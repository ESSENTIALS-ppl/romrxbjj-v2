-- P1-34 send-flip prep (Nov 16 2026). rombot-checkin hourly cron. NOT APPLIED. Do not run outside the gate.
-- Apply ONLY via Supabase MCP apply_migration (let MCP assign the id; pure-rename commit after), after Vera PASS + Sable OK.
-- Same statement as romrxbjj-v2 11803fee supabase/migrations-unapplied/20261116160000_rombot_checkin_cron.sql line 11.
-- Auth: public.cron_call_edge reads the cron secret from vault.decrypted_secrets (name 'cron_webhook_secret') and sends it as
-- the x-cron-secret header, exactly like live job 11 lifecycle-emails-hourly. No key or secret is written in this file.
-- Scheduling sends nothing by itself: rombot-checkin is dry until ROMBOT_CHECKIN_SEND is exactly "on", and writes nothing
-- while LIFECYCLE_AUDIENCE is not "all" and LIFECYCLE_CANARY_USER_IDS is empty (handler.ts:75).
-- No table, column, policy, data or other job change. Renewal job 1 untouched.
select cron.schedule('rombot-checkin-hourly', '30 * * * *', $$select public.cron_call_edge('rombot-checkin', 120000)$$);
