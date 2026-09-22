-- LIVE applied 2026-09-22 on cqzvqzwwevnflinxgnpp as client_feedback_sport_allow_base
-- (schema_migrations version 20260922111331). Git sync only — do NOT re-apply.
--
-- Root cause (Reid Settings Field FAIL 2026-09-22):
--   client_feedback_sport_check allowed only bjj|bodybuilding.
--   Base Settings FeedbackWidget / submit-feedback INSERT sport:'base'
--   → CHECK violation → edge returns 500 "could not save feedback"
--   → FE shows "Edge Function returned a non-2xx status code".
-- Notion never got a row because INSERT never succeeded.
-- severity/status columns have defaults; not the failure mode.
-- No FE / edge redeploy required.

ALTER TABLE public.client_feedback
  DROP CONSTRAINT IF EXISTS client_feedback_sport_check;

ALTER TABLE public.client_feedback
  ADD CONSTRAINT client_feedback_sport_check
  CHECK (sport = ANY (ARRAY['base'::text, 'bjj'::text, 'bodybuilding'::text]));
