# RECEIPT: P1-29 coach_roster security_invoker (BUILD ONLY)

Monday Nov 16, 2026, 8:22 PM ET (America/New_York). Avery. BUILD ONLY. Nothing applied, deployed, flipped or scheduled. No secrets or user emails printed. `/workspace/SHA256SUMS` was not touched.

## Branch / commit
- Branch: `feat/p1-29-coach-roster-security-invoker-20261116`
- Commit: `ae58b91f316ca757d130a612a30c05a620e6fee3` (parent `a34aa573`, already applied, do not re-apply)
- Patch sha256: `8afaf4f65463c6a0ea0a37c6e63504a6730759bd01eba95cd732ad3c7424e5f7`
- `git patch-id --stable`: `307ed0a39b4b667c99cb82740d5f552738705ff4`
- SQL sha256: `b4861884e9b69c0fb06680a12801c50a91b10020204c1dd128221f42b19d16d9`
- Rollback sha256: `3ff0affbb6fd10569d7105fe53eae7238e5986fd593cc5f0f6357cdf3e56c164`

## Tests
PGlite 0.5.16, **26/26 ALL PASS**. Roles: anon, authenticated (coach C, athlete D, school admin SA, unlinked E), service_role, postgres.

After the fix: anon is denied; coach C sees only Athlete D (name and belt); athlete, school admin, and unlinked user see none; service_role and postgres without a user id see none (the view's `WHERE c.user_id = auth.uid()` still applies). Coach roster rows match the definer view. Direct users SELECT: coach sees D only, not E; school admin sees the school member only; athlete and unlinked user see only self. A planted drop of the new users policy hides the roster from the coach (sensitivity); re-applying restores it. Rollback turns invoker off, keeps the barrier, drops the policy, and coach access still works via the definer view.

## Open questions
1. Needs its own gate line and Vera precheck. Not applied.
2. `public.feature_flags` is also a view without `security_invoker`. P1-29 is only `coach_roster` (the documented remaining security ERROR). Confirm feature_flags stays out.
3. The new users policy lets a linked coach `SELECT` those athlete user rows directly, not only through the view. That is required for invoker plus "coach access still works." If the policy must be even narrower (column-limited), say so — Postgres RLS is row-level.
4. Parent is a34aa573 (already applied). Apply only `20261117020100`, never a34aa573.

## Not done
Not applied. No gate line.
