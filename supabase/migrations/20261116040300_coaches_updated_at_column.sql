-- coaches.updated_at (UNAPPLIED, build only). Written 2026-11-15, Avery.
-- Numbered after live head 20261116024102 and after 20261116040000 (P1-22), 040100 (P1-27), 040200 (webhook claims);
-- clear of the P1-07/P1-06 0300xx lane.
-- Bug: trigger coaches_updated_at (BEFORE UPDATE, public.set_updated_at(): NEW.updated_at = now()) exists on
-- public.coaches, but the table has no updated_at column, so every UPDATE and every upsert that takes the
-- DO UPDATE path fails with 42703 (record "new" has no field "updated_at"). Confirmed read-only on live
-- 2026-11-15 ~9:56 PM ET: columns id, user_id, school_id, created_at, sports; coaches is the only table
-- with a set_updated_at trigger and no updated_at column; 0 existing rows (the default fills 0 rows).
-- Fix: add the column. The trigger and function are left as they are.
-- Table-level grants (anon/authenticated/service_role) already cover new columns; RLS policies unchanged.

ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.coaches.updated_at IS
  'Set by trigger coaches_updated_at (public.set_updated_at) on every UPDATE; defaults to now() on insert.';
