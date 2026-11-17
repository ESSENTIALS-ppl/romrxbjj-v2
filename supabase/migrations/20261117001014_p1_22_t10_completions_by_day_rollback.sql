-- ROLLBACK for 20261116151000_p1_22_t10_completions_by_day (UNAPPLIED companion). View-only; changes no data.
-- 1) ops.value_actions back to the live 20261116030659 text, copied byte for byte from
--    supabase/migrations/20261116030659_p1_22_retention_measurement.sql (owner, grants, reloptions untouched).
-- 2) then drop the new view (nothing else depends on it once value_actions no longer reads it).

CREATE OR REPLACE VIEW ops.value_actions AS
SELECT user_id, logged_at AS at, 'protocol_session'::text AS kind FROM public.protocol_sessions
UNION ALL
SELECT user_id, completed_at, 'protocol_completion' FROM public.protocol_completions
UNION ALL
SELECT user_id, assessed_at, 'assessment' FROM public.assessments;

DROP VIEW IF EXISTS ops.protocol_completion_days;
