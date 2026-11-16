# P1-27 BUILD-NOTES — RLS perf cleanup

STARTED: Sun Nov 15, 2026, 8:52 PM ET (America/New_York). UNAPPLIED migration only. Not applied to live. Live advisors pulled ~8:52 PM ET.

Branch: romrxbjj-v2 `fix/p1-27-rls-perf-cleanup-20261116040100` (renumbered rebuild of 78b600fc on `fix/p1-27-rls-perf-cleanup-20261115`). Migration `20261116040100_p1_27_rls_perf_cleanup.sql` (after live latest applied `20261116024102`; was `20261116013100`). ON HOLD: do not apply.

## What the migration does
- Wrap 75 policies where `auth.uid()` or `current_setting()` is not already in `(select ...)` form. Live pretty-print of an existing wrap is `( SELECT auth.uid() AS uid )`; those were left alone.
- Merge 15 exact table+cmd+role groups (36 policies) by OR-ing existing predicates (already permissive). service-role predicates that are TO PUBLIC with `auth.role() = 'service_role'` stay inside the OR. Advisor reported 258 `multiple_permissive_policies` because it expands ALL × roles.
- Drop 4 duplicate indexes: `coach_notes_coach_id_athlete_id_key` (keep `coach_notes_coach_athlete_unique`), `consents_user_id_idx` (keep `idx_consents_user`), `eligibility_athlete_id_idx` (keep `technique_eligibility_athlete_id_idx`), `techniques_sport_idx` (keep `idx_techniques_sport`).

Out of scope: unindexed FKs, no-PK, unused indexes, `ops.feature_flags` RLS off, `backup_tables.product_events_cleanup16_20261020` RLS off, `coach_roster` (P1-29 HOLD).

Policy-by-policy list: `POLICY-BY-POLICY.md`. PGlite scratch in `pglite/` is a syntax/demo stub, not a full-schema replay (live schema is too large to copy into PGlite here).
