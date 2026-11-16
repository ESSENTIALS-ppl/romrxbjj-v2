# SPEC-FOR-REID.md — P1-22 retention measurement

Avery, Sun Nov 15, 2026, about 8:57 PM ET (America/New_York). Built against Reid's MEASUREMENT-PLAN.md and sql/ drafts. Migration is UNAPPLIED. Nothing deployed, published, sent, or written to live data.

Companion branches (local only, not pushed):
- romrxbjj-v2 `fix/p1-22-retention-measurement-20261115` — this migration, views, exclusion hook, completions RPC/trigger/backfill, scratch harness.
- romrx-io-web `fix/p1-22-protocol-completions-writer-20261115` — Mark Complete writes one `protocol_completions` row per Today-card movement (existing columns, so it can work before the migration).
- romrxbjj-v2 `fix/p1-22-checkout-session-id-stripe-webhook-20261115` — **SEPARATE branch.** Adds `props.stripe_checkout_session_id` and skips a repeat event/alert when that id already exists. **stripe-webhook: deploy needs Jim's own yes.** Does not touch `create-checkout-session`.

## What was built (maps to Reid section 6)

| Reid | What shipped in this package |
|---|---|
| M-0 Internal account list | Empty table `ops.internal_accounts (user_id, note, added_at)`. No emails. Function `ops.is_excluded_from_metrics(user_id)` is true if the user is in that table **or** `public.is_test_account(email)` (existing rule: `jim+romrx-...@romrx.io` AND `raw_app_meta_data.test_fixture = true`). Metric views use funnel `is_test = false` AND this hook. Leave the table empty until Jim names staff accounts (your JIM-ONLY-STEPS.md item 1). |
| M-1 `ops.user_actions` + retention views | `ops.user_actions` is your Section 5 allowlist, including the reserved future event names. Also `ops.value_actions`, `ops.v_real_assessed`, `ops.retention_m1`, `ops.retention_m2`, `ops.retention_m4`, `ops.retention_m5`, and `ops.retention_daily` (union with `metric_id`). Classify by event name, not by `source`. |
| M-2 checkout_completed session id | Unique index on `props->>'stripe_checkout_session_id'` for new rows, plus view `ops.checkout_completed_deduped`. Historic rows have no session id (confirmed tonight: 6 raw, 3 after your user+purpose+ET day rule; prop keys are purpose, pending_sport, amount_total, currency, discount only). Fallback, when no session id is present, is user + purpose + a **2-hour timestamp window** (gaps-and-islands: a new window starts when the gap from the previous row for that user and purpose is greater than 2 hours; the latest row is kept). Purpose is kept so a Base unlock and a sport-pack unlock close together are not collapsed. This replaces your ET calendar-day fallback (see disagreements). The webhook writer is on the **separate** branch above. |
| M-3 protocol_completions | 0 rows live. No writer was in live Base `b52546f`. App branch writes one row per Today-card movement (`exercises[0]`, `stretches[0]`, `foam[0]` when present) with `assessment_id` and `joint`. Migration adds `protocol_session_id`, RPC `record_protocol_completions`, fallback trigger `zz_pc_protocol_session` (writes a session-level row only if none exist for that session), and a backfill of current `protocol_sessions` as session-level rows (exercise_id null) so value_actions start counting as soon as the migration is applied. |
| M-4 to M-10 | Not in this item. M-4 (`reminder_opt_in_set` inside `set_reminder_opt_in`), M-5 to M-9 UI events, and M-10 (local session_date, P1-05) stay with their owners. The allowlist already accepts those event names so they count once Jules ships them. |

## Scratch-DB harness

`harness/README.md`. PGlite (or Postgres) with a stub of the live tables, this migration, and write-path checks you can run without touching production. No live credentials.

## Disagreements / notes vs your plan

1. **Agree** on classifying by the user-event allowlist, not by `product_events.source`. I also added `public.product_event_kind()` (`system` vs `user`) matching your M8 system list. `event_kind = 'user'` is wider than `ops.user_actions` (it includes any event not on the system list). **Use `ops.user_actions` for return metrics**, as you wrote. Do not switch M1 to `event_kind = 'user'`.
2. **Checkout fallback window (change from your plan).** You specified user + purpose + ET calendar day for historic rows. After a later ruling, the fallback when no Stripe session id is present is **user + purpose + a 2-hour timestamp window** (documented on the view). Tonight's 6-raw / 3-deduped counts still hold under both rules for the current rows, but a retry that crosses midnight ET, or two real checkouts on the same ET day, would be treated differently. New rows will also carry `stripe_checkout_session_id` and prefer it. I did not put the webhook change on this branch.
3. **M-3 shape.** You asked for one row per exercise done, with assessment_id and joint. The Today card marks the whole session complete and shows up to three movements. The app writer uses those three (not every exercise in the Full list). Historic backfill cannot recover exercise ids, so those rows are session-level (`exercise_id` null, `joint` = `protocol_day` such as `P1`). Your `value_actions` uses `EXISTS`, so several completion rows on the same day still count as one return. The fallback trigger will not add a fourth row if the app already wrote exercise rows for that session.
4. **P1-05 / M-10.** I did **not** change `session_date` to the local calendar date. The app writer uses the same `toISOString().slice(0, 10)` as the current session upsert so the two stay consistent until Jules's P1-05 fix. Avery already confirmed that bug in P1-05 notes.
5. **`ops.retention_daily`** is a union of M1, M2, M4, M5 payloads, not a per-user daily fact table. Your draft SQL files remain the source of truth for the shapes; the views copy them and add the exclusion hook.
6. **M-4, M-8** (server event on opt-in, email link tagging) are not in this commit. Flag if you want them folded into a follow-up on this branch before the gate.
7. **Staff list.** The hook is `user_id` only. I will not seed it. When Jim names accounts, that is a separate yes, and we should resolve ids without putting emails in the repo or in this spec.
8. Account `7c71e421` was not queried or flagged.

## How to check after apply (still later, gated)

- `select count(*) from protocol_completions;` should equal current `protocol_sessions` after backfill, then rise as people tap Mark Complete (more than one row per session once the app writer is live).
- `select * from ops.checkout_completed_deduped;` should stay at 3 rows until new paid checkouts carry a session id.
- `select * from ops.retention_m1;` should match your tonight baselines once exclusions are the same (funnel `is_test` already covered fixtures; internal_accounts is empty).
