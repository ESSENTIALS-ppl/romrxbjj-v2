import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const MIG_PATH = process.env.MIG_PATH || '/workspace/p1-22-revoke-anon-execute-20261115/supabase/migrations/20261116040600_p1_22_revoke_anon_execute.sql';
const RB_PATH = process.env.RB_PATH || '/workspace/p1-22-revoke-anon-execute-20261115/supabase/migrations/20261116040600_p1_22_revoke_anon_execute.rollback.sql.txt';
const MIG = fs.readFileSync(MIG_PATH, 'utf8');
const RB = fs.readFileSync(RB_PATH, 'utf8');

const U = '00000000-0000-4000-8000-000000000001';

const GRANTS_SQL = `
SELECT n.nspname AS schema, p.proname AS function,
  pg_catalog.pg_get_function_identity_arguments(p.oid) AS args,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_exec,
  has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_exec,
  has_function_privilege('postgres', p.oid, 'EXECUTE') AS postgres_exec,
  EXISTS (
    SELECT 1 FROM aclexplode(COALESCE(p.proacl, acldefault('f'::"char", p.proowner))) a
    WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'
  ) AS public_exec,
  p.proacl::text AS proacl
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE (n.nspname = 'public' AND p.proname IN ('product_event_kind','record_protocol_completions','tg_protocol_session_completion'))
   OR (n.nspname = 'ops' AND p.proname = 'is_excluded_from_metrics')
ORDER BY 1, 2
`;

function byName(rows) {
  const m = {};
  for (const r of rows) m[`${r.schema}.${r.function}`] = r;
  return m;
}

function flags(r) {
  return {
    anon: !!r.anon_exec,
    authenticated: !!r.authenticated_exec,
    service_role: !!r.service_role_exec,
    postgres: !!r.postgres_exec,
    public: !!r.public_exec,
    proacl: r.proacl,
  };
}

// Exact live grants read 2026-11-15 10:21 PM ET.
const LIVE = {
  'ops.is_excluded_from_metrics': { anon: false, authenticated: false, service_role: true, postgres: true, public: false, proacl: '{postgres=X/postgres,service_role=X/postgres}' },
  'public.product_event_kind': { anon: true, authenticated: true, service_role: true, postgres: true, public: false, proacl: '{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' },
  'public.record_protocol_completions': { anon: true, authenticated: true, service_role: true, postgres: true, public: true, proacl: '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' },
  'public.tg_protocol_session_completion': { anon: true, authenticated: true, service_role: true, postgres: true, public: true, proacl: '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' },
};

const AFTER = {
  anon: false, authenticated: false, service_role: true, postgres: true, public: false,
  proacl: '{postgres=X/postgres,service_role=X/postgres}',
};

function sameFlags(actual, expected, { checkProacl = true } = {}) {
  const mism = [];
  for (const k of ['anon', 'authenticated', 'service_role', 'postgres', 'public']) {
    if (actual[k] !== expected[k]) mism.push(`${k}: got ${actual[k]} want ${expected[k]}`);
  }
  if (checkProacl && expected.proacl && actual.proacl !== expected.proacl) {
    mism.push(`proacl: got ${actual.proacl} want ${expected.proacl}`);
  }
  return mism;
}

async function mk() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA IF NOT EXISTS ops;
    REVOKE ALL ON SCHEMA ops FROM PUBLIC, anon, authenticated;
    GRANT USAGE, CREATE ON SCHEMA ops TO postgres, service_role;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, postgres;
    GRANT USAGE ON SCHEMA ops TO postgres, service_role;

    CREATE TABLE public.users (id uuid PRIMARY KEY);
    CREATE TABLE public.protocol_sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      session_date date NOT NULL,
      protocol_day text,
      logged_at timestamptz DEFAULT now()
    );
    CREATE TABLE public.protocol_completions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid,
      assessment_id uuid,
      exercise_id uuid,
      joint text,
      protocol_session_id uuid,
      completed_at timestamptz DEFAULT now()
    );

    GRANT SELECT, INSERT ON public.protocol_sessions TO authenticated, service_role, anon;
    GRANT SELECT, INSERT ON public.protocol_completions TO authenticated, service_role, anon;
    GRANT SELECT ON public.users TO authenticated, service_role, anon;

    CREATE OR REPLACE FUNCTION ops.is_excluded_from_metrics(p_user_id uuid)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'ops', 'public', 'pg_temp'
    AS $$ SELECT false $$;

    CREATE OR REPLACE FUNCTION public.product_event_kind(p_event text)
    RETURNS text
    LANGUAGE sql
    IMMUTABLE
    SET search_path TO 'pg_catalog', 'pg_temp'
    AS $$ SELECT CASE WHEN p_event = 'email_sent' THEN 'system' ELSE 'user' END $$;

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
    BEGIN
      RETURN 0;
    END;
    $$;

    CREATE OR REPLACE FUNCTION public.tg_protocol_session_completion()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
    BEGIN
      INSERT INTO public.protocol_completions (user_id, joint, protocol_session_id, completed_at)
      VALUES (NEW.user_id, 'tg', NEW.id, COALESCE(NEW.logged_at, now()));
      RETURN NEW;
    END;
    $$;

    DROP TRIGGER IF EXISTS zz_pc_protocol_session ON public.protocol_sessions;
    CREATE TRIGGER zz_pc_protocol_session
      AFTER INSERT OR UPDATE OF session_date, protocol_day ON public.protocol_sessions
      FOR EACH ROW
      EXECUTE FUNCTION public.tg_protocol_session_completion();

    -- Recreate the exact live grant shape (default ACL + 030659 grants).
    REVOKE ALL ON FUNCTION ops.is_excluded_from_metrics(uuid) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION ops.is_excluded_from_metrics(uuid) TO service_role, postgres;

    REVOKE ALL ON FUNCTION public.product_event_kind(text) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.product_event_kind(text) TO postgres, anon, authenticated, service_role;

    GRANT EXECUTE ON FUNCTION public.record_protocol_completions(uuid, uuid, text, uuid[]) TO PUBLIC, postgres, anon, authenticated, service_role;

    GRANT EXECUTE ON FUNCTION public.tg_protocol_session_completion() TO PUBLIC, postgres, anon, authenticated, service_role;

    INSERT INTO public.users(id) VALUES ('${U}');
  `);
  return db;
}

async function grants(db) {
  return byName((await db.query(GRANTS_SQL)).rows);
}

async function callAs(db, role, sql) {
  try {
    await db.exec(`SET ROLE ${role}`);
    const r = await db.query(sql);
    await db.exec('RESET ROLE');
    return { ok: true, rows: r.rows };
  } catch (e) {
    try { await db.exec('RESET ROLE'); } catch { /* ignore */ }
    return { ok: false, code: e.code || null, message: String(e.message || e) };
  }
}

const R = {};
const ok = (k, v, detail) => {
  R[k] = { pass: !!v, ...detail };
  console.log((v ? 'PASS ' : 'FAIL ') + k, JSON.stringify(detail));
};

const db = await mk();

const t0 = flagsCmp(await grants(db), LIVE);
ok('T0_live_grant_shape_recreated', t0.ok, t0.detail);

let err = null;
try { await db.exec(MIG); } catch (e) { err = e.code + ' ' + e.message; }
ok('T1_migration_applies_cleanly', !err, { err });

const after = await grants(db);
const t2d = {};
let t2ok = true;
for (const name of Object.keys(LIVE)) {
  const mism = sameFlags(flags(after[name] || {}), AFTER);
  t2d[name] = { mism, proacl: after[name] && after[name].proacl };
  if (mism.length) t2ok = false;
}
ok('T2_after_apply_grants_service_role_and_postgres_only', t2ok, t2d);

// Anon cannot execute any of the four (privilege + actual call on the three public fns).
const anonKind = await callAs(db, 'anon', `SELECT public.product_event_kind('page_view') AS k`);
const anonRec = await callAs(db, 'anon', `SELECT public.record_protocol_completions('00000000-0000-4000-8000-000000000099'::uuid, NULL::uuid, 'hip', ARRAY[]::uuid[]) AS n`);
const anonTg = await callAs(db, 'anon', `SELECT public.tg_protocol_session_completion()`);
const anonExclPriv = after['ops.is_excluded_from_metrics'].anon_exec === false;
const anonDenied =
  anonKind.ok === false && /permission denied|42501/i.test(anonKind.message) &&
  anonRec.ok === false && /permission denied|42501/i.test(anonRec.message) &&
  anonTg.ok === false && /permission denied|42501|cannot be called/i.test(anonTg.message) &&
  after['public.product_event_kind'].anon_exec === false &&
  after['public.record_protocol_completions'].anon_exec === false &&
  after['public.tg_protocol_session_completion'].anon_exec === false &&
  anonExclPriv;
ok('T3_anon_cannot_execute_any_of_the_four', anonDenied, {
  product_event_kind: anonKind,
  record_protocol_completions: anonRec,
  tg_protocol_session_completion: { ok: anonTg.ok, code: anonTg.code, message: String(anonTg.message).slice(0, 180) },
  is_excluded_anon_exec: after['ops.is_excluded_from_metrics'].anon_exec,
});

// Authenticated: RPC unused, so EXECUTE revoked. App path is table insert, not the RPC.
const authKind = await callAs(db, 'authenticated', `SELECT public.product_event_kind('page_view') AS k`);
const authRec = await callAs(db, 'authenticated', `SELECT public.record_protocol_completions('00000000-0000-4000-8000-000000000099'::uuid, NULL::uuid, 'hip', ARRAY[]::uuid[]) AS n`);
const authTg = await callAs(db, 'authenticated', `SELECT public.tg_protocol_session_completion()`);
const authDenied =
  authKind.ok === false && /permission denied|42501/i.test(authKind.message) &&
  authRec.ok === false && /permission denied|42501/i.test(authRec.message) &&
  authTg.ok === false && /permission denied|42501|cannot be called/i.test(authTg.message) &&
  after['public.product_event_kind'].authenticated_exec === false &&
  after['public.record_protocol_completions'].authenticated_exec === false &&
  after['public.tg_protocol_session_completion'].authenticated_exec === false &&
  after['ops.is_excluded_from_metrics'].authenticated_exec === false;
ok('T4_authenticated_execute_revoked_where_unused', authDenied, {
  product_event_kind: authKind,
  record_protocol_completions: authRec,
  tg_direct_call: { ok: authTg.ok, message: String(authTg.message).slice(0, 180) },
});

// Intended role: service_role can still execute the callable functions.
const srKind = await callAs(db, 'service_role', `SELECT public.product_event_kind('email_sent') AS k, public.product_event_kind('page_view') AS u`);
const srRec = await callAs(db, 'service_role', `SELECT public.record_protocol_completions('00000000-0000-4000-8000-000000000099'::uuid, NULL::uuid, 'hip', ARRAY[]::uuid[]) AS n`);
const srOk =
  srKind.ok && srKind.rows[0].k === 'system' && srKind.rows[0].u === 'user' &&
  srRec.ok && srRec.rows[0].n === 0 &&
  after['public.product_event_kind'].service_role_exec === true &&
  after['public.record_protocol_completions'].service_role_exec === true &&
  after['public.tg_protocol_session_completion'].service_role_exec === true &&
  after['ops.is_excluded_from_metrics'].service_role_exec === true &&
  after['public.product_event_kind'].postgres_exec === true;
ok('T5_service_role_can_still_execute', srOk, { product_event_kind: srKind, record_protocol_completions: srRec });

// Trigger still fires when authenticated inserts a session, without caller EXECUTE on the tg function.
const beforePc = (await db.query(`SELECT count(*)::int AS n FROM public.protocol_completions`)).rows[0].n;
const authIns = await callAs(db, 'authenticated', `INSERT INTO public.protocol_sessions(user_id, session_date, protocol_day) VALUES ('${U}', '2026-11-15', 'P1') RETURNING id`);
const afterPc = (await db.query(`SELECT count(*)::int AS n, count(*) FILTER (WHERE joint = 'tg')::int AS tg_rows FROM public.protocol_completions`)).rows[0];
const sid = authIns.ok ? authIns.rows[0].id : null;
const tgRow = sid ? (await db.query(`SELECT count(*)::int AS n FROM public.protocol_completions WHERE protocol_session_id = $1 AND joint = 'tg'`, [sid])).rows[0].n : 0;
ok('T6_authenticated_session_insert_still_fires_trigger', authIns.ok && tgRow === 1 && afterPc.n === beforePc + 1 && after['public.tg_protocol_session_completion'].authenticated_exec === false, {
  insert_ok: authIns.ok,
  insert_err: authIns.ok ? null : authIns.message,
  session_id: sid,
  trigger_rows_for_session: tgRow,
  completions_before: beforePc,
  completions_after: afterPc.n,
  authenticated_has_execute_on_tg: after['public.tg_protocol_session_completion'].authenticated_exec,
});

// App path: authenticated can still INSERT protocol_completions (MyProtocol.tsx:610).
const authWriter = await callAs(db, 'authenticated', `INSERT INTO public.protocol_completions(user_id, joint, completed_at) VALUES ('${U}', 'hip', '2026-11-15 20:00-05') RETURNING id`);
ok('T6b_authenticated_can_still_insert_protocol_completions', authWriter.ok && !!authWriter.rows[0].id, {
  ok: authWriter.ok,
  err: authWriter.ok ? null : authWriter.message,
});

// Rollback restores exact live grants.
err = null;
try { await db.exec(RB); } catch (e) { err = e.code + ' ' + e.message; }
const rolled = await grants(db);
const t7 = flagsCmp(rolled, LIVE);
ok('T7_rollback_restores_exact_live_grants', !err && t7.ok, { err, ...t7.detail });

const anonKind2 = await callAs(db, 'anon', `SELECT public.product_event_kind('page_view') AS k`);
const anonRec2 = await callAs(db, 'anon', `SELECT public.record_protocol_completions('00000000-0000-4000-8000-000000000099'::uuid, NULL::uuid, 'hip', ARRAY[]::uuid[]) AS n`);
ok('T7b_after_rollback_anon_can_execute_the_three_public_fns_again', anonKind2.ok && anonKind2.rows[0].k === 'user' && anonRec2.ok && rolled['ops.is_excluded_from_metrics'].anon_exec === false, {
  product_event_kind: anonKind2,
  record_protocol_completions: anonRec2,
  is_excluded_anon_exec: rolled['ops.is_excluded_from_metrics'].anon_exec,
});

// Re-apply after rollback is clean; trigger still works.
err = null;
try { await db.exec(MIG); } catch (e) { err = e.code + ' ' + e.message; }
const re = await grants(db);
const t8d = {};
let t8ok = !err;
for (const name of Object.keys(LIVE)) {
  const mism = sameFlags(flags(re[name] || {}), AFTER);
  t8d[name] = mism;
  if (mism.length) t8ok = false;
}
const authIns2 = await callAs(db, 'authenticated', `INSERT INTO public.protocol_sessions(user_id, session_date, protocol_day) VALUES ('${U}', '2026-11-16', 'P2') RETURNING id`);
const sid2 = authIns2.ok ? authIns2.rows[0].id : null;
const tgRow2 = sid2 ? (await db.query(`SELECT count(*)::int AS n FROM public.protocol_completions WHERE protocol_session_id = $1 AND joint = 'tg'`, [sid2])).rows[0].n : 0;
ok('T8_reapply_after_rollback_clean_trigger_still_fires', t8ok && authIns2.ok && tgRow2 === 1, {
  err,
  grants: t8d,
  insert_ok: authIns2.ok,
  trigger_rows: tgRow2,
});

function flagsCmp(got, expected) {
  const detail = {};
  let all = true;
  for (const name of Object.keys(expected)) {
    if (!got[name]) { detail[name] = { missing: true }; all = false; continue; }
    const mism = sameFlags(flags(got[name]), expected[name]);
    detail[name] = { mism, proacl: got[name].proacl };
    if (mism.length) all = false;
  }
  return { ok: all, detail };
}

const failed = Object.entries(R).filter(([, v]) => !v.pass).map(([k]) => k);
const passed = Object.entries(R).filter(([, v]) => v.pass).map(([k]) => k);
console.log(`\n${passed.length}/${Object.keys(R).length} PASS` + (failed.length ? `; FAILED: ${failed.join(', ')}` : ''));
fs.writeFileSync(path.join(here, 'results.json'), JSON.stringify({ passed: passed.length, total: Object.keys(R).length, failed, results: R }, null, 2));
if (failed.length) process.exit(1);
