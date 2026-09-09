# Sprint 8 — rate-limit scaffold (2026-09-08)

**Scope:** Scaffold only for ~300 beta readiness. Limits are **TBD / tunable**.

**Helper:** `rate_limit.ts` — in-memory fixed-window counters keyed by edge + user id (fallback IP).

**Wired on this branch (early 429):**
- `ai-chat` (primary Sprint 8 cost gate; hourly + soft monthly check)
- `submit-assessment`
- `create-checkout-session` (rate-limit only — no Stripe entitlement changes)
- `notify-coach-signup` (public signup email spam)

**Not in this repo on `main` (TODO when sources land / deploy sync):**
- `submit-lead-assessment` (public lead path — high risk)
- Auth: `set-password`, `admin-reset-password`, `seed-v1-clients`
- Other public APIs: `submit-feedback`, `submit-consent`, etc.

**Follow-ups (not this PR):**
1. Persist buckets in Supabase table for multi-isolate consistency
2. Tune limits after Free vs Pro memo
3. Enforce true 1000 msg/month against `ai_messages` counts (not just in-memory)
4. Wire remaining deployed edges
5. Do **not** conflate with Stripe entitlement cleanup or Ohio legal work

**Bypass:** `RATE_LIMIT_DISABLED=true` for local/dev.
