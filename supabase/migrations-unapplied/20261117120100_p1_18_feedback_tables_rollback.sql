-- COMBINED ROLLBACK for P1-18 session_feedback (20261117120000) and
-- P1-18b assessment_feedback (20261117120100). UNAPPLIED companion. Exact restore of both.
-- Order: drop assessment_feedback first, then session_feedback.
-- Does not change public.protocol_sessions, public.assessments, public.users, public.product_events,
-- public.log_product_event, public.client_feedback, or any webhook.
-- Does not delete already-written product_events rows (none exist until apply + insert).

DROP TRIGGER IF EXISTS trg_pe_assessment_feedback ON public.assessment_feedback;
DROP FUNCTION IF EXISTS public.tg_pe_assessment_feedback();
DROP TABLE IF EXISTS public.assessment_feedback;

DROP TRIGGER IF EXISTS trg_pe_session_feedback ON public.session_feedback;
DROP FUNCTION IF EXISTS public.tg_pe_session_feedback();
DROP TABLE IF EXISTS public.session_feedback;
