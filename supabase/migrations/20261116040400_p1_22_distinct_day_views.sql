-- P1-22 distinct-day views (UNAPPLIED, build only). Written 2026-11-15, Avery.
-- Numbered 20261116040400: after live head 20261116024102 and after 20261116040000 (P1-22
-- measurement, 5162a3c3), 040100 (P1-27), 040200 (webhook claims), 040300 (coaches.updated_at).
-- Depends on 20261116040000 already being applied (uses ops.v_real_assessed).
--
-- Why a new migration: Grant ruled that 040000 is applied from 5162a3c3's exact bytes only.
-- 7c10d6fb had edited 040000 in place to add these views plus changes to ops.value_actions
-- and ops.retention_daily. That commit is tagged not-for-apply/7c10d6fb and must not be applied.
-- This file contains ONLY the two new views. It does not edit ops.value_actions or
-- ops.retention_daily, so M1's value_actions keeps reading raw public.protocol_completions
-- (one row per completion, not one per local day). Stored rows are not changed.
--
-- Local date = the user's valid notification_preferences.timezone, else America/New_York
-- (same rule as the 040000 zz_pc_protocol_session skip). View definitions match 7c10d6fb.
-- Grants match 040000's ops views: GRANT SELECT TO service_role, postgres.

-- Distinct completion days: one row per user_id + local date, however many completion rows
-- (trigger session-level row + writer 41b947e7 per-movement rows) landed that day. Local date =
-- the user's valid notification_preferences.timezone, else America/New_York (same rule as the
-- zz_pc_protocol_session skip). Stored rows are not changed; metrics read this view.
CREATE OR REPLACE VIEW ops.protocol_completion_days AS
SELECT c.user_id,
  (c.completed_at AT TIME ZONE z.tz)::date AS local_date,
  z.tz AS tz_used,
  count(*) AS raw_rows,
  min(c.completed_at) AS first_at,
  max(c.completed_at) AS last_at
FROM public.protocol_completions c
CROSS JOIN LATERAL (SELECT COALESCE((SELECT np.timezone FROM public.notification_preferences np
                    WHERE np.user_id = c.user_id
                      AND np.timezone IN (SELECT tz.name FROM pg_catalog.pg_timezone_names tz)
                    ORDER BY np.updated_at DESC NULLS LAST LIMIT 1), 'America/New_York') AS tz) z
GROUP BY c.user_id, (c.completed_at AT TIME ZONE z.tz)::date, z.tz;

COMMENT ON VIEW ops.protocol_completion_days IS
  'P1-22 M-3: one row per user_id and local date (user tz, else America/New_York). raw_rows shows how many completion rows collapsed into that day.';

-- M-3: protocol completion DAYS (distinct user_id + local date), never raw completion rows.
CREATE OR REPLACE VIEW ops.retention_m3 AS
SELECT count(*) FILTER (WHERE r.t0 <= now() - interval '7 days') AS eligible,
  count(*) FILTER (WHERE r.t0 <= now() - interval '7 days' AND w.days_wk1 >= 1) AS completion_days_wk1_1plus,
  count(*) FILTER (WHERE r.t0 <= now() - interval '7 days' AND w.days_wk1 >= 3) AS completion_days_wk1_3plus,
  COALESCE(sum(a.days_all), 0)::bigint AS completion_days_all,
  COALESCE(sum(a.rows_all), 0)::bigint AS completion_rows_all
FROM ops.v_real_assessed r
LEFT JOIN LATERAL (
  SELECT count(*) AS days_wk1
  FROM ops.protocol_completion_days d
  WHERE d.user_id = r.user_id
    AND d.last_at >= r.t0
    AND d.first_at < r.t0 + interval '7 days'
) w ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS days_all, sum(d.raw_rows) AS rows_all
  FROM ops.protocol_completion_days d
  WHERE d.user_id = r.user_id
) a ON true;

COMMENT ON VIEW ops.retention_m3 IS
  'P1-22 M-3: completion DAYS (ops.protocol_completion_days), never raw completion rows. Not wired into ops.retention_daily in this migration; M1 value_actions is unchanged and still reads raw protocol_completions.';

GRANT SELECT ON ops.protocol_completion_days, ops.retention_m3 TO service_role, postgres;
