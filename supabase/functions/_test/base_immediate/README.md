# BASE-IMMEDIATE-CHARGE-20261124 tests (not deployed)

Test-only folder. No edge function imports anything here.

- `pin_643e27f0/` is create-checkout-session at fix/packs-closed-message-spring-2027-20261124 tip 643e27f0
  (pinned pack fix 22c490f8 + packs_gate.ts:9 message, on live v50 ezbr 2b7dd0ce). the LIVE stripe-webhook v59 (ezbr 3c60342d) index.ts is read with `git cat-file blob
  9626eee2` (git blob id, from baseline commit da087bb); its _shared files are in `live_v59/_shared/`. unit.test.ts checks their sha256. They are the "before" side
  of the byte-identical behavior tests.
- Jim's cutover options A and C (Grant 2:31 PM ET; B dropped) are tested by rewriting the ONE line `export const BASE_PAID_CUTOVER_UNIX = ...;`
  in a throwaway copy (harness.ts OPTIONS).
- `mocks/` stand in for Supabase, Stripe, Resend (fetch), events and rate limiting. Nothing touches a network.

Run (from supabase/functions):

    deno test --no-check --allow-read --allow-write=/tmp --allow-env --allow-run=git \
      --import-map=_test/base_immediate/import_map.json _test/base_immediate/

`--no-check`: the live sources already carry 44 supabase-js generic type errors (same set before and after this
change; see the packet build note), so type checking is run separately.
