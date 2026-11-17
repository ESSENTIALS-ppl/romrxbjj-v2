-- 20261117010100_p1_25_completion_cleanup (UNAPPLIED; BUILD ONLY). P1-25 v4.
-- P1-25 / L1004. Jim, verbatim, 2026-11-03 7:07 PM ET: "Purge deleted accounts after 90 days."
-- Grant's call (a): no stored email hash. Clear the email-matched lists AT COMPLETION instead.
--
-- Where completion happens today (read 2026-11-16, project cqzvqzwwevnflinxgnpp): MANUAL SQL by the privacy
-- team per process/batches/staged/docs/PRIVACY-DELETION-EXPORT-RUNBOOK.md section A (steps 2-4: erase the
-- safety copies, verify, then remove the live data and the account; line 118: status goes 'completed'
-- after step 4). No live edge function or SQL function sets status = 'completed' or deletes auth.users /
-- public.users; only the account_deletion_requests_touch trigger stamps completed_at; no cron job does it.
--
-- This file adds (all SECURITY DEFINER, EXECUTE for service_role only):
--   public.p1_25_exclusion_class(uuid) -> text       null, or the reason the account is excluded
--   public.p1_25_account_emails(uuid)  -> text[]     lower(btrim()) emails still recoverable for the account
--   public.p1_25_cleanup_at_completion(uuid, text)   clears leads + 4 pre-account lists (dry_run default)
--   public.p1_25_complete_account_deletion(uuid, text)
--       ONE call = ONE transaction: cleanup, then DELETE public.users, then DELETE auth.users
--       (ON DELETE CASCADE children go with it), then mark the request 'completed'. Any error in any
--       step (including the cleanup) aborts the whole call, so the request stays open and nothing is
--       erased. Default p_mode is 'dry_run' (counts only, writes nothing).
-- It does NOT touch: Stripe, Resend, Storage files (Storage API), auth.audit_log_entries, auth.flow_state,
-- platform logs, ops.internal_accounts, public.billing_consents, public.consent_events. Those stay manual
-- or are kept, as in the runbook and receipt v3. The safety-copy erase + second-person verify
-- (runbook steps 2-3) must still be done BEFORE this call.
-- Exclusions (refused with an error, nothing changes): 7c71e421-929b-4691-a6bc-cc614ed2a08d, every
-- ops.internal_accounts.user_id, and test fixtures (raw_app_meta_data.test_fixture = true, or
-- public.is_test_account(email) when it exists).
-- An email that still belongs to ANOTHER account (auth.users or public.users with a different id) is never
-- used to match, so other people's rows are untouched.
-- Apply via MCP apply_migration only after a gate line names this file's sha256. Do not apply this commit.
-- Rollback: 20261117010100_p1_25_completion_cleanup_rollback.sql (drops the four functions only).

CREATE OR REPLACE FUNCTION public.p1_25_exclusion_class(p_user uuid) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'pg_temp'
AS $fn$
DECLARE
  v_email text;
  v_fix boolean := false;
BEGIN
  IF p_user IS NULL THEN RAISE EXCEPTION 'user id required'; END IF;
  IF p_user = '7c71e421-929b-4691-a6bc-cc614ed2a08d'::uuid THEN RETURN 'excluded_hardcoded'; END IF;
  IF to_regclass('ops.internal_accounts') IS NULL THEN
    RAISE EXCEPTION 'ops.internal_accounts is required so staff/test ids can be excluded';
  END IF;
  IF EXISTS (SELECT 1 FROM ops.internal_accounts i WHERE i.user_id = p_user) THEN
    RETURN 'excluded_internal_accounts';
  END IF;
  IF to_regclass('auth.users') IS NOT NULL THEN
    SELECT u.email::text, coalesce(u.raw_app_meta_data ->> 'test_fixture', '') = 'true'
      INTO v_email, v_fix
    FROM auth.users u WHERE u.id = p_user;
    IF coalesce(v_fix, false) THEN RETURN 'excluded_fixture'; END IF;
    IF v_email IS NOT NULL AND EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'is_test_account'
        AND pg_get_function_identity_arguments(p.oid) = 'p_email text'
    ) THEN
      EXECUTE 'SELECT public.is_test_account($1)' INTO v_fix USING v_email;
      IF coalesce(v_fix, false) THEN RETURN 'excluded_fixture'; END IF;
    END IF;
  END IF;
  RETURN NULL;
END
$fn$;

CREATE OR REPLACE FUNCTION public.p1_25_account_emails(p_user uuid) RETURNS text[]
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'pg_temp'
AS $fn$
DECLARE
  r record;
  v_found text[];
  v_all text[] := '{}';
BEGIN
  IF p_user IS NULL THEN RAISE EXCEPTION 'user id required'; END IF;
  -- Sources, each skipped if the table or a column is absent. Column names are not guessed.
  FOR r IN
    SELECT * FROM (VALUES
      ('auth', 'users', 'id'),
      ('public', 'users', 'id'),
      ('auth', 'identities', 'user_id'),
      ('public', 'athletes', 'user_id'),
      ('public', 'clients', 'user_id'),
      ('public', 'leads', 'converted_user_id')
    ) AS s(nsp, rel, col)
  LOOP
    IF to_regclass(format('%I.%I', r.nsp, r.rel)) IS NULL THEN CONTINUE; END IF;
    IF (SELECT count(*) FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = r.nsp AND c.relname = r.rel AND a.attname IN (r.col, 'email')
          AND a.attnum > 0 AND NOT a.attisdropped) <> 2 THEN
      CONTINUE;
    END IF;
    EXECUTE format(
      'SELECT coalesce(array_agg(DISTINCT lower(btrim(t.email::text))), %L::text[]) FROM %I.%I t
       WHERE t.%I = $1 AND t.email IS NOT NULL AND btrim(t.email::text) <> %L',
      '{}', r.nsp, r.rel, r.col, ''
    ) INTO v_found USING p_user;
    v_all := v_all || v_found;
  END LOOP;

  SELECT coalesce(array_agg(DISTINCT e ORDER BY e), '{}') INTO v_all FROM unnest(v_all) AS e;

  -- Never match an email that still belongs to another account.
  IF to_regclass('auth.users') IS NOT NULL THEN
    SELECT coalesce(array_agg(e ORDER BY e), '{}') INTO v_all FROM unnest(v_all) AS e
    WHERE NOT EXISTS (SELECT 1 FROM auth.users u
                      WHERE u.id <> p_user AND u.email IS NOT NULL AND lower(btrim(u.email::text)) = e);
  END IF;
  IF to_regclass('public.users') IS NOT NULL AND EXISTS (
    SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'users' AND a.attname = 'email' AND a.attnum > 0 AND NOT a.attisdropped
  ) THEN
    EXECUTE 'SELECT coalesce(array_agg(e ORDER BY e), ''{}'') FROM unnest($1) AS e
             WHERE NOT EXISTS (SELECT 1 FROM public.users u
                               WHERE u.id <> $2 AND u.email IS NOT NULL AND lower(btrim(u.email::text)) = e)'
      INTO v_all USING v_all, p_user;
  END IF;
  RETURN v_all;
END
$fn$;

CREATE OR REPLACE FUNCTION public.p1_25_cleanup_at_completion(
  p_user uuid,
  p_mode text DEFAULT 'dry_run'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'pg_temp'
AS $fn$
DECLARE
  v_mode text := lower(btrim(coalesce(p_mode, '')));
  v_excl text;
  v_emails text[];
  r record;
  v_sql text;
  v_n bigint;
  v_counts jsonb := '{}'::jsonb;
BEGIN
  IF v_mode NOT IN ('dry_run', 'apply') THEN RAISE EXCEPTION 'p_mode must be dry_run or apply'; END IF;
  IF p_user IS NULL THEN RAISE EXCEPTION 'user id required'; END IF;
  v_excl := public.p1_25_exclusion_class(p_user);
  IF v_excl IS NOT NULL THEN
    RAISE EXCEPTION 'account is excluded (%): completion cleanup refused', v_excl;
  END IF;
  IF to_regclass('public.account_deletion_requests') IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.account_deletion_requests d
    WHERE d.user_id = p_user AND d.status IN ('requested', 'in_progress')
  ) THEN
    RAISE EXCEPTION 'no open deletion request for this account: completion cleanup refused';
  END IF;

  v_emails := public.p1_25_account_emails(p_user);

  FOR r IN
    SELECT * FROM (VALUES
      ('leads', 'converted_user_id'),
      ('sport_pack_waitlist', NULL),
      ('investor_requests', NULL),
      ('partner_inquiries', NULL),
      ('yoga_testers', NULL)
    ) AS s(rel, uidcol)
  LOOP
    IF to_regclass(format('public.%I', r.rel)) IS NULL THEN CONTINUE; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = r.rel AND a.attname = 'email' AND a.attnum > 0 AND NOT a.attisdropped
    ) THEN
      RAISE EXCEPTION 'public.% has no email column: completion cleanup refused', r.rel;
    END IF;
    v_sql := format(
      'FROM public.%I t WHERE (t.email IS NOT NULL AND lower(btrim(t.email::text)) = ANY ($1))', r.rel);
    IF r.uidcol IS NOT NULL THEN
      v_sql := v_sql || format(' OR t.%I = $2', r.uidcol);
    END IF;
    IF v_mode = 'apply' THEN
      EXECUTE 'DELETE ' || v_sql USING v_emails, p_user;
      GET DIAGNOSTICS v_n = ROW_COUNT;
    ELSE
      EXECUTE 'SELECT count(*) ' || v_sql INTO v_n USING v_emails, p_user;
    END IF;
    v_counts := v_counts || jsonb_build_object('public.' || r.rel, v_n);
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true, 'mode', v_mode, 'emails_matched', coalesce(array_length(v_emails, 1), 0),
    'table_counts', v_counts, 'written', v_mode = 'apply'
  );
END
$fn$;

CREATE OR REPLACE FUNCTION public.p1_25_complete_account_deletion(
  p_request_id uuid,
  p_mode text DEFAULT 'dry_run'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'pg_temp'
AS $fn$
DECLARE
  v_mode text := lower(btrim(coalesce(p_mode, '')));
  v_req record;
  v_excl text;
  v_cleanup jsonb;
  v_pub bigint := 0;
  v_auth bigint := 0;
  v_done timestamptz;
BEGIN
  IF v_mode NOT IN ('dry_run', 'apply') THEN RAISE EXCEPTION 'p_mode must be dry_run or apply'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'request id required'; END IF;

  SELECT d.id, d.user_id, d.status INTO v_req
  FROM public.account_deletion_requests d WHERE d.id = p_request_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'deletion request not found'; END IF;
  IF v_req.status NOT IN ('requested', 'in_progress') THEN
    RAISE EXCEPTION 'deletion request is %, not open: refused', v_req.status;
  END IF;
  v_excl := public.p1_25_exclusion_class(v_req.user_id);
  IF v_excl IS NOT NULL THEN
    RAISE EXCEPTION 'account is excluded (%): completion refused', v_excl;
  END IF;

  -- 1) Email-matched cleanup FIRST, while auth.users / public.users still hold the email.
  v_cleanup := public.p1_25_cleanup_at_completion(v_req.user_id, v_mode);

  IF v_mode = 'dry_run' THEN
    SELECT count(*) INTO v_pub FROM public.users WHERE id = v_req.user_id;
    SELECT count(*) INTO v_auth FROM auth.users WHERE id = v_req.user_id;
    RETURN jsonb_build_object(
      'ok', true, 'mode', 'dry_run', 'request_status', v_req.status,
      'cleanup', v_cleanup, 'public_users', v_pub, 'auth_users', v_auth, 'written', false
    );
  END IF;

  -- 2) The existing manual deletes (runbook step 4): live account rows. CASCADE children go with them.
  DELETE FROM public.users WHERE id = v_req.user_id;
  GET DIAGNOSTICS v_pub = ROW_COUNT;
  DELETE FROM auth.users WHERE id = v_req.user_id;
  GET DIAGNOSTICS v_auth = ROW_COUNT;

  -- 3) Mark completed (the touch trigger stamps completed_at).
  UPDATE public.account_deletion_requests SET status = 'completed' WHERE id = v_req.id
  RETURNING completed_at INTO v_done;

  RETURN jsonb_build_object(
    'ok', true, 'mode', 'apply', 'cleanup', v_cleanup,
    'public_users', v_pub, 'auth_users', v_auth,
    'request_status', 'completed', 'completed_at', v_done, 'written', true
  );
END
$fn$;

REVOKE ALL ON FUNCTION public.p1_25_exclusion_class(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.p1_25_account_emails(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.p1_25_cleanup_at_completion(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.p1_25_complete_account_deletion(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.p1_25_exclusion_class(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.p1_25_account_emails(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.p1_25_cleanup_at_completion(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.p1_25_complete_account_deletion(uuid, text) TO service_role;
