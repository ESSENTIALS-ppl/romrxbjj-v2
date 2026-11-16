# stripe-webhook: deploy needs Jim's own yes

This is a P1-22 companion branch (fix/p1-22-stripe-webhook-atomic-claim-20261115). It supersedes the read-then-skip version 46ac236e / 3c22b1a.

**Do not deploy `stripe-webhook` from this branch, or from any branch, without Jim's own yes.** This does not touch `create-checkout-session`.

- **Baseline is live v53, not this file.** The deploy baseline is live stripe-webhook v53 (ezbr `3259156f98f2949dd9a2e05c380cc44928204976cb178f219214540d41f7780c`). origin/main is behind live. The intended deploy artifact is `live-v53-plus-atomic-claim/index.ts` in batch P1-22-webhook/atomic-claim-20261115/. This file carries the same hunks against the stale main copy so they can be reviewed.
- **Apply order.** First migration `20261116040200_p1_22_stripe_checkout_claims.sql` (gated). Then, only after Jim's yes, the function.
- **Repeat-checkout skip.** The skip is atomic: `claimCheckoutSession` does `INSERT ... ON CONFLICT (stripe_checkout_session_id) DO NOTHING RETURNING`, using the PK on public.stripe_checkout_claims, and checks the returned row.
  - The Jim PAID alert and the `checkout_completed` event are sent only on the first delivery.
  - Entitlement writes always run.
  - If the claim errors or the table is missing, the function fails open, which is v53 behavior.
- **Alert order.** The PAID alert keeps its v53 position (Base: before the pending-sport entitlement step). 46ac236e had moved it after that step as a side effect of grouping it with the event; that move is reverted here.
