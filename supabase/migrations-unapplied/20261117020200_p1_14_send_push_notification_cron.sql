-- P1-14 send-push-notification hourly cron. NOT APPLIED. NOT SCHEDULED.
-- Does not touch job 1 (send-renewal-reminders-daily) or any existing job.
-- Existing jobs already use minute :00, :15, :17, :20, :30. This job uses :45.
-- Calls public.cron_call_edge so the x-cron-secret is injected from Vault
-- (cron_webhook_secret) and never appears in this file.
-- Rollback: 20261117020200_p1_14_send_push_notification_cron.ROLLBACK.sql

select cron.schedule(
  'send-push-notification-hourly',
  '45 * * * *',
  $$select public.cron_call_edge('send-push-notification', 120000)$$
);
