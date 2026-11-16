-- P1-22 retention measurement (UNAPPLIED)
-- Written 2026-11-15, Avery. Numbered after live supabase_migrations max 20261116024102 (renumbered from 20261116013000; P1-07/P1-06 lane is 0300xx).
-- Do not apply until Margot has a sha gate line and Vera's precheck PASS, relayed by Grant.
-- No live writes in this commit. Never stores user emails.

-- =====================================================================
-- M-0 Exclusions: existing is_test_account (jim+romrx-...@romrx.io AND
-- test_fixture=true) plus a hook table for the staff list Jim will name.
-- =====================================================================

CREATE TABLE IF NOT EXISTS ops.internal_accounts (
  user_id uuid PRIMARY KEY,
  note text,
  added_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ops.internal_accounts IS
  'P1-22 M-0 hook. Leave empty until Jim names staff or personal Base accounts to exclude from retention metrics. Store user_id only, never an email. Added rows need their own Jim yes.';

ALTER TABLE ops.internal_accounts ENABLE ROW LEVEL SECURITY;
-- No policies: service-role / postgres only (same pattern as other ops tables).

CREATE OR REPLACE FUNCTION ops.is_excluded_from_metrics(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'ops', 'public', 'auth', 'pg_temp'
AS $$
  SELECT
    p_user_id IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM ops.internal_accounts i WHERE i.user_id = p_user_id)
      OR EXISTS (
        SELECT 1
        FROM auth.users u
        WHERE u.id = p_user_id
          AND public.is_test_account(u.email)
      )
    );
$$;

COMMENT ON FUNCTION ops.is_excluded_from_metrics(uuid) IS
  'True when the user is a flagged test fixture (is_test_account = jim+romrx- pattern AND test_fixture) or is in ops.internal_accounts (staff hook, empty until Jim names accounts).';

REVOKE ALL ON FUNCTION ops.is_excluded_from_metrics(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ops.is_excluded_from_metrics(uuid) TO service_role, postgres;

-- =====================================================================
-- M-1 Event split and metric views (Reid MEASUREMENT-PLAN.md)
-- Classify by event-name allowlist, not by product_events.source.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.product_event_kind(p_event text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO 'pg_catalog', 'pg_temp'
AS $$
  SELECT CASE
    WHEN p_event IN (
      'email_sent',
      'base_status_changed',
      'base_activated',
      'checkout_completed',
      'checkout_packs_closed',
      'checkout_packs_closed_sport_dropped',
      'sport_entitlement_changed',
      'signup_completed',
      'lead_assessment_submitted',
      'assessment_lead_gate_shown',
      'unsubscribed'
    ) THEN 'system'
    ELSE 'user'
  END;
$$;

REVOKE ALL ON FUNCTION public.product_event_kind(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.product_event_kind(text) TO service_role, postgres;

CREATE OR REPLACE VIEW ops.user_actions AS
SELECT e.user_id, e.created_at, e.event, e.props, e.source, e.path, e.sport, e.id
FROM public.product_events e
WHERE e.user_id IS NOT NULL
  AND e.event IN (
    'page_view','results_viewed','results_unlock_clicked','assessment_started',
    'assessment_step_completed','assessment_completed_ui','assessment_submitted',
    'protocol_session_logged','rombot_message_sent','fuel_nutrition_calculated',
    'fuel_hydration_calculated','login_redirected_to_assessment','checkout_started',
    'signup_submitted','consent_signed',
    'today_session_started','session_completed','quick_recheck_started',
    'quick_recheck_submitted','reminder_opt_in_shown','reminder_opt_in_set',
    'retest_started','retest_results_viewed','rombot_checkin_opened','email_link_opened'
  );

COMMENT ON VIEW ops.user_actions IS
  'P1-22 M-1. Reid allowlist of user-caused events. New UI events must be added here when they ship. Not a split on source.';

CREATE OR REPLACE VIEW ops.value_actions AS
SELECT user_id, logged_at AS at, 'protocol_session'::text AS kind FROM public.protocol_sessions
UNION ALL
SELECT user_id, completed_at, 'protocol_completion' FROM public.protocol_completions
UNION ALL
SELECT user_id, assessed_at, 'assessment' FROM public.assessments;

CREATE OR REPLACE VIEW ops.v_real_assessed AS
SELECT f.user_id, f.first_assessment_at AS t0
FROM ops.base_onboarding_funnel f
WHERE NOT COALESCE(f.is_test, false)
  AND f.first_assessment_at IS NOT NULL
  AND NOT COALESCE(ops.is_excluded_from_metrics(f.user_id), false);

COMMENT ON VIEW ops.v_real_assessed IS
  'Real assessed users for retention metrics: funnel is_test = false (is_test_account / test_fixture / jim+romrx- pattern) AND not in ops.internal_accounts.';

CREATE OR REPLACE VIEW ops.retention_m1 AS
SELECT n AS day_n,
  count(*) FILTER (WHERE r.t0 <= now() - make_interval(days => n)) AS eligible,
  count(*) FILTER (WHERE r.t0 <= now() - make_interval(days => n)
    AND EXISTS (SELECT 1 FROM ops.user_actions u WHERE u.user_id = r.user_id
                AND u.created_at >= r.t0 + make_interval(days => n))) AS returned_any_action,
  count(*) FILTER (WHERE r.t0 <= now() - make_interval(days => n)
    AND EXISTS (SELECT 1 FROM ops.value_actions v WHERE v.user_id = r.user_id
                AND v.at >= r.t0 + make_interval(days => n))) AS returned_value_action
FROM ops.v_real_assessed r
CROSS JOIN (VALUES (1),(7),(14),(30)) d(n)
GROUP BY n;

CREATE OR REPLACE VIEW ops.retention_m2 AS
SELECT count(*) FILTER (WHERE r.t0 <= now() - interval '7 days') AS eligible,
  count(*) FILTER (WHERE r.t0 <= now() - interval '7 days' AND s.days_wk1 >= 1) AS had_1plus,
  count(*) FILTER (WHERE r.t0 <= now() - interval '7 days' AND s.days_wk1 >= 3) AS had_3plus
FROM ops.v_real_assessed r
LEFT JOIN LATERAL (
  SELECT count(DISTINCT p.session_date) AS days_wk1
  FROM public.protocol_sessions p
  WHERE p.user_id = r.user_id
    AND p.logged_at >= r.t0
    AND p.logged_at < r.t0 + interval '7 days'
) s ON true;

CREATE OR REPLACE VIEW ops.retention_m4 AS
SELECT
  count(*) FILTER (WHERE r.t0 <= now() - interval '56 days') AS eligible_56d,
  count(*) FILTER (WHERE r.t0 <= now() - interval '56 days' AND EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.user_id = r.user_id
      AND a.assessed_at > r.t0 + interval '1 day'
      AND a.assessed_at <= r.t0 + interval '56 days')) AS retested_by_d56,
  count(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.user_id = r.user_id AND a.assessed_at > r.t0 + interval '1 day')) AS retested_ever,
  count(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM ops.user_actions u
    WHERE u.user_id = r.user_id
      AND u.event = 'assessment_started'
      AND u.created_at > r.t0 + interval '1 day')) AS retest_started_ever
FROM ops.v_real_assessed r;

CREATE OR REPLACE VIEW ops.retention_m5 AS
SELECT
  (SELECT count(*) FROM ops.v_real_assessed) AS real_assessed,
  count(*) FILTER (WHERE (np.retest_reminders AND np.retest_opt_in_at IS NOT NULL)
                    OR (np.email_reminders AND np.protocol_opt_in_at IS NOT NULL)
                    OR (np.weekly_digest AND np.digest_opt_in_at IS NOT NULL)) AS opted_in_any,
  count(*) FILTER (WHERE np.retest_reminders AND np.retest_opt_in_at IS NULL) AS retest_default_on_no_marker,
  count(*) FILTER (WHERE np.push_subscription IS NOT NULL) AS push_pref_rows
FROM ops.v_real_assessed r
LEFT JOIN public.notification_preferences np ON np.user_id = r.user_id;

-- Convenience union for Reid (metric_id, payload as jsonb).
CREATE OR REPLACE VIEW ops.retention_daily AS
SELECT 'M1'::text AS metric_id, to_jsonb(m) AS payload FROM ops.retention_m1 m
UNION ALL
SELECT 'M2', to_jsonb(m) FROM ops.retention_m2 m
UNION ALL
SELECT 'M4', to_jsonb(m) FROM ops.retention_m4 m
UNION ALL
SELECT 'M5', to_jsonb(m) FROM ops.retention_m5 m;

GRANT SELECT ON ops.user_actions, ops.value_actions, ops.v_real_assessed,
  ops.retention_m1, ops.retention_m2, ops.retention_m4, ops.retention_m5,
  ops.retention_daily TO service_role, postgres;

-- =====================================================================
-- M-2 checkout_completed dedupe
-- New rows (after the stripe-webhook branch is deployed with Jim's yes)
-- carry props.stripe_checkout_session_id and dedupe on it.
-- Historic rows have no session id: fall back to user + purpose + a 2-hour
-- timestamp window (gaps-and-islands). This replaces Reid's ET calendar-day
-- fallback; see SPEC-FOR-REID.md.
-- The stripe-webhook emitter is on a SEPARATE branch and must not be deployed
-- without Jim's own yes. This migration does not change any edge function.
-- =====================================================================

CREATE UNIQUE INDEX IF NOT EXISTS product_events_checkout_session_id_uidx
  ON public.product_events ((props->>'stripe_checkout_session_id'))
  WHERE event = 'checkout_completed'
    AND props ? 'stripe_checkout_session_id'
    AND length(props->>'stripe_checkout_session_id') > 0;

CREATE OR REPLACE VIEW ops.checkout_completed_deduped AS
WITH base AS (
  SELECT e.*,
         NULLIF(e.props->>'stripe_checkout_session_id', '') AS _sid,
         COALESCE(e.props->>'purpose', '') AS _purpose
  FROM public.product_events e
  WHERE e.event = 'checkout_completed'
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
  'P1-22. Prefer props.stripe_checkout_session_id when present. Fallback (no session id): one row per user_id + purpose + 2-hour timestamp window (gaps-and-islands; a new window starts when the gap from the previous row for that user and purpose is greater than 2 hours). Latest row in the window is kept. Purpose is kept so a Base unlock and a sport-pack unlock close together are not collapsed. Window is 2 hours because Stripe webhook retries for one checkout usually arrive minutes to a couple of hours apart; a calendar-day rule can split a late-ET retry or merge two real checkouts on the same date.';

GRANT SELECT ON ops.checkout_completed_deduped TO service_role, postgres;

-- =====================================================================
-- M-3 protocol_completions writer (backend)
-- App on the companion romrx-io-web branch writes one row per Today-card
-- exercise using existing columns (works even before this migration).
-- This migration adds a session link, an RPC the app can call, a fallback
-- trigger so a session upsert still records a completion if the app did
-- not, and a backfill of the existing protocol_sessions (0 completions today).
-- =====================================================================

ALTER TABLE public.protocol_completions
  ADD COLUMN IF NOT EXISTS protocol_session_id uuid REFERENCES public.protocol_sessions(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS protocol_completions_session_exercise_uidx
  ON public.protocol_completions (protocol_session_id, exercise_id)
  WHERE protocol_session_id IS NOT NULL AND exercise_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS protocol_completions_session_only_uidx
  ON public.protocol_completions (protocol_session_id)
  WHERE protocol_session_id IS NOT NULL AND exercise_id IS NULL;

CREATE OR REPLACE FUNCTION public.record_protocol_completions(
  p_session_id uuid,
  p_assessment_id uuid,
  p_joint text,
  p_exercise_ids uuid[]
) RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $$
DECLARE
  uid uuid := auth.uid();
  n integer := 0;
  eid uuid;
  sid uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF p_session_id IS NULL THEN
    RETURN 0;
  END IF;
  SELECT s.id INTO sid
  FROM public.protocol_sessions s
  WHERE s.id = p_session_id AND s.user_id = uid;
  IF sid IS NULL THEN
    RAISE EXCEPTION 'session not found' USING ERRCODE = '42501';
  END IF;

  IF p_exercise_ids IS NULL OR cardinality(p_exercise_ids) = 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.protocol_completions c
      WHERE c.protocol_session_id = sid AND c.exercise_id IS NULL
    ) THEN
      INSERT INTO public.protocol_completions (
        user_id, assessment_id, exercise_id, joint, protocol_session_id, completed_at
      ) VALUES (uid, p_assessment_id, NULL, p_joint, sid, now());
      n := 1;
    END IF;
    RETURN n;
  END IF;

  FOREACH eid IN ARRAY p_exercise_ids LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.protocol_completions c
      WHERE c.protocol_session_id = sid AND c.exercise_id = eid
    ) THEN
      INSERT INTO public.protocol_completions (
        user_id, assessment_id, exercise_id, joint, protocol_session_id, completed_at
      ) VALUES (uid, p_assessment_id, eid, p_joint, sid, now());
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END;
$$;

COMMENT ON FUNCTION public.record_protocol_completions(uuid, uuid, text, uuid[]) IS
  'P1-22 M-3. Signed-in user records completions for their own protocol session. One row per exercise id, or one session-level row when the array is empty.';

GRANT EXECUTE ON FUNCTION public.record_protocol_completions(uuid, uuid, text, uuid[]) TO authenticated, service_role, postgres;

CREATE OR REPLACE FUNCTION public.tg_protocol_session_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $$
DECLARE
  aid uuid;
BEGIN
  -- Fallback only: if the app (or RPC) already wrote rows for this session, do nothing.
  IF EXISTS (SELECT 1 FROM public.protocol_completions c WHERE c.protocol_session_id = NEW.id) THEN
    RETURN NEW;
  END IF;
  -- FK-safe: protocol_completions.user_id references public.users(id). Skip users
  -- with no public.users row instead of failing the session save.
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = NEW.user_id) THEN
    RETURN NEW;
  END IF;
  BEGIN
    -- Skip when completions already exist for this user on the session's local date
    -- (Base web writer 41b947e7 inserts per-exercise rows with no protocol_session_id).
    -- Local date: user's notification_preferences.timezone if valid, else America/New_York.
    IF EXISTS (
      SELECT 1 FROM public.protocol_completions c
      WHERE c.user_id = NEW.user_id
        AND (c.completed_at AT TIME ZONE COALESCE(
              (SELECT np.timezone FROM public.notification_preferences np
                WHERE np.user_id = NEW.user_id
                  AND np.timezone IN (SELECT tz.name FROM pg_catalog.pg_timezone_names tz)
                ORDER BY np.updated_at DESC NULLS LAST LIMIT 1),
              'America/New_York'))::date = NEW.session_date
    ) THEN
      RETURN NEW;
    END IF;
    SELECT a.id INTO aid
    FROM public.assessments a
    WHERE a.user_id = NEW.user_id
    ORDER BY a.assessed_at DESC NULLS LAST
    LIMIT 1;
    INSERT INTO public.protocol_completions (
      user_id, assessment_id, exercise_id, joint, protocol_session_id, completed_at
    ) VALUES (
      NEW.user_id,
      aid,
      NULL,
      NEW.protocol_day,
      NEW.id,
      COALESCE(NEW.logged_at, now())
    );
  EXCEPTION WHEN others THEN
    -- Never block a protocol_sessions save.
    RAISE WARNING 'zz_pc_protocol_session: completion not recorded for session % (%: %)', NEW.id, SQLSTATE, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zz_pc_protocol_session ON public.protocol_sessions;
CREATE TRIGGER zz_pc_protocol_session
  AFTER INSERT OR UPDATE OF session_date, protocol_day ON public.protocol_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_protocol_session_completion();

-- Backfill existing sessions that have no completion row. Session-level only
-- (exercise_id is unknown historically). Safe to re-run.
-- FK-safe: skip sessions whose user has no public.users row (FK target).
INSERT INTO public.protocol_completions (
  user_id, assessment_id, exercise_id, joint, protocol_session_id, completed_at
)
SELECT
  ps.user_id,
  (SELECT a.id FROM public.assessments a
    WHERE a.user_id = ps.user_id
    ORDER BY a.assessed_at DESC NULLS LAST LIMIT 1),
  NULL,
  ps.protocol_day,
  ps.id,
  COALESCE(ps.logged_at, now())
FROM public.protocol_sessions ps
WHERE NOT EXISTS (
  SELECT 1 FROM public.protocol_completions c WHERE c.protocol_session_id = ps.id
)
  AND EXISTS (select 1 from public.users u where u.id = ps.user_id)
  -- Skip sessions whose user already has completions on that local date (writer 41b947e7 rows).
  AND NOT EXISTS (
    SELECT 1 FROM public.protocol_completions c
    WHERE c.user_id = ps.user_id
      AND (c.completed_at AT TIME ZONE COALESCE(
            (SELECT np.timezone FROM public.notification_preferences np
              WHERE np.user_id = ps.user_id
                AND np.timezone IN (SELECT tz.name FROM pg_catalog.pg_timezone_names tz)
              ORDER BY np.updated_at DESC NULLS LAST LIMIT 1),
            'America/New_York'))::date = ps.session_date
  );
