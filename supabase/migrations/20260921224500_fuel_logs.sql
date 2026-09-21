-- Per-user nutrition + hydration capture (Jim must-track). Base only.
CREATE TABLE IF NOT EXISTS public.fuel_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_on date NOT NULL DEFAULT ((timezone('utc', now()))::date),
  kind text NOT NULL CHECK (kind IN ('nutrition', 'hydration')),
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  outputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.fuel_logs IS
  'Per-user My Fuel captures. kind=nutrition|hydration. inputs/outputs JSON from calculators. Must-track for Base.';

CREATE INDEX IF NOT EXISTS fuel_logs_user_logged_idx
  ON public.fuel_logs (user_id, logged_on DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS fuel_logs_user_kind_idx
  ON public.fuel_logs (user_id, kind, created_at DESC);

ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fuel_logs_own ON public.fuel_logs;
CREATE POLICY fuel_logs_own ON public.fuel_logs
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fuel_logs TO authenticated;
GRANT ALL ON public.fuel_logs TO service_role;
