-- P1-06 assessments.check_kind. UNAPPLIED. Do not run until a sha gate line, Vera precheck PASS, and Jim knowing.
-- Rollback: 20261116031000_assessment_check_kind_rollback.sql
-- Existing rows receive check_kind = 'full' via the default. submit-assessment only writes 'quick' after this is applied.
-- Version 20261116031000: after the live head 20261116024102 and after P1-07 v2 (030000/030100/030200). Declared pair with P1-07 v2.

alter table public.assessments
  add column if not exists check_kind text not null default 'full';

alter table public.assessments
  drop constraint if exists assessments_check_kind_chk;

alter table public.assessments
  add constraint assessments_check_kind_chk
  check (check_kind in ('full', 'quick'));

comment on column public.assessments.check_kind is
  'full = complete assessment (default). quick = scheduled 1-2 joint re-check; does not move next_retest_at.';

create index if not exists assessments_user_check_kind_assessed_at_idx
  on public.assessments (user_id, check_kind, assessed_at desc);
