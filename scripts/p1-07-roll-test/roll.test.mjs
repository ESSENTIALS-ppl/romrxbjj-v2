// P1-07 rules 1-3 in PGlite: the real single migration 20261116030000 (table + roll + backfill + cron) over the FK/cron stub (../p1-07-schedule-fk-test).
// Writes cases.json (schedule state per scenario and local day) for email-lines.test.ts (deno, lifecycle-emails nextCheck).
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const here = dirname(fileURLToPath(import.meta.url))
const mig = (f) => readFileSync(join(here, '../../supabase/migrations-unapplied', f), 'utf8')
let fails = 0
const ok = (n, c, x = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${n}${x ? ' ' + x : ''}`); if (!c) fails++ }
const db = new PGlite()
await db.exec(readFileSync(join(here, '../p1-07-schedule-fk-test/schema-stub.sql'), 'utf8'))
const jobs = async () => (await db.query(`select jobid, jobname, schedule, active, md5(jobid||'|'||jobname||'|'||schedule||'|'||active||'|'||command) row_md5, command from cron.job order by jobid`)).rows
const jobsBefore = await jobs()
await db.exec(mig('20261116030000_user_mobility_schedule.sql'))
const jobsAfter = await jobs()
console.log('cron jobs before (jobid | name | schedule | active | row md5 | seeded live md5(command)):')
for (const j of jobsBefore) console.log(`  ${j.jobid} | ${j.jobname} | ${j.schedule} | ${j.active} | ${j.row_md5} | ${j.command.replace('live md5 ', '')}`)
console.log('cron jobs after:')
for (const j of jobsAfter) console.log(`  ${j.jobid} | ${j.jobname} | ${j.schedule} | ${j.active} | ${j.row_md5}`)
ok('jobs 1-12 byte-identical before and after (renewal job 1 untouched)', JSON.stringify(jobsBefore) === JSON.stringify(jobsAfter.slice(0, 12)))
ok('one new job 13 roll-next-check-at-hourly at 20 * * * *', jobsAfter.length === 13 && jobsAfter[12].jobname === 'roll-next-check-at-hourly' && jobsAfter[12].schedule === '20 * * * *' && jobsAfter[12].command.includes('roll_next_check_at()'))
const D = 86400000
const iso = (t) => new Date(t).toISOString()
// Rule 1 (submit-assessment scheduleRow): both reset from the new last_assessed_at.
async function fullSave(u, a, at) {
  await db.query(`insert into public.assessments (id, user_id, assessed_at) values ($1,$2,$3)`, [a, u, at])
  await db.query(`insert into public.user_mobility_schedule (user_id,last_assessment_id,last_assessed_at,next_retest_at,next_check_at)
    values ($1,$2,$3,$4,$5) on conflict (user_id) do update set last_assessment_id=excluded.last_assessment_id,
    last_assessed_at=excluded.last_assessed_at, next_retest_at=excluded.next_retest_at, next_check_at=excluded.next_check_at, updated_at=now()`,
    [u, a, at, iso(Date.parse(at) + 42 * D), iso(Date.parse(at) + 7 * D)])
}
// Rule 2 (P1-06 quick path): next_check_at = next_retest_at.
const quickSave = (u) => db.query(`update public.user_mobility_schedule set next_check_at = next_retest_at, updated_at = now() where user_id = $1`, [u])
const roll = async (nowIso) => (await db.query(`select public.roll_next_check_at($1::timestamptz) n`, [nowIso])).rows[0].n
const sched = async (u) => { const r = (await db.query(`select last_assessed_at, next_check_at, next_retest_at from public.user_mobility_schedule where user_id=$1`, [u])).rows[0]; return { last_assessment_id: 'a', last_assessed_at: r.last_assessed_at.toISOString(), next_check_at: r.next_check_at ? r.next_check_at.toISOString() : null, next_retest_at: r.next_retest_at.toISOString() } }
const users = { noQuick: '10000000-0000-4000-8000-000000000001', quick7: '10000000-0000-4000-8000-000000000002', re42: '10000000-0000-4000-8000-000000000003', noPrefs: '10000000-0000-4000-8000-000000000004', tokyo: '10000000-0000-4000-8000-000000000005', badTz: '10000000-0000-4000-8000-000000000006' }
const tzOf = { noQuick: 'America/Chicago', quick7: 'America/Chicago', re42: 'America/Chicago', noPrefs: null, tokyo: 'Asia/Tokyo', badTz: 'Not/AZone' }
for (const [k, u] of Object.entries(users)) {
  await db.query(`insert into auth.users values ($1)`, [u]); await db.query(`insert into public.users values ($1)`, [u])
  if (tzOf[k] !== null) await db.query(`insert into public.notification_preferences values ($1,$2)`, [u, tzOf[k]])
}
// Assessed Sun Nov 1 2026 12:00Z (06:00 Chicago). Local day 7 = Nov 8, day 8 = Nov 9, day 20 = Nov 21, day 42 = Dec 13.
const T0 = '2026-11-01T12:00:00.000Z'
for (const [k, u] of Object.entries(users)) await fullSave(u, `a0000000-0000-4000-8000-00000000000${Object.keys(users).indexOf(k) + 1}`, k === 'tokyo' ? '2026-11-01T03:00:00.000Z' : T0)
const cases = []
const snap = async (scenario, k, today) => cases.push({ scenario, today, tz: tzOf[k] ?? null, schedule: await sched(users[k]) })
// Day 7 in Chicago, 11:20 PM local (Nov 9 05:20Z): no roll yet for Chicago users.
let n = await roll('2026-11-09T05:20:00Z')
ok('first run (Tokyo already on local day 8) rolls only the Tokyo row', n === 1 && (await sched(users.tokyo)).next_check_at === (await sched(users.tokyo)).next_retest_at, `n=${n}`)
ok('day 7 11:20 PM Chicago: Chicago rows not rolled', (await sched(users.noQuick)).next_check_at === '2026-11-08T12:00:00.000Z')
await snap('no quick check', 'noQuick', '2026-11-08')
// Quick check saved on day 7 (rule 2).
await quickSave(users.quick7)
ok('quick on day 7: next_check_at = next_retest_at', (await sched(users.quick7)).next_check_at === '2026-12-13T12:00:00.000Z')
// Day 8, 00:20 Chicago (06:20Z): roll.
n = await roll('2026-11-09T06:20:00Z')
const s1 = await sched(users.noQuick)
ok('day 8 00:20 Chicago: no-quick row rolled to next_retest_at', s1.next_check_at === s1.next_retest_at, JSON.stringify(s1))
ok('no-prefs row uses America/Chicago fallback (rolled same hour)', (await sched(users.noPrefs)).next_check_at === (await sched(users.noPrefs)).next_retest_at)
ok('invalid tz row uses America/Chicago fallback, no error', (await sched(users.badTz)).next_check_at === (await sched(users.badTz)).next_retest_at)
ok('second hour rolls the 4 Chicago-day rows without a quick check (noQuick, re42, noPrefs, badTz)', n === 4, `n=${n}`)
await snap('no quick check', 'noQuick', '2026-11-09'); await snap('quick on day 7', 'quick7', '2026-11-09')
// Idempotent: second run changes nothing.
const before = JSON.stringify(await db.query(`select * from public.user_mobility_schedule order by user_id`).then(r => r.rows))
const n2 = await roll('2026-11-09T06:20:00Z'); const n3 = await roll('2026-11-21T18:00:00Z')
const after = JSON.stringify(await db.query(`select * from public.user_mobility_schedule order by user_id`).then(r => r.rows))
ok('second run updates 0 rows and no row changes', n2 === 0 && n3 === 0 && before === after, `n2=${n2} n3=${n3}`)
await snap('no quick check', 'noQuick', '2026-11-21'); await snap('quick on day 7', 'quick7', '2026-11-21')
// Tokyo: assessed Nov 1 12:00 local (03:00Z); day 7 = Nov 8 local; roll at Nov 8 15:20Z = Nov 9 00:20 Tokyo.
// (Checked separately below with a fresh row.)
// Full reassessment on day 42 (Dec 13 12:00Z) resets to +7 / +42 (rule 1).
await fullSave(users.re42, 'b0000000-0000-4000-8000-000000000003', '2026-12-13T12:00:00.000Z')
const s3 = await sched(users.re42)
ok('day 42 reassessment: next_check_at = +7, next_retest_at = +42', s3.next_check_at === '2026-12-20T12:00:00.000Z' && s3.next_retest_at === '2027-01-24T12:00:00.000Z', JSON.stringify(s3))
await snap('full reassessment day 42', 're42', '2026-12-13')
await roll('2026-12-21T05:20:00Z')
ok('roll on Dec 20 23:20 Chicago leaves it (still day 7 of new cycle)', (await sched(users.re42)).next_check_at === '2026-12-20T12:00:00.000Z')
await snap('full reassessment day 42', 're42', '2026-12-20')
await roll('2026-12-21T06:20:00Z')
ok('Dec 21 00:20 Chicago: re42 rolled', (await sched(users.re42)).next_check_at === '2027-01-24T12:00:00.000Z')
await snap('full reassessment day 42', 're42', '2026-12-21')
// Tokyo-specific: new cycle Dec 1 12:00 Tokyo (03:00Z), day 7 = Dec 8 local.
await fullSave(users.tokyo, 'c0000000-0000-4000-8000-000000000005', '2026-12-01T03:00:00.000Z')
ok('Tokyo Dec 8 23:20 local (14:20Z): not rolled', (await roll('2026-12-08T14:20:00Z')) >= 0 && (await sched(users.tokyo)).next_check_at === '2026-12-08T03:00:00.000Z')
await roll('2026-12-08T15:20:00Z')
ok('Tokyo Dec 9 00:20 local (15:20Z): rolled', (await sched(users.tokyo)).next_check_at === '2027-01-12T03:00:00.000Z')
writeFileSync(join(here, 'cases.json'), JSON.stringify(cases, null, 2) + '\n')
console.log(`wrote ${cases.length} cases`)
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAIL`); process.exit(fails ? 1 : 0)
