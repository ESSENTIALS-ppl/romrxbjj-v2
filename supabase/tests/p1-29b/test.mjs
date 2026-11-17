// P1-29b: coach_linked_athletes helper + coach_roster narrowing. PGlite, synthetic data only.
// No live reads or writes. Replays P1-29 (ae58b91f, SQL sha256 b4861884...) first, because
// main does not carry P1-29, then applies P1-29b. Run: npm install && node test.mjs
import { PGlite } from '@electric-sql/pglite';
import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const P129_COMMIT = 'ae58b91f316ca757d130a612a30c05a620e6fee3';
const P129_PATH = 'supabase/migrations/20261117020100_p1_29_coach_roster_security_invoker.sql';
const P129_SHA = 'b4861884e9b69c0fb06680a12801c50a91b10020204c1dd128221f42b19d16d9';
const P129 = process.env.P1_29_SQL
  ? fs.readFileSync(process.env.P1_29_SQL, 'utf8')
  : execFileSync('git', ['-C', repo, 'show', `${P129_COMMIT}:${P129_PATH}`], { encoding: 'utf8' });
const MIG = fs.readFileSync(path.join(repo, 'supabase/migrations/20261117020300_p1_29b_coach_linked_athletes.sql'), 'utf8');
const ROLL = fs.readFileSync(path.join(repo, 'supabase/migrations/20261117020300_p1_29b_coach_linked_athletes.rollback.sql.txt'), 'utf8');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

const C = 'eeeeeeee-0000-4000-8000-0000000000c1'; // linked coach
const F = 'eeeeeeee-0000-4000-8000-0000000000f1'; // coach with no athletes
const D = 'eeeeeeee-0000-4000-8000-0000000000d1'; // athlete linked to C
const E = 'eeeeeeee-0000-4000-8000-0000000000e1'; // athlete with no coach
const SA = 'eeeeeeee-0000-4000-8000-0000000000a1'; // school admin
const SU = 'eeeeeeee-0000-4000-8000-0000000000b1'; // school member
const COACH_C = 'ffffffff-0000-4000-8000-0000000000c1';
const COACH_F = 'ffffffff-0000-4000-8000-0000000000f1';
const ATH_D = 'ffffffff-0000-4000-8000-0000000000d1';
const ATH_E = 'ffffffff-0000-4000-8000-0000000000e1';
const SCHOOL = 'ffffffff-0000-4000-8000-0000000000a1';

const PERSONAS = {
  anon: { role: 'anon', claims: { role: 'anon' } },
  coach_C: { role: 'authenticated', claims: { sub: C, role: 'authenticated' } },
  coach_F_unlinked: { role: 'authenticated', claims: { sub: F, role: 'authenticated' } },
  athlete_D: { role: 'authenticated', claims: { sub: D, role: 'authenticated' } },
  athlete_E: { role: 'authenticated', claims: { sub: E, role: 'authenticated' } },
  school_admin_SA: { role: 'authenticated', claims: { sub: SA, role: 'authenticated' } },
  service_role: { role: 'service_role', claims: { role: 'service_role' } },
};

async function asP(db, name, fn) {
  const p = PERSONAS[name];
  await db.exec('begin');
  try {
    await db.query(
      `select set_config('request.jwt.claims',$1,true), set_config('request.jwt.claim.sub',$2,true), set_config('request.jwt.claim.role',$3,true)`,
      [JSON.stringify(p.claims), p.claims.sub || '', p.claims.role || ''],
    );
    await db.exec(`set local role ${p.role}`);
    return await fn();
  } catch (e) {
    return { err: (e.code || '') + ':' + String(e.message || '').slice(0, 80) };
  } finally {
    await db.exec('rollback');
  }
}

const q = (db, name, sql) => asP(db, name, async () => {
  const r = await db.query(sql);
  return { cols: r.fields.map((f) => f.name), rows: r.rows };
});

const usersAll = (db, name) => q(db, name, `select * from public.users order by id`);
const usersSensitive = (db, name, id) => q(db, name, `select id, email, stripe_customer_id, stripe_subscription_id, base_stripe_subscription_id, gender, age_bucket from public.users where id = '${id}'`);
const roster = (db, name) => q(db, name, `select * from public.coach_roster order by athlete_id`);
const helper = (db, name) => q(db, name, `select * from public.coach_linked_athletes() order by id`);

async function setup(db) {
  await db.exec(`
    set check_function_bodies=off;
    create role anon nologin noinherit;
    create role authenticated nologin noinherit;
    create role service_role nologin noinherit bypassrls;
    create schema auth;
    grant usage on schema public, auth to anon, authenticated, service_role;
    -- live default ACL for functions in public (pg_default_acl, read-only 2026-11-16)
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
    $$;
    grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;
    create table public.schools (id uuid primary key, admin_id uuid);
    -- users: subset of live columns incl. the sensitive ones named in the Vera/Stacy WARN
    create table public.users (
      id uuid primary key,
      email text not null,
      full_name text,
      belt text,
      school_id uuid,
      subscription_status text not null default 'none',
      stripe_customer_id text,
      stripe_subscription_id text,
      base_stripe_subscription_id text,
      gender text,
      age_bucket text,
      height_bucket text,
      weight_bucket text
    );
    create table public.coaches (id uuid primary key, user_id uuid not null unique);
    create table public.athletes (id uuid primary key, user_id uuid not null unique, coach_id uuid);
    alter table public.users enable row level security;
    alter table public.coaches enable row level security;
    alter table public.athletes enable row level security;
    alter table public.schools enable row level security;
    grant select on public.users, public.coaches, public.athletes, public.schools to anon, authenticated, service_role;
    -- live policies (pg_policies, read-only 2026-11-16)
    create policy "athletes_service_role_all" on public.athletes for all to public using (((auth.jwt() ->> 'role') = 'service_role'));
    create policy "athletes_select_own" on public.athletes for select to public using (auth.uid() = user_id);
    create policy "coaches_select_athletes" on public.athletes for select to public using (exists (select 1 from public.coaches c where c.user_id = auth.uid() and c.id = athletes.coach_id));
    create policy "coaches: service role" on public.coaches for all to public using (current_setting('role') = 'service_role');
    create policy "coaches_own" on public.coaches for all to public using (user_id = auth.uid());
    create policy "schools: admin owns" on public.schools for all to public using ((select auth.uid()) = admin_id);
    create policy "users: service role full access" on public.users for all to public using (current_setting('role') = 'service_role');
    create policy "users: school admin reads school users" on public.users for select to public using (exists (select 1 from public.schools s where s.admin_id = (select auth.uid()) and s.id = users.school_id));
    create policy "users: self read" on public.users for select to public using ((select auth.uid()) = id);
    -- live view (pre P1-29): security_barrier only
    create view public.coach_roster
      with (security_barrier=true) as
      select a.id as athlete_id, a.user_id, u.full_name, u.belt
      from public.athletes a
      join public.coaches c on c.id = a.coach_id
      join public.users u on u.id = a.user_id
      where c.user_id = auth.uid();
    grant select on public.coach_roster to authenticated, service_role;
    insert into public.schools(id, admin_id) values ('${SCHOOL}', '${SA}');
    insert into public.users(id, email, full_name, belt, school_id, stripe_customer_id, stripe_subscription_id, base_stripe_subscription_id, gender, age_bucket) values
      ('${C}',  'user@example.com',  'Coach C',   'black', null, null, null, null, null, null),
      ('${F}',  'user@example.com',  'Coach F',   'brown', null, null, null, null, null, null),
      ('${D}',  'user@example.com',  'Athlete D', 'blue',  null, 'cus_TESTD', 'sub_TESTD', 'sub_BASED', 'x', '25-34'),
      ('${E}',  'user@example.com',  'Athlete E', 'white', null, 'cus_TESTE', null, null, 'y', '35-44'),
      ('${SA}', 'user@example.com', 'Admin SA',  'black', null, null, null, null, null, null),
      ('${SU}', 'user@example.com', 'Member SU', 'white', '${SCHOOL}', null, null, null, null, null);
    insert into public.coaches(id, user_id) values ('${COACH_C}', '${C}'), ('${COACH_F}', '${F}');
    insert into public.athletes(id, user_id, coach_id) values
      ('${ATH_D}', '${D}', '${COACH_C}'),
      ('${ATH_E}', '${E}', null);
  `);
}

const results = [];
function rec(name, ok, detail) {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
}
const J = (x) => JSON.stringify(x);
const isDenied = (r) => !!(r && r.err && /42501/.test(r.err));

async function freshP129() {
  const db = new PGlite();
  await setup(db);
  await db.exec(P129);
  return db;
}

async function snapshot(db) {
  const s = {};
  for (const p of Object.keys(PERSONAS)) {
    s[p] = { users: await usersAll(db, p), roster: await roster(db, p) };
  }
  s.viewdef = (await db.query(`select pg_get_viewdef('public.coach_roster'::regclass, true) d`)).rows[0].d;
  s.reloptions = (await db.query(`select reloptions from pg_class where oid='public.coach_roster'::regclass`)).rows[0].reloptions;
  s.policies = (await db.query(`select policyname, cmd, roles::text, qual from pg_policies where schemaname='public' and tablename='users' order by policyname`)).rows;
  return s;
}

// The core leak check: a coach selecting athlete D's users row (any column) must get 0 rows.
async function coachDirectUsersIsZero(db) {
  const a = await usersSensitive(db, 'coach_C', D);
  const b = await q(db, 'coach_C', `select * from public.users where id = '${D}'`);
  const c = await q(db, 'coach_C', `select count(*)::int n from public.users where id <> '${C}'`);
  return { ok: !a.err && a.rows.length === 0 && !b.err && b.rows.length === 0 && !c.err && c.rows[0].n === 0, detail: { sensitive: a.rows ? a.rows.length : a, star: b.rows ? b.rows.length : b, others: c.rows ? c.rows[0].n : c } };
}

// ---------- 0. inputs ----------
rec('input: replayed P1-29 SQL sha256 = b4861884... (from ae58b91f, not on this branch)', sha(P129) === P129_SHA, sha(P129));
rec('input: P1-29 migration file is NOT on this branch', !fs.existsSync(path.join(repo, P129_PATH)));
rec('input: P1-29b sql sha256', true, sha(MIG));
rec('input: P1-29b rollback sha256', true, sha(ROLL));

// ---------- 1. P1-29 state (baseline) ----------
const db = await freshP129();
const s29 = await snapshot(db);
rec('P1-29 baseline: policy "users: linked coach reads roster athletes" present', s29.policies.some((p) => p.policyname === 'users: linked coach reads roster athletes'));
const leak29 = await usersSensitive(db, 'coach_C', D);
rec('P1-29 baseline (the WARN): coach_C can read athlete D email/stripe_* directly', !leak29.err && leak29.rows.length === 1 && leak29.rows[0].stripe_customer_id === 'cus_TESTD', leak29.rows && leak29.rows.length);

// ---------- 2. apply P1-29b ----------
await db.exec(MIG);
rec('apply: P1-29b applies cleanly after P1-29', true);

const fn = (await db.query(`select p.prosecdef, p.provolatile, p.proconfig, pg_get_function_result(p.oid) res, pg_get_userbyid(p.proowner) owner from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='coach_linked_athletes'`)).rows;
rec('helper: exists once, SECURITY DEFINER, STABLE', fn.length === 1 && fn[0].prosecdef === true && fn[0].provolatile === 's', fn);
rec('helper: search_path pinned to empty', fn.length === 1 && J(fn[0].proconfig) === J(['search_path=""']), fn[0] && fn[0].proconfig);
rec('helper: returns TABLE(id uuid, full_name text, belt text)', fn.length === 1 && fn[0].res === 'TABLE(id uuid, full_name text, belt text)', fn[0] && fn[0].res);
const priv = (await db.query(`select r, has_function_privilege(r, 'public.coach_linked_athletes()', 'EXECUTE') x from unnest(array['anon','authenticated','service_role']) r`)).rows;
const acl = (await db.query(`select proacl::text a from pg_proc where proname='coach_linked_athletes'`)).rows[0].a;
rec('helper grants: EXECUTE authenticated only (anon false, service_role false, no PUBLIC)', J(priv) === J([{ r: 'anon', x: false }, { r: 'authenticated', x: true }, { r: 'service_role', x: false }]) && !/(^|[{,])=X/.test(acl), { priv, acl });

const pols = (await db.query(`select policyname from pg_policies where schemaname='public' and tablename='users' order by policyname`)).rows.map((r) => r.policyname);
rec('policy: "users: linked coach reads roster athletes" dropped; other users policies unchanged', !pols.includes('users: linked coach reads roster athletes') && J(pols) === J(s29.policies.map((p) => p.policyname).filter((n) => n !== 'users: linked coach reads roster athletes')), pols);
const ro = (await db.query(`select reloptions from pg_class where oid='public.coach_roster'::regclass`)).rows[0].reloptions;
rec('view: security_invoker=true and security_barrier=true kept', ro.includes('security_invoker=true') && ro.includes('security_barrier=true'), ro);
const vgrants = (await db.query(`select grantee, privilege_type from information_schema.role_table_grants where table_name='coach_roster' and grantee in ('anon','authenticated','service_role') order by 1,2`)).rows;
rec('view: grants unchanged (authenticated, service_role SELECT; no anon)', J(vgrants) === J([{ grantee: 'authenticated', privilege_type: 'SELECT' }, { grantee: 'service_role', privilege_type: 'SELECT' }]), vgrants);

// linked coach
const hC = await helper(db, 'coach_C');
rec('linked coach: helper columns are exactly id, full_name, belt', !hC.err && J(hC.cols) === J(['id', 'full_name', 'belt']), hC.cols || hC);
rec('linked coach: helper rows = linked athlete D only', !hC.err && J(hC.rows) === J([{ id: D, full_name: 'Athlete D', belt: 'blue' }]), hC.rows || hC);
const rC = await roster(db, 'coach_C');
rec('linked coach: roster columns unchanged (athlete_id, user_id, full_name, belt)', !rC.err && J(rC.cols) === J(['athlete_id', 'user_id', 'full_name', 'belt']) && J(rC.cols) === J(s29.coach_C.roster.cols), rC.cols || rC);
rec('linked coach: roster rows identical to P1-29 (D only)', !rC.err && J(rC.rows) === J(s29.coach_C.roster.rows) && rC.rows.length === 1 && rC.rows[0].user_id === D, rC.rows || rC);
const lk = await coachDirectUsersIsZero(db);
rec('linked coach: SELECT email/stripe_*/gender/age_bucket or * from users for athlete D = 0 rows; sees no other users rows', lk.ok, lk.detail);
const selfC = await usersAll(db, 'coach_C');
rec('linked coach: own users row still visible (self read)', !selfC.err && selfC.rows.length === 1 && selfC.rows[0].id === C, selfC.rows && selfC.rows.map((r) => r.id.slice(-2)));

// unlinked coach
const hF = await helper(db, 'coach_F_unlinked');
const rF = await roster(db, 'coach_F_unlinked');
rec('unlinked coach: helper 0 rows', !hF.err && hF.rows.length === 0, hF.rows || hF);
rec('unlinked coach: roster 0 rows', !rF.err && rF.rows.length === 0, rF.rows || rF);

// athletes
for (const a of ['athlete_D', 'athlete_E']) {
  const u = await usersAll(db, a);
  rec(`${a}: own users SELECT unchanged from P1-29 (all columns, same rows)`, !u.err && J(u) === J(s29[a].users) && u.rows.length === 1, u.rows && u.rows.map((r) => r.id.slice(-2)));
  const r = await roster(db, a);
  rec(`${a}: roster 0 rows`, !r.err && r.rows.length === 0, r.rows || r);
  const h = await helper(db, a);
  rec(`${a}: helper 0 rows`, !h.err && h.rows.length === 0, h.rows || h);
}

// anon
const hAnon = await helper(db, 'anon');
rec('anon: cannot EXECUTE helper (42501)', isDenied(hAnon), hAnon);
const rAnon = await roster(db, 'anon');
rec('anon: cannot SELECT roster (42501)', isDenied(rAnon), rAnon);

// school admin unchanged
const uSA = await usersAll(db, 'school_admin_SA');
const rSA = await roster(db, 'school_admin_SA');
rec('school admin: users SELECT identical to P1-29 (self + school member SU)', !uSA.err && J(uSA) === J(s29.school_admin_SA.users) && J(uSA.rows.map((r) => r.id)) === J([SA, SU]), uSA.rows && uSA.rows.map((r) => r.id.slice(-2)));
rec('school admin: roster identical to P1-29 (0 rows)', !rSA.err && J(rSA) === J(s29.school_admin_SA.roster) && rSA.rows.length === 0, rSA.rows || rSA);

// service_role (no uid): users full access unchanged, roster empty, helper denied
const uSR = await usersAll(db, 'service_role');
rec('service_role: users SELECT identical to P1-29 (all 6)', !uSR.err && J(uSR) === J(s29.service_role.users) && uSR.rows.length === 6, uSR.rows && uSR.rows.length);
const hSR = await helper(db, 'service_role');
rec('service_role: helper EXECUTE denied (authenticated only)', isDenied(hSR), hSR);

// ---------- 3. rollback restores P1-29 ----------
await db.exec(ROLL);
const sRoll = await snapshot(db);
const fnGone = (await db.query(`select count(*)::int n from pg_proc where proname='coach_linked_athletes'`)).rows[0].n;
rec('rollback: helper dropped', fnGone === 0, fnGone);
rec('rollback: users policies identical to P1-29 (policy restored, same qual)', J(sRoll.policies) === J(s29.policies), sRoll.policies.map((p) => p.policyname));
rec('rollback: coach_roster definition identical to P1-29', sRoll.viewdef === s29.viewdef);
rec('rollback: coach_roster reloptions identical to P1-29', J(sRoll.reloptions) === J(s29.reloptions), sRoll.reloptions);
let allSame = true;
for (const p of Object.keys(PERSONAS)) {
  if (J(sRoll[p]) !== J(s29[p])) allSame = false;
}
rec('rollback: every persona users + roster result identical to P1-29', allSame);

// re-apply after rollback
await db.exec(MIG);
const lk2 = await coachDirectUsersIsZero(db);
const hC2 = await helper(db, 'coach_C');
rec('re-apply after rollback: still narrowed', lk2.ok && !hC2.err && hC2.rows.length === 1, lk2.detail);
await db.close();

// ---------- 4. planted mutants ----------
async function mutant(label, mutated, check) {
  const m = await freshP129();
  let caught;
  try {
    await m.exec(mutated);
    caught = !(await check(m));
  } catch (e) {
    caught = true;
  }
  await m.close();
  rec(`mutant caught: ${label}`, caught);
}
const noDrop = MIG.replace(/DROP POLICY IF EXISTS "users: linked coach reads roster athletes" ON public\.users;\n/, '');
rec('mutant setup: DROP POLICY line removed from mutant SQL', noDrop !== MIG && !/DROP POLICY/.test(noDrop));
await mutant('P1-29 users policy left in place', noDrop, async (m) => (await coachDirectUsersIsZero(m)).ok);
const anonGrant = MIG.replace('FROM PUBLIC, anon, service_role;', 'FROM PUBLIC;');
await mutant('helper EXECUTE left to anon', anonGrant, async (m) => isDenied(await helper(m, 'anon')));
const wideHelper = MIG.replace('RETURNS TABLE (id uuid, full_name text, belt text)', 'RETURNS TABLE (id uuid, full_name text, belt text, email text)').replace('SELECT u.id, u.full_name, u.belt\n', 'SELECT u.id, u.full_name, u.belt, u.email\n');
await mutant('helper returns an extra column (email)', wideHelper, async (m) => { const h = await helper(m, 'coach_C'); return !h.err && J(h.cols) === J(['id', 'full_name', 'belt']); });

const failed = results.filter((r) => !r.ok);
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, total: results.length, failed_names: failed.map((r) => r.name) }));
if (failed.length) process.exit(1);
