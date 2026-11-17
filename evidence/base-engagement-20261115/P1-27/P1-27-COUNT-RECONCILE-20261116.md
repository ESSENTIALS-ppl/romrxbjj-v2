# P1-27 policy count reconcile — 16 Nov 2026 (America/New_York)

Read-only. Nothing applied, deployed, or scheduled. SQL body `46016324` on branch `fix/p1-27-rls-perf-cleanup-20261116040100` @ `30ba24c4`. No hashed pack file was edited. `/workspace/SHA256SUMS` was not touched.

Live re-read this turn via MCP `execute_sql` SELECT only, project `cqzvqzwwevnflinxgnpp`. Migration head is now `20261117013428` (P1-25 cron; P1-25 hook/purge/cron applied). Cron jobs: 14. Public policy total is still **146**. P1-25 added no public policies.

## 1. Baseline the v4 replay used

The v4 4-role replay used a **PGlite structure restore** of live as of migration head `20261116024102`, captured about 9:42 PM ET on 15 Nov 2026 (`prod-schema.json` / `prod-constraints-triggers.json`, copied unchanged into the v4 folder). It was not built from migrations from scratch, and it was not a restore of today's live head.

## 2. Why 108 differs from 141 and 146

These are three different totals, not a disagreement about the same set.

| Count | What it is |
| --- | --- |
| 141 | All `public` policies in the Nov 15 restore (75 tables; 60 of them have at least one policy). |
| 108 | The subset of those 141 that sit on the **39 affected / tested tables** named in `affected.txt` (the tables 040100 actually touches, plus `assessment_drafts`, which 040100 does not touch). v3 already documented this split: "108 policies on the tested tables before, 87 after." |
| 146 | All `public` policies on live now. Same 141, plus 5 policies created by later applies (see section 4). Live also has 2 `cron` policies and 3 `storage` policies; those are outside the public totals. |

The 33 restore policies that sit on 21 tables **outside** the 39 are: `ai_conversations` (1), `ai_messages` (1), `ai_research_cache` (1), `billing_consents` (1), `client_feedback` (2), `clients` (3), `fuel_logs` (1), `mood_entries` (4), `mood_settings` (3), `muscle_volume_landmarks` (1), `partner_inquiries` (1), `product_events` (3), `push_subscriptions` (3), `renewal_reminders` (1), `rom_thresholds` (1), `scoring_cutovers` (1), `sport_pack_waitlist` (1), `surveys` (1), `technique_warmups` (1), `user_ads_consent` (1), `user_ai_preferences` (1). 040100 does not name these tables.

040100 itself is a net **-21** policies: 89 `DROP POLICY IF EXISTS`, 68 `CREATE POLICY` (53 same-name rewrites + 15 new `p1_27_merged_*` names, after 36 merge-source drops). That is why the tested set goes 108 → 87.

## 3. Live check of every policy 040100 drops, creates, or merges

Checked against live `pg_policies` (public) this turn, and also against the Nov 15 restore definitions. Qualifiers were compared after normalizing whitespace and `(SELECT auth.uid() AS uid)` / `(select auth.uid())` to `auth.uid()` (and the same for `auth.jwt()`). Ten of the 89 drop targets already store a `SELECT` wrap in both restore and live; that is not a semantic mismatch.

- All **89** drop / rewrite names exist on live. Each one's command, roles, permissive flag, USING, and WITH CHECK matches the Nov 15 restore (normalized). **0 missing. 0 definition mismatches.**
- All **15** new merged names (`p1_27_merged_*`) are **absent** on live, which is what we want before apply. `CREATE POLICY` would fail if they were already there.
- The 33 untouched restore policies also match live (normalized). **0 drift.**

No mismatch to flag. The 89 named source policies are still the ones the SQL expects to drop or rewrite.

## 4. Expected live public policy count after apply

146 − 21 = **125**.

That is: 87 left on the 39 affected tables, plus the 33 untouched restore policies, plus the 5 later policies in section 5 (87 + 33 + 5 = 125). 040100 does not add or drop policies outside that set.

## 5. The 5-policy delta (live minus restore), and proof 040100 does not touch them

Live public 146 minus restore public 141 is exactly these five. None of the five names, and none of the three tables, appear in 040100. They are not in `affected.txt`. None is a drop, create, or merge target.

| Table | Policy | Source apply (live `schema_migrations`) |
| --- | --- | --- |
| `assessment_feedback` | `assessment_feedback_insert_own` | `20261117010702` `p1_18_assessment_feedback` (with `assessment_feedback_select_own`) |
| `assessment_feedback` | `assessment_feedback_select_own` | same |
| `session_feedback` | `session_feedback_insert_own` | `20261117010651` `p1_18_session_feedback` (with `session_feedback_select_own`) |
| `session_feedback` | `session_feedback_select_own` | same |
| `user_mobility_schedule` | `schedule_own_read` | `20261116143732` `user_mobility_schedule` |

Later applies after the restore also include P1-22 and P1-25 (`20261117013401` / `20261117013410` / `20261117013428`). Those did not add public policies. Every restore policy name is still present on live (0 only-on-restore).

## 6. Local live-equivalent replay (read-only; nothing applied)

Because the v4 baseline was the Nov 15 restore, a second local PGlite run was done in `/tmp/p1-27-live-equiv-20261116` only (hashed v4 matrices and pack files were not written or overwritten). It restored the Nov 15 structure, added the 5 later policies (and the three tables / `assessments.check_kind` column they need), then applied 040100.

| | Affected (39 tables) | All public |
| --- | --- | --- |
| Before 040100 | 108 | 146 |
| After 040100 | 87 | 125 |

`migErr` was null. All 5 later policies were still present after the migration. 15 `p1_27_merged_*` policies existed after. See `live-equiv-replay-20261116.json`.

This is still a local structure restore plus the 5 later policies, not a Supabase branch and not a restore of today's full live catalog.

## Hashes (this note)

See `SHA256SUMS-P1-27-COUNT-RECONCILE-20261116`. Existing pack `SHA256SUMS` files were not modified. SQL body remains `46016324beccd0c7285c7f93c49e9e1795c64cf980294c76e1a78d2508e9be10`.
