-- PR #6 Migration B: Bodybuilding tier gating
-- Adds tier column to techniques + active_bb_tier to users
-- Mirrors BJJ belt gating: BB exercises unlock based on training age tier
--
-- Tier ordinal: beginner=1, intermediate=2, advanced=3
-- An exercise tagged tier='intermediate' is visible to int + adv users
-- An exercise tagged tier='advanced' is visible only to adv users

-- 1. Add tier column to techniques (BJJ rows stay NULL — gated by belt instead)
ALTER TABLE public.techniques
  ADD COLUMN IF NOT EXISTS tier text NULL
    CHECK (tier IS NULL OR tier IN ('beginner','intermediate','advanced'));

COMMENT ON COLUMN public.techniques.tier IS
  'Training-age tier gate for sport=bb exercises. NULL for BJJ (gated by belt instead).';

CREATE INDEX IF NOT EXISTS idx_techniques_sport_tier
  ON public.techniques(sport, tier) WHERE tier IS NOT NULL;

-- 2. Add active_bb_tier to users (mirrors users.belt for BJJ)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS active_bb_tier text NULL
    CHECK (active_bb_tier IS NULL OR active_bb_tier IN ('beginner','intermediate','advanced'));

COMMENT ON COLUMN public.users.active_bb_tier IS
  'User-selected bodybuilding training age tier. NULL until user sets it in settings.';

-- 3. Helper: ordinal converter (allows tier <= user_tier comparison)
CREATE OR REPLACE FUNCTION public.bb_tier_ordinal(p_tier text)
RETURNS smallint
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE p_tier
    WHEN 'beginner'     THEN 1
    WHEN 'intermediate' THEN 2
    WHEN 'advanced'     THEN 3
    ELSE NULL
  END::smallint;
$$;

COMMENT ON FUNCTION public.bb_tier_ordinal IS
  'Maps BB tier text to ordinal (1/2/3) for <= comparisons. NULL passes through.';

-- 4. Helper view: techniques unlocked for current user
-- For sport='bb', filters by tier <= user.active_bb_tier
-- For sport='bjj', returns all (gating happens via belt elsewhere)
-- For sport='general', returns all
CREATE OR REPLACE VIEW public.unlocked_techniques_v AS
SELECT t.*
FROM public.techniques t
LEFT JOIN public.users u ON u.id = auth.uid()
WHERE
  -- BJJ + general: no tier gate at this layer
  t.sport IN ('bjj','general')
  OR
  -- BB: must have user with active_bb_tier set, and exercise tier must be <= user tier
  (
    t.sport = 'bb'
    AND u.active_bb_tier IS NOT NULL
    AND t.tier IS NOT NULL
    AND public.bb_tier_ordinal(t.tier) <= public.bb_tier_ordinal(u.active_bb_tier)
  );

COMMENT ON VIEW public.unlocked_techniques_v IS
  'Per-user filtered view of techniques. BB exercises gated by users.active_bb_tier; BJJ/general unrestricted at this layer.';

-- 5. Helper function: callable from edge fns / client for tier-aware exercise lookup
CREATE OR REPLACE FUNCTION public.list_unlocked_techniques(p_sport text DEFAULT NULL)
RETURNS SETOF public.techniques
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT *
  FROM public.unlocked_techniques_v
  WHERE (p_sport IS NULL OR sport = p_sport);
$$;

COMMENT ON FUNCTION public.list_unlocked_techniques IS
  'Returns techniques unlocked for the authenticated user, optionally filtered by sport.';

GRANT SELECT ON public.unlocked_techniques_v TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.bb_tier_ordinal(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.list_unlocked_techniques(text) TO authenticated, anon;
