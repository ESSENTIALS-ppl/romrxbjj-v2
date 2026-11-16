# P1-22 BUILD-NOTES — retention measurement

STARTED: Sun Nov 15, 2026, 8:52 PM ET (America/New_York). Built on branches only. Nothing applied or deployed.

## Branches (local, not pushed)

- romrxbjj-v2 `fix/p1-22-retention-measurement-20261115` — UNAPPLIED migration `20261116040000_p1_22_retention_measurement.sql`, views, unique index, exclusion hook, `record_protocol_completions` RPC + trigger + backfill, SPEC-FOR-REID, PGlite harness.
- romrxbjj-v2 `fix/p1-22-checkout-session-id-stripe-webhook-20261115` — **separate branch**. `stripe-webhook: deploy needs Jim's own yes`. Does not touch `create-checkout-session`.
- romrx-io-web `fix/p1-22-protocol-completions-writer-20261115` — Today-card writer in `MyProtocol.tsx` (existing columns only).

## Hunks

### Measurement migration (UNAPPLIED)
- `ops.internal_accounts` (empty; user_id only — staff list hook for Jim) + `ops.is_excluded_from_metrics(user_id)` = live `public.is_test_account(email)` OR that table.
- `public.product_event_kind()`, views `ops.user_actions`, `ops.value_actions`, `ops.v_real_assessed`, `ops.retention_m1/m2/m4/m5`, `ops.retention_daily`.
- Unique index `product_events_checkout_session_id_uidx` on `props->>'stripe_checkout_session_id'` where event = checkout_completed and that key is present.
- View `ops.checkout_completed_deduped`: prefer `props.stripe_checkout_session_id`; else gaps-and-islands on `user_id + purpose + 2-hour window` (new group when gap > 2 hours; keep latest). Purpose is kept so a Base checkout and a sport unlock close together are not collapsed. This **disagrees** with Reid's user+purpose+ET-day fallback; documented in SPEC-FOR-REID.md.
- Window rationale: Stripe retries usually arrive minutes to a couple of hours apart; a calendar-day rule can split a late-ET retry or merge two real checkouts on the same date.
- `protocol_completions.protocol_session_id`; unique partial indexes; `record_protocol_completions` (SECURITY INVOKER, existence checks — cannot ON CONFLICT a partial unique index); trigger `zz_pc_protocol_session` writes a fallback row only if that session has no completions yet; backfill of existing `protocol_sessions`.

### App writer
- `TodayCard` takes `assessmentId`. After a successful `protocol_sessions` upsert, best-effort insert of one `protocol_completions` row per Today-card movement (exercises[0], stretches[0], foam[0]). Failures log and do not undo the session. `session_date` still uses UTC `toISOString().slice(0, 10)` (P1-05 / M-10 is Jules).

### stripe-webhook (separate branch + live-v53 artifact)
- Both `checkout_completed` logEvents add `stripe_checkout_session_id` (`obj.id` when it is a string, else null).
- After entitlement upserts (which always run), skip the Jim PAID alert and the event when that session id was already logged. Helper takes `supabase` as an argument (client is handler-scoped).
- Intended deploy baseline is live v53, not origin/main. See `P1-22-webhook/DEPLOY-HOLD.md` and `live-v53.patch`.

## Harness
`P1-22/harness/` (also `docs/p1-22/harness/` on the v2 branch). Live schema stub + this migration, PGlite, synthetic fixtures only (`jim+romrx-harness@romrx.io` and random UUIDs). Never account `7c71e421`.

## Not in this item
M-4..M-10 except the completions writer; P1-05 date logic; applying the migration; deploying the webhook; filling `ops.internal_accounts`.

## Harness result
All checks passed, 9:06 PM ET Nov 15, 2026. See harness/RESULTS.md. Nested window functions in the first checkout-view draft were rewritten as two CTEs (required by Postgres).
