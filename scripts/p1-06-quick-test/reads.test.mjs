// P1-06 server-side quick skip (20261116031200) in PGlite. Live definitions (the rollback file) vs the new ones, per read:
// get_my_profile (assessment + assessments, and check_kind present), my_joint_history, my_joint_start_vs_now, rombot_context.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const here = dirname(fileURLToPath(import.meta.url))
const mig = (f) => readFileSync(join(here, '../../supabase/migrations-unapplied', f), 'utf8')
let fails = 0
const ok = (n, c, x = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${n}${x ? ' ' + x : ''}`); if (!c) fails++ }
const db = new PGlite()
await db.exec(`
create role anon; create role authenticated; create role service_role;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table public.users (id uuid primary key, full_name text, belt text, platforms text[], portal_role text, subscription_status text);
create table public.assessments (id uuid primary key, user_id uuid references public.users(id), assessed_at timestamptz, created_at timestamptz default now(),
  rom_total numeric, rom_percentile numeric, worst_joints text[], red_flag_triggered boolean, red_flag_reasons text[], sport text, hip_er_l numeric);
create table public.joint_scores (assessment_id uuid, joint_key text, score smallint, left_value numeric, right_value numeric, asymmetry_pct numeric, asymmetry_flag text);
create table public.techniques (id uuid primary key, code text, name text, belt text, category text);
create table public.technique_eligibility (id uuid primary key default gen_random_uuid(), user_id uuid, assessment_id uuid, technique_id uuid, technique_code text, tier text, flag text, limiting_joints text[], sport text);
create table public.sport_entitlements (user_id uuid, sport text, status text, stripe_subscription_id text, granted_at timestamptz, expires_at timestamptz);
create table public.exercises (id uuid primary key, name text, exercise_type text, sets int, reps text, coaching_cue text);
create table public.protocols (user_id uuid, assessment_id uuid, joint_key text, priority_rank int, exercise_id uuid);
create table public.game_plans (id uuid primary key default gen_random_uuid(), user_id uuid, name text, description text, path_mode text, techniques jsonb, created_at timestamptz default now(), updated_at timestamptz default now());
`)
await db.exec(mig('20261116031000_assessment_check_kind.sql'))
const U = '11111111-1111-4111-8111-111111111111', F1 = 'f0000000-0000-4000-8000-000000000001', F2 = 'f0000000-0000-4000-8000-000000000002', Q = 'e0000000-0000-4000-8000-00000000000a'
await db.query(`insert into public.users (id, full_name) values ($1, 'Alex')`, [U])
await db.query(`insert into public.assessments (id, user_id, assessed_at, rom_total, sport) values ($1,$2,'2026-10-01T12:00Z',60,'general'), ($3,$2,'2026-11-01T12:00Z',70,'general')`, [F1, U, F2])
await db.query(`insert into public.assessments (id, user_id, assessed_at, rom_total, sport, check_kind) values ($1,$2,'2026-11-08T12:00Z',null,'general','quick')`, [Q, U])
for (const a of [F1, F2]) await db.query(`insert into public.joint_scores values ($1,'hip_er',$2,20,21,null,null)`, [a, a === F1 ? 50 : 60])
await db.query(`insert into public.joint_scores values ($1,'hip_er',90,30,31,null,null)`, [Q]) // even if a quick row had scores
await db.exec(`set request.jwt.claim.sub = '${U}'`)
const read = async () => ({
  prof: (await db.query(`select public.get_my_profile() p`)).rows[0].p,
  hist: (await db.query(`select * from public.my_joint_history(20)`)).rows,
  svn: (await db.query(`select * from public.my_joint_start_vs_now()`)).rows,
  ctx: (await db.query(`select latest_assessment_id from public.rombot_context where user_id = $1`, [U])).rows[0],
})
await db.exec(mig('20261116031200_skip_quick_reads_rollback.sql')) // live definitions
let r = await read()
ok('LIVE get_my_profile: latest assessment is the quick row (the bug)', r.prof.assessment.id === Q)
ok('LIVE my_joint_history includes the quick row', r.hist.some(x => x.assessment_id === Q))
ok('LIVE my_joint_start_vs_now "now" is the quick row', r.svn[0].latest_score === 90)
ok('LIVE rombot_context latest is the quick row', r.ctx.latest_assessment_id === Q)
await db.exec(mig('20261116031200_skip_quick_reads.sql'))
r = await read()
ok('get_my_profile.assessment = latest FULL row', r.prof.assessment.id === F2, r.prof.assessment.id)
ok('get_my_profile.assessments has no quick row (2 full)', r.prof.assessments.length === 2 && r.prof.assessments.every(a => a.check_kind === 'full'))
ok('get_my_profile returns check_kind (assessment and each assessments item)', r.prof.assessment.check_kind === 'full' && r.prof.assessments.every(a => 'check_kind' in a))
ok('my_joint_history excludes the quick row', !r.hist.some(x => x.assessment_id === Q) && r.hist.length === 2)
ok('my_joint_start_vs_now: start 50 -> now 60 (quick 90 ignored)', r.svn.length === 1 && r.svn[0].first_score === 50 && r.svn[0].latest_score === 60)
ok('rombot_context latest = latest FULL row', r.ctx.latest_assessment_id === F2)
ok('rombot_context keeps security_invoker=true', (await db.query(`select reloptions from pg_class where oid='public.rombot_context'::regclass`)).rows[0].reloptions.includes('security_invoker=true'))
await db.query(`update public.assessments set check_kind = 'full' where id = $1`, [Q]) // NULL/full rows still count as full
ok('a non-quick newest row is still picked (filter only drops quick)', (await read()).prof.assessment.id === Q)
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAIL`); process.exit(fails ? 1 : 0)
