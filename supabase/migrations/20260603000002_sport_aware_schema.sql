-- =====================================================================
-- PR #2: Sport-Aware Schema
-- =====================================================================
-- Adds the multi-tenant foundation:
--   * Creates sport_config table with 3 seeded sports (bjj, bodybuilding,
--     general)
--   * Adds `sport text` column to every sport-scoped data table
--   * Backfills all existing rows with sport='bjj' (your live data is
--     100% BJJ today)
--   * Adds users.active_sport (single active context) and users.sports_enabled
--     (entitled sports, kept in lockstep with platforms[] for now)
--   * Adds exercises.sports text[] for multi-sport tagging (default
--     {bjj,general} so existing exercises stay visible)
--   * Adds coaches.sports text[] for coaches who teach multiple sports
--   * Indexes on sport columns for query perf
--   * RLS on sport_config (read all, write service-only)
--
-- Risk: Medium. All changes are additive with safe defaults — existing
-- queries continue to work because columns default to 'bjj'.
--
-- Acceptance:
--   SELECT count(*) FROM sport_config                          -> 3
--   SELECT DISTINCT sport FROM techniques                      -> {bjj}
--   SELECT DISTINCT sport FROM rom_thresholds                  -> {bjj}
--   SELECT DISTINCT sport FROM technique_eligibility           -> {bjj}
--   SELECT DISTINCT sport FROM assessments                     -> {bjj}
--   SELECT DISTINCT sport FROM game_plans                      -> {bjj}
--   SELECT DISTINCT sport FROM drill_sessions                  -> {bjj}
--   SELECT DISTINCT sport FROM protocol_sessions               -> {bjj}
--   SELECT DISTINCT sport FROM coach_teaching_log              -> {bjj}
--   SELECT count(*) FROM users WHERE active_sport = 'bjj'      -> 9
--   SELECT count(*) FROM users WHERE sports_enabled = '{bjj}'  -> 9
--
-- This migration is idempotent: every DDL uses IF NOT EXISTS or
-- DROP/CREATE patterns where safe.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. sport_config — the source of truth for product-level sport metadata
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sport_config (
  slug              text PRIMARY KEY,
  display_name      text NOT NULL,
  short_name        text NOT NULL,
  rank_field        text,                            -- 'belt' | 'experience_level' | NULL
  rank_values       text[] NOT NULL DEFAULT ARRAY[]::text[],
  rank_labels       jsonb NOT NULL DEFAULT '{}'::jsonb,
  body_label        text NOT NULL DEFAULT 'My Body',
  game_label        text,                            -- 'My Game' | 'My Lifts' | NULL (hide page)
  protocol_label    text NOT NULL DEFAULT 'My Protocol',
  has_techniques    boolean NOT NULL DEFAULT true,
  has_schools       boolean NOT NULL DEFAULT false,
  has_coach_portal  boolean NOT NULL DEFAULT true,
  theme_accent      text NOT NULL DEFAULT 'teal',    -- tailwind color slug
  is_active         boolean NOT NULL DEFAULT true,
  sort_order        smallint NOT NULL DEFAULT 100,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sport_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sport_config_read_all          ON public.sport_config;
DROP POLICY IF EXISTS sport_config_write_service_only ON public.sport_config;

CREATE POLICY sport_config_read_all
  ON public.sport_config FOR SELECT
  USING (true);

CREATE POLICY sport_config_write_service_only
  ON public.sport_config FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Keep updated_at fresh
DROP TRIGGER IF EXISTS sport_config_set_updated_at ON public.sport_config;
CREATE TRIGGER sport_config_set_updated_at
  BEFORE UPDATE ON public.sport_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed the three sports (idempotent via ON CONFLICT)
INSERT INTO public.sport_config
  (slug, display_name, short_name, rank_field, rank_values, rank_labels,
   body_label, game_label, protocol_label,
   has_techniques, has_schools, has_coach_portal, theme_accent, sort_order)
VALUES
  ('bjj',          'Brazilian Jiu-Jitsu', 'BJJ',
   'belt',
   ARRAY['white','blue','purple','brown','black'],
   '{"white":"White Belt","blue":"Blue Belt","purple":"Purple Belt","brown":"Brown Belt","black":"Black Belt"}'::jsonb,
   'My Body', 'My Game', 'My Protocol',
   true, true, true, 'teal', 10),

  ('bodybuilding', 'Bodybuilding', 'BB',
   'experience_level',
   ARRAY['novice','intermediate','advanced','elite'],
   '{"novice":"Novice","intermediate":"Intermediate","advanced":"Advanced","elite":"Elite"}'::jsonb,
   'My Body', 'My Lifts', 'My Protocol',
   true, false, true, 'crimson', 20),

  ('general',      'ROMRx General', 'GEN',
   NULL,
   ARRAY[]::text[],
   '{}'::jsonb,
   'My Body', NULL, 'My Protocol',
   false, false, false, 'slate', 30)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. Add `sport` column to every sport-scoped data table
--    techniques + rombot_knowledge already have it (legacy default 'bjj')
-- ---------------------------------------------------------------------

-- rom_thresholds
ALTER TABLE public.rom_thresholds
  ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'bjj'
    REFERENCES public.sport_config(slug);

-- technique_eligibility
ALTER TABLE public.technique_eligibility
  ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'bjj'
    REFERENCES public.sport_config(slug);

-- assessments
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'bjj'
    REFERENCES public.sport_config(slug);

-- game_plans
ALTER TABLE public.game_plans
  ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'bjj'
    REFERENCES public.sport_config(slug);

-- drill_sessions
ALTER TABLE public.drill_sessions
  ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'bjj'
    REFERENCES public.sport_config(slug);

-- protocol_sessions
ALTER TABLE public.protocol_sessions
  ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'bjj'
    REFERENCES public.sport_config(slug);

-- coach_teaching_log
ALTER TABLE public.coach_teaching_log
  ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'bjj'
    REFERENCES public.sport_config(slug);

-- techniques: already has sport; add the FK if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='techniques'
      AND constraint_name='techniques_sport_fkey'
  ) THEN
    ALTER TABLE public.techniques
      ADD CONSTRAINT techniques_sport_fkey
      FOREIGN KEY (sport) REFERENCES public.sport_config(slug);
  END IF;
END $$;

-- rombot_knowledge: already has sport; add the FK if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='rombot_knowledge'
      AND constraint_name='rombot_knowledge_sport_fkey'
  ) THEN
    ALTER TABLE public.rombot_knowledge
      ADD CONSTRAINT rombot_knowledge_sport_fkey
      FOREIGN KEY (sport) REFERENCES public.sport_config(slug);
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 3. exercises.sports text[] — exercises can apply to multiple sports
--    Default {bjj,general}: every existing mobility exercise is useful
--    to both BJJ athletes and ROMRx general users.
-- ---------------------------------------------------------------------
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS sports text[] NOT NULL DEFAULT ARRAY['bjj','general']::text[];

-- Backfill safety: ensure no NULLs slipped in (defaults handle new rows;
-- this re-asserts for any rows that pre-dated the default).
UPDATE public.exercises
  SET sports = ARRAY['bjj','general']::text[]
WHERE sports IS NULL OR cardinality(sports) = 0;

CREATE INDEX IF NOT EXISTS exercises_sports_gin_idx
  ON public.exercises USING GIN (sports);

-- ---------------------------------------------------------------------
-- 4. coaches.sports text[] — which sports a coach is credentialed in
-- ---------------------------------------------------------------------
ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS sports text[] NOT NULL DEFAULT ARRAY['bjj']::text[];

CREATE INDEX IF NOT EXISTS coaches_sports_gin_idx
  ON public.coaches USING GIN (sports);

-- ---------------------------------------------------------------------
-- 5. users: active_sport (the sport currently being viewed) and
--    sports_enabled (the entitled sport packs, mirroring platforms[])
--
--    NOTE: `platforms` already exists. We keep it as the canonical
--    Stripe-entitlement column. `sports_enabled` is a clearer alias
--    that PR #3+ frontend will read. They're kept in lockstep via a
--    trigger so a future PR can drop one without surprises.
-- ---------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS active_sport text NOT NULL DEFAULT 'bjj'
    REFERENCES public.sport_config(slug);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS sports_enabled text[] NOT NULL DEFAULT ARRAY['bjj']::text[];

-- Backfill sports_enabled from existing platforms[]
UPDATE public.users
  SET sports_enabled = platforms
WHERE sports_enabled IS DISTINCT FROM platforms;

-- Sync trigger: keep sports_enabled and platforms aligned in both directions
CREATE OR REPLACE FUNCTION public.sync_user_sports()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- If the writer updated platforms, mirror into sports_enabled
  IF TG_OP = 'UPDATE' AND NEW.platforms IS DISTINCT FROM OLD.platforms
     AND NEW.sports_enabled IS NOT DISTINCT FROM OLD.sports_enabled THEN
    NEW.sports_enabled := NEW.platforms;
  END IF;
  -- If the writer updated sports_enabled, mirror into platforms
  IF TG_OP = 'UPDATE' AND NEW.sports_enabled IS DISTINCT FROM OLD.sports_enabled
     AND NEW.platforms IS NOT DISTINCT FROM OLD.platforms THEN
    NEW.platforms := NEW.sports_enabled;
  END IF;
  -- On insert, prefer platforms if both differ from default
  IF TG_OP = 'INSERT' THEN
    IF NEW.platforms IS NOT NULL AND cardinality(NEW.platforms) > 0
       AND NEW.sports_enabled IS NULL THEN
      NEW.sports_enabled := NEW.platforms;
    ELSIF NEW.sports_enabled IS NOT NULL AND cardinality(NEW.sports_enabled) > 0
          AND (NEW.platforms IS NULL OR cardinality(NEW.platforms) = 0) THEN
      NEW.platforms := NEW.sports_enabled;
    END IF;
  END IF;

  -- Safety net: active_sport must be in sports_enabled. If not, snap to first.
  IF NEW.sports_enabled IS NOT NULL AND cardinality(NEW.sports_enabled) > 0
     AND NOT (NEW.active_sport = ANY (NEW.sports_enabled))
     AND NEW.active_sport <> 'general' THEN
    NEW.active_sport := NEW.sports_enabled[1];
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_sync_sports ON public.users;
CREATE TRIGGER users_sync_sports
  BEFORE INSERT OR UPDATE OF platforms, sports_enabled, active_sport
  ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_sports();

-- Lock down: this is an internal trigger function only
REVOKE EXECUTE ON FUNCTION public.sync_user_sports() FROM anon, authenticated, public;

-- ---------------------------------------------------------------------
-- 6. Indexes for fast sport-filtered reads
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS rom_thresholds_sport_idx        ON public.rom_thresholds        (sport);
CREATE INDEX IF NOT EXISTS technique_eligibility_sport_idx ON public.technique_eligibility (sport);
CREATE INDEX IF NOT EXISTS assessments_sport_idx           ON public.assessments           (sport);
CREATE INDEX IF NOT EXISTS game_plans_sport_idx            ON public.game_plans            (sport);
CREATE INDEX IF NOT EXISTS drill_sessions_sport_idx        ON public.drill_sessions        (sport);
CREATE INDEX IF NOT EXISTS protocol_sessions_sport_idx     ON public.protocol_sessions     (sport);
CREATE INDEX IF NOT EXISTS coach_teaching_log_sport_idx    ON public.coach_teaching_log    (sport);
CREATE INDEX IF NOT EXISTS techniques_sport_idx            ON public.techniques            (sport);
CREATE INDEX IF NOT EXISTS rombot_knowledge_sport_idx      ON public.rombot_knowledge      (sport);
CREATE INDEX IF NOT EXISTS users_active_sport_idx          ON public.users                 (active_sport);
CREATE INDEX IF NOT EXISTS users_sports_enabled_gin_idx    ON public.users   USING GIN     (sports_enabled);

-- ---------------------------------------------------------------------
-- 7. Compatibility check — every existing row has a valid sport
-- ---------------------------------------------------------------------
DO $$
DECLARE
  bad_rows int;
BEGIN
  SELECT COUNT(*) INTO bad_rows FROM public.techniques            WHERE sport IS NULL;
  IF bad_rows > 0 THEN RAISE EXCEPTION 'techniques has % NULL sport rows', bad_rows; END IF;

  SELECT COUNT(*) INTO bad_rows FROM public.rom_thresholds        WHERE sport IS NULL;
  IF bad_rows > 0 THEN RAISE EXCEPTION 'rom_thresholds has % NULL sport rows', bad_rows; END IF;

  SELECT COUNT(*) INTO bad_rows FROM public.technique_eligibility WHERE sport IS NULL;
  IF bad_rows > 0 THEN RAISE EXCEPTION 'technique_eligibility has % NULL sport rows', bad_rows; END IF;

  SELECT COUNT(*) INTO bad_rows FROM public.assessments           WHERE sport IS NULL;
  IF bad_rows > 0 THEN RAISE EXCEPTION 'assessments has % NULL sport rows', bad_rows; END IF;

  SELECT COUNT(*) INTO bad_rows FROM public.users                 WHERE active_sport IS NULL;
  IF bad_rows > 0 THEN RAISE EXCEPTION 'users has % NULL active_sport rows', bad_rows; END IF;
END $$;

COMMIT;

-- =====================================================================
-- End of PR #2 migration.
-- After this runs, the database is multi-tenant ready. No frontend or
-- edge function changes yet — those come in PR #3, #4, #5.
-- =====================================================================
