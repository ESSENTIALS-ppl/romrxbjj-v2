-- Rollback for UNAPPLIED P1-07 20261116030000_user_mobility_schedule.sql (one apply, so one rollback).
-- Unschedules only roll-next-check-at-hourly, drops roll_next_check_at(), the three indexes and the table
-- (the ON DELETE CASCADE / SET NULL FKs and the backfilled rows go with the table). No other cron job is touched.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'roll-next-check-at-hourly') then
    perform cron.unschedule('roll-next-check-at-hourly');
  end if;
end $$;
drop function if exists public.roll_next_check_at(timestamptz);
drop index if exists public.user_mobility_schedule_last_assessment_id_idx;
drop index if exists public.user_mobility_schedule_next_check_at_idx;
drop index if exists public.user_mobility_schedule_next_retest_at_idx;
drop table if exists public.user_mobility_schedule;
