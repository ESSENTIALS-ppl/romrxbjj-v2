// PGlite tests for P1-25 v4 (UNAPPLIED; BUILD ONLY): completion hook 20261117010100_p1_25_completion_cleanup
// and the v4 day-90 sweep in 20261117010000_p1_25_purge_deleted_accounts. Run: node test-v4.mjs
// Emails in this file are example.com test addresses only. No secrets, no live data.
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const rd = (f) => fs.readFileSync(path.join(ROOT, 'supabase/migrations-unapplied', f), 'utf8');
const PURGE = rd('20261117010000_p1_25_purge_deleted_accounts.sql');
const HOOK = rd('20261117010100_p1_25_completion_cleanup.sql');
const HOOK_RB = rd('20261117010100_p1_25_completion_cleanup_rollback.sql');

const results = {};
let fails = 0;
const ok = (n, c, info) => {
  results[n] = { pass: !!c, ...(info ? { info } : {}) };
  if (!c) fails++;
  console.log(`${c ? 'PASS' : 'FAIL'} ${n}${info ? ' ' + JSON.stringify(info) : ''}`);
};

const U = (n) => `00000000-0000-4000-8000-0000000001${String(n).padStart(2, '0')}`;
const R = (n) => `11111111-0000-4000-8000-0000000001${String(n).padStart(2, '0')}`;
const HARD = '7c71e421-929b-4691-a6bc-cc614ed2a08d';
const INTERNAL = 'aaaaaaaa-0000-4000-8000-000000000001';
const FIXTURE = 'bbbbbbbb-0000-4000-8000-000000000002';
const D1 = U(1), D2 = U(2), D3 = U(3), D4 = U(4), D5 = U(5), O = U(9), P90 = U(90);
const LISTS = ['leads', 'sport_pack_waitlist', 'investor_requests', 'partner_inquiries', 'yoga_testers'];

const SCHEMA = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema ops;
create table auth.users (
  id uuid primary key, email varchar,
  raw_app_meta_data jsonb not null default '{}'::jsonb,
  deleted_at timestamptz, created_at timestamptz not null default now());
create table auth.identities (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  email text, provider text not null default 'email');
create table ops.internal_accounts (user_id uuid primary key, note text, added_at timestamptz not null default now());
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade, email text not null,
  created_at timestamptz not null default now());
create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null,
  status text not null default 'requested' check (status in ('requested','in_progress','completed','failed')),
  requested_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  completed_at timestamptz);
create unique index account_deletion_requests_one_open on public.account_deletion_requests (user_id) where status in ('requested','in_progress');
create or replace function public.account_deletion_requests_touch() returns trigger language plpgsql as $$
begin
  if new.user_id is distinct from old.user_id or new.requested_at is distinct from old.requested_at then
    raise exception 'account_deletion_requests: user_id and requested_at are immutable';
  end if;
  new.updated_at := now();
  if new.status = 'completed' then new.completed_at := coalesce(old.completed_at, now()); else new.completed_at := null; end if;
  return new;
end $$;
create trigger account_deletion_requests_touch before update on public.account_deletion_requests
  for each row execute function public.account_deletion_requests_touch();
create table public.athletes (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, email text);
create table public.clients (user_id uuid primary key references auth.users(id) on delete cascade, email text);
create table public.assessments (id uuid primary key default gen_random_uuid(), user_id uuid references public.users(id) on delete cascade);
create table public.billing_consents (id uuid primary key default gen_random_uuid(), user_id uuid);
create table public.consent_events (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null);
create table public.leads (id uuid primary key default gen_random_uuid(), email text not null,
  converted_user_id uuid references public.users(id) on delete set null, created_at timestamptz not null default now());
create table public.sport_pack_waitlist (id bigint generated always as identity primary key, email text not null, sport text);
create table public.investor_requests (id uuid primary key default gen_random_uuid(), email text not null, name text);
create table public.partner_inquiries (id bigint generated always as identity primary key, email text not null, name text);
create table public.yoga_testers (email text primary key, note text, added_at timestamptz not null default now());
CREATE OR REPLACE FUNCTION public.is_test_account(p_email text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog', 'pg_temp'
AS $f$ select exists (select 1 from auth.users u where p_email is not null and lower(u.email) = lower(p_email)
  and u.raw_app_meta_data ->> 'test_fixture' = 'true'); $f$;
`;

const SEED = `
insert into auth.users (id, email, raw_app_meta_data) values
  ('${D1}', 'd1@example.com', '{}'), ('${D2}', 'd2@example.com', '{}'), ('${D3}', 'd3@example.com', '{}'),
  ('${D4}', 'd4@example.com', '{}'), ('${D5}', 'd5@example.com', '{}'), ('${O}', 'o@example.com', '{}'),
  ('${HARD}', 'hard@example.com', '{}'), ('${INTERNAL}', 'internal@example.com', '{}'),
  ('${FIXTURE}', 'user@example.com', '{"test_fixture":true}');
insert into public.users (id, email) select id, email from auth.users;
insert into auth.identities (user_id, email) values ('${D1}', 'D1@example.com'), ('${O}', 'o@example.com');
insert into ops.internal_accounts (user_id, note) values ('${INTERNAL}', 'staff');
insert into public.account_deletion_requests (id, user_id, status) values
  ('${R(1)}', '${D1}', 'in_progress'), ('${R(2)}', '${D2}', 'requested'), ('${R(3)}', '${D3}', 'requested'),
  ('${R(4)}', '${D4}', 'requested'), ('${R(5)}', '${D5}', 'requested'),
  ('${R(7)}', '${HARD}', 'requested'), ('${R(8)}', '${INTERNAL}', 'requested'), ('${R(9)}', '${FIXTURE}', 'requested');
-- D1: a coach-typed athlete email, so a list row can only be matched through athletes.email.
insert into public.athletes (user_id, email) values ('${D1}', ' D1.Coach@Example.com '), ('${O}', 'o@example.com');
-- D3: an athletes.email that is ANOTHER account's email (O); must never be used to match.
insert into public.athletes (user_id, email) values ('${D3}', 'O@example.com');
insert into public.clients (user_id, email) values ('${D1}', 'd1@example.com');
insert into public.assessments (user_id) values ('${D1}'), ('${O}');
insert into public.billing_consents (user_id) values ('${D1}'), ('${O}');
insert into public.consent_events (user_id) values ('${D1}'), ('${O}');
insert into public.leads (converted_user_id, email) values
  ('${D1}', 'd1-other-address@example.com'),   -- matched by user id only
  (null, '  D1@Example.COM '),                 -- matched by email (cased, padded)
  (null, 'd1.coach@example.com'),              -- matched by the athletes-sourced email
  ('${O}', 'o@example.com'), (null, 'o@example.com'),
  ('${D3}', 'd3@example.com'), ('${D4}', 'd4@example.com'), (null, 'd5@example.com'),
  (null, 'hard@example.com'), (null, 'internal@example.com'), (null, 'user@example.com');
insert into public.sport_pack_waitlist (email, sport) values
  (' D1@EXAMPLE.com', 'bjj'), ('d1.coach@example.com', 'bb'), ('o@example.com', 'bjj'), ('d3@example.com', 'bjj'),
  ('d4@example.com', 'bjj'), ('d5@example.com', 'bjj'), ('hard@example.com', 'bjj'), ('internal@example.com', 'bjj'), ('user@example.com', 'bjj');
insert into public.investor_requests (email, name) values
  ('d1@example.com', 'a'), ('o@example.com', 'o'), ('d3@example.com', 'c'), ('d4@example.com', 'd'),
  ('hard@example.com', 'h'), ('internal@example.com', 'i'), ('user@example.com', 'f');
insert into public.partner_inquiries (email, name) values
  ('D1@example.com', 'a'), ('o@example.com', 'o'), ('d4@example.com', 'd'),
  ('hard@example.com', 'h'), ('internal@example.com', 'i'), ('user@example.com', 'f');
insert into public.yoga_testers (email, note) values
  ('d1@example.com', 'a'), ('o@example.com', 'o'), ('d4@example.com', 'd'), ('d5@example.com', 'e'),
  ('hard@example.com', 'h'), ('internal@example.com', 'i'), ('user@example.com', 'f');
`;

async function mk(seed = SEED) {
  const db = new PGlite();
  await db.exec(SCHEMA);
  await db.exec(seed);
  await db.exec(PURGE);
  await db.exec(HOOK);
  return db;
}
const q1 = async (db, sql, p) => (await db.query(sql, p)).rows[0];
const n = async (db, sql, p) => Number((await q1(db, sql, p)).n);
const listCountFor = async (db, email) => {
  const out = {};
  for (const t of LISTS) out[t] = await n(db, `select count(*) n from public.${t} where lower(btrim(email)) = lower(btrim($1))`, [email]);
  return out;
};
const totalLists = async (db) => {
  const out = {};
  for (const t of LISTS) out[t] = await n(db, `select count(*) n from public.${t}`);
  return out;
};
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const adr = async (db, id) => q1(db, `select status, completed_at from public.account_deletion_requests where id = $1`, [id]);
const tryErr = async (db, sql) => { try { await db.query(sql); return null; } catch (e) { return String(e.message || e); } };

const db = await mk();
const before = await totalLists(db);
const oBefore = await listCountFor(db, 'o@example.com');

// C1 dry-run default writes nothing.
const dry = (await q1(db, `select public.p1_25_complete_account_deletion('${R(1)}') j`)).j;
const afterDry = await totalLists(db);
ok('C1 completion default is dry_run, reports counts, writes nothing',
  dry.mode === 'dry_run' && dry.written === false && JSON.stringify(afterDry) === JSON.stringify(before) &&
  (await adr(db, R(1))).status === 'in_progress' && (await n(db, `select count(*) n from auth.users where id='${D1}'`)) === 1 &&
  ['public.leads', 3, 'public.sport_pack_waitlist', 2, 'public.investor_requests', 1, 'public.partner_inquiries', 1, 'public.yoga_testers', 1].every((v, i, a) => i % 2 || dry.cleanup.table_counts[v] === a[i + 1]),
  { counts: dry.cleanup.table_counts });
ok('C2 the dry-run and apply return values contain no email addresses', !JSON.stringify(dry).includes('@'));

// C3 apply clears all 5 lists for D1, by user id and by email, then deletes users, auth.users, marks completed.
const app = (await q1(db, `select public.p1_25_complete_account_deletion('${R(1)}', 'apply') j`)).j;
const a1 = await adr(db, R(1));
ok('C3 apply: request completed with completed_at, public.users and auth.users removed',
  app.written === true && a1.status === 'completed' && a1.completed_at !== null && app.public_users === 1 && app.auth_users === 1 &&
  (await n(db, `select count(*) n from auth.users where id='${D1}'`)) === 0 && (await n(db, `select count(*) n from public.users where id='${D1}'`)) === 0,
  { cleanup: app.cleanup.table_counts });
ok('C4 apply cleared all 5 lists for the account (8 rows)', sum(app.cleanup.table_counts) === 8 &&
  sum(await listCountFor(db, 'd1@example.com')) === 0 && sum(await listCountFor(db, 'd1.coach@example.com')) === 0, { cleared: app.cleanup.table_counts });
ok('C5 leads matched by converted_user_id (other address) and by email (cased/padded) are gone',
  (await n(db, `select count(*) n from public.leads where email in ('d1-other-address@example.com')`)) === 0 &&
  (await n(db, `select count(*) n from public.leads where lower(btrim(email)) = 'd1@example.com'`)) === 0);
ok('C6 other user O rows untouched in every list', JSON.stringify(await listCountFor(db, 'o@example.com')) === JSON.stringify(oBefore), { o: oBefore });
ok('C7 cascade: identities, athletes, clients, assessments of D1 gone; O kept',
  (await n(db, `select count(*) n from auth.identities where user_id='${D1}'`)) === 0 && (await n(db, `select count(*) n from public.athletes where user_id='${D1}'`)) === 0 &&
  (await n(db, `select count(*) n from public.clients where user_id='${D1}'`)) === 0 && (await n(db, `select count(*) n from public.assessments where user_id='${D1}'`)) === 0 &&
  (await n(db, `select count(*) n from public.assessments where user_id='${O}'`)) === 1);
ok('C8 billing_consents and consent_events rows kept (consent_events user_id set null by FK)',
  (await n(db, `select count(*) n from public.billing_consents`)) === 2 && (await n(db, `select count(*) n from public.consent_events`)) === 2);
ok('C9 apply return value contains no email addresses', !JSON.stringify(app).includes('@'));

// C10 completion with no list rows.
const t2 = await totalLists(db);
const app2 = (await q1(db, `select public.p1_25_complete_account_deletion('${R(2)}', 'apply') j`)).j;
ok('C10 a completion with no list rows works (0 cleared, completed, account removed)',
  sum(app2.cleanup.table_counts) === 0 && (await adr(db, R(2))).status === 'completed' && app2.auth_users === 1 &&
  JSON.stringify(await totalLists(db)) === JSON.stringify(t2));

// C11 guard: D3's athletes.email is O's email; O untouched, D3's own rows cleared.
const app3 = (await q1(db, `select public.p1_25_complete_account_deletion('${R(3)}', 'apply') j`)).j;
ok('C11 an email still owned by another account is never matched (O untouched; D3 own rows cleared)',
  JSON.stringify(await listCountFor(db, 'o@example.com')) === JSON.stringify(oBefore) && sum(await listCountFor(db, 'd3@example.com')) === 0 &&
  app3.cleanup.emails_matched === 1, { d3: app3.cleanup.table_counts });

// C12 forced cleanup failure rolls back the whole completion.
await db.exec(`create function public._t_fail() returns trigger language plpgsql as $$ begin raise exception 'forced test failure'; end $$;
  create trigger _t_fail_yoga before delete on public.yoga_testers for each row when (old.email = 'd4@example.com') execute function public._t_fail();`);
const d4Before = await listCountFor(db, 'd4@example.com');
const e12 = await tryErr(db, `select public.p1_25_complete_account_deletion('${R(4)}', 'apply')`);
ok('C12 forced cleanup failure (yoga_testers) fails the completion and rolls back every step',
  e12 && e12.includes('forced test failure') && (await adr(db, R(4))).status === 'requested' && (await adr(db, R(4))).completed_at === null &&
  (await n(db, `select count(*) n from auth.users where id='${D4}'`)) === 1 && (await n(db, `select count(*) n from public.users where id='${D4}'`)) === 1 &&
  JSON.stringify(await listCountFor(db, 'd4@example.com')) === JSON.stringify(d4Before), { d4: d4Before });

// C13 failure AFTER the cleanup (auth.users delete) also rolls the cleanup back.
await db.exec(`create trigger _t_fail_auth before delete on auth.users for each row when (old.id = '${D5}') execute function public._t_fail();`);
const d5Before = await listCountFor(db, 'd5@example.com');
const e13 = await tryErr(db, `select public.p1_25_complete_account_deletion('${R(5)}', 'apply')`);
ok('C13 failure at the auth.users delete rolls back the already-run list cleanup and public.users delete',
  e13 && e13.includes('forced test failure') && (await adr(db, R(5))).status === 'requested' &&
  (await n(db, `select count(*) n from public.users where id='${D5}'`)) === 1 && JSON.stringify(await listCountFor(db, 'd5@example.com')) === JSON.stringify(d5Before) && sum(d5Before) === 3,
  { d5: d5Before });
await db.exec(`drop trigger _t_fail_yoga on public.yoga_testers; drop trigger _t_fail_auth on auth.users;`);

// C14-C16 exclusions refuse completion; nothing changes.
for (const [tag, id, req, email, cls] of [
  ['C14', HARD, R(7), 'hard@example.com', 'excluded_hardcoded'],
  ['C15', INTERNAL, R(8), 'internal@example.com', 'excluded_internal_accounts'],
  ['C16', FIXTURE, R(9), 'user@example.com', 'excluded_fixture'],
]) {
  const lb = await listCountFor(db, email);
  const e = await tryErr(db, `select public.p1_25_complete_account_deletion('${req}', 'apply')`);
  const ed = await tryErr(db, `select public.p1_25_complete_account_deletion('${req}')`);
  const ec = await tryErr(db, `select public.p1_25_cleanup_at_completion('${id}', 'apply')`);
  ok(`${tag} ${cls}: completion and cleanup refused (apply and dry_run), nothing changed`,
    e && e.includes(cls) && ed && ec && ec.includes(cls) && (await adr(db, req)).status === 'requested' &&
    (await n(db, `select count(*) n from auth.users where id='${id}'`)) === 1 && JSON.stringify(await listCountFor(db, email)) === JSON.stringify(lb) && sum(lb) === 5,
    { lists: lb });
}
ok('C17 ops.internal_accounts never written', (await n(db, `select count(*) n from ops.internal_accounts`)) === 1);

// C18-C20 refusals.
ok('C18 cleanup_at_completion alone is refused without an open request', !!(await tryErr(db, `select public.p1_25_cleanup_at_completion('${O}', 'apply')`)));
ok('C19 completing an already completed request is refused', (await tryErr(db, `select public.p1_25_complete_account_deletion('${R(1)}', 'apply')`) || '').includes('not open'));
ok('C20 an unknown mode is refused', !!(await tryErr(db, `select public.p1_25_complete_account_deletion('${R(4)}', 'yes')`)));

// C21 privileges: service_role only.
const priv = (await db.query(`select f, has_function_privilege('anon', f, 'execute') a, has_function_privilege('authenticated', f, 'execute') u, has_function_privilege('service_role', f, 'execute') s
  from unnest(array['public.p1_25_exclusion_class(uuid)','public.p1_25_account_emails(uuid)','public.p1_25_cleanup_at_completion(uuid,text)','public.p1_25_complete_account_deletion(uuid,text)']) f`)).rows;
ok('C21 EXECUTE is service_role only on all four functions', priv.length === 4 && priv.every((r) => !r.a && !r.u && r.s));

// C22 v3 purge defaults unchanged.
const pd = (await q1(db, `select public.purge_deleted_accounts() j`)).j;
ok('C22 purge_deleted_accounts() default is still dry_run, 90 days, writes nothing', pd.mode === 'dry_run' && pd.written === false && pd.retention === '90 days');
ok('C23 purge retention below 90 days still refused', !!(await tryErr(db, `select public.purge_deleted_accounts('dry_run', interval '30 days')`)));
ok('C24 just-completed requests (under 90 days) do not qualify for the day-90 purge', pd.qualifying_count === 0);

// C25 rollback drops only the four hook functions.
await db.exec(HOOK_RB);
const left = await n(db, `select count(*) n from pg_proc where proname like 'p1_25_%'`);
const purgeLeft = await n(db, `select count(*) n from pg_proc where proname = 'purge_deleted_accounts'`);
ok('C25 hook rollback drops the four functions and leaves purge_deleted_accounts', left === 0 && purgeLeft === 1);

// S1-S3 day-90 sweep on a separate db: completed > 90 days ago, auth.users/public.users already gone,
// emails still recoverable only from identities / athletes / clients / leads (no FKs in this fixture).
const SWEEP_SEED = `
alter table auth.identities drop constraint identities_user_id_fkey;
alter table public.athletes drop constraint athletes_user_id_fkey;
alter table public.clients drop constraint clients_user_id_fkey;
alter table public.leads drop constraint leads_converted_user_id_fkey;
insert into auth.users (id, email) values ('${O}', 'o@example.com');
insert into public.users (id, email) values ('${O}', 'o@example.com');
insert into public.account_deletion_requests (user_id, status, requested_at, completed_at) values ('${P90}', 'completed', now() - interval '130 days', now() - interval '91 days');
insert into auth.identities (user_id, email) values ('${P90}', 'p90i@example.com');
insert into public.athletes (user_id, email) values ('${P90}', 'P90A@example.com ');
insert into public.clients (user_id, email) values ('${P90}', 'o@example.com');
insert into public.leads (converted_user_id, email) values ('${P90}', 'p90l@example.com'), (null, 'p90l@example.com'), (null, 'o@example.com');
insert into public.sport_pack_waitlist (email) values ('p90i@example.com'), ('o@example.com');
insert into public.investor_requests (email) values ('p90a@example.com'), ('o@example.com');
insert into public.partner_inquiries (email, name) values ('p90l@example.com', 'x'), ('o@example.com', 'o');
insert into public.yoga_testers (email) values ('p90i@example.com'), ('o@example.com');
`;
const sdb = new PGlite();
await sdb.exec(SCHEMA);
await sdb.exec(SWEEP_SEED);
await sdb.exec(PURGE);
const sdry = (await q1(sdb, `select public.purge_deleted_accounts() j`)).j;
const sBefore = await totalLists(sdb);
ok('S1 day-90 dry run finds the account and writes nothing', sdry.qualifying_count === 1 && sdry.written === false && JSON.stringify(await totalLists(sdb)) === JSON.stringify(sBefore), { counts: sdry.table_counts });
const sapp = (await q1(sdb, `select public.purge_deleted_accounts('apply') j`)).j;
const sAfter = await totalLists(sdb);
ok('S2 day-90 sweep clears the 5 lists using emails still recoverable from identities, athletes and leads',
  sapp.written !== false && sum(await listCountFor(sdb, 'p90i@example.com')) === 0 && sum(await listCountFor(sdb, 'p90a@example.com')) === 0 &&
  sum(await listCountFor(sdb, 'p90l@example.com')) === 0 && sum(sBefore) - sum(sAfter) === 6, { before: sBefore, after: sAfter });
ok('S3 day-90 sweep never matches an email that belongs to another live account (O kept in all 5 lists)',
  JSON.stringify(await listCountFor(sdb, 'o@example.com')) === JSON.stringify({ leads: 1, sport_pack_waitlist: 1, investor_requests: 1, partner_inquiries: 1, yoga_testers: 1 }));
ok('S4 the day-90 apply wrote a zz_bak_p1_25_* backup (7-day window unchanged)', typeof sapp.backup_schema === 'string' && /^zz_bak_p1_25_\d{14}$/.test(sapp.backup_schema));

const out = path.join(HERE, 'results-v4.json');
const passed = Object.values(results).filter((r) => r.pass).length;
fs.writeFileSync(out, JSON.stringify({ passed, failed: fails, results }, null, 2));
console.log(`\n${passed}/${Object.keys(results).length} passed`);
if (fails) process.exit(1);
