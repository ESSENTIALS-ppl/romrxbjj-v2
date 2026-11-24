-- ROLLBACK for p1_25_purge_w2_queue_from_backup: restores the exact live body (prosrc md5 cb7bde65b246fd50e107f5dcb6571641) from 20261124194129.
CREATE OR REPLACE FUNCTION public.purge_deleted_accounts(p_mode text DEFAULT 'dry_run'::text, p_retention interval DEFAULT '90 days'::interval)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
DECLARE
  v_mode text;
  v_hardcoded uuid := '7c71e421-929b-4691-a6bc-cc614ed2a08d';
  v_bak_schema text;
  v_bak_created timestamptz;
  v_has_is_test boolean;
  v_qualifying int := 0;
  v_excluded_hardcoded int := 0;
  v_excluded_internal int := 0;
  v_excluded_fixture int := 0;
  r record;
  v_ns record;
  v_sql text;
  v_n bigint;
  v_counts jsonb := '{}'::jsonb;
  v_ids jsonb := '[]'::jsonb;
  v_excluded jsonb := '{}'::jsonb;
  v_sources jsonb := '[]'::jsonb;
  v_dropped jsonb := '[]'::jsonb;
  v_bak_rel text;
  v_created timestamptz;
  v_comment text;
  v_has_uid boolean;
  v_has_email boolean;
  v_storage_queued bigint := 0;
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

  -- v3: completed ADR only. Path 2 (auth.users.deleted_at) removed.
  EXECUTE $q$
    INSERT INTO _cand (user_id, marked_at, sources)
    SELECT r.user_id, min(r.completed_at), 'account_deletion_requests.completed_at'
    FROM public.account_deletion_requests r
    WHERE r.status = 'completed'
      AND r.completed_at IS NOT NULL
      AND r.completed_at < now() - $1
    GROUP BY r.user_id
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

  -- Capture emails for qualifying accounts before any auth.users delete (and before inventory
  -- deletes). Sources: auth.users.email, then public.users.email when that column exists.
  -- Email-only tables cannot be matched if both sources are already gone.
  CREATE TEMP TABLE _qual_emails (
    user_id uuid NOT NULL,
    email_norm text NOT NULL,
    PRIMARY KEY (user_id, email_norm)
  ) ON COMMIT DROP;

  IF to_regclass('auth.users') IS NOT NULL AND exists (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth' AND c.relname = 'users' AND a.attname = 'email'
      AND a.attnum > 0 AND NOT a.attisdropped
  ) THEN
    INSERT INTO _qual_emails (user_id, email_norm)
    SELECT c.user_id, lower(btrim(u.email::text))
    FROM _classed c
    JOIN auth.users u ON u.id = c.user_id
    WHERE c.class = 'qualifying'
      AND u.email IS NOT NULL AND btrim(u.email::text) <> ''
    ON CONFLICT DO NOTHING;
  END IF;

  IF to_regclass('public.users') IS NOT NULL AND exists (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'users' AND a.attname = 'email'
      AND a.attnum > 0 AND NOT a.attisdropped
  ) THEN
    INSERT INTO _qual_emails (user_id, email_norm)
    SELECT c.user_id, lower(btrim(u.email::text))
    FROM _classed c
    JOIN public.users u ON u.id = c.user_id
    WHERE c.class = 'qualifying'
      AND u.email IS NOT NULL AND btrim(u.email::text) <> ''
    ON CONFLICT DO NOTHING;
  END IF;

  -- v4 day-90 sweep: any email still recoverable for a qualifying account, from rows still linked
  -- by user id (each source skipped if the table or column is absent). Normally the completion hook
  -- (20261117010100_p1_25_completion_cleanup.sql) already cleared the 5 lists at completion and these
  -- sources were removed with auth.users; this catches anything left behind.
  --   auth.identities.email (user_id), public.athletes.email (user_id), public.clients.email (user_id),
  --   public.leads.email (converted_user_id).
  FOR r IN
    SELECT * FROM (VALUES
      ('auth', 'identities', 'user_id'),
      ('public', 'athletes', 'user_id'),
      ('public', 'clients', 'user_id'),
      ('public', 'leads', 'converted_user_id')
    ) AS s(nsp, rel, col)
  LOOP
    IF to_regclass(format('%I.%I', r.nsp, r.rel)) IS NOT NULL
       AND (SELECT count(*) FROM pg_attribute a
            JOIN pg_class c ON c.oid = a.attrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = r.nsp AND c.relname = r.rel AND a.attname IN (r.col, 'email')
              AND a.attnum > 0 AND NOT a.attisdropped) = 2 THEN
      EXECUTE format(
        'INSERT INTO _qual_emails (user_id, email_norm)
         SELECT t.%I, lower(btrim(t.email::text)) FROM %I.%I t
         WHERE t.%I IN (SELECT user_id FROM _classed WHERE class = %L)
           AND t.email IS NOT NULL AND btrim(t.email::text) <> %L
         ON CONFLICT DO NOTHING',
        r.col, r.nsp, r.rel, r.col, 'qualifying', ''
      );
    END IF;
  END LOOP;

  -- v4 guard: never match an email that still belongs to another account (any auth.users or
  -- public.users row whose id is not qualifying, which includes 7c71e421, internal accounts and fixtures).
  IF to_regclass('auth.users') IS NOT NULL THEN
    DELETE FROM _qual_emails q
    USING auth.users u
    WHERE u.email IS NOT NULL AND lower(btrim(u.email::text)) = q.email_norm
      AND u.id NOT IN (SELECT user_id FROM _classed WHERE class = 'qualifying');
  END IF;
  IF to_regclass('public.users') IS NOT NULL AND exists (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'users' AND a.attname = 'email'
      AND a.attnum > 0 AND NOT a.attisdropped
  ) THEN
    DELETE FROM _qual_emails q
    USING public.users u
    WHERE u.email IS NOT NULL AND lower(btrim(u.email::text)) = q.email_norm
      AND u.id NOT IN (SELECT user_id FROM _classed WHERE class = 'qualifying');
  END IF;

  -- Tables this function may back up and delete (skip if absent or if the named column is absent).
  -- Never includes ops.internal_accounts, billing_consents, or consent_events.
  -- kind 'col': match t.<col> to qualifying user ids.
  -- kind 'uid_or_email': match t.<col> to qualifying ids OR lower(btrim(t.email)) to captured emails.
  -- kind 'email': match lower(btrim(t.<col>)) to captured emails.
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
    ('public', 'leads', 'converted_user_id', 'uid_or_email'),
    ('public', 'sport_pack_waitlist', 'email', 'email'),
    ('public', 'investor_requests', 'email', 'email'),
    ('public', 'partner_inquiries', 'email', 'email'),
    ('public', 'yoga_testers', 'email', 'email'),
    ('public', 'athlete_injuries', 'athlete_user_id', 'col'),
    ('public', 'attendance', 'athlete_user_id', 'col'),
    ('public', 'coach_competitors', 'athlete_user_id', 'col'),
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
    ELSIF r.kind = 'uid_or_email' THEN
      v_has_uid := exists (
        SELECT 1 FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = r.nsp AND c.relname = r.rel AND a.attname = r.col AND a.attnum > 0 AND NOT a.attisdropped
      );
      v_has_email := exists (
        SELECT 1 FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = r.nsp AND c.relname = r.rel AND a.attname = 'email' AND a.attnum > 0 AND NOT a.attisdropped
      );
      IF v_has_uid AND v_has_email THEN
        v_sql := format(
          'SELECT count(*) FROM %I.%I t
           WHERE t.%I IN (SELECT user_id FROM _classed WHERE class = %L)
              OR (t.email IS NOT NULL AND btrim(t.email::text) <> %L
                  AND lower(btrim(t.email::text)) IN (SELECT email_norm FROM _qual_emails))',
          r.nsp, r.rel, r.col, 'qualifying', ''
        );
      ELSIF v_has_uid THEN
        v_sql := format(
          'SELECT count(*) FROM %I.%I t WHERE t.%I IN (SELECT user_id FROM _classed WHERE class = %L)',
          r.nsp, r.rel, r.col, 'qualifying'
        );
      ELSIF v_has_email THEN
        v_sql := format(
          'SELECT count(*) FROM %I.%I t
           WHERE t.email IS NOT NULL AND btrim(t.email::text) <> %L
             AND lower(btrim(t.email::text)) IN (SELECT email_norm FROM _qual_emails)',
          r.nsp, r.rel, ''
        );
      ELSE
        CONTINUE;
      END IF;
    ELSIF r.kind = 'email' THEN
      IF NOT exists (
        SELECT 1 FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = r.nsp AND c.relname = r.rel AND a.attname = r.col AND a.attnum > 0 AND NOT a.attisdropped
      ) THEN
        CONTINUE;
      END IF;
      v_sql := format(
        'SELECT count(*) FROM %I.%I t
         WHERE t.%I IS NOT NULL AND btrim(t.%I::text) <> %L
           AND lower(btrim(t.%I::text)) IN (SELECT email_norm FROM _qual_emails)',
        r.nsp, r.rel, r.col, r.col, '', r.col
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

  -- Apply-mode only: drop any zz_bak_p1_25_* backup older than 7 days. Prefer
  -- _p1_25_backup_meta.created_at, then the schema comment, then the UTC stamp in the name.
  FOR v_ns IN
    SELECT n.nspname, n.oid
    FROM pg_namespace n
    WHERE n.nspname ~ '^zz_bak_p1_25_[0-9]{14}$'
  LOOP
    v_created := NULL;
    IF to_regclass(format('%I._p1_25_backup_meta', v_ns.nspname)) IS NOT NULL THEN
      EXECUTE format('SELECT min(created_at) FROM %I._p1_25_backup_meta', v_ns.nspname) INTO v_created;
    END IF;
    IF v_created IS NULL THEN
      v_comment := obj_description(v_ns.oid, 'pg_namespace');
      IF v_comment IS NOT NULL AND v_comment ~ 'created_at=[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z' THEN
        v_created := (regexp_match(v_comment, 'created_at=([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z)'))[1]::timestamptz;
      END IF;
    END IF;
    IF v_created IS NULL THEN
      -- Parse the 14-digit UTC stamp in the name as ISO-Z so DateStyle cannot reject YYYYMMDDHH24MISS.
      v_created := (
        substr(right(v_ns.nspname, 14), 1, 4) || '-' ||
        substr(right(v_ns.nspname, 14), 5, 2) || '-' ||
        substr(right(v_ns.nspname, 14), 7, 2) || 'T' ||
        substr(right(v_ns.nspname, 14), 9, 2) || ':' ||
        substr(right(v_ns.nspname, 14), 11, 2) || ':' ||
        substr(right(v_ns.nspname, 14), 13, 2) || 'Z'
      )::timestamptz;
    END IF;
    IF v_created < now() - interval '7 days' THEN
      EXECUTE format('DROP SCHEMA %I CASCADE', v_ns.nspname);
      v_dropped := v_dropped || jsonb_build_array(v_ns.nspname);
    END IF;
  END LOOP;

  v_bak_created := now();
  v_bak_schema := 'zz_bak_p1_25_' || to_char(timezone('UTC', v_bak_created), 'YYYYMMDDHH24MISS');
  EXECUTE format('CREATE SCHEMA %I', v_bak_schema);
  EXECUTE format(
    'COMMENT ON SCHEMA %I IS %L',
    v_bak_schema,
    'p1_25_backup created_at=' || to_char(timezone('UTC', v_bak_created), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
  EXECUTE format(
    'CREATE TABLE %I._p1_25_backup_meta (created_at timestamptz PRIMARY KEY)',
    v_bak_schema
  );
  EXECUTE format(
    'INSERT INTO %I._p1_25_backup_meta (created_at) VALUES ($1)',
    v_bak_schema
  ) USING v_bak_created;
  EXECUTE format('ALTER TABLE %I._p1_25_backup_meta ENABLE ROW LEVEL SECURITY', v_bak_schema);

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
      IF NOT exists (
        SELECT 1 FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = r.nsp AND c.relname = r.rel AND a.attname = r.col AND a.attnum > 0 AND NOT a.attisdropped
      ) THEN
        CONTINUE;
      END IF;
      v_sql := format(
        'CREATE TABLE %I.%I AS SELECT t.* FROM %I.%I t
         WHERE t.%I IN (SELECT user_id FROM _classed WHERE class = %L)',
        v_bak_schema, v_bak_rel, r.nsp, r.rel, r.col, 'qualifying'
      );
    ELSIF r.kind = 'uid_or_email' THEN
      v_has_uid := exists (
        SELECT 1 FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = r.nsp AND c.relname = r.rel AND a.attname = r.col AND a.attnum > 0 AND NOT a.attisdropped
      );
      v_has_email := exists (
        SELECT 1 FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = r.nsp AND c.relname = r.rel AND a.attname = 'email' AND a.attnum > 0 AND NOT a.attisdropped
      );
      IF v_has_uid AND v_has_email THEN
        v_sql := format(
          'CREATE TABLE %I.%I AS SELECT t.* FROM %I.%I t
           WHERE t.%I IN (SELECT user_id FROM _classed WHERE class = %L)
              OR (t.email IS NOT NULL AND btrim(t.email::text) <> %L
                  AND lower(btrim(t.email::text)) IN (SELECT email_norm FROM _qual_emails))',
          v_bak_schema, v_bak_rel, r.nsp, r.rel, r.col, 'qualifying', ''
        );
      ELSIF v_has_uid THEN
        v_sql := format(
          'CREATE TABLE %I.%I AS SELECT t.* FROM %I.%I t
           WHERE t.%I IN (SELECT user_id FROM _classed WHERE class = %L)',
          v_bak_schema, v_bak_rel, r.nsp, r.rel, r.col, 'qualifying'
        );
      ELSIF v_has_email THEN
        v_sql := format(
          'CREATE TABLE %I.%I AS SELECT t.* FROM %I.%I t
           WHERE t.email IS NOT NULL AND btrim(t.email::text) <> %L
             AND lower(btrim(t.email::text)) IN (SELECT email_norm FROM _qual_emails)',
          v_bak_schema, v_bak_rel, r.nsp, r.rel, ''
        );
      ELSE
        CONTINUE;
      END IF;
    ELSIF r.kind = 'email' THEN
      IF NOT exists (
        SELECT 1 FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = r.nsp AND c.relname = r.rel AND a.attname = r.col AND a.attnum > 0 AND NOT a.attisdropped
      ) THEN
        CONTINUE;
      END IF;
      v_sql := format(
        'CREATE TABLE %I.%I AS SELECT t.* FROM %I.%I t
         WHERE t.%I IS NOT NULL AND btrim(t.%I::text) <> %L
           AND lower(btrim(t.%I::text)) IN (SELECT email_norm FROM _qual_emails)',
        v_bak_schema, v_bak_rel, r.nsp, r.rel, r.col, r.col, '', r.col
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
      IF NOT exists (
        SELECT 1 FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = r.nsp AND c.relname = r.rel AND a.attname = r.col AND a.attnum > 0 AND NOT a.attisdropped
      ) THEN
        CONTINUE;
      END IF;
      v_sql := format(
        'DELETE FROM %I.%I t WHERE t.%I IN (SELECT user_id FROM _classed WHERE class = %L)',
        r.nsp, r.rel, r.col, 'qualifying'
      );
    ELSIF r.kind = 'uid_or_email' THEN
      v_has_uid := exists (
        SELECT 1 FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = r.nsp AND c.relname = r.rel AND a.attname = r.col AND a.attnum > 0 AND NOT a.attisdropped
      );
      v_has_email := exists (
        SELECT 1 FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = r.nsp AND c.relname = r.rel AND a.attname = 'email' AND a.attnum > 0 AND NOT a.attisdropped
      );
      IF v_has_uid AND v_has_email THEN
        v_sql := format(
          'DELETE FROM %I.%I t
           WHERE t.%I IN (SELECT user_id FROM _classed WHERE class = %L)
              OR (t.email IS NOT NULL AND btrim(t.email::text) <> %L
                  AND lower(btrim(t.email::text)) IN (SELECT email_norm FROM _qual_emails))',
          r.nsp, r.rel, r.col, 'qualifying', ''
        );
      ELSIF v_has_uid THEN
        v_sql := format(
          'DELETE FROM %I.%I t WHERE t.%I IN (SELECT user_id FROM _classed WHERE class = %L)',
          r.nsp, r.rel, r.col, 'qualifying'
        );
      ELSIF v_has_email THEN
        v_sql := format(
          'DELETE FROM %I.%I t
           WHERE t.email IS NOT NULL AND btrim(t.email::text) <> %L
             AND lower(btrim(t.email::text)) IN (SELECT email_norm FROM _qual_emails)',
          r.nsp, r.rel, ''
        );
      ELSE
        CONTINUE;
      END IF;
    ELSIF r.kind = 'email' THEN
      IF NOT exists (
        SELECT 1 FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = r.nsp AND c.relname = r.rel AND a.attname = r.col AND a.attnum > 0 AND NOT a.attisdropped
      ) THEN
        CONTINUE;
      END IF;
      v_sql := format(
        'DELETE FROM %I.%I t
         WHERE t.%I IS NOT NULL AND btrim(t.%I::text) <> %L
           AND lower(btrim(t.%I::text)) IN (SELECT email_norm FROM _qual_emails)',
        r.nsp, r.rel, r.col, r.col, '', r.col
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

  -- Storage files are never deleted with SQL (storage.protect_delete blocks it; files go through the Storage API).
  -- Only when the run found matching objects, queue each object's bucket and path in
  -- public.p1_25_storage_delete_queue for deletion through the Storage API (runbook). Otherwise nothing runs here.
  IF to_regclass('storage.objects') IS NOT NULL AND coalesce((v_counts ->> 'storage.objects')::bigint, 0) > 0 THEN
    IF to_regclass('public.progress_photos') IS NOT NULL THEN
      v_sql := $q$
        INSERT INTO public.p1_25_storage_delete_queue (bucket_id, name)
        SELECT o.bucket_id, o.name FROM storage.objects o
        WHERE o.owner IN (SELECT user_id FROM _classed WHERE class = 'qualifying')
           OR o.owner_id IN (SELECT user_id::text FROM _classed WHERE class = 'qualifying')
           OR o.name IN (
             SELECT p.storage_path FROM public.progress_photos p
             WHERE p.user_id IN (SELECT user_id FROM _classed WHERE class = 'qualifying')
               AND p.storage_path IS NOT NULL
           )
        ON CONFLICT (bucket_id, name) DO NOTHING
      $q$;
    ELSE
      v_sql := $q$
        INSERT INTO public.p1_25_storage_delete_queue (bucket_id, name)
        SELECT o.bucket_id, o.name FROM storage.objects o
        WHERE o.owner IN (SELECT user_id FROM _classed WHERE class = 'qualifying')
           OR o.owner_id IN (SELECT user_id::text FROM _classed WHERE class = 'qualifying')
        ON CONFLICT (bucket_id, name) DO NOTHING
      $q$;
    END IF;
    EXECUTE v_sql;
    GET DIAGNOSTICS v_storage_queued = ROW_COUNT;
  END IF;

  -- Final: remove the auth row when it is still present. Cascades public.users and ON DELETE CASCADE children
  -- not already removed above. The hardcoded / internal / fixture ids are not in the qualifying set.
  -- Emails were captured into _qual_emails before this delete.
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
    'backup_schema', v_bak_schema,
    'backup_created_at', v_bak_created,
    'backup_keep_for', '7 days',
    'dropped_backup_schemas', v_dropped,
    'storage_objects_queued', v_storage_queued
  );
END;
$function$
;
