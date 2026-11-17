-- ROLLBACK for 20261117120100_p1_18_assessment_feedback only (UNAPPLIED companion).
-- Drops the P1-18b trigger, function, and table (policies and indexes go with the table).
-- Does not drop session_feedback. For both tables, use
-- 20261117120100_p1_18_feedback_tables_rollback.sql instead.
-- Does not change public.assessments, public.users, public.product_events, or any webhook.

DROP TRIGGER IF EXISTS trg_pe_assessment_feedback ON public.assessment_feedback;
DROP FUNCTION IF EXISTS public.tg_pe_assessment_feedback();
DROP TABLE IF EXISTS public.assessment_feedback;
