-- 20261116151000_p1_22_t10_completions_by_day (UNAPPLIED; build only). Grant 10:06 AM ET Nov 16, L1031, option (1).
-- T10: the zz_pc_protocol_session trigger writes 1 session-level completion row on session save, then the Base web
-- writer 41b947e7 adds up to 3 per-movement rows for the same session, so raw protocol_completions rows overstate use.
-- Fix (metrics only): new view ops.protocol_completion_days (user + local day, excluded users dropped) and the
-- completion arm of ops.value_actions reads it. No data changes, no deletes, no triggers, no web change.
-- ops.value_actions keeps its oid, columns (user_id uuid, at timestamptz, kind text), owner, grants and reloptions
-- (CREATE OR REPLACE; only the completion arm changes). Dependents ops.retention_m1 -> ops.retention_daily are untouched.
-- Apply via MCP apply_migration only. Rollback: 20261116151000_p1_22_t10_completions_by_day_rollback.sql.

CREATE VIEW ops.protocol_completion_days AS
SELECT c.user_id,
  (c.completed_at AT TIME ZONE z.tz)::date AS local_date,
  z.tz AS tz_used,
  count(*) AS raw_rows,
  min(c.completed_at) AS first_at,
  max(c.completed_at) AS last_at
FROM public.protocol_completions c
CROSS JOIN LATERAL (
  SELECT COALESCE(
    (SELECT np.timezone FROM public.notification_preferences np
      WHERE np.user_id = c.user_id
        AND np.timezone IN (SELECT tz.name FROM pg_catalog.pg_timezone_names tz)
      ORDER BY np.updated_at DESC NULLS LAST LIMIT 1),
    'America/New_York') AS tz
) z
WHERE NOT COALESCE(ops.is_excluded_from_metrics(c.user_id), false)
GROUP BY c.user_id, (c.completed_at AT TIME ZONE z.tz)::date, z.tz;

COMMENT ON VIEW ops.protocol_completion_days IS
  'P1-22 T10 (20261116151000). One row per user_id and local completion date, however many protocol_completions rows landed that day (the zz_pc_protocol_session session-level row plus up to 3 Today-card writer rows count once). Local date = the user''s latest valid notification_preferences.timezone, else America/New_York (same rule as the zz_pc_protocol_session skip). Excludes test fixtures and ops.internal_accounts via ops.is_excluded_from_metrics (same as ops.v_real_assessed). raw_rows shows how many rows collapsed. Stored rows are not changed.';

REVOKE ALL ON ops.protocol_completion_days FROM PUBLIC, anon, authenticated;
GRANT SELECT ON ops.protocol_completion_days TO service_role, postgres;

CREATE OR REPLACE VIEW ops.value_actions AS
SELECT user_id, logged_at AS at, 'protocol_session'::text AS kind FROM public.protocol_sessions
UNION ALL
-- T10: one row per user + local completion day (ops.protocol_completion_days). last_at keeps every
-- EXISTS (at >= X) answer of the per-row version for non-excluded users.
SELECT user_id, last_at, 'protocol_completion' FROM ops.protocol_completion_days
UNION ALL
SELECT user_id, assessed_at, 'assessment' FROM public.assessments;
