-- Rollback for UNAPPLIED P1-07 20261116010000_user_mobility_schedule.sql. Drops the new table only.
drop index if exists public.user_mobility_schedule_next_check_at_idx;
drop index if exists public.user_mobility_schedule_next_retest_at_idx;
drop table if exists public.user_mobility_schedule;
