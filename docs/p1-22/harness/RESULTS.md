# P1-22 harness results

Ran: Sun Nov 15, 2026, 9:06 PM ET (America/New_York).
Command: `node test.mjs` in `P1-22/harness` with `@electric-sql/pglite` 0.5.16 (pgcrypto contrib) and synthetic fixtures only.

All checks passed:
- fixture email+flag is_test_account / non-fixture is not
- fixture excluded via is_test_account; real user not excluded
- internal_accounts hook excludes staff user_id
- v_real_assessed keeps only the real user
- user_actions allowlist excludes system events
- product_event_kind split
- unique index rejects a second row with the same stripe session id
- two base windows more than 2 hours apart stay distinct
- sport_unlock in the same hour is not collapsed into base
- session-id row appears once in the deduped view
- fallback trigger writes one session-level completion
- RPC writes one row per exercise id; no extra fallback row after exercise-level writes

Checkout view fix found by this run: an earlier draft nested `SUM() OVER` around `lag()`; Postgres rejects nested window functions. The migration now flags a new window in one CTE and sums it in the next.
