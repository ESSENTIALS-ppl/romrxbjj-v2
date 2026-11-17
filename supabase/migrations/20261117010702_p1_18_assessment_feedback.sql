-- 20261117120100_p1_18_assessment_feedback (UNAPPLIED; build only). P1-18b, L1031.
-- Creates public.assessment_feedback exactly per JULES-P1-18B-ASSESSMENT-FEEDBACK-SPEC-20261116.md
-- (sha256 7b42dd84b0f2549b7dfbf248f22721503279d8f3df6c6f49f0146a1efb36bbff), with two tightenings:
--   1) INSERT is allowed only when the assessment is the caller's own AND check_kind = 'full'.
--      The Jules draft used "check_kind IS DISTINCT FROM 'quick'" (NULL would count as full).
--      After live L1134 031000 (20261116143905) the column is NOT NULL and is only 'full' or 'quick'.
--      Grant/Stacy require FULL only, and that partial or quick rows and other users' assessments are
--      rejected, so the policy requires equality to 'full'. A non-full kind (quick, or a 'partial'
--      kind if one were ever added) cannot get a row.
--   2) The event trigger writes product_events event assessment_feedback_submitted with props holding
--      only ids and timestamps (id, assessment_id, created_at). It does NOT copy ease, results_clear,
--      check_again, or survey_version (Jules asked for those four as props; Stacy: no answers, and
--      there is no free-text column on this table anyway).
-- Ordered after the session_feedback unapplied file 20261117120000, and after live 031000
-- (20261116143905 assessment_check_kind). This SQL reads assessments.check_kind; do not apply before 031000.
-- Stacy privacy (same as session_feedback): rows never reach OpenAI or ROMBot/ai-chat; nothing to Meta
-- beyond a no-answers event (this build adds no Meta or Notion hook); deleted with the account
-- (user_id REFERENCES public.users(id) ON DELETE CASCADE, matching assessments.user_id; public.users.id
-- itself references auth.users(id) ON DELETE CASCADE); export-my-data coverage, flag stays off.
-- Apply via MCP apply_migration only, after its own gate, and only after 031000 and (if applying both)
-- after 20261117120000 is live or this is applied as a later id. Combined rollback:
-- 20261117120100_p1_18_feedback_tables_rollback.sql (drops this table, then session_feedback).

CREATE TABLE public.assessment_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  ease text NOT NULL,
  results_clear text NOT NULL,
  check_again text NOT NULL,
  survey_version text NOT NULL,
  sport text NOT NULL DEFAULT 'base',
  source text NOT NULL DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assessment_feedback_assessment_id_key UNIQUE (assessment_id),
  CONSTRAINT assessment_feedback_ease_check CHECK (ease IN ('easy', 'okay', 'hard')),
  CONSTRAINT assessment_feedback_results_clear_check CHECK (results_clear IN ('yes', 'mostly', 'no')),
  CONSTRAINT assessment_feedback_check_again_check CHECK (check_again IN ('yes', 'maybe', 'no')),
  CONSTRAINT assessment_feedback_survey_version_check CHECK (survey_version = 'p1-18b-card1-2026-11-16'),
  CONSTRAINT assessment_feedback_sport_check CHECK (sport = 'base'),
  CONSTRAINT assessment_feedback_source_check CHECK (source = 'web')
);

CREATE INDEX assessment_feedback_user_created_idx
  ON public.assessment_feedback (user_id, created_at DESC);

COMMENT ON TABLE public.assessment_feedback IS
  'P1-18b (20261117120100, unapplied). One row per full assessment (unique assessment_id). Write-once from the signed-in user. No free-text column. INSERT is allowed only for the caller''s own assessments with check_kind = ''full'' (quick and any non-full kind, including partial, are rejected). Answers are not copied to product_events, ai-chat, ROMBot, Meta, or Notion.';

ALTER TABLE public.assessment_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY assessment_feedback_insert_own
  ON public.assessment_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.assessments a
      WHERE a.id = assessment_id
        AND a.user_id = (SELECT auth.uid())
        AND a.check_kind = 'full'
    )
  );

CREATE POLICY assessment_feedback_select_own
  ON public.assessment_feedback
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.assessment_feedback FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.assessment_feedback TO authenticated;

CREATE OR REPLACE FUNCTION public.tg_pe_assessment_feedback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Stacy: payload holds only ids, timestamps, and the event name. No answers.
  PERFORM public.log_product_event(
    NEW.user_id,
    'assessment_feedback_submitted',
    jsonb_build_object(
      'id', NEW.id,
      'assessment_id', NEW.assessment_id,
      'created_at', NEW.created_at
    )
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tg_pe_assessment_feedback() IS
  'P1-18b. AFTER INSERT on assessment_feedback: product_events assessment_feedback_submitted with props id, assessment_id, created_at only. Never copies ease, results_clear, check_again, or survey_version.';

REVOKE ALL ON FUNCTION public.tg_pe_assessment_feedback() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_pe_assessment_feedback
  AFTER INSERT ON public.assessment_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_pe_assessment_feedback();
