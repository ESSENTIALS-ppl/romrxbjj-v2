-- Migration: Seed v1 paying clients into public.users
-- Jim Scott (jscott@namb.net) + Jennifer Oliver (jolivertree@gmail.com)
-- Auth accounts created via seed-v1-clients edge function
-- Real auth.users.id linked at first magic link sign-in
-- Date: 2026-05-26

-- NOTE: auth.users rows created by seed-v1-clients edge function call.
-- This migration documents the public.users seed state.
-- Actual IDs after auth creation:
--   Jim Scott: f4666e12-ab43-4182-a90e-ffb3c04bde40
--   Jennifer Oliver: 40d8c9de-7bf8-4518-98ca-2bc000c4f2fd

INSERT INTO public.users
  (id, email, full_name, belt, portal_role, subscription_status, subscription_tier,
   stripe_customer_id, subscription_expiry, platforms, created_at, updated_at)
VALUES
  (
    'f4666e12-ab43-4182-a90e-ffb3c04bde40'::uuid,
    'jscott@namb.net',
    'Jim Scott',
    'white', 'athlete', 'active', 'athlete',
    'cus_U1r0Jul8RF0MVw',
    now() + INTERVAL '1 year',
    ARRAY['bjj'],
    '2024-01-01T00:00:00Z', now()
  ),
  (
    '40d8c9de-7bf8-4518-98ca-2bc000c4f2fd'::uuid,
    'jolivertree@gmail.com',
    'Jennifer Oliver',
    'white', 'athlete', 'active', 'athlete',
    'cus_U3gGhZwY3lEjkM',
    now() + INTERVAL '1 year',
    ARRAY['bjj'],
    '2024-01-01T00:00:00Z', now()
  )
ON CONFLICT (email) DO UPDATE SET
  subscription_status  = EXCLUDED.subscription_status,
  subscription_tier    = EXCLUDED.subscription_tier,
  stripe_customer_id   = EXCLUDED.stripe_customer_id,
  subscription_expiry  = EXCLUDED.subscription_expiry,
  updated_at           = now();
