-- 2026-09-29 security: stop storing secrets in trigger/function SQL.
-- Additive step (nothing attached yet):
--   1) Two random webhook secrets generated server-side into Supabase Vault (values never leave the DB).
--   2) public.verify_webhook_secret(name, candidate) -> boolean, EXECUTE for service_role only.
--   3) Trigger functions that read the secret from vault.decrypted_secrets at call time.
-- The welcome path no longer needs ANY Supabase API key: the service_role JWT that was inline in
-- the trigger on_new_user_send_s1_welcome is replaced by a dedicated, independently rotatable secret.

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'feedback_to_notion_webhook_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'feedback_to_notion_webhook_secret',
      'x-webhook-secret: trigger public.client_feedback "feedback-to-notion" -> edge fn feedback-to-notion. Rotated 2026-09-29.'
    );
  end if;
  if not exists (select 1 from vault.secrets where name = 'welcome_email_webhook_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'welcome_email_webhook_secret',
      'x-webhook-secret: trigger auth.users on_new_user_send_s1_welcome -> edge fn send-s1-welcome-email. Replaces inline service_role bearer 2026-09-29.'
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
  if p_name not in ('feedback_to_notion_webhook_secret', 'welcome_email_webhook_secret') then
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
comment on function public.verify_webhook_secret(text, text) is
  'Edge-function webhook gate. Compares a candidate x-webhook-secret to a named Vault secret. Returns boolean only. service_role only.';

create or replace function public.tg_webhook_send_s1_welcome()
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
  where ds.name = 'welcome_email_webhook_secret';
  if v_secret is null then
    raise warning 'tg_webhook_send_s1_welcome: vault secret missing; welcome webhook skipped for %', new.id;
    return new;
  end if;
  -- Minimal payload (no password hash / tokens): only what send-s1-welcome-email reads.
  perform net.http_post(
    url := 'https://cqzvqzwwevnflinxgnpp.supabase.co/functions/v1/send-s1-welcome-email',
    body := jsonb_build_object(
      'type', 'INSERT', 'schema', tg_table_schema, 'table', tg_table_name,
      'record', jsonb_build_object(
        'id', new.id, 'email', new.email,
        'raw_user_meta_data', new.raw_user_meta_data, 'created_at', new.created_at),
      'old_record', null),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
    timeout_milliseconds := 5000
  );
  return new;
exception when others then
  raise warning 'tg_webhook_send_s1_welcome failed (signup not blocked): %', sqlerrm;
  return new;
end;
$$;

create or replace function public.tg_webhook_feedback_to_notion()
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
  where ds.name = 'feedback_to_notion_webhook_secret';
  if v_secret is null then
    raise warning 'tg_webhook_feedback_to_notion: vault secret missing; webhook skipped for %', new.id;
    return new;
  end if;
  perform net.http_post(
    url := 'https://cqzvqzwwevnflinxgnpp.supabase.co/functions/v1/feedback-to-notion',
    body := jsonb_build_object(
      'type', 'INSERT', 'schema', tg_table_schema, 'table', tg_table_name,
      'record', to_jsonb(new), 'old_record', null),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
    timeout_milliseconds := 5000
  );
  return new;
exception when others then
  raise warning 'tg_webhook_feedback_to_notion failed (insert not blocked): %', sqlerrm;
  return new;
end;
$$;

revoke all on function public.tg_webhook_send_s1_welcome() from public, anon, authenticated;
revoke all on function public.tg_webhook_feedback_to_notion() from public, anon, authenticated;
