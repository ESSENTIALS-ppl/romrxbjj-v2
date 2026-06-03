-- PR #6 Migration C: Bodybuilding workouts (BB analogue to BJJ game_plans/flows)
-- Users build their own workouts from unlocked exercises in the techniques library
-- Templates (is_template=true, user_id NULL) serve as starting points pulled from
-- the Beginner/Intermediate/Advanced program docs.

-- 1. workouts: a saved exercise sequence (user-owned OR system template)
CREATE TABLE IF NOT EXISTS public.workouts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sport             text NOT NULL DEFAULT 'bb',
  tier              text NULL CHECK (tier IS NULL OR tier IN ('beginner','intermediate','advanced')),
  name              text NOT NULL,
  description       text NULL,
  day_label         text NULL,                    -- e.g. "Day A - Full Body A", "Push", "Lower 1"
  split_type        text NULL,                    -- e.g. "Full Body", "Upper/Lower", "PPL"
  is_template       boolean NOT NULL DEFAULT false,
  source_program    text NULL,                    -- 'beginner_doc' | 'intermediate_doc' | 'advanced_doc' | NULL
  notes             text NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT workouts_template_or_user CHECK (
    (is_template = true  AND user_id IS NULL) OR
    (is_template = false AND user_id IS NOT NULL)
  )
);

COMMENT ON TABLE public.workouts IS 'Bodybuilding workout sequences. Templates (is_template=true, user_id NULL) are seeded from program docs; user workouts are cloned/built from those.';

CREATE INDEX IF NOT EXISTS idx_workouts_user ON public.workouts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workouts_template ON public.workouts(is_template, sport, tier) WHERE is_template = true;

-- 2. workout_exercises: ordered exercises within a workout
CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id      uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  technique_id    uuid NULL REFERENCES public.techniques(id) ON DELETE SET NULL,
  exercise_name   text NOT NULL,                  -- denormalized (allows template variants like "Bench Press or DB Press")
  position        smallint NOT NULL,
  sets            smallint NULL,
  reps_min        smallint NULL,
  reps_max        smallint NULL,
  rest_seconds_min smallint NULL,
  rest_seconds_max smallint NULL,
  target_notes    text NULL,                      -- "Quadriceps, glutes, hamstrings"
  alternative_of  uuid NULL REFERENCES public.workout_exercises(id) ON DELETE SET NULL,  -- for "or" alternatives
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT workout_ex_unique_position UNIQUE (workout_id, position)
);

COMMENT ON TABLE public.workout_exercises IS 'Ordered exercises within a workout. exercise_name is denormalized to allow template phrasing like "Bench Press or DB Press".';

CREATE INDEX IF NOT EXISTS idx_wex_workout ON public.workout_exercises(workout_id, position);
CREATE INDEX IF NOT EXISTS idx_wex_technique ON public.workout_exercises(technique_id) WHERE technique_id IS NOT NULL;

-- 3. updated_at trigger for workouts
CREATE OR REPLACE FUNCTION public.set_workouts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workouts_updated_at ON public.workouts;
CREATE TRIGGER trg_workouts_updated_at
  BEFORE UPDATE ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.set_workouts_updated_at();

-- 4. RLS
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

-- workouts: users see their own + all templates; insert/update/delete only their own
CREATE POLICY workouts_select ON public.workouts
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    is_template = true
    OR user_id = auth.uid()
  );

CREATE POLICY workouts_insert ON public.workouts
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND is_template = false
  );

CREATE POLICY workouts_update ON public.workouts
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND is_template = false)
  WITH CHECK (user_id = auth.uid() AND is_template = false);

CREATE POLICY workouts_delete ON public.workouts
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND is_template = false);

-- Service role full access (PERMISSIVE — established pattern from PR #4 hotfix)
CREATE POLICY workouts_service_all ON public.workouts
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- workout_exercises: visible/modifiable iff parent workout is
CREATE POLICY wex_select ON public.workout_exercises
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_exercises.workout_id
        AND (w.is_template = true OR w.user_id = auth.uid())
    )
  );

CREATE POLICY wex_insert ON public.workout_exercises
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_exercises.workout_id
        AND w.user_id = auth.uid()
        AND w.is_template = false
    )
  );

CREATE POLICY wex_update ON public.workout_exercises
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_exercises.workout_id
        AND w.user_id = auth.uid()
        AND w.is_template = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_exercises.workout_id
        AND w.user_id = auth.uid()
        AND w.is_template = false
    )
  );

CREATE POLICY wex_delete ON public.workout_exercises
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_exercises.workout_id
        AND w.user_id = auth.uid()
        AND w.is_template = false
    )
  );

CREATE POLICY wex_service_all ON public.workout_exercises
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Convenience function: clone a template into the user's library
CREATE OR REPLACE FUNCTION public.clone_workout_template(p_template_id uuid, p_new_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_new_id  uuid;
  v_src     public.workouts%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_src FROM public.workouts WHERE id = p_template_id AND is_template = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;

  INSERT INTO public.workouts (
    user_id, sport, tier, name, description, day_label, split_type,
    is_template, source_program, notes
  ) VALUES (
    v_user_id, v_src.sport, v_src.tier,
    COALESCE(p_new_name, v_src.name || ' (my copy)'),
    v_src.description, v_src.day_label, v_src.split_type,
    false, v_src.source_program, v_src.notes
  ) RETURNING id INTO v_new_id;

  INSERT INTO public.workout_exercises (
    workout_id, technique_id, exercise_name, position,
    sets, reps_min, reps_max, rest_seconds_min, rest_seconds_max, target_notes
  )
  SELECT v_new_id, technique_id, exercise_name, position,
         sets, reps_min, reps_max, rest_seconds_min, rest_seconds_max, target_notes
  FROM public.workout_exercises
  WHERE workout_id = p_template_id
  ORDER BY position;

  RETURN v_new_id;
END;
$$;

COMMENT ON FUNCTION public.clone_workout_template IS 'Clones a template workout (is_template=true) into the calling user''s personal library.';

GRANT EXECUTE ON FUNCTION public.clone_workout_template(uuid, text) TO authenticated;
