-- 20261117010000_p1_25_purge_deleted_accounts (UNAPPLIED; BUILD ONLY).
-- P1-25 / L1004. Jim, verbatim, 2026-11-03 7:07 PM ET: "Purge deleted accounts after 90 days."
-- Adds public.purge_deleted_accounts(p_mode text default 'dry_run', p_retention interval default interval '90 days')
-- returns jsonb. Default dry_run: counts and lists user ids, writes nothing. count / count_only: counts only.
-- apply is opt-in: backs up qualifying rows into schema zz_bak_p1_25_<UTC stamp>, then hard-deletes remaining
-- account data. Retention below 90 days is refused. No cron is scheduled in this file (see the sibling
-- 20261117010000_p1_25_purge_deleted_accounts_cron.NOT_FOR_APPLY.sql, which is also unapplied).
--
-- How deletion is marked today (live read 2026-11-16, project cqzvqzwwevnflinxgnpp):
--   1) request-account-deletion v11 files public.account_deletion_requests (status default 'requested')
--      and erases safety-copy rows. It does not delete the account or live data.
--   2) The privacy team completes deletion manually within 30 days. completed_at is set when
--      status becomes 'completed'. auth.users.deleted_at exists (GoTrue soft-delete) but is unused (0 rows).
--   3) public.purge_account_deletion_requests(interval) already deletes completed REQUEST LOG rows only;
--      it is not scheduled and is unchanged by this file.
-- This function qualifies an account only when it is already marked deleted AND that mark is older than
-- the retention (default 90 days):
--   a) account_deletion_requests.status = 'completed' and completed_at < now() - retention, and/or
--   b) auth.users.deleted_at is not null and deleted_at < now() - retention.
-- A request that is still 'requested' or 'in_progress' is not a deleted account and is not qualified.
--
-- Hard exclusions (never purged, even if marked deleted over 90 days):
--   * 7c71e421-929b-4691-a6bc-cc614ed2a08d
--   * every ops.internal_accounts.user_id (the table itself is never written)
--   * test fixtures: auth.users.raw_app_meta_data->>'test_fixture' = 'true', or public.is_test_account(email)
--     when that function exists.
-- Leave-alone (not copied, not deleted): ops.internal_accounts, public.billing_consents, public.consent_events.
--   billing_consents has no FK by design; consent_events is ON DELETE SET NULL. L1004 does not amend any
--   separate consent-retention rule.
-- Apply via MCP apply_migration only after a gate line names this file's sha256. Do not apply this commit.
-- Rollback of the function (no data yet purged): 20261117010000_p1_25_purge_deleted_accounts_rollback.sql.
-- Restore after a real apply-mode run: docs/p1-25/BACKUP-AND-ROLLBACK.md (from the zz_bak_p1_25_* schema).

CREATE OR REPLACE FUNCTION public.purge_deleted_accounts(
  p_mode text DEFAULT 'dry_run',
  p_retention interval DEFAULT interval '90 days'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'pg_temp'
AS $fn$
DECLARE
  v_mode text;
  v_hardcoded uuid := '7c71e421-929b-4691-a6bc-cc614ed2a08d';
  v_bak_schema text;
  v_has_is_test boolean;
  v_qualifying int := 0;
  v_excluded_hardcoded int := 0;
  v_excluded_internal int := 0;
  v_excluded_fixture int := 0;
  r record;
  v_sql text;
  v_n bigint;
  v_counts jsonb := '{}'::jsonb;
  v_ids jsonb := '[]'::jsonb;
  v_excluded jsonb := '{}'::jsonb;
  v_sources jsonb := '[]'::jsonb;
  v_bak_rel text;
BEGIN
  v_mode := lower(btrim(coalesce(p_mode, '')));
  IF v_mode = 'count_only' THEN v_mode := 'count'; END IF;
  IF v_mode NOT IN ('count', 'dry_run', 'apply') THEN
    RAISE EXCEPTION 'p_mode must be count, count_only, dry_run, or apply';
  END IF;
  IF p_retention IS NULL THEN
    RAISE EXCEPTION 'retention period required (L1004: 90 days)';
  END IF;
  IF p_retention < interval '90 days' THEN
    RAISE EXCEPTION 'retention below 90 days refused (L1004: "Purge deleted accounts after 90 days.")';
  END IF;
  IF to_regclass('ops.internal_accounts') IS NULL THEN
    RAISE EXCEPTION 'ops.internal_accounts is required so staff/test ids can be excluded';
  END IF;

  v_has_is_test := exists (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_test_account'
      AND pg_get_function_identity_arguments(p.oid) = 'p_email text'
  );

  CREATE TEMP TABLE _cand (
    user_id uuid PRIMARY KEY,
    marked_at timestamptz NOT NULL,
    sources text NOT NULL
  ) ON COMMIT DROP;

  EXECUTE $q$
    INSERT INTO _cand (user_id, marked_at, sources)
    SELECT user_id, min(marked_at), string_agg(DISTINCT src, ',' ORDER BY src)
    FROM (
      SELECT r.user_id, r.completed_at AS marked_at, 'account_deletion_requests.completed_at' AS src
      FROM public.account_deletion_requests r
      WHERE r.status = 'completed'
        AND r.completed_at IS NOT NULL
        AND r.completed_at < now() - $1
      UNION ALL
      SELECT u.id, u.deleted_at, 'auth.users.deleted_at'
      FROM auth.users u
      WHERE u.deleted_at IS NOT NULL
        AND u.deleted_at < now() - $1
    ) s
    GROUP BY user_id
  $q$ USING p_retention;

  CREATE TEMP TABLE _classed (
    user_id uuid PRIMARY KEY,
    marked_at timestamptz NOT NULL,
    sources text NOT NULL,
    class text NOT NULL
  ) ON COMMIT DROP;

  v_sql := $q$
    INSERT INTO _classed (user_id, marked_at, sources, class)
    SELECT c.user_id, c.marked_at, c.sources,
      CASE
        WHEN c.user_id = $1 THEN 'excluded_hardcoded'
        WHEN EXISTS (SELECT 1 FROM ops.internal_accounts i WHERE i.user_id = c.user_id) THEN 'excluded_internal_accounts'
        WHEN EXISTS (
          SELECT 1 FROM auth.users u
          WHERE u.id = c.user_id AND u.raw_app_meta_data ->> 'test_fixture' = 'true'
        ) THEN 'excluded_fixture'
  $q$;
  IF v_has_is_test THEN
    v_sql := v_sql || $q$
        WHEN EXISTS (
          SELECT 1 FROM auth.users u
          WHERE u.id = c.user_id AND public.is_test_account(u.email)
        ) THEN 'excluded_fixture'
    $q$;
  END IF;
  v_sql := v_sql || $q$
        ELSE 'qualifying'
      END
    FROM _cand c
  $q$;
  EXECUTE v_sql USING v_hardcoded;

  SELECT
    count(*) FILTER (WHERE class = 'qualifying'),
    count(*) FILTER (WHERE class = 'excluded_hardcoded'),
    count(*) FILTER (WHERE class = 'excluded_internal_accounts'),
    count(*) FILTER (WHERE class = 'excluded_fixture')
  INTO v_qualifying, v_excluded_hardcoded, v_excluded_internal, v_excluded_fixture
  FROM _classed;

  v_excluded := jsonb_build_object(
    'hardcoded_7c71e421', v_excluded_hardcoded,
    'internal_accounts', v_excluded_internal,
    'fixtures', v_excluded_fixture
  );

  IF v_mode <> 'count' THEN
    SELECT coalesce(jsonb_agg(user_id ORDER BY user_id), '[]'::jsonb),
           coalesce(jsonb_agg(jsonb_build_object(
             'user_id', user_id, 'marked_at', marked_at, 'sources', sources
           ) ORDER BY user_id), '[]'::jsonb)
    INTO v_ids, v_sources
    FROM _classed
    WHERE class = 'qualifying';
  END IF;

  -- Tables this function may back up and delete (skip if absent). Never includes
  -- ops.internal_accounts, billing_consents, or consent_events.
  CREATE TEMP TABLE _rels (
    nsp text NOT NULL,
    rel text NOT NULL,
    col text NOT NULL,
    kind text NOT NULL,
    PRIMARY KEY (nsp, rel)
  ) ON COMMIT DROP;

  INSERT INTO _rels (nsp, rel, col, kind) VALUES
    ('public', 'product_events', 'user_id', 'col'),
    ('public', 'client_feedback', 'user_id', 'col'),
    ('public', 'stripe_checkout_claims', 'user_id', 'col'),
    ('public', 'account_deletion_requests', 'user_id', 'col'),
    ('public', 'fg36_rescore_log', 'user_id', 'col'),
    ('public', 'fg36_rescore_backup', 'user_id', 'special_fg36_backup'),
    ('public', 'lumbar_null_backup_20261021_protocols', 'user_id', 'col'),
    ('public', 'lumbar_null_backup_20261021_assessments', 'id', 'special_via_assessment'),
    ('public', 'lumbar_null_backup_20261021_joint_scores', 'assessment_id', 'special_via_assessment'),
    ('public', 'rescore_backup_20261021_assessments', 'user_id', 'col'),
    ('public', 'rescore_backup_20261021_protocols', 'user_id', 'col'),
    ('public', 'rescore_backup_20261021_joint_scores', 'assessment_id', 'special_via_assessment'),
    ('public', 'users', 'id', 'col'),
    ('public', 'assessments', 'user_id', 'col'),
    ('public', 'assessment_drafts', 'user_id', 'col'),
    ('public', 'joint_scores', 'assessment_id', 'special_joint_scores'),
    ('public', 'protocols', 'user_id', 'col'),
    ('public', 'protocol_completions', 'user_id', 'col'),
    ('public', 'protocol_sessions', 'user_id', 'col'),
    ('public', 'notification_preferences', 'user_id', 'col'),
    ('public', 'mood_entries', 'user_id', 'col'),
    ('public', 'mood_settings', 'user_id', 'col'),
    ('public', 'sport_entitlements', 'user_id', 'col'),
    ('public', 'user_mobility_schedule', 'user_id', 'col'),
    ('public', 'body_metrics', 'user_id', 'col'),
    ('public', 'progress_photos', 'user_id', 'col'),
    ('public', 'push_subscriptions', 'user_id', 'col'),
    ('public', 'push_sends', 'user_id', 'col'),
    ('public', 'email_sends', 'user_id', 'col'),
    ('public', 'ai_conversations', 'user_id', 'col'),
    ('public', 'ai_messages', 'user_id', 'col'),
    ('public', 'user_ai_preferences', 'user_id', 'col'),
    ('public', 'athletes', 'user_id', 'col'),
    ('public', 'clients', 'user_id', 'col'),
    ('public', 'coaches', 'user_id', 'col'),
    ('public', 'drill_sessions', 'user_id', 'col'),
    ('public', 'fuel_logs', 'user_id', 'col'),
    ('public', 'game_plans', 'user_id', 'col'),
    ('public', 'mesocycles', 'user_id', 'col'),
    ('public', 'pr_records', 'user_id', 'col'),
    ('public', 'surveys', 'user_id', 'col'),
    ('public', 'technique_eligibility', 'user_id', 'col'),
    ('public', 'user_technique_competency', 'user_id', 'col'),
    ('public', 'workouts', 'user_id', 'col'),
    ('public', 'workout_sets', 'user_id', 'col'),
    ('public', 'renewal_reminders', 'user_id', 'col'),
    ('public', 'alert_dismissals', 'athlete_id', 'col'),
    ('public', 'coach_assignments', 'athlete_user_id', 'col'),
    ('public', 'coach_notes', 'athlete_id', 'col'),
    ('public', 'coach_video_feedback', 'athlete_user_id', 'col'),
    ('auth', 'users', 'id', 'col');

  FOR r IN
    SELECT * FROM _rels
    ORDER BY CASE WHEN nsp = 'auth' AND rel = 'users' THEN 2 ELSE 1 END, nsp, rel
  LOOP
    IF to_regclass(format('%I.%I', r.nsp, r.rel)) IS NULL THEN
      CONTINUE;
    END IF;
    IF r.kind = 'col' AND NOT exists (
      SELECT 1 FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = r.nsp AND c.relname = r.rel AND a.attname = r.col AND a.attnum > 0 AND NOT a.attisdropped
    ) THEN
      CONTINUE;
    END IF;

    IF r.kind = 'col' THEN
      v_sql := format(
        'SELECT count(*) FROM %I.%I t WHERE t.%I IN (SELECT user_id FROM _classed WHERE class = %L)',
        r.nsp, r.rel, r.col, 'qualifying'
      );
    ELSIF r.kind = 'special_joint_scores' THEN
      IF to_regclass('public.assessments') IS NULL THEN CONTINUE; END IF;
      v_sql := format(
        'SELECT count(*) FROM public.joint_scores j
         WHERE j.assessment_id IN (SELECT a.id FROM public.assessments a
           WHERE a.user_id IN (SELECT user_id FROM _classed WHERE class = %L))',
        'qualifying'
      );
    ELSIF r.kind = 'special_via_assessment' THEN
      IF to_regclass('public.assessments') IS NULL THEN
        CONTINUE;
      END IF;
      v_sql := format(
        'SELECT count(*) FROM %I.%I t WHERE t.%I IN (
           SELECT a.id FROM public.assessments a
           WHERE a.user_id IN (SELECT user_id FROM _classed WHERE class = %L)
         )', r.nsp, r.rel, r.col, 'qualifying'
      );
    ELSIF r.kind = 'special_fg36_backup' THEN
      IF exists (
        SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = r.nsp AND c.relname = r.rel AND a.attname = 'user_id' AND a.attnum > 0 AND NOT a.attisdropped
      ) THEN
        v_sql := format(
          'SELECT count(*) FROM %I.%I t WHERE t.user_id IN (SELECT user_id FROM _classed WHERE class = %L)',
          r.nsp, r.rel, 'qualifying'
        );
      ELSIF to_regclass('public.fg36_rescore_log') IS NOT NULL THEN
        v_sql := format(
          'SELECT count(*) FROM %I.%I t WHERE t.run_id IN (
             SELECT l.run_id FROM public.fg36_rescore_log l
             WHERE l.user_id IN (SELECT user_id FROM _classed WHERE class = %L)
           )', r.nsp, r.rel, 'qualifying'
        );
      ELSE
        CONTINUE;
      END IF;
    ELSE
      CONTINUE;
    END IF;

    EXECUTE v_sql INTO v_n;
    v_counts := v_counts || jsonb_build_object(r.nsp || '.' || r.rel, v_n);
  END LOOP;

  IF to_regclass('storage.objects') IS NOT NULL THEN
    v_sql := $q$
      SELECT count(*) FROM storage.objects o
      WHERE o.owner IN (SELECT user_id FROM _classed WHERE class = 'qualifying')
         OR o.owner_id IN (SELECT user_id::text FROM _classed WHERE class = 'qualifying')
    $q$;
    IF to_regclass('public.progress_photos') IS NOT NULL THEN
      v_sql := $q$
        SELECT count(*) FROM storage.objects o
        WHERE o.owner IN (SELECT user_id FROM _classed WHERE class = 'qualifying')
           OR o.owner_id IN (SELECT user_id::text FROM _classed WHERE class = 'qualifying')
           OR o.name IN (
             SELECT p.storage_path FROM public.progress_photos p
             WHERE p.user_id IN (SELECT user_id FROM _classed WHERE class = 'qualifying')
               AND p.storage_path IS NOT NULL
           )
      $q$;
    END IF;
    EXECUTE v_sql INTO v_n;
    v_counts := v_counts || jsonb_build_object('storage.objects', v_n);
  END IF;

  IF v_counts ? 'ops.internal_accounts' OR v_counts ? 'public.billing_consents' OR v_counts ? 'public.consent_events' THEN
    RAISE EXCEPTION 'internal_accounts / billing_consents / consent_events must not be in the purge inventory';
  END IF;

  IF v_mode <> 'apply' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'mode', v_mode,
      'retention', p_retention::text,
      'qualifying_count', v_qualifying,
      'excluded', v_excluded,
      'table_counts', v_counts,
      'ids', CASE WHEN v_mode = 'count' THEN NULL ELSE v_ids END,
      'sources', CASE WHEN v_mode = 'count' THEN NULL ELSE v_sources END,
      'written', false
    );
  END IF;

  v_bak_schema := 'zz_bak_p1_25_' || to_char(timezone('UTC', now()), 'YYYYMMDDHH24MISS');
  EXECUTE format('CREATE SCHEMA %I', v_bak_schema);

  EXECUTE format(
    'CREATE TABLE %I.manifest (
        user_id uuid PRIMARY KEY,
        marked_at timestamptz NOT NULL,
        sources text NOT NULL,
        backed_up_at timestamptz NOT NULL DEFAULT now()
     )', v_bak_schema
  );
  EXECUTE format(
    'INSERT INTO %I.manifest (user_id, marked_at, sources)
     SELECT user_id, marked_at, sources FROM _classed WHERE class = %L',
    v_bak_schema, 'qualifying'
  );

  FOR r IN
    SELECT * FROM _rels
    ORDER BY CASE WHEN nsp = 'auth' AND rel = 'users' THEN 0 ELSE 1 END, nsp, rel
  LOOP
    IF to_regclass(format('%I.%I', r.nsp, r.rel)) IS NULL THEN
      CONTINUE;
    END IF;
    v_bak_rel := r.nsp || '__' || r.rel;
    IF r.kind = 'col' THEN
      v_sql := format(
        'CREATE TABLE %I.%I AS SELECT t.* FROM %I.%I t
         WHERE t.%I IN (SELECT user_id FROM _classed WHERE class = %L)',
        v_bak_schema, v_bak_rel, r.nsp, r.rel, r.col, 'qualifying'
      );
    ELSIF r.kind = 'special_joint_scores' THEN
      IF to_regclass('public.assessments') IS NULL THEN CONTINUE; END IF;
      v_sql := format(
        'CREATE TABLE %I.%I AS SELECT j.* FROM public.joint_scores j
         WHERE j.assessment_id IN (SELECT a.id FROM public.assessments a
           WHERE a.user_id IN (SELECT user_id FROM _classed WHERE class = %L))',
        v_bak_schema, v_bak_rel, 'qualifying'
      );
    ELSIF r.kind = 'special_via_assessment' THEN
      IF to_regclass('public.assessments') IS NULL THEN CONTINUE; END IF;
      v_sql := format(
        'CREATE TABLE %I.%I AS SELECT t.* FROM %I.%I t
         WHERE t.%I IN (SELECT a.id FROM public.assessments a
           WHERE a.user_id IN (SELECT user_id FROM _classed WHERE class = %L))',
        v_bak_schema, v_bak_rel, r.nsp, r.rel, r.col, 'qualifying'
      );
    ELSIF r.kind = 'special_fg36_backup' THEN
      IF exists (
        SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = r.nsp AND c.relname = r.rel AND a.attname = 'user_id' AND a.attnum > 0 AND NOT a.attisdropped
      ) THEN
        v_sql := format(
          'CREATE TABLE %I.%I AS SELECT t.* FROM %I.%I t
           WHERE t.user_id IN (SELECT user_id FROM _classed WHERE class = %L)',
          v_bak_schema, v_bak_rel, r.nsp, r.rel, 'qualifying'
        );
      ELSIF to_regclass('public.fg36_rescore_log') IS NOT NULL THEN
        v_sql := format(
          'CREATE TABLE %I.%I AS SELECT t.* FROM %I.%I t
           WHERE t.run_id IN (SELECT l.run_id FROM public.fg36_rescore_log l
             WHERE l.user_id IN (SELECT user_id FROM _classed WHERE class = %L))',
          v_bak_schema, v_bak_rel, r.nsp, r.rel, 'qualifying'
        );
      ELSE
        CONTINUE;
      END IF;
    ELSE
      CONTINUE;
    END IF;
    EXECUTE v_sql;
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', v_bak_schema, v_bak_rel);
  END LOOP;

  IF to_regclass('storage.objects') IS NOT NULL THEN
    IF to_regclass('public.progress_photos') IS NOT NULL THEN
      v_sql := format(
        'CREATE TABLE %I.storage__objects AS SELECT o.* FROM storage.objects o
         WHERE o.owner IN (SELECT user_id FROM _classed WHERE class = %L)
            OR o.owner_id IN (SELECT user_id::text FROM _classed WHERE class = %L)
            OR o.name IN (
              SELECT p.storage_path FROM public.progress_photos p
              WHERE p.user_id IN (SELECT user_id FROM _classed WHERE class = %L)
                AND p.storage_path IS NOT NULL
            )',
        v_bak_schema, 'qualifying', 'qualifying', 'qualifying'
      );
    ELSE
      v_sql := format(
        'CREATE TABLE %I.storage__objects AS SELECT o.* FROM storage.objects o
         WHERE o.owner IN (SELECT user_id FROM _classed WHERE class = %L)
            OR o.owner_id IN (SELECT user_id::text FROM _classed WHERE class = %L)',
        v_bak_schema, 'qualifying', 'qualifying'
      );
    END IF;
    EXECUTE v_sql;
    EXECUTE format('ALTER TABLE %I.storage__objects ENABLE ROW LEVEL SECURITY', v_bak_schema);
  END IF;

  -- Delete leftover / SET-NULL / no-FK and inventory tables first, then auth.users (cascades the rest).
  FOR r IN
    SELECT * FROM _rels
    WHERE NOT (nsp = 'auth' AND rel = 'users')
    ORDER BY
      CASE rel
        WHEN 'joint_scores' THEN 0
        WHEN 'lumbar_null_backup_20261021_joint_scores' THEN 0
        WHEN 'rescore_backup_20261021_joint_scores' THEN 0
        WHEN 'fg36_rescore_backup' THEN 0
        ELSE 1
      END,
      nsp, rel
  LOOP
    IF to_regclass(format('%I.%I', r.nsp, r.rel)) IS NULL THEN CONTINUE; END IF;
    IF r.kind = 'col' THEN
      v_sql := format(
        'DELETE FROM %I.%I t WHERE t.%I IN (SELECT user_id FROM _classed WHERE class = %L)',
        r.nsp, r.rel, r.col, 'qualifying'
      );
    ELSIF r.kind = 'special_joint_scores' THEN
      IF to_regclass('public.assessments') IS NULL THEN CONTINUE; END IF;
      v_sql := format(
        'DELETE FROM public.joint_scores j
         WHERE j.assessment_id IN (SELECT a.id FROM public.assessments a
           WHERE a.user_id IN (SELECT user_id FROM _classed WHERE class = %L))',
        'qualifying'
      );
    ELSIF r.kind = 'special_via_assessment' THEN
      IF to_regclass('public.assessments') IS NULL THEN CONTINUE; END IF;
      v_sql := format(
        'DELETE FROM %I.%I t WHERE t.%I IN (
           SELECT a.id FROM public.assessments a
           WHERE a.user_id IN (SELECT user_id FROM _classed WHERE class = %L)
         )', r.nsp, r.rel, r.col, 'qualifying'
      );
    ELSIF r.kind = 'special_fg36_backup' THEN
      IF exists (
        SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = r.nsp AND c.relname = r.rel AND a.attname = 'user_id' AND a.attnum > 0 AND NOT a.attisdropped
      ) THEN
        v_sql := format(
          'DELETE FROM %I.%I t WHERE t.user_id IN (SELECT user_id FROM _classed WHERE class = %L)',
          r.nsp, r.rel, 'qualifying'
        );
      ELSIF to_regclass('public.fg36_rescore_log') IS NOT NULL THEN
        v_sql := format(
          'DELETE FROM %I.%I t WHERE t.run_id IN (
             SELECT l.run_id FROM public.fg36_rescore_log l
             WHERE l.user_id IN (SELECT user_id FROM _classed WHERE class = %L)
           )', r.nsp, r.rel, 'qualifying'
        );
      ELSE
        CONTINUE;
      END IF;
    ELSE
      CONTINUE;
    END IF;
    EXECUTE v_sql;
  END LOOP;

  IF to_regclass('storage.objects') IS NOT NULL THEN
    IF to_regclass('public.progress_photos') IS NOT NULL THEN
      v_sql := $q$
        DELETE FROM storage.objects o
        WHERE o.owner IN (SELECT user_id FROM _classed WHERE class = 'qualifying')
           OR o.owner_id IN (SELECT user_id::text FROM _classed WHERE class = 'qualifying')
           OR o.name IN (
             SELECT p.storage_path FROM public.progress_photos p
             WHERE p.user_id IN (SELECT user_id FROM _classed WHERE class = 'qualifying')
               AND p.storage_path IS NOT NULL
           )
      $q$;
    ELSE
      v_sql := $q$
        DELETE FROM storage.objects o
        WHERE o.owner IN (SELECT user_id FROM _classed WHERE class = 'qualifying')
           OR o.owner_id IN (SELECT user_id::text FROM _classed WHERE class = 'qualifying')
      $q$;
    END IF;
    EXECUTE v_sql;
  END IF;

  -- Final: remove the auth row when it is still present. Cascades public.users and ON DELETE CASCADE children
  -- not already removed above. The hardcoded / internal / fixture ids are not in the qualifying set.
  IF to_regclass('auth.users') IS NOT NULL THEN
    EXECUTE $q$
      DELETE FROM auth.users u
      WHERE u.id IN (SELECT user_id FROM _classed WHERE class = 'qualifying')
    $q$;
  END IF;

  IF exists (SELECT 1 FROM _classed WHERE class = 'qualifying' AND user_id = v_hardcoded) THEN
    RAISE EXCEPTION 'refusing to apply: hardcoded excluded id was classified qualifying';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'mode', 'apply',
    'retention', p_retention::text,
    'qualifying_count', v_qualifying,
    'excluded', v_excluded,
    'table_counts', v_counts,
    'ids', v_ids,
    'sources', v_sources,
    'written', true,
    'backup_schema', v_bak_schema
  );
END;
$fn$;

COMMENT ON FUNCTION public.purge_deleted_accounts(text, interval) IS
  'P1-25 / L1004. Jim: "Purge deleted accounts after 90 days." Default dry_run lists ids and counts and writes nothing. count/count_only returns counts only. apply backs up then hard-deletes data for accounts marked deleted (ADR completed_at or auth.users.deleted_at) more than p_retention ago (minimum 90 days). Never touches 7c71e421-929b-4691-a6bc-cc614ed2a08d, ops.internal_accounts, or test fixtures. Execute: postgres and service_role only.';

REVOKE ALL ON FUNCTION public.purge_deleted_accounts(text, interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_deleted_accounts(text, interval) TO postgres, service_role;
