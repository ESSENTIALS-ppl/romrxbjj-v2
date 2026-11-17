// PGlite tests for 20261117010000_p1_25_purge_deleted_accounts (UNAPPLIED; BUILD ONLY).
// Run: npm i && node test.mjs
// Emails in this file are only user@example.com. No secrets.
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const MIG = fs.readFileSync(
  path.join(ROOT, 'supabase/migrations-unapplied/20261117010000_p1_25_purge_deleted_accounts.sql'),
  'utf8',
);
const RB = fs.readFileSync(
  path.join(ROOT, 'supabase/migrations-unapplied/20261117010000_p1_25_purge_deleted_accounts_rollback.sql'),
  'utf8',
);
const CRON = fs.readFileSync(
  path.join(ROOT, 'supabase/migrations-unapplied/20261117010000_p1_25_purge_deleted_accounts_cron.NOT_FOR_APPLY.sql'),
  'utf8',
);

const results = {};
let fails = 0;
const ok = (n, c, info) => {
  results[n] = { pass: !!c, ...(info ? { info } : {}) };
  if (!c) fails++;
  console.log(`${c ? 'PASS' : 'FAIL'} ${n}${info ? ' ' + JSON.stringify(info) : ''}`);
};

const U = (n) => `00000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;
const HARD = '7c71e421-929b-4691-a6bc-cc614ed2a08d';
const INTERNAL = 'aaaaaaaa-0000-4000-8000-000000000001';
const FIXTURE = 'bbbbbbbb-0000-4000-8000-000000000002';
const OVER90 = U(1);
const UNDER90 = U(2);
const REQUESTED = U(3);
const SOFT90 = U(4);
const EXTRA = U(5);

const SCHEMA = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema ops;
create table auth.users (
  id uuid primary key,
  email varchar,
  raw_app_meta_data jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create table ops.internal_accounts (
  user_id uuid primary key,
  note text,
  added_at timestamptz not null default now()
);
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  status text not null default 'requested',
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  assessed_at timestamptz default now()
);
create table public.product_events (
  id bigserial primary key,
  user_id uuid,
  event text not null default 'x',
  created_at timestamptz not null default now()
);
create table public.client_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  message text,
  created_at timestamptz not null default now()
);
create table public.billing_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  created_at timestamptz not null default now()
);
create table public.consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  created_at timestamptz not null default now()
);
create table public.stripe_checkout_claims (
  stripe_checkout_session_id text primary key,
  purpose text,
  user_id uuid,
  claimed_at timestamptz default now()
);
CREATE OR REPLACE FUNCTION public.is_test_account(p_email text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'pg_temp'
AS $f$
  select exists (
    select 1 from auth.users u
    where p_email is not null
      and lower(u.email) = lower(p_email)
      and u.raw_app_meta_data ->> 'test_fixture' = 'true'
  );
$f$;
`;

async function seed(db) {
  await db.exec(`
insert into auth.users (id, email, raw_app_meta_data, deleted_at) values
  ('${OVER90}', null, '{}', null),
  ('${UNDER90}', null, '{}', null),
  ('${REQUESTED}', null, '{}', null),
  ('${SOFT90}', null, '{}', now() - interval '91 days'),
  ('${HARD}', null, '{}', now() - interval '200 days'),
  ('${INTERNAL}', null, '{}', now() - interval '200 days'),
  ('${FIXTURE}', 'user@example.com', '{"test_fixture":true}', now() - interval '200 days'),
  ('${EXTRA}', null, '{}', null);
insert into public.users (id) values
  ('${OVER90}'), ('${UNDER90}'), ('${REQUESTED}'), ('${SOFT90}'),
  ('${HARD}'), ('${INTERNAL}'), ('${FIXTURE}'), ('${EXTRA}');
insert into ops.internal_accounts (user_id, note) values ('${INTERNAL}', 'staff');
insert into public.account_deletion_requests (user_id, status, requested_at, completed_at) values
  ('${OVER90}', 'completed', now() - interval '120 days', now() - interval '91 days'),
  ('${UNDER90}', 'completed', now() - interval '40 days', now() - interval '10 days'),
  ('${REQUESTED}', 'requested', now() - interval '200 days', null),
  ('${HARD}', 'completed', now() - interval '200 days', now() - interval '180 days'),
  ('${INTERNAL}', 'completed', now() - interval '200 days', now() - interval '180 days'),
  ('${FIXTURE}', 'completed', now() - interval '200 days', now() - interval '180 days');
insert into public.assessments (user_id) values
  ('${OVER90}'), ('${UNDER90}'), ('${REQUESTED}'), ('${SOFT90}'),
  ('${HARD}'), ('${INTERNAL}'), ('${FIXTURE}'), ('${EXTRA}');
insert into public.product_events (user_id, event) values
  ('${OVER90}', 'a'), ('${UNDER90}', 'b'), ('${SOFT90}', 'c'),
  ('${HARD}', 'h'), ('${INTERNAL}', 'i'), ('${FIXTURE}', 'f'), ('${EXTRA}', 'e');
insert into public.client_feedback (user_id, message) values
  ('${OVER90}', 'note'), ('${HARD}', 'note'), ('${INTERNAL}', 'note'), ('${FIXTURE}', 'note');
insert into public.billing_consents (user_id) values
  ('${OVER90}'), ('${SOFT90}'), ('${HARD}'), ('${INTERNAL}'), ('${FIXTURE}');
insert into public.consent_events (user_id) values
  ('${OVER90}'), ('${SOFT90}'), ('${HARD}');
insert into public.stripe_checkout_claims (stripe_checkout_session_id, purpose, user_id) values
  ('cs_over', 'base', '${OVER90}'),
  ('cs_hard', 'base', '${HARD}');
`);
}

async function mk() {
  const db = new PGlite();
  await db.exec(SCHEMA);
  await seed(db);
  await db.exec(MIG);
  return db;
}

const counts = async (db, table, col, id) =>
  (await db.query(`select count(*)::int n from ${table} where ${col} = $1`, [id])).rows[0].n;
const authExists = async (db, id) =>
  (await db.query(`select count(*)::int n from auth.users where id = $1`, [id])).rows[0].n;

const db = await mk();

// Default is dry_run
const defl = (await db.query(`select public.purge_deleted_accounts() as j`)).rows[0].j;
ok('T1 default mode is dry_run and written=false', defl.mode === 'dry_run' && defl.written === false, { mode: defl.mode, written: defl.written });
ok('T2 over-90 completed ADR and over-90 soft-delete are included (2)', defl.qualifying_count === 2, { n: defl.qualifying_count, ids: defl.ids });
ok('T3 under-90 completed is excluded from qualifying', !defl.ids.includes(UNDER90), { ids: defl.ids });
ok('T4 requested-but-not-completed (even 200 days old) is not qualifying', !defl.ids.includes(REQUESTED), { ids: defl.ids });
ok('T5 included ids are OVER90 and SOFT90 only', defl.ids.includes(OVER90) && defl.ids.includes(SOFT90) && defl.ids.length === 2, { ids: defl.ids });
ok('T6 hardcoded 7c71e421 is excluded even when marked deleted over 90 days', defl.excluded.hardcoded_7c71e421 === 1 && !defl.ids.includes(HARD), { excluded: defl.excluded });
ok('T7 internal_accounts member is excluded', defl.excluded.internal_accounts === 1 && !defl.ids.includes(INTERNAL), { excluded: defl.excluded });
ok('T8 fixture (test_fixture=true) is excluded', defl.excluded.fixtures === 1 && !defl.ids.includes(FIXTURE), { excluded: defl.excluded });

const afterDry = {
  overAssess: await counts(db, 'public.assessments', 'user_id', OVER90),
  overAuth: await authExists(db, OVER90),
  softAuth: await authExists(db, SOFT90),
  hardAuth: await authExists(db, HARD),
  internalRow: await counts(db, 'ops.internal_accounts', 'user_id', INTERNAL),
  billing: await counts(db, 'public.billing_consents', 'user_id', OVER90),
  pe: await counts(db, 'public.product_events', 'user_id', OVER90),
};
ok('T9 dry-run writes nothing (qualifying rows still present)', afterDry.overAssess === 1 && afterDry.overAuth === 1 && afterDry.softAuth === 1 && afterDry.pe === 1, afterDry);

const cnt = (await db.query(`select public.purge_deleted_accounts('count') as j`)).rows[0].j;
ok('T10 count-only returns qualifying_count=2 and no ids', cnt.mode === 'count' && cnt.qualifying_count === 2 && cnt.ids === null && cnt.written === false, { mode: cnt.mode, n: cnt.qualifying_count, ids: cnt.ids });
const cntAlias = (await db.query(`select public.purge_deleted_accounts('count_only') as j`)).rows[0].j;
ok('T11 count_only alias maps to count', cntAlias.mode === 'count' && cntAlias.ids === null);

let refused = false;
try {
  await db.query(`select public.purge_deleted_accounts('dry_run', interval '30 days')`);
} catch (e) {
  refused = String(e.message || e).includes('90 days');
}
ok('T12 retention below 90 days is refused', refused);

const applied = (await db.query(`select public.purge_deleted_accounts('apply') as j`)).rows[0].j;
ok('T13 apply reports written=true, count=2, and a backup schema', applied.written === true && applied.qualifying_count === 2 && typeof applied.backup_schema === 'string' && applied.backup_schema.startsWith('zz_bak_p1_25_'), { schema: applied.backup_schema, n: applied.qualifying_count });
ok('T14 apply deleted qualifying auth users and their assessments', (await authExists(db, OVER90)) === 0 && (await authExists(db, SOFT90)) === 0 && (await counts(db, 'public.assessments', 'user_id', OVER90)) === 0 && (await counts(db, 'public.assessments', 'user_id', SOFT90)) === 0);
ok('T15 apply left under-90, requested, extra, and leftover product_events of non-qualifying users', (await authExists(db, UNDER90)) === 1 && (await authExists(db, REQUESTED)) === 1 && (await authExists(db, EXTRA)) === 1 && (await counts(db, 'public.assessments', 'user_id', UNDER90)) === 1 && (await counts(db, 'public.product_events', 'user_id', EXTRA)) === 1);
ok('T16 never touches 7c71e421 (auth, assessment, events still there)', (await authExists(db, HARD)) === 1 && (await counts(db, 'public.assessments', 'user_id', HARD)) === 1 && (await counts(db, 'public.product_events', 'user_id', HARD)) === 1);
ok('T17 never touches internal_accounts member or the staff-list row', (await authExists(db, INTERNAL)) === 1 && (await counts(db, 'ops.internal_accounts', 'user_id', INTERNAL)) === 1 && (await counts(db, 'public.assessments', 'user_id', INTERNAL)) === 1);
ok('T18 never touches fixtures', (await authExists(db, FIXTURE)) === 1 && (await counts(db, 'public.assessments', 'user_id', FIXTURE)) === 1);
ok('T19 leave-alone billing_consents and consent_events for qualifying users are still present', (await counts(db, 'public.billing_consents', 'user_id', OVER90)) === 1 && (await counts(db, 'public.consent_events', 'user_id', OVER90)) === 1 && (await counts(db, 'public.billing_consents', 'user_id', SOFT90)) === 1);
ok('T20 leftover no-FK rows for qualifying users were deleted (claims, product_events, feedback)', (await counts(db, 'public.stripe_checkout_claims', 'user_id', OVER90)) === 0 && (await counts(db, 'public.product_events', 'user_id', OVER90)) === 0 && (await counts(db, 'public.client_feedback', 'user_id', OVER90)) === 0);
ok('T21 backup schema has manifest of 2 ids and copied assessments', (await db.query(`select count(*)::int n from ${applied.backup_schema}.manifest`)).rows[0].n === 2 && (await db.query(`select count(*)::int n from ${applied.backup_schema}.public__assessments`)).rows[0].n === 2, { schema: applied.backup_schema });

// Restore from backup (the documented rollback path), then confirm rows return.
await db.exec(`
insert into auth.users (id, email, raw_app_meta_data, deleted_at, created_at)
select id, email, raw_app_meta_data, deleted_at, created_at from ${applied.backup_schema}.auth__users b
where not exists (select 1 from auth.users a where a.id = b.id);
insert into public.users (id, created_at)
select id, created_at from ${applied.backup_schema}.public__users b
where not exists (select 1 from public.users a where a.id = b.id);
insert into public.assessments (id, user_id, assessed_at)
select id, user_id, assessed_at from ${applied.backup_schema}.public__assessments b
where not exists (select 1 from public.assessments a where a.id = b.id);
`);
ok('T22 restore from backup puts qualifying auth users and assessments back', (await authExists(db, OVER90)) === 1 && (await authExists(db, SOFT90)) === 1 && (await counts(db, 'public.assessments', 'user_id', OVER90)) === 1);

// Function rollback drops the function; cron file must refuse.
await db.exec(RB);
const gone = (await db.query(`select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='purge_deleted_accounts'`)).rows[0].n;
ok('T23 function rollback drops purge_deleted_accounts', gone === 0);

let cronRefused = false;
try {
  await db.exec(CRON);
} catch (e) {
  cronRefused = String(e.message || e).includes('unscheduled');
}
ok('T24 cron file is refused (unscheduled / not-for-apply)', cronRefused);
ok('T25 cron file did not create a cron.job table or schedule anything', (await db.query(`select to_regclass('cron.job') is not null as exists`)).rows[0].exists === false);

const out = path.join(HERE, 'results.json');
fs.writeFileSync(out, JSON.stringify({ passed: Object.values(results).filter((r) => r.pass).length, failed: fails, results }, null, 2));
console.log(`\n${Object.values(results).filter((r) => r.pass).length}/${Object.keys(results).length} passed`);
if (fails) process.exit(1);
