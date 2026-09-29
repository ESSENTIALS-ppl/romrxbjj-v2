-- 2026-09-29 security: cron-called edge functions have verify_jwt=false and no caller auth.
-- Every pg_cron HTTP job now sends x-cron-secret read from Vault at run time (cron_webhook_secret,
-- created in 20260929050000). Enforcing functions (v14/v11, deployed 2026-09-29 ~11:58 PM ET):
-- send-s1-2/3/4, send-bb-s1-2/3/4. Not yet enforcing (dedupe exists): send-renewal-reminders,
-- send-conversion-drip.
create or replace function public.cron_call_edge(p_fn text, p_timeout_ms int default 5000)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
begin
  if p_fn !~ '^[a-z0-9-]{1,64}$' then
    raise exception 'cron_call_edge: bad function name';
  end if;
  select ds.decrypted_secret into v_secret from vault.decrypted_secrets ds where ds.name = 'cron_webhook_secret';
  return net.http_post(
    url := 'https://cqzvqzwwevnflinxgnpp.supabase.co/functions/v1/' || p_fn,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', coalesce(v_secret, '')),
    timeout_milliseconds := p_timeout_ms
  );
end;
$$;
revoke all on function public.cron_call_edge(text, int) from public, anon, authenticated;

select cron.alter_job(1, command := $c$select public.cron_call_edge('send-renewal-reminders')$c$);
select cron.alter_job(2, command := $c$select public.cron_call_edge('send-s1-2-followup-email')$c$);
select cron.alter_job(3, command := $c$select public.cron_call_edge('send-s1-3-masters-email')$c$);
select cron.alter_job(4, command := $c$select public.cron_call_edge('send-s1-4-stilhere-email')$c$);
select cron.alter_job(5, command := $c$select public.cron_call_edge('send-bb-s1-2-followup-email')$c$);
select cron.alter_job(6, command := $c$select public.cron_call_edge('send-bb-s1-3-followup-email')$c$);
select cron.alter_job(7, command := $c$select public.cron_call_edge('send-bb-s1-4-stilhere-email')$c$);
select cron.alter_job(8, command := $c$select public.cron_call_edge('send-conversion-drip', 10000)$c$);
