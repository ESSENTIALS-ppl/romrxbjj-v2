// PGlite test for 20261116150000_p1_22_checkout_deduped_exclude_test (synthetic data only; no live credentials).
// Run: npm i (or link @electric-sql/pglite 0.5.16) && node test.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
const R = new URL('../../', import.meta.url).pathname;
const LIVE = fs.readFileSync(R + 'supabase/migrations/20261116030659_p1_22_retention_measurement.sql', 'utf8');
const MIG = fs.readFileSync(R + 'supabase/migrations-unapplied/20261116150000_p1_22_checkout_deduped_exclude_test.sql', 'utf8');
const RB = fs.readFileSync(R + 'supabase/migrations-unapplied/20261116150000_p1_22_checkout_deduped_exclude_test_rollback.sql', 'utf8');
// The live view + comment + grant block, byte-for-byte from the live 030659 migration.
const s = LIVE.indexOf('CREATE OR REPLACE VIEW ops.checkout_completed_deduped AS');
const e = LIVE.indexOf('GRANT SELECT ON ops.checkout_completed_deduped TO service_role, postgres;') + 'GRANT SELECT ON ops.checkout_completed_deduped TO service_role, postgres;'.length;
const LIVE_VIEW = LIVE.slice(s, e);
const results = {}; let fails = 0;
const ok = (name, cond, info) => { results[name] = { pass: !!cond, ...(info ? { info } : {}) }; if (!cond) fails++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${info ? ' ' + JSON.stringify(info) : ''}`); };
const db = new PGlite();
await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create schema ops;
create table auth.users (id uuid primary key, email varchar, raw_app_meta_data jsonb);
create table public.product_events (id bigserial primary key, user_id uuid, anon_id text, session_id text, event text not null,
  props jsonb not null default '{}'::jsonb, sport text, source text, path text, created_at timestamptz not null default now());
create table ops.internal_accounts (user_id uuid primary key, note text, added_at timestamptz not null default now());
-- live definitions (read from prod pg_get_functiondef, Nov 16 2026: md5 de7d4fe0 / d70fa4c4)
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
`);
await db.exec(LIVE_VIEW);
const U = (n) => `00000000-0000-4000-8000-00000000000${n}`;
// 1 real buyer, 2 fixtures, 1 internal (staff), 1 fixture-looking address WITHOUT the app-meta flag (not a fixture), 1 anonymous row.
await db.exec(`
insert into auth.users values
 ('${U(1)}','buyer@example.com','{}'),
 ('${U(2)}','jim+romrx-fix1@romrx.io','{"test_fixture":true}'),
 ('${U(3)}','jim+romrx-fix2@romrx.io','{"test_fixture":"true"}'),
 ('${U(4)}','staff@example.com','{}'),
 ('${U(5)}','jim+romrx-noflag@romrx.io','{}');
insert into public.product_events (user_id, event, props, created_at) values
 ('${U(1)}','checkout_completed','{"purpose":"base"}','2026-11-02 15:00Z'),
 ('${U(1)}','checkout_completed','{"purpose":"base"}','2026-11-02 15:20Z'),
 ('${U(1)}','checkout_completed','{"purpose":"base"}','2026-11-02 16:10Z'),
 ('${U(1)}','checkout_completed','{"purpose":"sport_pack"}','2026-11-02 15:05Z'),
 ('${U(2)}','checkout_completed','{"purpose":"base"}','2026-11-03 10:00Z'),
 ('${U(3)}','checkout_completed','{"purpose":"base"}','2026-11-04 10:00Z'),
 ('${U(3)}','checkout_completed','{"purpose":"base","stripe_checkout_session_id":"cs_test_fix3"}','2026-11-05 10:00Z'),
 ('${U(4)}','checkout_completed','{"purpose":"base"}','2026-11-06 10:00Z'),
 ('${U(5)}','checkout_completed','{"purpose":"base"}','2026-11-07 10:00Z'),
 (null,'checkout_completed','{"purpose":"base"}','2026-11-08 10:00Z'),
 ('${U(1)}','checkout_completed','{"purpose":"base","stripe_checkout_session_id":"cs_test_buyer"}','2026-11-09 10:00Z'),
 ('${U(1)}','checkout_completed','{"purpose":"base","stripe_checkout_session_id":"cs_test_buyer"}','2026-11-09 10:01Z'),
 ('${U(1)}','page_view','{}','2026-11-02 15:00Z');
`);
const meta = async () => (await db.query(`select pg_get_userbyid(c.relowner) owner, c.reloptions::text ro, c.relacl::text acl, c.oid::int oid,
  md5(pg_get_viewdef(c.oid, true)) vmd5, obj_description(c.oid,'pg_class') cmt,
  (select string_agg(attname||':'||format_type(atttypid,atttypmod), ',' order by attnum) from pg_attribute where attrelid=c.oid and attnum>0) cols
  from pg_class c where c.oid='ops.checkout_completed_deduped'::regclass`)).rows[0];
const rows = async () => (await db.query(`select user_id::text u, props->>'purpose' p, props->>'stripe_checkout_session_id' sid, created_at from ops.checkout_completed_deduped order by 1 nulls last, 2, 4`)).rows;
const pre = await meta(); const preRows = await rows();
ok('T0 pre (live view): fixtures are counted today', preRows.filter(r => r.u === U(2) || r.u === U(3)).length === 3, { pre_rows: preRows.length });
// staff: Jim-named account (internal_accounts)
await db.exec(`insert into ops.internal_accounts (user_id, note) values ('${U(4)}','synthetic staff');`);
await db.exec(MIG);
const post = await meta(); const postRows = await rows();
ok('T1 fixtures excluded (flagged jim+romrx-* accounts, with and without a session id)', postRows.every(r => r.u !== U(2) && r.u !== U(3)));
const buyerPre = preRows.filter(r => r.u === U(1)), buyerPost = postRows.filter(r => r.u === U(1));
ok('T2 real buyer rows kept, identical to the live view', JSON.stringify(buyerPre) === JSON.stringify(buyerPost) && buyerPost.length === 3, { buyer_rows: buyerPost.length });
ok('T2b 2-hour window and purpose split unchanged for the buyer (base window, sport_pack, session-id row)',
  buyerPost.filter(r => r.p === 'base' && !r.sid).length === 1 && buyerPost.filter(r => r.p === 'sport_pack').length === 1 && buyerPost.filter(r => r.sid === 'cs_test_buyer').length === 1);
ok('T3 internal_accounts row excluded (same hook as ops.v_real_assessed)', postRows.every(r => r.u !== U(4)));
ok('T4 unflagged jim+romrx-* address is NOT a fixture and is kept', postRows.some(r => r.u === U(5)));
ok('T5 anonymous (NULL user_id) row kept', postRows.some(r => r.u === null));
ok('T6 column list unchanged', post.cols === pre.cols, { cols: post.cols });
ok('T7 owner, reloptions, grants and oid unchanged', post.owner === pre.owner && post.ro === pre.ro && post.acl === pre.acl && post.oid === pre.oid, { owner: post.owner, reloptions: post.ro, acl: post.acl });
ok('T8 viewdef changed only by the exclusion', pre.vmd5 !== post.vmd5 && (await db.query(`select pg_get_viewdef('ops.checkout_completed_deduped'::regclass, true) d`)).rows[0].d.includes('is_excluded_from_metrics'), { pre_md5: pre.vmd5, post_md5: post.vmd5 });
ok('T9 comment updated with the exclusion note', post.cmt !== pre.cmt && post.cmt.startsWith(pre.cmt.slice(0, -1)));
ok('T10 page_view and other events still ignored', postRows.length === 5, { post_rows: postRows.length });
await db.exec(RB);
const rb = await meta(); const rbRows = await rows();
ok('T11 rollback restores viewdef md5, comment, columns, owner, grants, reloptions', rb.vmd5 === pre.vmd5 && rb.cmt === pre.cmt && rb.cols === pre.cols && rb.owner === pre.owner && rb.acl === pre.acl && rb.ro === pre.ro && rb.oid === pre.oid, { rb_md5: rb.vmd5 });
ok('T11b rollback returns the live rows again', JSON.stringify(rbRows) === JSON.stringify(preRows));
await db.exec(MIG);
ok('T12 re-apply after rollback is clean', (await meta()).vmd5 === post.vmd5);
const ver = (await db.query('select version() v')).rows[0].v;
fs.writeFileSync(new URL('./results.json', import.meta.url), JSON.stringify({ engine: ver, results, fails }, null, 1) + '\n');
console.log(fails ? `${fails} FAIL` : `ALL ${Object.keys(results).length} PASS`);
process.exit(fails ? 1 : 0);
