-- PR #6 Migration D-pre: Relax techniques.belt + align BB to 'bodybuilding' slug
-- sport_config slug for bodybuilding is 'bodybuilding' (not 'bb'); align view + workouts default.
-- This migration also recreates unlocked_techniques_v and list_unlocked_techniques to use the correct slug.

-- 1) Relax techniques.belt: NULL allowed (for non-BJJ sports like bodybuilding)
ALTER TABLE public.techniques ALTER COLUMN belt DROP NOT NULL;
ALTER TABLE public.techniques DROP CONSTRAINT IF EXISTS techniques_belt_check;
ALTER TABLE public.techniques ADD CONSTRAINT techniques_belt_check
  CHECK (belt IS NULL OR belt = ANY (ARRAY['white'::text,'blue'::text,'purple'::text,'brown'::text,'black'::text]));

-- 2) Change workouts.sport default to 'bodybuilding'
ALTER TABLE public.workouts ALTER COLUMN sport SET DEFAULT 'bodybuilding';

-- 3) Recreate unlocked_techniques_v with correct BB slug ('bodybuilding')
--    BJJ techniques: always visible (belt gating handled in app layer for now)
--    General techniques: always visible
--    Bodybuilding: gated by users.active_bb_tier via bb_tier_ordinal()
DROP VIEW IF EXISTS public.unlocked_techniques_v CASCADE;
CREATE VIEW public.unlocked_techniques_v AS
SELECT t.*
FROM public.techniques t
LEFT JOIN public.users u ON u.id = auth.uid()
WHERE
  t.sport IN ('bjj','general')
  OR (
    t.sport = 'bodybuilding'
    AND u.active_bb_tier IS NOT NULL
    AND t.tier IS NOT NULL
    AND public.bb_tier_ordinal(t.tier) <= public.bb_tier_ordinal(u.active_bb_tier)
  );

-- 4) Recreate list_unlocked_techniques wrapper
CREATE OR REPLACE FUNCTION public.list_unlocked_techniques(p_sport text DEFAULT NULL)
RETURNS SETOF public.unlocked_techniques_v
LANGUAGE sql STABLE AS $$
  SELECT * FROM public.unlocked_techniques_v
  WHERE p_sport IS NULL OR sport = p_sport;
$$;

GRANT EXECUTE ON FUNCTION public.list_unlocked_techniques(text) TO authenticated, service_role;
