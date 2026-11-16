-- Rollback for 20261116020000_assessment_check_kind.sql. UNAPPLIED. Do not run against live until gated.
drop index if exists public.assessments_user_check_kind_assessed_at_idx;
alter table public.assessments drop constraint if exists assessments_check_kind_chk;
alter table public.assessments drop column if exists check_kind;
