-- P1-22 stripe-webhook atomic repeat-checkout skip (UNAPPLIED, build only)
-- Written 2026-11-15, Avery. Numbered after live supabase_migrations max 20261116024102,
-- clear of the P1-07/P1-06 0300xx lane, after P1-22 measurement 20261116040000
-- (20261116040100 is left for a possible P1-27 rebuild).
-- Must be applied BEFORE any stripe-webhook deploy that calls claimCheckoutSession
-- (a missing table only makes the function fail open = v53 behavior, never blocks entitlements).
-- DEPLOY HOLD: stripe-webhook deploy needs Jim's own yes. Does not touch create-checkout-session.
-- No FK on user_id on purpose: 2 auth accounts have no public.users row and a claim must never
-- fail on that (see the P1-22 23503 apply stop).

CREATE TABLE IF NOT EXISTS public.stripe_checkout_claims (
  stripe_checkout_session_id text PRIMARY KEY
    CHECK (length(stripe_checkout_session_id) BETWEEN 3 AND 255),
  purpose     text NOT NULL CHECK (purpose IN ('base', 'sport_unlock')),
  user_id     uuid,
  livemode    boolean,
  claimed_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.stripe_checkout_claims IS
  'P1-22: one row per Stripe checkout session first delivered to stripe-webhook. INSERT ... ON CONFLICT DO NOTHING RETURNING decides first vs repeat delivery, gating only the internal PAID alert and the checkout_completed product event. Service role only.';

ALTER TABLE public.stripe_checkout_claims ENABLE ROW LEVEL SECURITY;
-- No policies: anon and authenticated get nothing; service_role bypasses RLS.
-- Supabase default privileges grant ALL on new public tables to anon, authenticated and service_role;
-- revoke all of it, then give service_role only what the claim needs (ON CONFLICT DO NOTHING needs INSERT only).
REVOKE ALL ON TABLE public.stripe_checkout_claims FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE public.stripe_checkout_claims TO service_role;
