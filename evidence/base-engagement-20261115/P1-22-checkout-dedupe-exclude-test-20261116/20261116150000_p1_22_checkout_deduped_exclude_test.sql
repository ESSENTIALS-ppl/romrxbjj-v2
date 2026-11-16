-- 20261116150000_p1_22_checkout_deduped_exclude_test (UNAPPLIED; build only).
-- P1-22 follow-up: ops.checkout_completed_deduped (live since 20261116030659) counted test fixtures.
-- Adds the same exclusion the other P1-22 metric views use (ops.v_real_assessed:
-- NOT COALESCE(ops.is_excluded_from_metrics(user_id), false)), i.e. public.is_test_account(email) via auth.users
-- OR a row in ops.internal_accounts. Rows with a NULL user_id are kept (the hook returns false for NULL).
-- CREATE OR REPLACE keeps the view's oid, owner (postgres), grants (service_role SELECT), reloptions (none)
-- and the exact column list; only the WHERE in the base CTE and the comment change.
-- Apply via MCP apply_migration only. Rollback: 20261116150000_p1_22_checkout_deduped_exclude_test_rollback.sql.

CREATE OR REPLACE VIEW ops.checkout_completed_deduped AS
WITH base AS (
  SELECT e.*,
         NULLIF(e.props->>'stripe_checkout_session_id', '') AS _sid,
         COALESCE(e.props->>'purpose', '') AS _purpose
  FROM public.product_events e
  WHERE e.event = 'checkout_completed'
    AND NOT COALESCE(ops.is_excluded_from_metrics(e.user_id), false)
),
with_sid AS (
  SELECT DISTINCT ON (_sid)
         id, user_id, anon_id, session_id, event, props, sport, source, path, created_at
  FROM base
  WHERE _sid IS NOT NULL
  ORDER BY _sid, created_at DESC
),
no_sid_flagged AS (
  SELECT b.*,
         CASE
           WHEN lag(created_at) OVER (PARTITION BY user_id, _purpose ORDER BY created_at) IS NULL
             OR created_at - lag(created_at) OVER (PARTITION BY user_id, _purpose ORDER BY created_at)
                > INTERVAL '2 hours'
           THEN 1 ELSE 0
         END AS _new_grp
  FROM base b
  WHERE _sid IS NULL
),
no_sid_grouped AS (
  SELECT f.*,
         SUM(_new_grp) OVER (PARTITION BY user_id, _purpose ORDER BY created_at) AS _grp
  FROM no_sid_flagged f
),
no_sid AS (
  SELECT DISTINCT ON (user_id, _purpose, _grp)
         id, user_id, anon_id, session_id, event, props, sport, source, path, created_at
  FROM no_sid_grouped
  ORDER BY user_id, _purpose, _grp, created_at DESC
)
SELECT * FROM with_sid
UNION ALL
SELECT * FROM no_sid;

COMMENT ON VIEW ops.checkout_completed_deduped IS
  'P1-22. Prefer props.stripe_checkout_session_id when present. Fallback (no session id): one row per user_id + purpose + 2-hour timestamp window (gaps-and-islands; a new window starts when the gap from the previous row for that user and purpose is greater than 2 hours). Latest row in the window is kept. Purpose is kept so a Base unlock and a sport-pack unlock close together are not collapsed. Window is 2 hours because Stripe webhook retries for one checkout usually arrive minutes to a couple of hours apart; a calendar-day rule can split a late-ET retry or merge two real checkouts on the same date. Excludes test fixtures and ops.internal_accounts via ops.is_excluded_from_metrics(user_id), the same rule as ops.v_real_assessed (20261116150000).';
