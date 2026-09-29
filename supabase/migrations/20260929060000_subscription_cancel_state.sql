-- Canceled-but-not-ended state for Base and sport-pack subscriptions (Legal update 2026-09-29, item 4).
-- Written by stripe-webhook v40 on customer.subscription.updated / deleted. Read by create-portal-session v13
-- (action cancel_status) so Settings never shows "active" for a subscription that will not renew.
-- NOT YET APPLIED: apply before deploying stripe-webhook v40 / create-portal-session v13.
-- Additive, nullable/defaulted columns only. No RLS change (both tables keep their existing policies).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS base_cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS base_cancel_at timestamptz,
  ADD COLUMN IF NOT EXISTS base_canceled_at timestamptz;

COMMENT ON COLUMN public.users.base_cancel_at_period_end IS 'Stripe Base subscription cancel_at_period_end (stripe-webhook v40).';
COMMENT ON COLUMN public.users.base_cancel_at IS 'When the Base subscription stops: Stripe cancel_at, else current_period_end if canceling at period end, else ended_at once deleted.';
COMMENT ON COLUMN public.users.base_canceled_at IS 'Stripe canceled_at for the Base subscription (when the customer canceled).';

ALTER TABLE public.sport_entitlements
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancel_at timestamptz,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz;

COMMENT ON COLUMN public.sport_entitlements.cancel_at_period_end IS 'Stripe cancel_at_period_end for the subscription that grants this pack (stripe-webhook v40).';
COMMENT ON COLUMN public.sport_entitlements.cancel_at IS 'When the pack subscription stops (cancel_at / current_period_end / ended_at).';
COMMENT ON COLUMN public.sport_entitlements.canceled_at IS 'Stripe canceled_at for the pack subscription.';
