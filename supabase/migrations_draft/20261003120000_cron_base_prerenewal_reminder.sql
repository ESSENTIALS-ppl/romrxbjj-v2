-- DRAFT, NOT APPLIED, NOT in supabase/migrations on purpose (so `supabase db push` / branch CI cannot pick it up).
-- Move to supabase/migrations/ only when Grant gives the go (order: Stacy OKs copy -> byte-diff clean -> Reid retests
-- with fixtures -> deploy send-base-prerenewal-reminder -> set PREREMINDER_CRON_ENABLED=true -> apply this file).
--
-- Daily Base pre-renewal reminder: Dec 18 through Dec 28 at 15:00 UTC (10:00 ET in December), once a day.
-- The edge function itself enforces: flag PREREMINDER_CRON_ENABLED=true, ET date window Dec 18-28, Base trial ending
-- Jan 1, 2027 12:00 ET, once per user via email_sends claim "base_trial_will_end" (shared with stripe-webhook trial_will_end).
-- Auth: public.cron_call_edge posts x-cron-secret (Vault cron_webhook_secret); the function verifies it fail-closed.
-- pg_cron schedules are UTC. Existing jobs (send-renewal-reminders-daily, conversion-drip-hourly, ...) are not touched.

select cron.schedule(
  'base-prerenewal-reminder-daily',
  '0 15 18-28 12 *',
  $$select public.cron_call_edge('send-base-prerenewal-reminder', 30000)$$
);

-- Rollback / switch off (also valid at any time before Dec 18):
--   select cron.unschedule('base-prerenewal-reminder-daily');
