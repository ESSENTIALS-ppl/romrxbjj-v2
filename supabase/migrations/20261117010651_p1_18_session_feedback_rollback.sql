-- ROLLBACK for 20261117120000_p1_18_session_feedback (UNAPPLIED companion).
-- Drops the P1-18 trigger, function, and table (policies and indexes go with the table).
-- Does not change public.protocol_sessions, public.product_events, public.log_product_event,
-- public.client_feedback, or any webhook. Does not delete already-written product_events rows
-- (none exist until this is applied and a row is inserted). No data in session_feedback until apply.

DROP TRIGGER IF EXISTS trg_pe_session_feedback ON public.session_feedback;
DROP FUNCTION IF EXISTS public.tg_pe_session_feedback();
DROP TABLE IF EXISTS public.session_feedback;
