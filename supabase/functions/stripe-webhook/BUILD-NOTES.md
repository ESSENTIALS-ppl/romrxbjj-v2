# stripe-webhook P1-22 atomic claim: BUILD NOTES (build only, 2026-11-15 ET)

These notes supersede 3c22b1a (46ac236e diff).

Hunks, the same in the live-v53 artifact and in this main copy:
1. New helper `claimCheckoutSession(supabase, sessionId, purpose, userId, livemode)`. It returns "first", "repeat" or "unknown".
   - The call is `upsert(row, { onConflict: "stripe_checkout_session_id", ignoreDuplicates: true }).select("stripe_checkout_session_id")`. That sends `POST /rest/v1/stripe_checkout_claims?on_conflict=stripe_checkout_session_id` with `Prefer: resolution=ignore-duplicates, return=representation`, i.e. INSERT ... ON CONFLICT DO NOTHING RETURNING.
   - The result is "first" only when exactly 1 row comes back and its id is this session id, and "repeat" when 0 rows come back with no error. Any error, any throw, or any other row result gives "unknown", which fails open. A missing session id also gives "unknown".
   - The helper sits ABOVE the v40 doc comment. 46ac236e had put it between that comment and eventUserEmail.
2. Base path: the claim comes right before the PAID alert, and the alert keeps its v53 position. The code is `if (alertJim && firstDelivery)`.
3. Base path: `if (firstDelivery) logEvent("checkout_completed", ...)`, with the props adding stripe_checkout_session_id.
4. Sport path: the same as 2 and 3, and the order is unchanged.

The old read-then-skip `checkoutSessionAlreadyLogged` (a product_events select) is not used. It was racy, and it never matched sessions processed before the deploy.

Migration 20261116040200_p1_22_stripe_checkout_claims.sql:
- The table has PK stripe_checkout_session_id and a purpose CHECK, and no FK on user_id.
- RLS is on with no policies.
- Grants: ALL is revoked from anon, authenticated and service_role, then service_role is granted SELECT and INSERT.
