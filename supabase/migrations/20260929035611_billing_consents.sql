-- billing_consents: verification of affirmative consent to auto-renewal terms
-- (Legal plan ca-arl-plan-20260929 section 4C; Cal. Bus. & Prof. Code 17602(a)(6)).
-- One row per Stripe Checkout Session, written ONLY by stripe-webhook (service role) on
-- checkout.session.completed. Owners can read their own rows. No IP address is stored.
-- Applied live 2026-09-28 11:56 PM ET (version 20260929035611) via Supabase MCP apply_migration.
-- No INSERT/UPDATE/DELETE policies: only the service role (which bypasses RLS) can write.
-- Retention: keep each row at least 3 years after consented_at, or 1 year after the contract ends
-- (contract_ended_at), whichever is later. No purge job exists; do not delete rows before retain_until().

CREATE TABLE IF NOT EXISTS public.billing_consents (
  id                               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                          uuid NOT NULL,
  stripe_checkout_session_id       text NOT NULL UNIQUE,
  stripe_subscription_id           text,
  stripe_customer_id               text,
  offer                            text NOT NULL CHECK (offer IN ('base', 'sport', 'combo', 'reconfirm')),
  price_ids                        text[] NOT NULL DEFAULT '{}',
  amounts                          integer[] NOT NULL DEFAULT '{}',
  currency                         text NOT NULL DEFAULT 'usd',
  interval                         text NOT NULL DEFAULT 'year',
  trial_end                        timestamptz,
  disclosure_text_version          text NOT NULL,
  disclosure_text                  text,
  consent_text                     text,
  consent_method                   text NOT NULL CHECK (consent_method IN ('stripe_terms_of_service', 'in_app_checkbox', 'reconfirm', 'none')),
  stripe_consent_terms_of_service  text,
  consented_at                     timestamptz,
  checkout_created_at              timestamptz,
  user_agent                       text,
  region_state                     text,
  livemode                         boolean NOT NULL DEFAULT true,
  contract_ended_at                timestamptz,
  created_at                       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.billing_consents IS
  'Auto-renewal consent records (CA ARL 17602(a)(6)). Service-role writes only (stripe-webhook). Owner read via RLS. '
  'Retain at least 3 years from consented_at or 1 year after contract_ended_at, whichever is later. No IP stored.';
COMMENT ON COLUMN public.billing_consents.user_id IS 'public.users.id; no FK so account deletion never cascades away a consent record.';
COMMENT ON COLUMN public.billing_consents.disclosure_text IS 'Exact custom_text.submit message shown on Stripe Checkout (from the Session).';
COMMENT ON COLUMN public.billing_consents.consent_text IS 'Exact custom_text.terms_of_service_acceptance message next to the required checkbox.';
COMMENT ON COLUMN public.billing_consents.stripe_consent_terms_of_service IS 'Session.consent.terms_of_service from Stripe (accepted when the box was checked).';

CREATE INDEX IF NOT EXISTS billing_consents_user_id_idx ON public.billing_consents (user_id);
CREATE INDEX IF NOT EXISTS billing_consents_subscription_idx ON public.billing_consents (stripe_subscription_id);

CREATE OR REPLACE FUNCTION public.billing_consent_retain_until(c public.billing_consents)
RETURNS timestamptz
LANGUAGE sql STABLE
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT GREATEST(
    COALESCE(c.consented_at, c.created_at) + interval '3 years',
    COALESCE(c.contract_ended_at + interval '1 year', '-infinity'::timestamptz)
  );
$$;

ALTER TABLE public.billing_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_consents FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.billing_consents FROM anon, authenticated;
GRANT SELECT ON public.billing_consents TO authenticated;
GRANT ALL ON public.billing_consents TO service_role;

DROP POLICY IF EXISTS billing_consents_owner_read ON public.billing_consents;
CREATE POLICY billing_consents_owner_read ON public.billing_consents
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON FUNCTION public.billing_consent_retain_until(public.billing_consents) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.billing_consent_retain_until(public.billing_consents) TO service_role;
