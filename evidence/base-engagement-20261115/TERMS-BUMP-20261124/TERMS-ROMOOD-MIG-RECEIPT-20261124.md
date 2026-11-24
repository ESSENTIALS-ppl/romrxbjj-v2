# Terms version bump (STAGED) + ROMood migration 20261028100000 check (Base only)
Nov 24 2026, 4:11-4:20 PM ET. Project cqzvqzwwevnflinxgnpp. Nothing applied, nothing deployed, no sends or invokes.
No secrets involved; no CLI --yes step needed.

## Task 1: Terms version terms-2026-12-31-v1 (STAGED, not applied, per Grant 4:12 PM ET)
Server places (live, read via MCP; repo grep of supabase/functions in both repos: none):
- public.current_terms_version() = '2026-10-19' (md5 c5a7810a)
- public.record_signup_terms_consent() (trigger zy_record_signup_terms_consent on auth.users, md5 a7ab226f):
  RAISES 22023 if metadata terms_version is distinct from current_terms_version(). The signup fails.
- public.record_terms_reaccept(text,text,text,text) (md5 fc925f42): RAISES if p_terms_version is not current.
- tg_after_consent_insert only copies new.terms_version (no check). No policy, constraint or view compares versions.
- Edge functions: none. Live sources of create-checkout-session v56, stripe-webhook v62, ai-chat v104,
  submit-assessment v53, activate-beta-base v20 have no terms_version reference. HOT FUNCTION TOUCHED: NO.
- Live consents by version (counts only): 2026-06-04 4, 2026-10-03 6, 2026-10-19 4. None are changed.

Coupling found: strict equality. With a plain bump, every signup from a client still sending 2026-10-19 fails
(and the reverse if the client goes first). So the staged SQL adds a transition:
- current_terms_version() -> 'terms-2026-12-31-v1' (new consents)
- new accepted_terms_version(p): true for '2026-10-19' or 'terms-2026-12-31-v1' only
- signup trigger and re-accept RPC check accepted_terms_version() instead of strict equality.
ORDER: SQL FIRST, then the io publish. SQL-first is safe (old clients still accepted). Client-first breaks signups.

Client side (Jules), must match exactly:
- app/src/lib/termsConsent.ts:13  export const TERMS_VERSION = '2026-10-19'  ->  'terms-2026-12-31-v1'
- FORCED RE-CONSENT RISK: the combined dist inlines VITE_TERMS_REACCEPT_GATE = "on" (index-Ba_9NjlT.js,
  Ag(`on`,...)), so the re-accept gate is ON in prod. TermsReacceptGate.tsx:45 looks up
  .eq('terms_version', TERMS_VERSION). Bumping TERMS_VERSION alone would gate every existing user
  (no terms-2026-12-31-v1 row) = forced re-consent, against Grant's ruling. Jules must change line 45 to accept
  either version, e.g. .in('terms_version', ['2026-10-19','terms-2026-12-31-v1']) (or turn the gate flag off).
  The server side accepts both values in record_terms_reaccept, so no server change is needed for that.

Staged files (this folder):
- terms_version_20261231_v1.sql (apply via MCP apply_migration, name terms_version_20261231_v1; rename to applied id after)
- terms_version_20261231_v1.rollback.sql (restores the exact live bodies; drops accepted_terms_version)
- before-after-checks.sql (read-only md5s + current value + counts), dry-run.sql (begin/test/rollback)
- live-before-*.sql (exact live definitions captured 4:15 PM ET)
Before md5 (live): current_terms_version c5a7810a30ab09223beb2648fda071af,
  record_signup_terms_consent a7ab226f5eb70ca2633c6965c915599e, record_terms_reaccept fc925f42b5592001d8003d1adeb20fa3
Expected after md5: accepted_terms_version bc5a058300ec4029ea02a2496111d0be, current_terms_version 247f8567ba059ceef859fd8774899e3c,
  record_signup_terms_consent 2a9c1ac04978054083bf2a01195adcb6, record_terms_reaccept f45533176090ce0e7bfa832265c8006a
Tests (scratch local Postgres 17, not prod): baseline md5s equal live; dry-run 5/5 true; signup 2026-10-19 ok,
  signup terms-2026-12-31-v1 ok, signup 2026-10-03 rejected, re-accept old and new ok; rollback restores the
  3 live md5s exactly and then rejects terms-2026-12-31-v1 (so roll back the io publish before the SQL).

## Task 2: migration 20261028100000_romood_consent_v3_rombot.sql (NOTHING APPLIED)
Source: /workspace/p1-wt on a4ff43fa (feat/combined-io-fg-20261124), not in romrxbjj-v2. It creates no table,
column, function or grant. Objects:
- drop policy mood_entries_insert_requires_v2_consent: PRESENT-AND-EQUIVALENT (absent live; dropped by 20261124210022).
- policy mood_entries_insert_requires_v3_consent (RESTRICTIVE insert, v3 only): MISSING by design. Live has
  mood_entries_insert_requires_v2_or_v3_consent (RESTRICTIVE insert, consent_version in v2 or v3, opted_in_at not null),
  applied 20261124210022 at 4:00 PM ET, which is a superset. Adding the v3-only policy would AND with it and make
  inserts v3-only, undoing the v2-or-v3 ruling. Not applied.
- Columns used (mood_settings.consent_version, opted_in_at): present (live policy references them).
Result: live already supports v3 check-in saves. Jules's note that v3 ticks fail against a live v2 policy is out of date.
The file must not be applied; treat it as superseded by 20261124210022.
Live migration ids: 20261027151753 romood_insert_requires_v2_consent, 20261124210022 romood_insert_accepts_v2_or_v3_consent.
