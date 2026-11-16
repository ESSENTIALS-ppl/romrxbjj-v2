// P1-07 v3 (window through local day 14) rules 1-3 in PGlite: the real single migration 20261116030000 (table + roll + backfill + cron) over the FK/cron stub (../p1-07-schedule-fk-test).
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
const users = { noQuick: '10000000-0000-4000-8000-000000000001', quick10: '10000000-0000-4000-8000-000000000002', re42: '10000000-0000-4000-8000-000000000003', noPrefs: '10000000-0000-4000-8000-000000000004', tokyo: '10000000-0000-4000-8000-000000000005', badTz: '10000000-0000-4000-8000-000000000006' }
const tzOf = { noQuick: 'America/Chicago', quick10: 'America/Chicago', re42: 'America/Chicago', noPrefs: null, tokyo: 'Asia/Tokyo', badTz: 'Not/AZone' }
for (const [k, u] of Object.entries(users)) {
  await db.query(`insert into auth.users values ($1)`, [u]); await db.query(`insert into public.users values ($1)`, [u])
  if (tzOf[k] !== null) await db.query(`insert into public.notification_preferences values ($1,$2)`, [u, tzOf[k]])
}
// Assessed Sun Nov 1 2026 12:00Z (06:00 Chicago). Local day 7 = Nov 8, day 10 = Nov 11, day 14 = Nov 15, day 15 = Nov 16,
// day 20 = Nov 21, day 42 = Dec 13. v3 window (Grant): open local day 7 through the END of local day 14; roll after.
const T0 = '2026-11-01T12:00:00.000Z'
for (const [k, u] of Object.entries(users)) await fullSave(u, `a0000000-0000-4000-8000-00000000000${Object.keys(users).indexOf(k) + 1}`, k === 'tokyo' ? '2026-11-01T03:00:00.000Z' : T0)
const cases = []
const snap = async (scenario, k, today, day) => cases.push({ scenario, today, day, tz: tzOf[k] ?? null, schedule: await sched(users[k]) })
const OPEN = '2026-11-08T12:00:00.000Z', RETEST = '2026-12-13T12:00:00.000Z'
const chi = ['noQuick', 'quick10', 're42', 'noPrefs', 'badTz']
const allOpen = async () => { for (const k of chi) if ((await sched(users[k])).next_check_at !== OPEN) return false; return true }
// Day 0-6: nothing rolls (before the window).
let n = await roll('2026-11-04T18:20:00Z')
ok('day 3: roll changes 0 rows', n === 0, `n=${n}`)
await snap('no quick check', 'noQuick', '2026-11-04', 3)
// Day 7, 11:20 PM Chicago (Nov 9 05:20Z): window open, nothing rolls (Tokyo is on local day 8, also open).
n = await roll('2026-11-09T05:20:00Z')
ok('day 7 23:20 Chicago: 0 rows rolled, all Chicago rows keep next_check_at = +7', n === 0 && await allOpen(), `n=${n}`)
await snap('no quick check', 'noQuick', '2026-11-08', 7)
// Day 8, 00:20 Chicago (old v2 roll moment): v3 does NOT roll.
n = await roll('2026-11-09T06:20:00Z')
ok('day 8 00:20 Chicago: still open, 0 rows rolled (v2 would have rolled 4)', n === 0 && await allOpen(), `n=${n}`)
await snap('no quick check', 'noQuick', '2026-11-09', 8)
// Day 10: hourly rolls all day change nothing; then a quick check is saved (rule 2).
let n10 = 0; for (let h = 6; h < 30; h++) n10 += await roll(new Date(Date.parse('2026-11-11T00:20:00Z') + h * 3600000).toISOString())
ok('day 10: 24 hourly rolls change 0 rows', n10 === 0, `n=${n10}`)
await quickSave(users.quick10)
ok('quick on day 10: next_check_at = next_retest_at', (await sched(users.quick10)).next_check_at === RETEST)
await snap('no quick check', 'noQuick', '2026-11-11', 10); await snap('quick on day 10', 'quick10', '2026-11-11', 10)
// Tokyo (assessed Nov 1 12:00 Tokyo = 03:00Z): day 14 ends Nov 16 00:00 Tokyo = Nov 15 15:00Z.
n = await roll('2026-11-15T14:20:00Z')
ok('Tokyo day 14 23:20 local (Nov 15 14:20Z): not rolled', n === 0 && (await sched(users.tokyo)).next_check_at === '2026-11-08T03:00:00.000Z', `n=${n}`)
n = await roll('2026-11-15T15:20:00Z')
ok('Tokyo day 15 00:20 local (Nov 15 15:20Z): rolled (only Tokyo)', n === 1 && (await sched(users.tokyo)).next_check_at === '2026-12-13T03:00:00.000Z', `n=${n}`)
// Day 14, 11:20 PM Chicago (Nov 16 05:20Z): late evening, still open.
n = await roll('2026-11-16T05:20:00Z')
ok('day 14 23:20 Chicago (late evening): still open, 0 rows rolled', n === 0 && (await sched(users.noQuick)).next_check_at === OPEN, `n=${n}`)
await snap('no quick check', 'noQuick', '2026-11-15', 14)
// Day 15, 00:20 Chicago (Nov 16 06:20Z): roll.
n = await roll('2026-11-16T06:20:00Z')
const s1 = await sched(users.noQuick)
ok('day 15 00:20 Chicago: no-quick row rolled to next_retest_at', s1.next_check_at === s1.next_retest_at && s1.next_check_at === RETEST, JSON.stringify(s1))
ok('no-prefs row uses America/Chicago fallback (rolled same hour)', (await sched(users.noPrefs)).next_check_at === RETEST)
ok('invalid tz row uses America/Chicago fallback, no error', (await sched(users.badTz)).next_check_at === RETEST)
ok('day 15 roll changes exactly the 4 Chicago-day rows without a quick check (noQuick, re42, noPrefs, badTz)', n === 4, `n=${n}`)
await snap('no quick check', 'noQuick', '2026-11-16', 15)
// Idempotent: second run changes nothing.
const before = JSON.stringify(await db.query(`select * from public.user_mobility_schedule order by user_id`).then(r => r.rows))
const n2 = await roll('2026-11-16T06:20:00Z'); const n3 = await roll('2026-11-21T18:00:00Z')
const after = JSON.stringify(await db.query(`select * from public.user_mobility_schedule order by user_id`).then(r => r.rows))
ok('second run updates 0 rows and no row changes', n2 === 0 && n3 === 0 && before === after, `n2=${n2} n3=${n3}`)
await snap('no quick check', 'noQuick', '2026-11-21', 20); await snap('quick on day 10', 'quick10', '2026-11-21', 20)
// Day 42 with no new full assessment: check = retest = today.
await snap('no quick check', 'noQuick', '2026-12-13', 42)
// Full reassessment on day 42 (Dec 13 12:00Z) resets to +7 / +42 (rule 1).
await fullSave(users.re42, 'b0000000-0000-4000-8000-000000000003', '2026-12-13T12:00:00.000Z')
const s3 = await sched(users.re42)
ok('day 42 full retest: next_check_at = +7, next_retest_at = +42', s3.next_check_at === '2026-12-20T12:00:00.000Z' && s3.next_retest_at === '2027-01-24T12:00:00.000Z', JSON.stringify(s3))
await snap('full retest day 42', 're42', '2026-12-13', 0)
await roll('2026-12-21T06:20:00Z')
ok('new cycle day 8 (Dec 21 00:20 Chicago): still open', (await sched(users.re42)).next_check_at === '2026-12-20T12:00:00.000Z')
await snap('full retest day 42', 're42', '2026-12-20', 7); await snap('full retest day 42', 're42', '2026-12-21', 8)
await roll('2026-12-28T05:20:00Z')
ok('new cycle day 14 23:20 Chicago (Dec 27): still open', (await sched(users.re42)).next_check_at === '2026-12-20T12:00:00.000Z')
await snap('full retest day 42', 're42', '2026-12-27', 14)
await roll('2026-12-28T06:20:00Z')
ok('new cycle day 15 00:20 Chicago (Dec 28): rolled to the new retest date', (await sched(users.re42)).next_check_at === '2027-01-24T12:00:00.000Z')
await snap('full retest day 42', 're42', '2026-12-28', 15)
ok('second roll after that changes 0 rows', (await roll('2026-12-28T06:20:00Z')) === 0)
// Cron jobs 1-12 still byte-identical at the end of all rolls.
const jobsEnd = await jobs()
ok('jobs 1-12 md5 still unchanged after all rolls; job 13 unchanged', JSON.stringify(jobsAfter) === JSON.stringify(jobsEnd))
writeFileSync(join(here, 'cases.json'), JSON.stringify(cases, null, 2) + '\n')
console.log(`wrote ${cases.length} cases`)
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAIL`); process.exit(fails ? 1 : 0)
