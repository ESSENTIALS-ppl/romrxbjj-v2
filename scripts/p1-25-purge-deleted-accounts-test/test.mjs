// PGlite tests for 20261117010000_p1_25_purge_deleted_accounts (UNAPPLIED; BUILD ONLY). v3.
// Run: npm i && node test.mjs
// Emails in this file are only example.com addresses (plus user@example.com for the fixture). No secrets.
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

const E_OVER = 'over90@example.com';
const E_OVER_VAR = '  Over90@Example.com  ';
const E_LEAD_UID = 'lead-uid-only@example.com';
const E_EXTRA = 'other.user@example.com';
const E_HARD = 'hard.user@example.com';
const E_INTERNAL = 'internal.user@example.com';
const E_FIXTURE = 'user@example.com';
const E_UNDER = 'under90@example.com';
const E_SOFT = 'soft90@example.com';
const E_REQUESTED = 'requested@example.com';

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
  email text,
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
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  email text,
  converted_user_id uuid,
  created_at timestamptz not null default now()
);
create table public.sport_pack_waitlist (
  id bigint generated always as identity primary key,
  email text,
  sport text
);
create table public.investor_requests (
  id uuid primary key default gen_random_uuid(),
  email text,
  name text
);
create table public.partner_inquiries (
  id bigint generated always as identity primary key,
  email text,
  name text
);
create table public.yoga_testers (
  email text primary key,
  note text,
  added_at timestamptz not null default now()
);
create table public.athlete_injuries (
  id uuid primary key default gen_random_uuid(),
  athlete_user_id uuid,
  body_part text,
  notes text
);
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  athlete_user_id uuid,
  class_date date,
  note text
);
create table public.coach_competitors (
  id uuid primary key default gen_random_uuid(),
  athlete_user_id uuid,
  next_comp_name text
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
  ('${OVER90}', '${E_OVER}', '{}', null),
  ('${UNDER90}', '${E_UNDER}', '{}', null),
  ('${REQUESTED}', '${E_REQUESTED}', '{}', null),
  ('${SOFT90}', '${E_SOFT}', '{}', now() - interval '91 days'),
  ('${HARD}', '${E_HARD}', '{}', now() - interval '200 days'),
  ('${INTERNAL}', '${E_INTERNAL}', '{}', now() - interval '200 days'),
  ('${FIXTURE}', '${E_FIXTURE}', '{"test_fixture":true}', now() - interval '200 days'),
  ('${EXTRA}', '${E_EXTRA}', '{}', null);
insert into public.users (id, email) values
  ('${OVER90}', '${E_OVER}'), ('${UNDER90}', '${E_UNDER}'), ('${REQUESTED}', '${E_REQUESTED}'),
  ('${SOFT90}', '${E_SOFT}'), ('${HARD}', '${E_HARD}'), ('${INTERNAL}', '${E_INTERNAL}'),
  ('${FIXTURE}', '${E_FIXTURE}'), ('${EXTRA}', '${E_EXTRA}');
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

-- leads: uid match, email match (cased/padded), other user, excluded, under-90, path-2-only
insert into public.leads (converted_user_id, email) values
  ('${OVER90}', '${E_LEAD_UID}'),
  (null, '${E_OVER_VAR}'),
  ('${EXTRA}', '${E_EXTRA}'),
  ('${HARD}', '${E_HARD}'),
  ('${INTERNAL}', '${E_INTERNAL}'),
  ('${FIXTURE}', '${E_FIXTURE}'),
  ('${UNDER90}', '${E_UNDER}'),
  ('${SOFT90}', '${E_SOFT}'),
  (null, '${E_SOFT}');

insert into public.sport_pack_waitlist (email, sport) values
  ('${E_OVER_VAR}', 'bjj'),
  ('${E_EXTRA}', 'bjj'),
  ('${E_HARD}', 'bjj'),
  ('${E_INTERNAL}', 'bjj'),
  ('${E_FIXTURE}', 'bjj'),
  ('${E_UNDER}', 'bjj'),
  ('${E_SOFT}', 'bjj');
insert into public.investor_requests (email, name) values
  ('${E_OVER_VAR}', 'o'),
  ('${E_EXTRA}', 'x'),
  ('${E_HARD}', 'h'),
  ('${E_INTERNAL}', 'i'),
  ('${E_FIXTURE}', 'f'),
  ('${E_UNDER}', 'u'),
  ('${E_SOFT}', 's');
insert into public.partner_inquiries (email, name) values
  ('${E_OVER_VAR}', 'o'),
  ('${E_EXTRA}', 'x'),
  ('${E_HARD}', 'h'),
  ('${E_INTERNAL}', 'i'),
  ('${E_FIXTURE}', 'f'),
  ('${E_UNDER}', 'u'),
  ('${E_SOFT}', 's');
insert into public.yoga_testers (email, note) values
  ('${E_OVER}', 'o'),
  ('${E_EXTRA}', 'x'),
  ('${E_HARD}', 'h'),
  ('${E_INTERNAL}', 'i'),
  ('${E_FIXTURE}', 'f'),
  ('${E_UNDER}', 'u'),
  ('${E_SOFT}', 's');

insert into public.athlete_injuries (athlete_user_id, body_part) values
  ('${OVER90}', 'knee'),
  ('${EXTRA}', 'knee'),
  ('${HARD}', 'knee'),
  ('${INTERNAL}', 'knee'),
  ('${FIXTURE}', 'knee'),
  ('${UNDER90}', 'knee'),
  ('${SOFT90}', 'knee');
insert into public.attendance (athlete_user_id, class_date) values
  ('${OVER90}', '2026-01-01'),
  ('${EXTRA}', '2026-01-01'),
  ('${HARD}', '2026-01-01'),
  ('${INTERNAL}', '2026-01-01'),
  ('${FIXTURE}', '2026-01-01'),
  ('${UNDER90}', '2026-01-01'),
  ('${SOFT90}', '2026-01-01');
insert into public.coach_competitors (athlete_user_id, next_comp_name) values
  ('${OVER90}', 'a'),
  ('${EXTRA}', 'b'),
  ('${HARD}', 'c'),
  ('${INTERNAL}', 'd'),
  ('${FIXTURE}', 'e'),
  ('${UNDER90}', 'f'),
  ('${SOFT90}', 'g');
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
const emailCounts = async (db, table, email) =>
  (await db.query(
    `select count(*)::int n from ${table} where lower(btrim(email)) = lower(btrim($1))`,
    [email],
  )).rows[0].n;
const authExists = async (db, id) =>
  (await db.query(`select count(*)::int n from auth.users where id = $1`, [id])).rows[0].n;
const schemaExists = async (db, name) =>
  (await db.query(`select exists(select 1 from pg_namespace where nspname = $1) as e`, [name])).rows[0].e;

const utcStamp = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
};

const db = await mk();

// Default is dry_run
const defl = (await db.query(`select public.purge_deleted_accounts() as j`)).rows[0].j;
ok('T1 default mode is dry_run and written=false', defl.mode === 'dry_run' && defl.written === false, { mode: defl.mode, written: defl.written });
ok('T2 only over-90 completed ADR is included (1); path 2 deleted_at-only is not', defl.qualifying_count === 1 && defl.ids.includes(OVER90) && !defl.ids.includes(SOFT90), { n: defl.qualifying_count, ids: defl.ids });
ok('T3 under-90 completed is excluded from qualifying', !defl.ids.includes(UNDER90), { ids: defl.ids });
ok('T4 requested-but-not-completed (even 200 days old) is not qualifying', !defl.ids.includes(REQUESTED), { ids: defl.ids });
ok('T5 included ids are OVER90 only', defl.ids.includes(OVER90) && defl.ids.length === 1, { ids: defl.ids });
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
  leadsUid: await counts(db, 'public.leads', 'converted_user_id', OVER90),
  waitlist: await emailCounts(db, 'public.sport_pack_waitlist', E_OVER),
};
ok('T9 dry-run writes nothing (qualifying rows still present)', afterDry.overAssess === 1 && afterDry.overAuth === 1 && afterDry.softAuth === 1 && afterDry.pe === 1 && afterDry.leadsUid === 1 && afterDry.waitlist === 1, afterDry);

const cnt = (await db.query(`select public.purge_deleted_accounts('count') as j`)).rows[0].j;
ok('T10 count-only returns qualifying_count=1 and no ids', cnt.mode === 'count' && cnt.qualifying_count === 1 && cnt.ids === null && cnt.written === false, { mode: cnt.mode, n: cnt.qualifying_count, ids: cnt.ids });
const cntAlias = (await db.query(`select public.purge_deleted_accounts('count_only') as j`)).rows[0].j;
ok('T11 count_only alias maps to count', cntAlias.mode === 'count' && cntAlias.ids === null);

let refused = false;
try {
  await db.query(`select public.purge_deleted_accounts('dry_run', interval '30 days')`);
} catch (e) {
  refused = String(e.message || e).includes('90 days');
}
ok('T12 retention below 90 days is refused', refused);

// Backup-age fixtures: old (meta), old (name only), young (meta, 2 days ago).
const OLD_META = 'zz_bak_p1_25_20260101000000';
const OLD_NAME = 'zz_bak_p1_25_20260201000000';
const youngStamp = utcStamp(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000));
const YOUNG = `zz_bak_p1_25_${youngStamp}`;
await db.exec(`
create schema ${OLD_META};
create table ${OLD_META}._p1_25_backup_meta (created_at timestamptz primary key);
insert into ${OLD_META}._p1_25_backup_meta values ('2026-01-01 00:00:00+00');
create table ${OLD_META}.marker (x int);
insert into ${OLD_META}.marker values (1);

create schema ${OLD_NAME};
comment on schema ${OLD_NAME} is 'legacy name-only backup';
create table ${OLD_NAME}.marker (x int);
insert into ${OLD_NAME}.marker values (1);

create schema ${YOUNG};
create table ${YOUNG}._p1_25_backup_meta (created_at timestamptz primary key);
insert into ${YOUNG}._p1_25_backup_meta values (now() - interval '2 days');
create table ${YOUNG}.marker (x int);
insert into ${YOUNG}.marker values (1);
`);

const dryAfterBak = (await db.query(`select public.purge_deleted_accounts('dry_run') as j`)).rows[0].j;
ok('T26 dry-run does not drop existing backup schemas', dryAfterBak.written === false && (await schemaExists(db, OLD_META)) && (await schemaExists(db, OLD_NAME)) && (await schemaExists(db, YOUNG)));

const applied = (await db.query(`select public.purge_deleted_accounts('apply') as j`)).rows[0].j;
const dropped = applied.dropped_backup_schemas || [];
ok('T13 apply reports written=true, count=1, and a backup schema', applied.written === true && applied.qualifying_count === 1 && typeof applied.backup_schema === 'string' && applied.backup_schema.startsWith('zz_bak_p1_25_') && applied.backup_keep_for === '7 days', { schema: applied.backup_schema, n: applied.qualifying_count, dropped });
ok('T14 apply deleted the over-90 ADR auth user and assessments; path-2 SOFT90 remains', (await authExists(db, OVER90)) === 0 && (await counts(db, 'public.assessments', 'user_id', OVER90)) === 0 && (await authExists(db, SOFT90)) === 1 && (await counts(db, 'public.assessments', 'user_id', SOFT90)) === 1);
ok('T15 apply left under-90, requested, extra, and leftover product_events of non-qualifying users', (await authExists(db, UNDER90)) === 1 && (await authExists(db, REQUESTED)) === 1 && (await authExists(db, EXTRA)) === 1 && (await counts(db, 'public.assessments', 'user_id', UNDER90)) === 1 && (await counts(db, 'public.product_events', 'user_id', EXTRA)) === 1);
ok('T16 never touches 7c71e421 (auth, assessment, events still there)', (await authExists(db, HARD)) === 1 && (await counts(db, 'public.assessments', 'user_id', HARD)) === 1 && (await counts(db, 'public.product_events', 'user_id', HARD)) === 1);
ok('T17 never touches internal_accounts member or the staff-list row', (await authExists(db, INTERNAL)) === 1 && (await counts(db, 'ops.internal_accounts', 'user_id', INTERNAL)) === 1 && (await counts(db, 'public.assessments', 'user_id', INTERNAL)) === 1);
ok('T18 never touches fixtures', (await authExists(db, FIXTURE)) === 1 && (await counts(db, 'public.assessments', 'user_id', FIXTURE)) === 1);
ok('T19 leave-alone billing_consents and consent_events for qualifying users are still present', (await counts(db, 'public.billing_consents', 'user_id', OVER90)) === 1 && (await counts(db, 'public.consent_events', 'user_id', OVER90)) === 1 && (await counts(db, 'public.billing_consents', 'user_id', SOFT90)) === 1);
ok('T20 leftover no-FK rows for qualifying users were deleted (claims, product_events, feedback)', (await counts(db, 'public.stripe_checkout_claims', 'user_id', OVER90)) === 0 && (await counts(db, 'public.product_events', 'user_id', OVER90)) === 0 && (await counts(db, 'public.client_feedback', 'user_id', OVER90)) === 0);
ok('T21 backup schema has manifest of 1 id, copied assessments, and _p1_25_backup_meta', (await db.query(`select count(*)::int n from ${applied.backup_schema}.manifest`)).rows[0].n === 1 && (await db.query(`select count(*)::int n from ${applied.backup_schema}.public__assessments`)).rows[0].n === 1 && (await db.query(`select count(*)::int n from ${applied.backup_schema}._p1_25_backup_meta`)).rows[0].n === 1, { schema: applied.backup_schema });

ok('T27 apply dropped backup schemas older than 7 days (meta and name-only)', dropped.includes(OLD_META) && dropped.includes(OLD_NAME) && !(await schemaExists(db, OLD_META)) && !(await schemaExists(db, OLD_NAME)), { dropped });
ok('T28 apply kept a backup younger than 7 days', !dropped.includes(YOUNG) && (await schemaExists(db, YOUNG)) && (await db.query(`select count(*)::int n from ${YOUNG}.marker`)).rows[0].n === 1, { young: YOUNG });

// leads
ok('T29 leads: purged when matched by user id (converted_user_id)', (await counts(db, 'public.leads', 'converted_user_id', OVER90)) === 0);
ok('T30 leads: purged when matched by email (case-insensitive, trimmed; no user id)', (await emailCounts(db, 'public.leads', E_OVER)) === 0);
ok('T31 leads: another user and excluded accounts untouched', (await counts(db, 'public.leads', 'converted_user_id', EXTRA)) === 1 && (await counts(db, 'public.leads', 'converted_user_id', HARD)) === 1 && (await counts(db, 'public.leads', 'converted_user_id', INTERNAL)) === 1 && (await counts(db, 'public.leads', 'converted_user_id', FIXTURE)) === 1 && (await counts(db, 'public.leads', 'converted_user_id', UNDER90)) === 1 && (await counts(db, 'public.leads', 'converted_user_id', SOFT90)) === 1 && (await emailCounts(db, 'public.leads', E_SOFT)) === 2);

const emailTables = [
  ['sport_pack_waitlist', 'T32'],
  ['investor_requests', 'T33'],
  ['partner_inquiries', 'T34'],
  ['yoga_testers', 'T35'],
];
for (const [tbl, prefix] of emailTables) {
  const qGone = await emailCounts(db, `public.${tbl}`, E_OVER);
  const other = await emailCounts(db, `public.${tbl}`, E_EXTRA);
  const hard = await emailCounts(db, `public.${tbl}`, E_HARD);
  const intern = await emailCounts(db, `public.${tbl}`, E_INTERNAL);
  const fix = await emailCounts(db, `public.${tbl}`, E_FIXTURE);
  const under = await emailCounts(db, `public.${tbl}`, E_UNDER);
  const soft = await emailCounts(db, `public.${tbl}`, E_SOFT);
  ok(`${prefix} ${tbl}: purged by email; other user and excluded / under-90 / path-2 untouched`,
    qGone === 0 && other === 1 && hard === 1 && intern === 1 && fix === 1 && under === 1 && soft === 1,
    { qGone, other, hard, intern, fix, under, soft });
}

const athleteTables = [
  ['athlete_injuries', 'T36'],
  ['attendance', 'T37'],
  ['coach_competitors', 'T38'],
];
for (const [tbl, prefix] of athleteTables) {
  const qGone = await counts(db, `public.${tbl}`, 'athlete_user_id', OVER90);
  const other = await counts(db, `public.${tbl}`, 'athlete_user_id', EXTRA);
  const hard = await counts(db, `public.${tbl}`, 'athlete_user_id', HARD);
  const intern = await counts(db, `public.${tbl}`, 'athlete_user_id', INTERNAL);
  const fix = await counts(db, `public.${tbl}`, 'athlete_user_id', FIXTURE);
  const under = await counts(db, `public.${tbl}`, 'athlete_user_id', UNDER90);
  const soft = await counts(db, `public.${tbl}`, 'athlete_user_id', SOFT90);
  ok(`${prefix} ${tbl}: purged by user id; other user and excluded / under-90 / path-2 untouched`,
    qGone === 0 && other === 1 && hard === 1 && intern === 1 && fix === 1 && under === 1 && soft === 1,
    { qGone, other, hard, intern, fix, under, soft });
}

ok('T39 backup copied the purged leads and waitlist rows', (await db.query(`select count(*)::int n from ${applied.backup_schema}.public__leads`)).rows[0].n === 2 && (await db.query(`select count(*)::int n from ${applied.backup_schema}.public__sport_pack_waitlist`)).rows[0].n === 1);

// Restore from backup (the documented rollback path), then confirm rows return.
await db.exec(`
insert into auth.users (id, email, raw_app_meta_data, deleted_at, created_at)
select id, email, raw_app_meta_data, deleted_at, created_at from ${applied.backup_schema}.auth__users b
where not exists (select 1 from auth.users a where a.id = b.id);
insert into public.users (id, email, created_at)
select id, email, created_at from ${applied.backup_schema}.public__users b
where not exists (select 1 from public.users a where a.id = b.id);
insert into public.assessments (id, user_id, assessed_at)
select id, user_id, assessed_at from ${applied.backup_schema}.public__assessments b
where not exists (select 1 from public.assessments a where a.id = b.id);
insert into public.account_deletion_requests (id, user_id, status, requested_at, updated_at, completed_at)
select id, user_id, status, requested_at, updated_at, completed_at from ${applied.backup_schema}.public__account_deletion_requests b
where not exists (select 1 from public.account_deletion_requests a where a.id = b.id);
`);
ok('T22 restore from backup puts the qualifying auth user and assessments back', (await authExists(db, OVER90)) === 1 && (await authExists(db, SOFT90)) === 1 && (await counts(db, 'public.assessments', 'user_id', OVER90)) === 1);

// A later apply-mode run drops this run's own backup once it is aged past 7 days.
await db.exec(`update ${applied.backup_schema}._p1_25_backup_meta set created_at = now() - interval '8 days'`);
await new Promise((r) => setTimeout(r, 1100)); // distinct UTC second so the new backup name differs
const applied2 = (await db.query(`select public.purge_deleted_accounts('apply') as j`)).rows[0].j;
const dropped2 = applied2.dropped_backup_schemas || [];
ok('T40 a later apply drops this run\'s own backup once older than 7 days, and keeps the still-young one', dropped2.includes(applied.backup_schema) && !(await schemaExists(db, applied.backup_schema)) && (await schemaExists(db, YOUNG)) && (await schemaExists(db, applied2.backup_schema)) && applied2.backup_schema !== applied.backup_schema, { dropped2, newSchema: applied2.backup_schema });

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
