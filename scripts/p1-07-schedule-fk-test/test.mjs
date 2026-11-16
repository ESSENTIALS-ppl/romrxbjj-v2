// P1-07 FK test (Vera L1073). Runs the real migration file in PGlite over a stub of the live FKs.
// Usage: node test.mjs [migration.sql]   (default: the v2 migration in supabase/migrations-unapplied)
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const here = dirname(fileURLToPath(import.meta.url))
const migPath = process.argv[2] ?? join(here, '../../supabase/migrations-unapplied/20261116030000_user_mobility_schedule.sql')
const U1 = '11111111-1111-4111-8111-111111111111', U2 = '22222222-2222-4222-8222-222222222222'
const A1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', A2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
let fails = 0
const ok = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' ' + extra : ''}`); if (!cond) fails++ }
const db = new PGlite()
await db.exec(readFileSync(join(here, 'schema-stub.sql'), 'utf8'))
await db.exec(readFileSync(migPath, 'utf8'))
const fk = (await db.query(`select conname, confdeltype from pg_constraint where conrelid='public.user_mobility_schedule'::regclass and contype='f' order by conname`)).rows
ok('user_id FK is ON DELETE CASCADE', fk.some(r => r.conname.includes('user_id') && r.confdeltype === 'c'), JSON.stringify(fk))
ok('last_assessment_id FK is ON DELETE SET NULL', fk.some(r => r.conname.includes('last_assessment') && r.confdeltype === 'n'))
for (const [u, a] of [[U1, A1], [U2, A2]]) {
  await db.query(`insert into auth.users values ($1)`, [u]); await db.query(`insert into public.users values ($1)`, [u])
  await db.query(`insert into public.assessments (id, user_id) values ($1, $2)`, [a, u])
  await db.query(`insert into public.joint_scores (assessment_id) values ($1)`, [a])
  await db.query(`insert into public.user_mobility_schedule (user_id, last_assessment_id, last_assessed_at, next_retest_at, next_check_at) values ($1, $2, now(), now() + interval '42 days', now() + interval '7 days')`, [u, a])
}
// 1) Deleting an assessment nulls last_assessment_id and keeps the schedule row.
let err = null
try { await db.query(`delete from public.assessments where id = $1`, [A1]) } catch (e) { err = e.message }
ok('delete assessment succeeds', err === null, err ?? '')
const r1 = (await db.query(`select last_assessment_id from public.user_mobility_schedule where user_id = $1`, [U1])).rows
ok('schedule row kept, last_assessment_id NULL', r1.length === 1 && r1[0].last_assessment_id === null)
// 2) P1-23 path: the privacy team deletes the auth user (auth.admin.deleteUser), cascading auth.users -> public.users -> assessments + schedule.
err = null
try { await db.query(`delete from auth.users where id = $1`, [U2]) } catch (e) { err = e.message }
ok('delete auth user (P1-23 account deletion) succeeds', err === null, err ?? '')
const c = (await db.query(`select (select count(*) from public.users where id=$1)::int u, (select count(*) from public.assessments where user_id=$1)::int a, (select count(*) from public.user_mobility_schedule where user_id=$1)::int s, (select count(*) from public.joint_scores where assessment_id=$2)::int j`, [U2, A2])).rows[0]
ok('user, assessment, joint_scores and schedule all gone', c.u === 0 && c.a === 0 && c.s === 0 && c.j === 0, JSON.stringify(c))
// 3) Direct public.users delete (same cascade, U1 whose assessment is already gone).
err = null
try { await db.query(`delete from public.users where id = $1`, [U1]) } catch (e) { err = e.message }
ok('delete public.users row with a schedule row succeeds', err === null, err ?? '')
ok('schedule row for that user gone', (await db.query(`select count(*)::int n from public.user_mobility_schedule where user_id=$1`, [U1])).rows[0].n === 0)
// 4) RLS and grants unchanged: owner-only select for authenticated, no anon.
const pol = (await db.query(`select policyname, cmd, roles::text from pg_policies where tablename='user_mobility_schedule'`)).rows
ok('one select-only policy for authenticated', pol.length === 1 && pol[0].cmd === 'SELECT' && pol[0].roles.includes('authenticated'), JSON.stringify(pol))
ok('RLS enabled', (await db.query(`select relrowsecurity from pg_class where oid='public.user_mobility_schedule'::regclass`)).rows[0].relrowsecurity === true)
// 5) Rollback reverses it.
const rb = migPath.replace(/\.sql$/, '_rollback.sql')
try { await db.exec(readFileSync(rb, 'utf8')); ok('rollback drops the table', (await db.query(`select to_regclass('public.user_mobility_schedule') t`)).rows[0].t === null) } catch (e) { ok('rollback runs', false, e.message) }
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAIL`)
process.exit(fails === 0 ? 0 : 1)
