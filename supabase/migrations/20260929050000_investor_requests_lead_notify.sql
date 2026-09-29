-- 2026-09-29 fix: romrx.io investor form lost every submission.
--   netlify/functions/investor-request.js POSTs to /rest/v1/investor_requests, but the table never
--   existed (PostgREST 404; fetch() does not throw, so the visitor still saw "Thanks").
--   Neither form emailed anyone either: romrx.io's Netlify env has no RESEND_API_KEY.
-- This migration:
--   1) Creates public.investor_requests (service_role only; RLS on, no policies).
--   2) Vault secrets lead_notify_webhook_secret (used now) and cron_webhook_secret (for the cron
--      caller-auth hardening that follows); verify_webhook_secret allowlist extended.
--   3) AFTER INSERT triggers on investor_requests and partner_inquiries -> edge fn
--      notify-inbound-lead (emails jim@romrx.io via the project's existing Resend key).
--      The trigger never blocks the insert.

create table if not exists public.investor_requests (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(name) between 1 and 200),
  email      text not null check (length(email) between 3 and 320 and position('@' in email) > 1),
  firm       text check (firm is null or length(firm) <= 200),
  stage      text check (stage is null or length(stage) <= 50),
  notes      text check (notes is null or length(notes) <= 5000),
  source     text not null default 'romrx.io/investors' check (length(source) <= 100),
  created_at timestamptz not null default now()
);
comment on table public.investor_requests is
  'romrx.io/investors "Request access" form. Written only by Netlify fn investor-request (service role). Fields: name, email, firm, stage, notes, source, created_at. Retention/deletion: see ROMRx Data Deletion Policy.';
alter table public.investor_requests enable row level security;
revoke all on table public.investor_requests from public, anon, authenticated;
grant select, insert, update, delete on table public.investor_requests to service_role;
create index if not exists investor_requests_email_idx on public.investor_requests (lower(email));

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'lead_notify_webhook_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'lead_notify_webhook_secret',
      'x-webhook-secret: triggers on investor_requests/partner_inquiries -> edge fn notify-inbound-lead. Created 2026-09-29.'
    );
  end if;
  if not exists (select 1 from vault.secrets where name = 'cron_webhook_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'cron_webhook_secret',
      'x-cron-secret: pg_cron -> cron-called edge functions (caller auth). Created 2026-09-29.'
    );
  end if;
end $$;

create or replace function public.verify_webhook_secret(p_name text, p_candidate text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_secret text;
begin
  if p_name not in ('feedback_to_notion_webhook_secret', 'welcome_email_webhook_secret',
                    'lead_notify_webhook_secret', 'cron_webhook_secret') then
    return false;
  end if;
  if p_candidate is null or length(p_candidate) < 32 then
    return false;
  end if;
  select ds.decrypted_secret into v_secret
  from vault.decrypted_secrets ds
  where ds.name = p_name;
  return v_secret is not null and v_secret = p_candidate;
end;
$$;
revoke all on function public.verify_webhook_secret(text, text) from public, anon, authenticated;
grant execute on function public.verify_webhook_secret(text, text) to service_role;

create or replace function public.tg_webhook_notify_inbound_lead()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
begin
  select ds.decrypted_secret into v_secret
  from vault.decrypted_secrets ds
  where ds.name = 'lead_notify_webhook_secret';
  if v_secret is null then
    raise warning 'tg_webhook_notify_inbound_lead: vault secret missing; % % not emailed', tg_table_name, new.id;
    return new;
  end if;
  perform net.http_post(
    url := 'https://cqzvqzwwevnflinxgnpp.supabase.co/functions/v1/notify-inbound-lead',
    body := jsonb_build_object(
      'type', 'INSERT', 'schema', tg_table_schema, 'table', tg_table_name,
      'record', to_jsonb(new), 'old_record', null),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
    timeout_milliseconds := 5000
  );
  return new;
exception when others then
  raise warning 'tg_webhook_notify_inbound_lead failed (insert not blocked): %', sqlerrm;
  return new;
end;
$$;
revoke all on function public.tg_webhook_notify_inbound_lead() from public, anon, authenticated;

drop trigger if exists notify_inbound_lead on public.investor_requests;
create trigger notify_inbound_lead
  after insert on public.investor_requests
  for each row execute function public.tg_webhook_notify_inbound_lead();

drop trigger if exists notify_inbound_lead on public.partner_inquiries;
create trigger notify_inbound_lead
  after insert on public.partner_inquiries
  for each row execute function public.tg_webhook_notify_inbound_lead();
