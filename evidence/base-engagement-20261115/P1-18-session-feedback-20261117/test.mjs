// PGlite + source-grep tests for P1-18 session_feedback (20261117120000) and
// P1-18b assessment_feedback (20261117120100). BUILD ONLY, not applied.
// Run: npm i && node test.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';

const R = new URL('../../', import.meta.url).pathname;
const MIG_S = fs.readFileSync(R + 'supabase/migrations-unapplied/20261117120000_p1_18_session_feedback.sql', 'utf8');
const MIG_A = fs.readFileSync(R + 'supabase/migrations-unapplied/20261117120100_p1_18_assessment_feedback.sql', 'utf8');
const RB_BOTH = fs.readFileSync(R + 'supabase/migrations-unapplied/20261117120100_p1_18_feedback_tables_rollback.sql', 'utf8');
const HANDLER = fs.readFileSync(R + 'supabase/functions/export-my-data/handler.ts', 'utf8');
const INDEX = fs.readFileSync(R + 'supabase/functions/export-my-data/index.ts', 'utf8');

const results = {}; let fails = 0;
const ok = (n, c, info) => { results[n] = { pass: !!c, ...(info ? { info } : {}) }; if (!c) fails++; console.log(`${c ? 'PASS' : 'FAIL'} ${n}${info ? ' ' + JSON.stringify(info) : ''}`); };
const U = (n) => `00000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;
const S = (n) => `10000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;
const A = (n) => `20000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;

async function mk() {
  const db = new PGlite();
  await db.exec(`
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text);
create table public.users (id uuid primary key references auth.users(id) on delete cascade);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create table public.protocol_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null,
  protocol_day text default '' not null,
  logged_at timestamptz default now() not null,
  sport text default 'base' not null,
  unique (user_id, session_date)
);
-- Stub check_kind has no 'full'|'quick' check, so the test can also insert a 'partial' kind.
-- Live 031000 (20261116143905) only allows 'full' and 'quick'; the policy requires = 'full' either way.
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  assessed_at timestamptz default now() not null,
  check_kind text not null default 'full'
);
create table public.product_events (
  id bigserial primary key,
  user_id uuid,
  anon_id text,
  session_id text,
  event text not null,
  props jsonb not null default '{}'::jsonb,
  sport text,
  source text default 'server' not null,
  path text,
  created_at timestamptz not null default now()
);
create or replace function public.log_product_event(
  p_user_id uuid, p_event text, p_props jsonb default '{}'::jsonb,
  p_sport text default null, p_source text default 'server'
) returns void language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
begin
  insert into public.product_events (user_id, event, props, sport, source)
  values (p_user_id, p_event, coalesce(p_props, '{}'::jsonb), p_sport, p_source);
exception when others then
  raise warning 'log_product_event(%) failed: %', p_event, sqlerrm;
end;
$$;
create table public.client_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  message text,
  created_at timestamptz default now()
);
grant usage on schema public to anon, authenticated, service_role;
grant select on public.protocol_sessions to authenticated, service_role;
grant select on public.assessments to authenticated, service_role;
grant select, insert on public.product_events to service_role;
`);
  return db;
}

const objMd5 = async (db, rel) => {
  const r = await db.query(`
    select md5(coalesce(pg_get_viewdef(c.oid, true), '')) as vmd5,
           (select string_agg(attname||':'||format_type(atttypid,atttypmod), ',' order by attnum)
              from pg_attribute where attrelid=c.oid and attnum>0 and not attisdropped) as cols,
           c.relkind,
           pg_get_userbyid(c.relowner) as owner,
           c.relacl::text as acl
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where (n.nspname||'.'||c.relname) = $1 or c.oid = to_regclass($1)`, [rel]);
  return r.rows[0] || null;
};
const fnSrc = async (db, name) => {
  const r = await db.query(`select pg_get_functiondef(p.oid) as def from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=$1`, [name]);
  return r.rows[0]?.def || null;
};
const snap = async (db) => ({
  ps: await objMd5(db, 'public.protocol_sessions'),
  pe: await objMd5(db, 'public.product_events'),
  cf: await objMd5(db, 'public.client_feedback'),
  us: await objMd5(db, 'public.users'),
  asmt: await objMd5(db, 'public.assessments'),
  log: await fnSrc(db, 'log_product_event'),
});
const sameSnap = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const asUser = async (db, uid, sql, params=[]) => {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
  try { return await db.query(sql, params); }
  finally { await db.exec('reset role; select set_config(\'request.jwt.claim.sub\', \'\', false);'); }
};
const asAnon = async (db, sql, params=[]) => {
  await db.exec('set role anon;');
  try { return await db.query(sql, params); }
  finally { await db.exec('reset role;'); }
};
const denied = async (fn) => { try { await fn(); return false; } catch { return true; } };
const has = async (db, rel) => (await db.query(`select to_regclass($1) is not null as ok`, [rel])).rows[0].ok;
const fnExists = async (db, name) => (await db.query(`select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname=$1`, [name])).rows[0].n > 0;

const db = await mk();
const pre = await snap(db);
await db.query(`insert into auth.users(id, email) values ($1,'user@example.com'), ($2,'user@example.com')`, [U(1), U(2)]);
await db.query(`insert into public.users(id) values ($1), ($2)`, [U(1), U(2)]);
await db.query(`insert into public.protocol_sessions(id, user_id, session_date) values ($1,$2,'2026-11-16'), ($3,$4,'2026-11-16')`, [S(1), U(1), S(2), U(2)]);
// A1 full own, A2 other user's full, A3 own quick, A4 own partial
await db.query(`insert into public.assessments(id, user_id, check_kind) values
  ($1,$2,'full'), ($3,$4,'full'), ($5,$2,'quick'), ($6,$2,'partial')`,
  [A(1), U(1), A(2), U(2), A(3), A(4)]);

await db.exec(MIG_S);
await db.exec(MIG_A);
const post = await snap(db);
ok('T_existing objects unchanged after both applies (protocol_sessions, assessments, users, product_events, client_feedback, log_product_event)',
  sameSnap(pre, post));

const sfCols = (await objMd5(db, 'public.session_feedback'))?.cols || '';
const afCols = (await objMd5(db, 'public.assessment_feedback'))?.cols || '';
ok('T_session_feedback columns', sfCols.includes('session_id:uuid') && sfCols.includes('note:text') && sfCols.includes('feel:text'), { cols: sfCols });
ok('T_assessment_feedback columns (no free-text note)', afCols.includes('assessment_id:uuid') && afCols.includes('ease:text') && afCols.includes('survey_version:text') && !afCols.includes('note:'), { cols: afCols });

// ---------- session_feedback: own insert/select, other denied, anon denied ----------
const NOTE = 'felt steady on the third move';
let ownSf;
try {
  ownSf = await asUser(db, U(1),
    `insert into public.session_feedback (user_id, session_id, session_date, feel, clear, length_fit, note)
     values ($1,$2,'2026-11-16','about_right','yes','about_right',$3) returning id, note, feel`,
    [U(1), S(1), NOTE]);
  ok('T_sf own insert OK', ownSf.rows.length===1 && ownSf.rows[0].note===NOTE);
} catch (e) { ok('T_sf own insert OK', false, { err: String(e.message||e) }); }
const ownSfId = ownSf?.rows?.[0]?.id;
const sfSel = await asUser(db, U(1), `select id, note from public.session_feedback`);
ok('T_sf own select OK', sfSel.rows.length===1 && sfSel.rows[0].id===ownSfId && sfSel.rows[0].note===NOTE);
ok("T_sf other user's rows denied (select)", (await asUser(db, U(2), `select id from public.session_feedback`)).rows.length===0);
ok("T_sf other user cannot insert onto someone else's session",
  await denied(() => asUser(db, U(2), `insert into public.session_feedback (user_id, session_id, session_date, feel) values ($1,$2,'2026-11-16','easy')`, [U(1), S(1)])));
ok('T_sf user2 can insert their own row',
  (await asUser(db, U(2), `insert into public.session_feedback (user_id, session_id, session_date, feel, note) values ($1,$2,'2026-11-16','hard',$3) returning id`, [U(2), S(2), 'other note must not leak'])).rows.length===1);
ok('T_sf anon denied',
  await denied(() => asAnon(db, `select id, note from public.session_feedback`))
  && await denied(() => asAnon(db, `insert into public.session_feedback (user_id, session_id, session_date, feel) values ($1,$2,'2026-11-16','easy')`, [U(1), S(1)])));

const sfEv = (await db.query(`select event, props, user_id::text as uid from public.product_events where event='session_feedback_submitted' and user_id=$1`, [U(1)])).rows;
const sfProps = sfEv[0]?.props || {};
ok('T_sf event payload is ids + timestamps + event name only (no answers, no note)',
  sfEv.length===1 && sfEv[0].event==='session_feedback_submitted' && sfEv[0].uid===U(1)
  && Object.keys(sfProps).sort().join(',')==='created_at,id,session_id'
  && !('feel' in sfProps) && !('note' in sfProps) && !('has_survey' in sfProps)
  && !JSON.stringify(sfEv[0]).includes(NOTE) && sfProps.id===ownSfId && sfProps.session_id===S(1),
  { propKeys: Object.keys(sfProps).sort() });

// ---------- assessment_feedback: own FULL insert/select ----------
const VER = 'p1-18b-card1-2026-11-16';
let ownAf;
try {
  ownAf = await asUser(db, U(1),
    `insert into public.assessment_feedback (user_id, assessment_id, ease, results_clear, check_again, survey_version)
     values ($1,$2,'okay','mostly','yes',$3) returning id, ease, assessment_id`,
    [U(1), A(1), VER]);
  ok('T_af own insert on FULL assessment OK', ownAf.rows.length===1 && ownAf.rows[0].ease==='okay' && ownAf.rows[0].assessment_id===A(1));
} catch (e) { ok('T_af own insert on FULL assessment OK', false, { err: String(e.message||e) }); }
const ownAfId = ownAf?.rows?.[0]?.id;
ok('T_af own select OK', (await asUser(db, U(1), `select id, ease from public.assessment_feedback`)).rows.length===1
  && (await asUser(db, U(1), `select id from public.assessment_feedback`)).rows[0].id===ownAfId);

ok("T_af other user's rows denied (select)", (await asUser(db, U(2), `select id from public.assessment_feedback`)).rows.length===0);
ok("T_af other user's FULL assessment rejected",
  await denied(() => asUser(db, U(1),
    `insert into public.assessment_feedback (user_id, assessment_id, ease, results_clear, check_again, survey_version)
     values ($1,$2,'easy','yes','no',$3)`, [U(1), A(2), VER])));
ok("T_af other user cannot insert a row for user1's FULL assessment",
  await denied(() => asUser(db, U(2),
    `insert into public.assessment_feedback (user_id, assessment_id, ease, results_clear, check_again, survey_version)
     values ($1,$2,'easy','yes','no',$3)`, [U(1), A(1), VER])));
ok('T_af own QUICK assessment rejected',
  await denied(() => asUser(db, U(1),
    `insert into public.assessment_feedback (user_id, assessment_id, ease, results_clear, check_again, survey_version)
     values ($1,$2,'easy','yes','no',$3)`, [U(1), A(3), VER])));
ok('T_af own PARTIAL assessment rejected',
  await denied(() => asUser(db, U(1),
    `insert into public.assessment_feedback (user_id, assessment_id, ease, results_clear, check_again, survey_version)
     values ($1,$2,'easy','yes','no',$3)`, [U(1), A(4), VER])));
ok('T_af anon denied',
  await denied(() => asAnon(db, `select id from public.assessment_feedback`))
  && await denied(() => asAnon(db, `insert into public.assessment_feedback (user_id, assessment_id, ease, results_clear, check_again, survey_version) values ($1,$2,'easy','yes','no',$3)`, [U(1), A(1), VER])));

// user2 can insert on their own full assessment (isolation)
ok('T_af user2 can insert on their own FULL assessment',
  (await asUser(db, U(2),
    `insert into public.assessment_feedback (user_id, assessment_id, ease, results_clear, check_again, survey_version)
     values ($1,$2,'hard','no','maybe',$3) returning id`, [U(2), A(2), VER])).rows.length===1);
ok('T_af user1 still sees only their own row',
  (await asUser(db, U(1), `select assessment_id from public.assessment_feedback`)).rows.length===1
  && (await asUser(db, U(1), `select assessment_id from public.assessment_feedback`)).rows[0].assessment_id===A(1));

const afEv = (await db.query(`select event, props, user_id::text as uid from public.product_events where event='assessment_feedback_submitted' and user_id=$1`, [U(1)])).rows;
const afProps = afEv[0]?.props || {};
const afBlob = JSON.stringify(afEv[0] || {});
ok('T_af event payload is ids + timestamps + event name only (no answers)',
  afEv.length===1 && afEv[0].event==='assessment_feedback_submitted' && afEv[0].uid===U(1)
  && Object.keys(afProps).sort().join(',')==='assessment_id,created_at,id'
  && !('ease' in afProps) && !('results_clear' in afProps) && !('check_again' in afProps) && !('survey_version' in afProps)
  && !afBlob.includes('okay') && !afBlob.includes(VER) && afProps.id===ownAfId && afProps.assessment_id===A(1),
  { propKeys: Object.keys(afProps).sort() });

// write-once
let sfUpd=false, sfDel=false, afUpd=false, afDel=false;
try { await asUser(db, U(1), `update public.session_feedback set note='x' where id=$1`, [ownSfId]); } catch { sfUpd=true; }
try { await asUser(db, U(1), `delete from public.session_feedback where id=$1`, [ownSfId]); } catch { sfDel=true; }
try { await asUser(db, U(1), `update public.assessment_feedback set ease='hard' where id=$1`, [ownAfId]); } catch { afUpd=true; }
try { await asUser(db, U(1), `delete from public.assessment_feedback where id=$1`, [ownAfId]); } catch { afDel=true; }
const sfNote = (await db.query(`select note from public.session_feedback where id=$1`, [ownSfId])).rows[0]?.note;
const afEase = (await db.query(`select ease from public.assessment_feedback where id=$1`, [ownAfId])).rows[0]?.ease;
ok('T_both tables are write-once (no update/delete for the owner)',
  sfUpd && sfDel && afUpd && afDel && sfNote===NOTE && afEase==='okay');

// ---------- cascade: deleting the account (auth.users) removes both tables' rows; other user kept ----------
const sfBefore = (await db.query(`select count(*)::int n from public.session_feedback where user_id=$1`, [U(1)])).rows[0].n;
const afBefore = (await db.query(`select count(*)::int n from public.assessment_feedback where user_id=$1`, [U(1)])).rows[0].n;
await db.query(`delete from auth.users where id=$1`, [U(1)]);
const sfAfter = (await db.query(`select count(*)::int n from public.session_feedback where user_id=$1`, [U(1)])).rows[0].n;
const afAfter = (await db.query(`select count(*)::int n from public.assessment_feedback where user_id=$1`, [U(1)])).rows[0].n;
const sfOther = (await db.query(`select count(*)::int n from public.session_feedback where user_id=$1`, [U(2)])).rows[0].n;
const afOther = (await db.query(`select count(*)::int n from public.assessment_feedback where user_id=$1`, [U(2)])).rows[0].n;
ok('T_deleting the account removes both session_feedback and assessment_feedback rows (ON DELETE CASCADE); other user kept',
  sfBefore>=1 && afBefore>=1 && sfAfter===0 && afAfter===0 && sfOther===1 && afOther===1,
  { sfBefore, afBefore, sfAfter, afAfter, sfOther, afOther });

// ---------- combined rollback is exact restore ----------
const mid = await snap(db);
await db.exec(RB_BOTH);
ok('T_combined rollback is exact: both tables and trigger functions dropped; existing objects restored to pre-apply',
  !(await has(db, 'public.session_feedback')) && !(await has(db, 'public.assessment_feedback'))
  && !(await fnExists(db, 'tg_pe_session_feedback')) && !(await fnExists(db, 'tg_pe_assessment_feedback'))
  && sameSnap(await snap(db), pre) && sameSnap(mid, pre));

await db.exec(MIG_S);
await db.exec(MIG_A);
ok('T_re-apply both after combined rollback is clean',
  (await has(db, 'public.session_feedback')) && (await has(db, 'public.assessment_feedback')));

// ---------- export-my-data coverage; flag stays off ----------
ok('T_export-my-data TABLES includes session_feedback with all columns, keyed on user_id',
  /key:\s*"session_feedback"[\s\S]*?cols:\s*"id, user_id, session_id, session_date, feel, clear, length_fit, note, sport, source, created_at"/.test(HANDLER));
ok('T_export-my-data TABLES includes assessment_feedback with all columns, keyed on user_id',
  /key:\s*"assessment_feedback"[\s\S]*?cols:\s*"id, user_id, assessment_id, ease, results_clear, check_again, survey_version, sport, source, created_at"/.test(HANDLER));
ok('T_EXPORT_MY_DATA stays off (flagOn still exact "on"; index.ts still reads the env flag)',
  /flagOn\s*=\s*\([^)]*\)\s*:\s*boolean\s*=>\s*v\s*===\s*"on"/.test(HANDLER)
  && INDEX.includes('flagOn(Deno.env.get("EXPORT_MY_DATA"))'));

// ---------- Stacy (1): grep proof for BOTH tables ----------
function walk(dir, acc=[]) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name==='node_modules' || ent.name==='.git' || ent.name==='dist') continue;
      walk(p, acc);
    } else if (/\.(ts|js|mjs|sql|tsx)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}
const repoScan = [
  ...walk(path.join(R, 'supabase/functions/ai-chat')),
  ...walk(path.join(R, 'supabase/functions/embed-knowledge')),
  ...walk(path.join(R, 'supabase/functions/embed-general-once')),
  ...fs.readdirSync(path.join(R, 'supabase/migrations')).filter((f) => /rombot_context|search_rombot_knowledge|sport_aware_rag/.test(f))
      .map((f) => path.join(R, 'supabase/migrations', f)),
];
const extraScan = walk('/workspace/p1-17-wt/supabase/functions/rombot-checkin');
const allScan = [...repoScan, ...extraScan];
const leakHits = [];
for (const f of allScan) {
  const text = fs.readFileSync(f, 'utf8');
  if (/session_feedback|assessment_feedback/i.test(text)) leakHits.push(path.relative(R, f) || f);
}
ok('T_grep: session_feedback and assessment_feedback do not appear in ai-chat, embed-knowledge, rombot_context, search_rombot_knowledge, or rombot-checkin',
  leakHits.length===0, { scanned: allScan.length, leakHits });

const fromRe = /\.from\(\s*["']([^"']+)["']\s*\)/g;
const aiFrom = new Set();
for (const f of walk(path.join(R, 'supabase/functions/ai-chat'))) {
  const text = fs.readFileSync(f, 'utf8');
  let m; while ((m = fromRe.exec(text))) aiFrom.add(m[1]);
}
const aiAllowed = new Set(['user_ai_preferences','users','coaches','athletes','rombot_context','ai_messages','ai_conversations','assessments']);
ok('T_grep: on-branch ai-chat .from() tables are a fixed allow-list (no generic pull, no feedback tables)',
  [...aiFrom].every((t) => aiAllowed.has(t)) && !aiFrom.has('session_feedback') && !aiFrom.has('assessment_feedback'),
  { aiFrom: [...aiFrom].sort() });

const embedFrom = new Set();
for (const f of walk(path.join(R, 'supabase/functions/embed-knowledge'))) {
  const text = fs.readFileSync(f, 'utf8');
  let m; while ((m = fromRe.exec(text))) embedFrom.add(m[1]);
}
ok('T_grep: embed-knowledge only reads/writes rombot_knowledge',
  [...embedFrom].every((t) => t==='rombot_knowledge'), { embedFrom: [...embedFrom] });

const rcFiles = fs.readdirSync(path.join(R, 'supabase/migrations')).filter((f) => /rombot_context/.test(f))
  .map((f) => path.join(R, 'supabase/migrations', f));
ok('T_grep: rombot_context migrations do not reference session_feedback, assessment_feedback, or client_feedback',
  !rcFiles.some((f) => /session_feedback|assessment_feedback|client_feedback/.test(fs.readFileSync(f, 'utf8'))),
  { files: rcFiles.map((f)=>path.basename(f)) });

const checkinDir = '/workspace/p1-17-wt/supabase/functions/rombot-checkin';
if (fs.existsSync(checkinDir)) {
  const cFrom = new Set();
  for (const f of walk(checkinDir)) {
    const text = fs.readFileSync(f, 'utf8');
    let m; while ((m = fromRe.exec(text))) cFrom.add(m[1]);
  }
  ok('T_grep: rombot-checkin (11803fee tree) has no session_feedback or assessment_feedback in .from() list',
    !cFrom.has('session_feedback') && !cFrom.has('assessment_feedback'), { cFrom: [...cFrom].sort() });
} else {
  ok('T_grep: rombot-checkin tree not present on disk (skipped)', true, { skipped: true });
}

fs.writeFileSync(new URL('./results.json', import.meta.url), JSON.stringify({ totals: { pass: Object.keys(results).length - fails, fail: fails, total: Object.keys(results).length }, results }, null, 2) + '\n');
console.log(`\n${fails === 0 ? 'ALL PASS' : 'FAIL'} ${Object.keys(results).length - fails}/${Object.keys(results).length}`);
process.exit(fails === 0 ? 0 : 1);
