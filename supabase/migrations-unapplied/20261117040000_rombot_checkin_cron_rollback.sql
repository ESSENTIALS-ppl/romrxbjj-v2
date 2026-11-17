-- ROLLBACK for 20261117040000_rombot_checkin_cron.sql (P1-17). UNAPPLIED. Removes only the rombot-checkin-hourly job, by name.
-- Safe to run twice (no error if the job is already gone). No data change: check-in notes and their email_sends claims stay.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'rombot-checkin-hourly') then
    perform cron.unschedule('rombot-checkin-hourly');
  end if;
end $$;
