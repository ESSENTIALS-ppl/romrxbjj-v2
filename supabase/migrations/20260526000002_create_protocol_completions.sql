-- Migration: protocol_completions table — adherence tracking
-- Date: 2026-05-26

CREATE TABLE IF NOT EXISTS public.protocol_completions (
  id               UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assessment_id    UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  exercise_id      UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  joint            TEXT,
  completed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  sets_completed   INTEGER,
  reps_completed   INTEGER,
  difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5),
  pain_rating      INTEGER CHECK (pain_rating BETWEEN 0 AND 10),
  notes            TEXT
);

ALTER TABLE public.protocol_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "completions_own" ON public.protocol_completions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "completions_coach_read" ON public.protocol_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.user_id = protocol_completions.user_id
        AND a.coach_id IN (
          SELECT id FROM public.coaches WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "completions_service_role" ON public.protocol_completions
  FOR ALL TO service_role USING (true);

CREATE INDEX idx_protocol_completions_user_id ON public.protocol_completions(user_id);
CREATE INDEX idx_protocol_completions_assessment_id ON public.protocol_completions(assessment_id);
CREATE INDEX idx_protocol_completions_completed_at ON public.protocol_completions(completed_at DESC);
