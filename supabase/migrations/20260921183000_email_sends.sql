-- email_sends: durable send-once ledger for conversion drip (and future drips)
-- LIVE applied 2026-09-21 via Supabase MCP apply_migration email_sends_send_once
create table if not exists public.email_sends (
  user_id uuid not null references auth.users(id) on delete cascade,
  email_id text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, email_id)
);

comment on table public.email_sends is 'Send-once ledger keyed by (user_id, email_id); used by conversion drip C1–C3.';

create index if not exists email_sends_email_id_idx on public.email_sends (email_id);

alter table public.email_sends enable row level security;

revoke all on table public.email_sends from anon, authenticated;
grant select, insert, update, delete on table public.email_sends to service_role;
