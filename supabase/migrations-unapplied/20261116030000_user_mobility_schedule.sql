-- P1-07 user_mobility_schedule. UNAPPLIED. Do not run until a sha gate line, Vera precheck PASS, and Jim knowing.
-- Rollback: 20261116030000_user_mobility_schedule_rollback.sql
-- FKs (Vera L1073): user_id ON DELETE CASCADE (like the 17 other user-owned tables), last_assessment_id ON DELETE SET NULL,
-- so deleting a user or an assessment (P1-23 account deletion) is never blocked by a schedule row.
-- Version 20261116030000, numbered after the live migration head 20261116024102 (assessment_drafts applied Nov 15).
-- ONE apply (Grant 9:44 PM ET): table, roll function, backfill (already rolled), and the roll cron job, in this order.
-- Writer rules (Grant 9:38 PM ET): 1) full save (submit-assessment): next_check_at = last_assessed_at + 7 days and
-- next_retest_at = + 42 days, both reset. 2) quick save (P1-06): next_check_at = next_retest_at, right away, any day.
-- 3) roll (v3 window, Grant Nov 15 ET, to match Stacy's cleared words "day 7 to day 14"): the quick check opens on local
-- day 7 and stays open through the END of local day 14 (day 0 = local date of last_assessed_at). Only once local day 14
-- has ended with no quick check saved since the last full assessment does next_check_at = next_retest_at. So
-- "Your next check is today." shows on local days 7 to 14 (next_check_at stays at +7 while the window is open).
-- Window end is computed here from last_assessed_at in the user's tz (no stored column: the tz lives in
-- notification_preferences and can change, so a stored close time could go stale).
-- Time zone (same source as lifecycle-emails): notification_preferences.timezone if valid, else America/Chicago
-- (lifecycle-emails DEFAULT_TZ). user_mobility_schedule has no tz column.
-- Does not touch any other cron job (never send-renewal-reminders-daily, send-renewal-reminders or RENEWAL_BASE_SEND).

create table if not exists public.user_mobility_schedule (
  user_id uuid primary key references public.users(id) on delete cascade,
  last_assessment_id uuid references public.assessments(id) on delete set null,
  last_assessed_at timestamptz not null,
  next_retest_at timestamptz not null,
  next_check_at timestamptz,
  check_joints text[],
  updated_at timestamptz not null default now()
);

comment on table public.user_mobility_schedule is 'Per-user next full retest (42 days) and optional quick check (7/14 days). Service role writes; owner may read.';
comment on column public.user_mobility_schedule.next_retest_at is 'Full 10-joint retest due at last_assessed_at + 42 days.';
comment on column public.user_mobility_schedule.next_check_at is 'Quick re-check opens at last_assessed_at + 7 days and stays open through the end of local day 14; then (or after a quick check) equals next_retest_at.';

alter table public.user_mobility_schedule enable row level security;

drop policy if exists schedule_own_read on public.user_mobility_schedule;
create policy schedule_own_read on public.user_mobility_schedule
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.user_mobility_schedule from public, anon, authenticated;
grant select on public.user_mobility_schedule to authenticated;
grant all on public.user_mobility_schedule to service_role, postgres;

create index if not exists user_mobility_schedule_next_retest_at_idx on public.user_mobility_schedule (next_retest_at);
create index if not exists user_mobility_schedule_next_check_at_idx on public.user_mobility_schedule (next_check_at);
create index if not exists user_mobility_schedule_last_assessment_id_idx on public.user_mobility_schedule (last_assessment_id);

-- ---------------------------------------------------------------------------------------------------------------
-- Rule 3 (v3 window): roll_next_check_at(). Rolls a row only when the user's local date is after local day 14
-- (local date of last_assessed_at + 14). A quick save already set next_check_at = next_retest_at, so such rows are
-- excluded by "is distinct from". Idempotent: a second run updates 0 rows. p_now is for tests; the cron passes nothing.
create or replace function public.roll_next_check_at(p_now timestamptz default now())
returns integer language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare n integer;
begin
  update public.user_mobility_schedule s
     set next_check_at = s.next_retest_at,
         updated_at = p_now
    from (
      select s2.user_id, coalesce(tzn.name, 'America/Chicago') as tz
        from public.user_mobility_schedule s2
        left join public.notification_preferences np on np.user_id = s2.user_id
        left join lateral (select t.name from pg_catalog.pg_timezone_names t where t.name = np.timezone limit 1) tzn on true
    ) z
   where z.user_id = s.user_id
     and s.next_check_at is not null
     and s.next_check_at is distinct from s.next_retest_at
     and ((s.last_assessed_at at time zone z.tz)::date + 14) < (p_now at time zone z.tz)::date;
  get diagnostics n = row_count;
  return n;
end $$;
comment on function public.roll_next_check_at(timestamptz) is
  'P1-07 rule 3 (v3 window): after local day 14 ends (notification_preferences.timezone, fallback America/Chicago) with no quick check, next_check_at = next_retest_at. Idempotent. Cron roll-next-check-at-hourly.';
revoke all on function public.roll_next_check_at(timestamptz) from public, anon, authenticated;
grant execute on function public.roll_next_check_at(timestamptz) to service_role, postgres;

-- ---------------------------------------------------------------------------------------------------------------
-- Backfill (one row per user from their latest FULL assessment; check_kind read through to_jsonb so this works before
-- or after the P1-06 check_kind column exists). check_joints stays NULL until the next full save. A user with a quick
-- check after that full assessment gets next_check_at = next_retest_at (rule 2). Everyone else gets +7, then the roll
-- below moves every row whose local day 14 has ended. Same rule as the cron: rows on local days 7 to 14 at apply keep
-- +7 ("Your next check is today."), rows from local day 15 on show the retest date.
insert into public.user_mobility_schedule (user_id, last_assessment_id, last_assessed_at, next_retest_at, next_check_at, updated_at)
select f.user_id, f.id, f.at, f.at + interval '42 days',
       case when exists (
              select 1 from public.assessments q
               where q.user_id = f.user_id and to_jsonb(q)->>'check_kind' = 'quick' and q.assessed_at > f.at)
            then f.at + interval '42 days'
            else f.at + interval '7 days' end,
       now()
  from (
    select distinct on (a.user_id) a.user_id, a.id, a.assessed_at as at
      from public.assessments a
      join public.users u on u.id = a.user_id
     where a.assessed_at is not null
       and (to_jsonb(a)->>'check_kind') is distinct from 'quick'
     order by a.user_id, a.assessed_at desc
  ) f
on conflict (user_id) do nothing;

select public.roll_next_check_at();

-- ---------------------------------------------------------------------------------------------------------------
-- Rule 3 cron, its own job. '20 * * * *' (UTC) = every hour at :20 past, also :20 past in ET. lifecycle-emails-hourly is
-- '30 * * * *' (:30 past in ET), so each hour the roll lands 10 minutes before the emails read next_check_at.
-- Hourly because local midnight differs per user time zone.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'roll-next-check-at-hourly') then
    perform cron.unschedule('roll-next-check-at-hourly');
  end if;
end $$;
select cron.schedule('roll-next-check-at-hourly', '20 * * * *', $$select public.roll_next_check_at();$$);
