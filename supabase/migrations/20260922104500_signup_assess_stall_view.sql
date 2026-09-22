-- ops.signup_assess_stall — measurement/ops signal only (Tue funnel inventory rank #4).
-- Detects signup_completed with no assessment_started after N hours (default 24).
-- Also requires no assessments row so pre-instrumentation completes are not false stalls
-- (LIVE product_events.assessment_started is sparse: 2 all-time as of 2026-09-22).
--
-- Does NOT: send customer email, invent activation, write product_events, cron notify.
-- Conversion drip anchors post-assess unpaid sport — does not cover this pre-start gap.
-- Fight Status four counters (ops.field_counter_*) — do not cover this stall set.
-- Companion: ops.base_onboarding_funnel (first_assessment_at) remains the broader funnel grain.
--
-- Query (service_role / SQL editor):
--   SELECT * FROM ops.signup_assess_stall ORDER BY signup_at;
--   SELECT count(*) FROM ops.signup_assess_stall WHERE NOT is_test;
-- LIVE applied via Supabase MCP apply_migration signup_assess_stall_view.

CREATE OR REPLACE VIEW ops.signup_assess_stall
WITH (security_invoker = true)
AS
WITH signup AS (
  SELECT pe.user_id, min(pe.created_at) AS signup_at
  FROM public.product_events pe
  WHERE pe.event = 'signup_completed'
    AND pe.user_id IS NOT NULL
  GROUP BY pe.user_id
),
started AS (
  SELECT DISTINCT pe.user_id
  FROM public.product_events pe
  WHERE pe.event = 'assessment_started'
    AND pe.user_id IS NOT NULL
),
assessed AS (
  SELECT DISTINCT a.user_id
  FROM public.assessments a
)
SELECT
  s.user_id,
  u.email,
  s.signup_at,
  round((extract(epoch FROM (now() - s.signup_at)) / 3600.0)::numeric, 1) AS hours_since_signup,
  24 AS stall_hours_threshold,
  pu.base_status,
  pu.active_sport,
  (pu.id IS NOT NULL) AS has_public_users,
  public.is_test_account(u.email::text) AS is_test
FROM signup s
JOIN auth.users u ON u.id = s.user_id
LEFT JOIN started st ON st.user_id = s.user_id
LEFT JOIN assessed a ON a.user_id = s.user_id
LEFT JOIN public.users pu ON pu.id = s.user_id
WHERE st.user_id IS NULL
  AND a.user_id IS NULL
  AND s.signup_at < (now() - interval '24 hours');

COMMENT ON VIEW ops.signup_assess_stall IS
  'Ops-only: signup_completed >=24h ago with no assessment_started and no assessments row. No customer email.';

CREATE OR REPLACE VIEW ops.signup_assess_stall_count
WITH (security_invoker = true)
AS
SELECT
  count(*) FILTER (WHERE NOT is_test) AS nontest_stalls,
  count(*) AS raw_stalls
FROM ops.signup_assess_stall;

COMMENT ON VIEW ops.signup_assess_stall_count IS
  'Ops-only aggregate over signup_assess_stall (nontest vs raw).';

REVOKE ALL ON ops.signup_assess_stall FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ops.signup_assess_stall_count FROM PUBLIC, anon, authenticated;
GRANT SELECT ON ops.signup_assess_stall TO service_role;
GRANT SELECT ON ops.signup_assess_stall_count TO service_role;
GRANT SELECT ON ops.signup_assess_stall TO postgres;
GRANT SELECT ON ops.signup_assess_stall_count TO postgres;
