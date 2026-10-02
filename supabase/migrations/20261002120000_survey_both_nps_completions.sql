-- DRAFT: Native Both survey (NPS micro + optional feedback). DO NOT apply live until Jim GO on copy.
-- Completions = surveys rows with survey_key = 'base_both_nps' AND completed_at IS NOT NULL.
-- Counter redefined: scoreboard "Surveys" = completions, NOT surveys_open tickets / client_feedback opens.
-- Sacred: Base bands Needs focus / Building / Steady only.

-- Allow completed status on surveys (open was historical ticket-style).
ALTER TABLE public.surveys DROP CONSTRAINT IF EXISTS surveys_status_check;
ALTER TABLE public.surveys
  ADD CONSTRAINT surveys_status_check
  CHECK (status = ANY (ARRAY['open'::text, 'completed'::text, 'dismissed'::text]));

-- NPS score 0-10 when present (Both instrument).
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS nps_score smallint;

ALTER TABLE public.surveys DROP CONSTRAINT IF EXISTS surveys_nps_score_range;
ALTER TABLE public.surveys
  ADD CONSTRAINT surveys_nps_score_range
  CHECK (nps_score IS NULL OR (nps_score >= 0 AND nps_score <= 10));

COMMENT ON COLUMN public.surveys.nps_score IS
  'Both instrument NPS 0-10. Completion = survey_key base_both_nps + completed_at set + nps_score present.';

COMMENT ON TABLE public.surveys IS
  'Survey responses. Scoreboard Surveys counter = completions (base_both_nps with completed_at), not open tickets.';

-- Scoreboard helper view (service/reporting). Excludes test fixtures.
CREATE OR REPLACE VIEW public.field_counter_survey_completions AS
SELECT s.id, s.user_id, s.nps_score, s.completed_at, s.created_at
FROM public.surveys s
JOIN public.users u ON u.id = s.user_id
WHERE s.survey_key = 'base_both_nps'
  AND s.completed_at IS NOT NULL
  AND s.nps_score IS NOT NULL
  AND coalesce(public.is_test_account(u.email::text), false) = false;

REVOKE ALL ON public.field_counter_survey_completions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.field_counter_survey_completions TO service_role;
