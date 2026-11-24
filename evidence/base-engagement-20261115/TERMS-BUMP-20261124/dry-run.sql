-- Dry run: applies the migration inside a transaction, checks, then ROLLS BACK. Writes nothing.
begin;
\i terms_version_20261231_v1.sql
select public.current_terms_version() = 'terms-2026-12-31-v1' as t1_current_is_new,
       public.accepted_terms_version('2026-10-19') as t2_old_accepted,
       public.accepted_terms_version('terms-2026-12-31-v1') as t3_new_accepted,
       not public.accepted_terms_version('2026-10-03') as t4_older_rejected,
       coalesce(public.accepted_terms_version(null), false) = false as t5_null_rejected;
rollback;
