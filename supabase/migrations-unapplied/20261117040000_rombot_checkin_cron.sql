-- P1-17 day 3 ROMBot check-in: hourly pg_cron job for the live rombot-checkin function. UNAPPLIED. BUILD ONLY.
-- Spec: /workspace/research/base-comp-20261115/reid/ROMBOT-DAY3-SPEC.md ("scheduler (hourly run, reuse the lifecycle-emails pattern)").
-- Version 20261117040000 is a placeholder after the live migration head (20261117025845 at build time); apply_migration
-- stamps the real id. Kept in migrations-unapplied/ so a db push cannot pick it up.
-- Rollback: 20261117040000_rombot_checkin_cron_rollback.sql (unschedules this job by name only).
--
-- Call pattern: identical to live job 11 lifecycle-emails-hourly ('30 * * * *',
--   select public.cron_call_edge('lifecycle-emails', 120000)). public.cron_call_edge (SECURITY DEFINER) reads the vault
--   secret cron_webhook_secret and sends it as the x-cron-secret header with an empty JSON body; rombot-checkin checks it with
--   public.verify_webhook_secret('cron_webhook_secret', ...) and fails closed (403). No secret is written here.
--
-- Time zones and DST: pg_cron runs in UTC. The job runs every hour at minute 30 UTC, which is minute 30 of every hour in
--   America/New_York in both EST (UTC-5) and EDT (UTC-4), so a DST change never skips or doubles a local hour. The schedule
--   is not the send-time gate: the function picks each user's local send hour itself (reminder_time, else 9; stored
--   timezone, else America/New_York, the same New York fallback as adc6249b) and sends only on local day 3 inside a 3 hour
--   window. So no ET gate is needed in the SQL, and a fixed UTC hour would be wrong for users outside ET.
--
-- Sends: the function is a dry run unless ROMBOT_CHECKIN_SEND is exactly "on"; the email fallback also needs
--   LIFECYCLE_EMAILS_SEND exactly "on". This migration sets neither. Touches no other cron job, table, column, policy or data.
--
-- Idempotent: remove an existing job with this name (if any), then schedule it once.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'rombot-checkin-hourly') then
    perform cron.unschedule('rombot-checkin-hourly');
  end if;
end $$;

select cron.schedule(
  'rombot-checkin-hourly',
  '30 * * * *',
  $$select public.cron_call_edge('rombot-checkin', 120000)$$
);
