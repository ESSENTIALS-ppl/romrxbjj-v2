-- Migration: Extend schools table with school-tier billing columns
-- Wire athletes.gym_id -> schools FK
-- Date: 2026-05-26

ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS student_cap INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS payment_platform TEXT,
  ADD COLUMN IF NOT EXISTS payment_platform_url TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.schools ADD CONSTRAINT schools_tier_check
  CHECK (tier IN ('starter','pro','elite','enterprise'));

CREATE OR REPLACE FUNCTION public.set_schools_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER schools_updated_at
  BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.set_schools_updated_at();

ALTER TABLE public.athletes
  ADD CONSTRAINT athletes_gym_id_fkey
  FOREIGN KEY (gym_id) REFERENCES public.schools(id) ON DELETE SET NULL
  NOT VALID;

ALTER TABLE public.athletes VALIDATE CONSTRAINT athletes_gym_id_fkey;

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schools_admin_all" ON public.schools
  FOR ALL USING (admin_id = auth.uid());

CREATE POLICY "schools_authenticated_read" ON public.schools
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "schools_service_role" ON public.schools
  FOR ALL TO service_role USING (true);
