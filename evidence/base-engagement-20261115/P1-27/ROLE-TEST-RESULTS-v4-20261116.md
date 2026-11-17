# P1-27 per-role access test v4 (4-role replay) — 78b600fc / migration 040100 — 2026-11-16

Executor for Avery. Written Monday Nov 16, 2026, 8:15 PM ET (America/New_York). BUILD ONLY. Nothing applied, deployed, flipped or scheduled. v1, v2 and v3 results and their SHA256SUMS are kept unchanged.

This is a local PGlite replay of the four roles Sable named (anon, authenticated, service_role, postgres) against the 040100 migration whose body is byte-identical to 78b600fc (sha256 46016324beccd0c7285c7f93c49e9e1795c64cf980294c76e1a78d2508e9be10). It adds the postgres persona that v3 did not test, and it records ON CONFLICT upserts, RETURNING writes, and cross-user reads (coach to linked athlete, school admin) in the same matrix.

It is still a PGlite structure restore, not a Supabase branch and not a restore of today's live head. Whether that meets L1075 is Sable's call.

## What changed from v3
- Personas in the owner/other shape: anon, auth_owner_A, auth_other_B, service_role, **postgres**.
- Personas in the cross-user shape: anon, coach_C, athlete_D_owner, school_admin_SA, unlinked_user_E, service_role, **postgres**.
- postgres is the PGlite bootstrap superuser (rolsuper, rolbypassrls). `SET LOCAL ROLE postgres` is a no-op on that session.
- Unique fixture identifiers for email columns are not mailbox addresses (no `@`), so the pack stays within the address rule. v3 used `@test.local` addresses, which this pack does not copy.
- Schema, constraints, triggers and the migration body are the same files as v3 (restore of live at 20261116024102, captured ~9:42 PM ET Nov 15). They were copied, not edited.

## Results
| shape | compared cells (before = after) | differences | mutant differences |
|---|---|---|---|
| s1 | 4,867 | **0** | 27 |
| s2 | 6,067 | **0** | 27 |

- The migration ran without error in all 4 runs (`migErr` null).
- Policies on the 39 tested tables: 108 → 87 in every run (same as v3). Unique/PK constraints 91 → 90 (the dropped `coach_notes_coach_id_athlete_id_key`). FK 88, CHECK 92, triggers 39, unchanged.
- Sensitivity is unchanged: 27 cells differ in each planted-mutant shape (athletes and body_metrics for owner/other, CROSS:athletes for four authenticated personas, CROSS:protocols for coach_C).
- Cross reads match before/after. After s1 (identical after s2):

| table | anon | coach_C | athlete_D_owner | school_admin_SA | unlinked_user_E | service_role | postgres |
|---|---|---|---|---|---|---|---|
| assessments | (none) | assessment_D | assessment_D | (none) | assessment_E | D and E | D and E |
| joint_scores | (none) | joint_score_D | joint_score_D | (none) | joint_score_E | D and E | D and E |
| protocols | (none) | protocol_D | protocol_D | (none) | protocol_E | D and E | D and E |
| technique_eligibility | (none) | tech_elig_D | tech_elig_D | (none) | tech_elig_E | D and E | D and E |
| athletes | (none) | athlete_D | athlete_D | (none) | athlete_E | D and E | D and E |
| users | (none) | user_C | user_D | user_SA user_SU_in_school | user_E | all five | all five |

- ON CONFLICT DO NOTHING, ON CONFLICT DO UPDATE, and RETURNING on insert, update, delete and upsert are present as first-class matrix keys for every persona, including postgres (`upsert_*_do_nothing`, `upsert_*_do_update`, `upsert_*_do_update_returning`, `insert_*_returning`, `update_returning_per_row`, `delete_returning_per_row`). Those cells match before vs after.
- The coaches finding from v2/v3 still stands and is unrelated to P1-27: UPDATE on coaches fails 42703 because the coaches_updated_at trigger sets a column the table doesn't have (L1098).

## Live read-only check, 8:13 PM ET
SELECT only, project cqzvqzwwevnflinxgnpp, live migration head 20261117010702. All 89 policies named in 040100 are still present. The three duplicate indexes and both coach_notes unique constraints are still present. Live public policy total is 146 (the Nov 15 restore has 141; the 5 new policies are from later applies, including P1-18, and are not touched by 040100).

## Limits
- Data is synthetic, and FK/CHECK are NOT VALID for seed rows only (every test write is checked).
- pg_net/Vault are stubbed, so HTTP side effects aren't exercised.
- Where a guard trigger raises before RLS (coaches, users protected columns), RLS isn't separately visible on that path; it is the same before and after.
- PGlite is PostgreSQL 18.x (0.5.16). Prod itself isn't tested.
- This is not a Supabase branch and not a restore of today's live head.

## Files
`P1-27/role-test-v4-4role-20261116/` (harness build4.mjs, compare.py, copied structure exports, matrices for s1/s2 and both mutants, logs, live-read-only-20261116.json, SHA256SUMS). v1–v3 folders and receipts were not modified.
