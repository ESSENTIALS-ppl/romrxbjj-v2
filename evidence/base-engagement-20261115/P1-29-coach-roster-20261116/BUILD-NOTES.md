# P1-29 coach_roster security_invoker BUILD-NOTES — 2026-11-16, 8:22 PM ET (America/New_York)

BUILD ONLY. Nothing applied, deployed, flipped or scheduled.

## Stopped-run check
No P1-29 folder, branch, or origin ref existed from the rate-limited run. Started fresh from a live read of `public.coach_roster`.

## Branch / commit
- Repo: ESSENTIALS-ppl/romrxbjj-v2
- Branch: `feat/p1-29-coach-roster-security-invoker-20261116`
- Commit: `ae58b91f316ca757d130a612a30c05a620e6fee3`
- Parent: `a34aa573a160c674cfdf9660cec30304161f1044` (already-applied rename of assessment_drafts; do NOT re-apply a34aa573). The only apply-able file in this commit is `20261117020100`.
- Patch sha256: `8afaf4f65463c6a0ea0a37c6e63504a6730759bd01eba95cd732ad3c7424e5f7`
- `git patch-id --stable`: `307ed0a39b4b667c99cb82740d5f552738705ff4`
- SQL sha256: `b4861884e9b69c0fb06680a12801c50a91b10020204c1dd128221f42b19d16d9`
- Rollback sha256: `3ff0affbb6fd10569d7105fe53eae7238e5986fd593cc5f0f6357cdf3e56c164`

## Live read-only (before any change)
View query: athletes ⋈ coaches ⋈ users, `WHERE c.user_id = auth.uid()`. reloptions `security_barrier=true` only (DEFINER). Owner postgres. Grants: authenticated SELECT (and more), service_role, postgres. No anon grant.

## Every hunk
1. `supabase/migrations/20261117020100_p1_29_coach_roster_security_invoker.sql` — `ALTER VIEW public.coach_roster SET (security_invoker = true);` keeps `security_barrier`. Adds `users: linked coach reads roster athletes` (SELECT, TO authenticated, EXISTS linked athlete+coach where `c.user_id = (select auth.uid())`).
2. `supabase/migrations/20261117020100_p1_29_coach_roster_security_invoker.rollback.sql.txt` — DROP that policy, `ALTER VIEW ... RESET (security_invoker)`.
3. `scripts/p1-29-coach-roster-test/test.mjs` and `package.json` — PGlite 4-role tests. Not a migration.

The users policy is required for "coach access still works": with invoker, users RLS would otherwise hide athlete full_name/belt (self / school admin / service_role only). It exposes the same linked-athlete rows the definer view already returned, and also allows a direct `SELECT` of those user rows by that coach.
