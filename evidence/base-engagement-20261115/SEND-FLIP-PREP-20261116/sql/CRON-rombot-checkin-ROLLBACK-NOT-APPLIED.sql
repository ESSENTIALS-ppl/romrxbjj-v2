-- Rollback for CRON-rombot-checkin-NOT-APPLIED.sql. NOT APPLIED. Removes only the rombot-checkin-hourly job, by name.
-- Same statement as 11803fee supabase/migrations-unapplied/20261116160000_rombot_checkin_cron_rollback.sql.
-- Notes and email_sends claims already written ('checkin-d3-%') stay in place. No other job touched.
select cron.unschedule('rombot-checkin-hourly');
