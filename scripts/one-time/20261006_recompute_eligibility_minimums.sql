-- =====================================================================================================================
-- ONE-TIME: re-save technique_eligibility after 20261006170000_pack_minimums_rescale.sql (technique minimums rescaled to the
-- Oct 6 Steady targets). NOT a migration on purpose (outside supabase/migrations, so `supabase db push` never runs it).
-- Run AFTER 20261006153000 + scripts/one-time/20261006_recompute_steady_targets.sql + 20261006170000 are applied.
--
-- What it does: public.recompute_user_eligibility(user) (the same function add_sport_access calls) for every pack owner
-- (users.sports_enabled has bjj or bodybuilding) who has an assessment. That function re-runs compute_joint_scores on the
-- user's latest assessment (same result as the steady-targets recompute) and upserts technique_eligibility for each owned
-- sport. No emails, no triggers on technique_eligibility. Older assessments' eligibility rows are left as they are.
-- Test fixtures (public.is_test_account) are skipped by default, same as the steady-targets recompute.
-- Rollback: there is no separate backup; run the migration rollback, then section B again (tiers follow the minimums).
-- =====================================================================================================================

-- A. DRY RUN (read-only): who would be re-saved, and how many stored rows exist today
SELECT count(*) AS pack_owners_in_scope,
       count(*) FILTER (WHERE 'bjj' = ANY (u.sports_enabled)) AS bjj_owners,
       count(*) FILTER (WHERE 'bodybuilding' = ANY (u.sports_enabled)) AS bodybuilding_owners,
       (SELECT count(*) FROM public.technique_eligibility te
         WHERE te.user_id IN (SELECT id FROM public.users x WHERE x.sports_enabled && ARRAY['bjj','bodybuilding']::text[])) AS stored_rows_for_them
FROM public.users u
WHERE u.sports_enabled && ARRAY['bjj','bodybuilding']::text[]
  AND NOT coalesce(public.is_test_account(u.email), false)
  AND EXISTS (SELECT 1 FROM public.assessments a WHERE a.user_id = u.id);

-- B. APPLY (writes technique_eligibility; one transaction)
-- BEGIN;
-- SELECT u.id, public.recompute_user_eligibility(u.id) AS result
-- FROM public.users u
-- WHERE u.sports_enabled && ARRAY['bjj','bodybuilding']::text[]
--   AND NOT coalesce(public.is_test_account(u.email), false)
--   AND EXISTS (SELECT 1 FROM public.assessments a WHERE a.user_id = u.id);
-- COMMIT;
