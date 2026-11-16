-- Rollback for 20261116160000_rombot_checkin_cron.sql (P1-17). Removes only the rombot-checkin-hourly job. No data change.
-- Claims already written to public.email_sends (email_id 'checkin-d3-%') and in-app notes are left in place.

select cron.unschedule('rombot-checkin-hourly');
