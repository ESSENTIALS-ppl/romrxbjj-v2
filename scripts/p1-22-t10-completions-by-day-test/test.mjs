// PGlite test for 20261116151000_p1_22_t10_completions_by_day (synthetic data; optional anonymized live replica via LIVE_ROWS=<json>).
// Run: npm i (or link @electric-sql/pglite 0.5.16) && node test.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
const R = new URL('../../', import.meta.url).pathname;
const LIVE = fs.readFileSync(R + 'supabase/migrations/20261116030659_p1_22_retention_measurement.sql', 'utf8');
const MIG = fs.readFileSync(R + 'supabase/migrations-unapplied/20261116151000_p1_22_t10_completions_by_day.sql', 'utf8');
const RB = fs.readFileSync(R + 'supabase/migrations-unapplied/20261116151000_p1_22_t10_completions_by_day_rollback.sql', 'utf8');
const G = 'GRANT SELECT ON ops.user_actions, ops.value_actions, ops.v_real_assessed,';
const s = LIVE.indexOf('CREATE OR REPLACE VIEW ops.user_actions AS');
const e = LIVE.indexOf('TO service_role, postgres;', LIVE.indexOf(G)) + 'TO service_role, postgres;'.length;
const LIVE_METRICS = LIVE.slice(s, e); // live user_actions .. retention_daily + their GRANT, byte for byte
const results = {}; let fails = 0;
const ok = (n, c, info) => { results[n] = { pass: !!c, ...(info ? { info } : {}) }; if (!c) fails++; console.log(`${c ? 'PASS' : 'FAIL'} ${n}${info ? ' ' + JSON.stringify(info) : ''}`); };
const U = (n) => `00000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;
async function mk() {
  const db = new PGlite();
  await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create schema ops;
create table auth.users (id uuid primary key, email varchar, raw_app_meta_data jsonb);
create table ops.internal_accounts (user_id uuid primary key, note text, added_at timestamptz not null default now());
create table public.product_events (id bigserial primary key, user_id uuid, anon_id text, session_id text, event text not null,
  props jsonb not null default '{}'::jsonb, sport text, source text, path text, created_at timestamptz not null default now());
create table public.protocol_sessions (id uuid primary key default gen_random_uuid(), user_id uuid, session_date date, protocol_day text, logged_at timestamptz default now());
create table public.assessments (id uuid primary key default gen_random_uuid(), user_id uuid, assessed_at timestamptz);
create table public.protocol_completions (id uuid primary key default gen_random_uuid(), user_id uuid, assessment_id uuid, exercise_id uuid, joint text,
  completed_at timestamptz default now(), sets_completed int, reps_completed int, difficulty_rating int, pain_rating int, notes text, protocol_session_id uuid);
create table public.notification_preferences (id uuid primary key default gen_random_uuid(), user_id uuid, email_reminders boolean, push_reminders boolean,
  reminder_time text, timezone text, push_subscription jsonb, created_at timestamptz default now(), updated_at timestamptz default now(),
  retest_reminders boolean, weekly_digest boolean, retest_opt_in_at timestamptz, protocol_opt_in_at timestamptz, digest_opt_in_at timestamptz);
create table public.funnel_stub (user_id uuid, first_assessment_at timestamptz, is_test boolean);
create view ops.base_onboarding_funnel as select * from public.funnel_stub;
CREATE OR REPLACE FUNCTION public.is_test_account(p_email text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp' AS $f$
  select lower(coalesce(p_email, '')) ~ '^jim\\+romrx-[a-z0-9._-]+@romrx\\.io$'
     and exists (select 1 from auth.users u where lower(u.email) = lower(p_email) and u.raw_app_meta_data ->> 'test_fixture' = 'true');
$f$;
CREATE OR REPLACE FUNCTION ops.is_excluded_from_metrics(p_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'ops', 'public', 'auth', 'pg_temp' AS $f$
  SELECT p_user_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM ops.internal_accounts i WHERE i.user_id = p_user_id)
      OR EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_user_id AND public.is_test_account(u.email)));
$f$;
set search_path = public;`);
  await db.exec(LIVE_METRICS);
  return db;
}
const meta = async (db, rel) => (await db.query(`select pg_get_userbyid(c.relowner) owner, c.reloptions::text ro, c.relacl::text acl, c.oid::int oid,
  md5(pg_get_viewdef(c.oid, true)) vmd5, (select string_agg(attname||':'||format_type(atttypid,atttypmod), ',' order by attnum) from pg_attribute where attrelid=c.oid and attnum>0) cols
  from pg_class c where c.oid = to_regclass('${rel}')`)).rows[0];
const days = async (db, uid) => (await db.query(`select local_date::text d, raw_rows::int n, tz_used from ops.protocol_completion_days where user_id = $1 order by 1`, [uid])).rows;
const vaComp = async (db, uid) => (await db.query(`select count(*)::int n from ops.value_actions where kind='protocol_completion' and user_id = $1`, [uid])).rows[0].n;
const m1 = async (db) => JSON.stringify((await db.query(`select * from ops.retention_m1 order by day_n`)).rows);
const daily = async (db) => (await db.query(`select count(*)::int n from ops.retention_daily`)).rows[0].n;

// ---------- synthetic scenario ----------
const db = await mk();
const pre = { va: await meta(db, 'ops.value_actions'), m1v: await meta(db, 'ops.retention_m1'), dv: await meta(db, 'ops.retention_daily') };
ok('T0 PGlite reproduces the live value_actions viewdef md5 (758e3d8a…)', pre.va.vmd5 === '758e3d8ad5cd04297470b0a4af8e3d3b', { md5: pre.va.vmd5 });
const X = 'a0000000-0000-4000-8000-000000000001';
await db.exec(`
insert into auth.users values ('${U(1)}','user@example.com','{}'), ('${U(2)}','user@example.com','{}'), ('${U(3)}','jim+romrx-fx@romrx.io','{"test_fixture":true}'), ('${U(4)}','user@example.com','{}'), ('${U(5)}','user@example.com','{}');
insert into public.notification_preferences (user_id, timezone, updated_at) values ('${U(2)}','America/Los_Angeles', now()), ('${U(5)}','Not/AZone', now());
insert into public.funnel_stub values ('${U(1)}', now() - interval '40 days', false), ('${U(2)}', now() - interval '40 days', false), ('${U(3)}', now() - interval '40 days', false), ('${U(4)}', now() - interval '40 days', false);
-- U1 (no stored tz -> America/New_York): one session day 2026-11-20 ET: trigger row + 3 writer rows + an evening-ET writer row at 01:30Z next UTC day
insert into public.protocol_completions (user_id, exercise_id, protocol_session_id, completed_at) values
 ('${U(1)}', null, '${X}', '2026-11-20 14:00Z'),
 ('${U(1)}', gen_random_uuid(), null, '2026-11-20 14:01Z'), ('${U(1)}', gen_random_uuid(), null, '2026-11-20 14:01Z'), ('${U(1)}', gen_random_uuid(), null, '2026-11-20 14:02Z'),
 ('${U(1)}', gen_random_uuid(), null, '2026-11-21 01:30Z'),
-- U1 second local day 2026-11-22: trigger row + 2 writer rows
 ('${U(1)}', null, gen_random_uuid(), '2026-11-22 15:00Z'), ('${U(1)}', gen_random_uuid(), null, '2026-11-22 15:01Z'), ('${U(1)}', gen_random_uuid(), null, '2026-11-22 15:02Z'),
-- U2 stored zone America/Los_Angeles: 20:00Z and 06:30Z+1 are both Nov 20 PT; 09:00Z+1 is Nov 21 PT
 ('${U(2)}', null, gen_random_uuid(), '2026-11-20 20:00Z'), ('${U(2)}', gen_random_uuid(), null, '2026-11-21 06:30Z'), ('${U(2)}', gen_random_uuid(), null, '2026-11-21 09:00Z'),
-- U3 fixture, U4 one row, U5 invalid stored zone -> America/New_York (03:00Z = Nov 19 ET)
 ('${U(3)}', null, gen_random_uuid(), '2026-11-20 14:00Z'), ('${U(4)}', null, gen_random_uuid(), '2026-11-20 14:00Z'), ('${U(5)}', null, gen_random_uuid(), '2026-11-20 03:00Z');
`);
const m1Before = await m1(db); const dailyBefore = await daily(db);
const rawCountsBefore = Object.fromEntries(await Promise.all([1, 2, 3, 4, 5].map(async (i) => [i, await vaComp(db, U(i))])));
await db.exec(MIG);
const post = { va: await meta(db, 'ops.value_actions'), pcd: await meta(db, 'ops.protocol_completion_days'), m1v: await meta(db, 'ops.retention_m1'), dv: await meta(db, 'ops.retention_daily') };
const d1 = await days(db, U(1)), d2 = await days(db, U(2));
ok('T1 session-level row + 3 per-movement rows (+ an evening-ET row) on one local day count as 1', d1[0].d === '2026-11-20' && d1[0].n === 5, { day: d1[0] });
ok('T2 two different local days count as 2', d1.length === 2 && d1[1].d === '2026-11-22' && d1[1].n === 3 && (await vaComp(db, U(1))) === 2, { days: d1.map((x) => x.d), value_actions_rows_before: rawCountsBefore[1] });
const utcDays = (await db.query(`select count(distinct (completed_at at time zone 'UTC')::date)::int n from public.protocol_completions where user_id=$1 and completed_at < '2026-11-22'`, [U(1)])).rows[0].n;
ok('T3a ET day boundary: 01:30Z belongs to the prior ET day (a UTC count would give 2 days)', utcDays === 2 && d1.filter((x) => x.d <= '2026-11-21').length === 1);
ok('T3b stored zone America/Los_Angeles honored (Nov 20 PT has 2 rows, Nov 21 PT 1 row)', JSON.stringify(d2.map((x) => [x.d, x.n, x.tz_used])) === JSON.stringify([['2026-11-20', 2, 'America/Los_Angeles'], ['2026-11-21', 1, 'America/Los_Angeles']]));
const d5 = await days(db, U(5));
ok('T3c invalid stored zone falls back to America/New_York', d5.length === 1 && d5[0].tz_used === 'America/New_York' && d5[0].d === '2026-11-19');
ok('T4 fixtures excluded (no days, no value_actions completion rows)', (await days(db, U(3))).length === 0 && (await vaComp(db, U(3))) === 0, { fixture_rows_before: rawCountsBefore[3] });
await db.exec(`insert into ops.internal_accounts (user_id) values ('${U(4)}')`);
ok('T4b ops.internal_accounts excluded', (await days(db, U(4))).length === 0);
await db.exec(`delete from ops.internal_accounts`); // synthetic scratch DB only
ok('T5 value_actions: same columns, owner, grants, reloptions, oid', post.va.cols === pre.va.cols && post.va.owner === pre.va.owner && post.va.acl === pre.va.acl && post.va.ro === pre.va.ro && post.va.oid === pre.va.oid, { cols: post.va.cols, acl: post.va.acl, md5_after: post.va.vmd5 });
ok('T6 new view grants: service_role SELECT only (+postgres owner), no anon/authenticated', post.pcd.acl === '{postgres=arwdDxtm/postgres,service_role=r/postgres}' && post.pcd.owner === 'postgres', { acl: post.pcd.acl, cols: post.pcd.cols, md5: post.pcd.vmd5 });
ok('T7 dependents unbroken: retention_m1 and retention_daily keep oid/md5 and still query', post.m1v.oid === pre.m1v.oid && post.m1v.vmd5 === pre.m1v.vmd5 && post.dv.vmd5 === pre.dv.vmd5 && (await daily(db)) === dailyBefore);
ok('T8 M1 answers identical for non-excluded users', (await m1(db)) === m1Before, { m1: JSON.parse(await m1(db)) });
// rollback
await db.exec(RB);
const rb = await meta(db, 'ops.value_actions');
ok('T9 rollback restores live value_actions viewdef byte for byte (pg_get_viewdef text equal, md5 758e3d8a…) and oid/columns/grants', rb.vmd5 === pre.va.vmd5 && rb.oid === pre.va.oid && rb.cols === pre.va.cols && rb.acl === pre.va.acl && rb.ro === pre.va.ro, { md5: rb.vmd5 });
ok('T9b rollback drops ops.protocol_completion_days and restores per-row counts', (await meta(db, 'ops.protocol_completion_days')) === undefined && (await vaComp(db, U(1))) === rawCountsBefore[1] && (await m1(db)) === m1Before);
await db.exec(MIG);
ok('T10 re-apply after rollback is clean', (await meta(db, 'ops.value_actions')).vmd5 === post.va.vmd5);

// ---------- anonymized live replica (22 rows) ----------
if (process.env.LIVE_ROWS) {
  const rows = JSON.parse(fs.readFileSync(process.env.LIVE_ROWS, 'utf8'));
  const L = await mk();
  const ids = [...new Set(rows.map((r) => r.uh))]; const uid = (h) => U(50 + ids.indexOf(h));
  for (const h of ids) {
    const tz = rows.find((r) => r.uh === h).stored_tz;
    await L.query(`insert into auth.users values ($1,'user@example.com','{}')`, [uid(h)]);
    if (tz) await L.query(`insert into public.notification_preferences (user_id, timezone) values ($1,$2)`, [uid(h), tz]);
  }
  for (const r of rows) await L.query(`insert into public.protocol_completions (user_id, exercise_id, protocol_session_id, completed_at) values ($1, ${r.session_level ? 'null' : 'gen_random_uuid()'}, ${r.has_sid ? 'gen_random_uuid()' : 'null'}, $2)`, [uid(r.uh), r.completed_at]);
  const before = (await L.query(`select count(*)::int n from ops.value_actions where kind='protocol_completion'`)).rows[0].n;
  await L.exec(MIG);
  const after = (await L.query(`select count(*)::int n from ops.value_actions where kind='protocol_completion'`)).rows[0].n;
  const dd = (await L.query(`select count(*)::int days, sum(raw_rows)::int rows, max(raw_rows)::int max_rows from ops.protocol_completion_days`)).rows[0];
  ok('T11 live replica: 22 rows give the same completion counts as today (no doubles yet)', rows.length === 22 && before === 22 && after === 22 && dd.days === 22 && dd.max_rows === 1, { rows: rows.length, before, after, ...dd });
}
const ver = (await db.query('select version() v')).rows[0].v;
fs.writeFileSync(new URL('./results.json', import.meta.url), JSON.stringify({ engine: ver, results, fails }, null, 1) + '\n');
console.log(fails ? `${fails} FAIL` : `ALL ${Object.keys(results).length} PASS`);
process.exit(fails ? 1 : 0);
