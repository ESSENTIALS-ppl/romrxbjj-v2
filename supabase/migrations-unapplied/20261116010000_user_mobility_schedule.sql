-- P1-07 user_mobility_schedule. UNAPPLIED. Do not run until a sha gate line, Vera precheck PASS, and Jim knowing.
-- Rollback: 20261116010000_user_mobility_schedule_rollback.sql
-- Sets nothing on existing assessments; submit-assessment fills a row on the next successful submit after this is applied.

create table if not exists public.user_mobility_schedule (
  user_id uuid primary key references public.users(id),
  last_assessment_id uuid references public.assessments(id),
  last_assessed_at timestamptz not null,
  next_retest_at timestamptz not null,
  next_check_at timestamptz,
  check_joints text[],
  updated_at timestamptz not null default now()
);

comment on table public.user_mobility_schedule is 'Per-user next full retest (42 days) and optional quick check (7/14 days). Service role writes; owner may read.';
comment on column public.user_mobility_schedule.next_retest_at is 'Full 10-joint retest due at last_assessed_at + 42 days.';
comment on column public.user_mobility_schedule.next_check_at is 'Quick re-check due at last_assessed_at + 7 days (day 14 is derived).';

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
