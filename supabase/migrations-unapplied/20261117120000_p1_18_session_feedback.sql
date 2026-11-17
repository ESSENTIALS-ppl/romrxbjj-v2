-- 20261117120000_p1_18_session_feedback (UNAPPLIED; build only). P1-18, L1031.
-- Creates public.session_feedback exactly per JULES-P1-18-SESSION-FEEDBACK-SPEC-20261116.md
-- (sha256 272c95a3b7a57586e2c17412223b5acb39724bd514c610405b62064dcebceeec).
-- Stacy privacy conditions (Grant steering, 7:12 PM ET Nov 16):
--   (1) rows, including the note, never reach OpenAI or ROMBot/ai-chat context;
--   (2) nothing goes to Meta (Pixel or CAPI) beyond a no-answers event, and no third-party
--       other than Notion gets the data (this build adds no Notion webhook; feedback-to-notion
--       stays on client_feedback only);
--   (3) rows are deleted with the account: user_id REFERENCES auth.users(id) ON DELETE CASCADE
--       (same as public.protocol_sessions.user_id);
--   (4) the AFTER INSERT event trigger writes product_events event session_feedback_submitted
--       with props holding only ids and timestamps (id, session_id, created_at). It does NOT
--       copy feel, clear, length_fit, has_survey, or the note text. This is stricter than the
--       Jules spec's props { feel, has_survey }; the table itself matches the spec exactly.
-- No data backfill. Apply via MCP apply_migration only, after its own gate. EXPORT_MY_DATA stays off.
-- Rollback: 20261117120000_p1_18_session_feedback_rollback.sql.

CREATE TABLE public.session_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.protocol_sessions(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  feel text NOT NULL,
  clear text,
  length_fit text,
  note text,
  sport text NOT NULL DEFAULT 'base',
  source text NOT NULL DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_feedback_session_id_key UNIQUE (session_id),
  CONSTRAINT session_feedback_feel_check CHECK (feel IN ('easy', 'about_right', 'hard')),
  CONSTRAINT session_feedback_clear_check CHECK (clear IS NULL OR clear IN ('yes', 'somewhat', 'no')),
  CONSTRAINT session_feedback_length_fit_check CHECK (length_fit IS NULL OR length_fit IN ('too_short', 'about_right', 'too_long')),
  CONSTRAINT session_feedback_note_check CHECK (note IS NULL OR char_length(note) BETWEEN 1 AND 500),
  CONSTRAINT session_feedback_sport_check CHECK (sport = 'base'),
  CONSTRAINT session_feedback_source_check CHECK (source = 'web')
);

CREATE INDEX session_feedback_user_created_idx
  ON public.session_feedback (user_id, created_at DESC);

COMMENT ON TABLE public.session_feedback IS
  'P1-18 (20261117120000, unapplied). One row per protocol session (unique session_id). Write-once from the signed-in user. The note and answers stay on this table; they are not copied to product_events, ai-chat, or ROMBot context, and this table has no Notion/Meta webhook.';

COMMENT ON COLUMN public.session_feedback.note IS
  'Optional free text, 1 to 500 characters. Never copied to product_events, OpenAI, ROMBot, Meta, or Notion.';

ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY session_feedback_insert_own
  ON public.session_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.protocol_sessions ps
      WHERE ps.id = session_id
        AND ps.user_id = (SELECT auth.uid())
        AND ps.session_date = session_feedback.session_date
    )
  );

CREATE POLICY session_feedback_select_own
  ON public.session_feedback
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.session_feedback FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.session_feedback TO authenticated;
-- service_role keeps default full access (BYPASSRLS). No UPDATE or DELETE policy: write-once from the client.

CREATE OR REPLACE FUNCTION public.tg_pe_session_feedback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Stacy (4): payload holds only ids, timestamps, and the event name. No answers, no note.
  PERFORM public.log_product_event(
    NEW.user_id,
    'session_feedback_submitted',
    jsonb_build_object(
      'id', NEW.id,
      'session_id', NEW.session_id,
      'created_at', NEW.created_at
    )
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tg_pe_session_feedback() IS
  'P1-18. AFTER INSERT on session_feedback: product_events session_feedback_submitted with props id, session_id, created_at only. Never copies feel, clear, length_fit, has_survey, or note.';

REVOKE ALL ON FUNCTION public.tg_pe_session_feedback() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_pe_session_feedback
  AFTER INSERT ON public.session_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_pe_session_feedback();
