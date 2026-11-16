// P1-07 v3 backfill test: the single migration's backfill is already rolled at apply time, by the v3 window rule
// (open local day 7 through the END of local day 14; roll after day 14 with no quick check).
// Users assessed 0..60 local days before "now" in 4 time zones (and no prefs), plus quick-check cases (the stub adds a
// check_kind column here only, to exercise the to_jsonb path). Writes backfill-cases.json for email-lines.test.ts.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const here = dirname(fileURLToPath(import.meta.url))
let fails = 0
const ok = (n, c, x = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${n}${x ? ' ' + x : ''}`); if (!c) fails++ }
const db = new PGlite()
await db.exec(readFileSync(join(here, '../p1-07-schedule-fk-test/schema-stub.sql'), 'utf8'))
await db.exec(`alter table public.assessments add column check_kind text not null default 'full'`)
const tzs = ['America/Chicago', 'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', null]
const D = 86400000, now = Date.now()
let i = 0
const users = []
for (const tz of tzs) for (let n = 0; n <= 60; n++) {
  i++; const u = `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
  await db.query(`insert into auth.users values ($1)`, [u]); await db.query(`insert into public.users values ($1)`, [u])
  if (tz) await db.query(`insert into public.notification_preferences values ($1,$2)`, [u, tz])
  const at = new Date(now - n * D - 3600000).toISOString() // n days (and an hour) ago
  await db.query(`insert into public.assessments (id, user_id, assessed_at) values (gen_random_uuid(), $1, $2)`, [u, at])
  // an older full assessment that must NOT be picked
  await db.query(`insert into public.assessments (id, user_id, assessed_at) values (gen_random_uuid(), $1, $2)`, [u, new Date(now - (n + 50) * D).toISOString()])
  let quick = false
  if (n >= 3 && n % 5 === 0) { // quick check after the latest full one: rule 2
    quick = true
    await db.query(`insert into public.assessments (id, user_id, assessed_at, check_kind) values (gen_random_uuid(), $1, $2, 'quick')`, [u, new Date(now - (n - 2) * D).toISOString()])
  }
  users.push({ u, tz, n, quick, at })
}
const jobsQ = `select jobid, jobname, schedule, active, md5(jobid||'|'||jobname||'|'||schedule||'|'||active||'|'||command) row_md5 from cron.job order by jobid`
const jb = (await db.query(jobsQ)).rows
await db.exec(readFileSync(join(here, '../../supabase/migrations-unapplied/20261116030000_user_mobility_schedule.sql'), 'utf8'))
const ja = (await db.query(jobsQ)).rows
ok('jobs 1-12 unchanged by the apply', JSON.stringify(jb) === JSON.stringify(ja.slice(0, 12)), `before=${jb.length} after=${ja.length}`)
const rows = (await db.query(`
  select s.user_id, s.last_assessed_at, s.next_check_at, s.next_retest_at, coalesce(t.name,'America/New_York') tz,
         (s.last_assessed_at at time zone coalesce(t.name,'America/New_York'))::date d0,
         (now() at time zone coalesce(t.name,'America/New_York'))::date today,
         (s.next_check_at at time zone coalesce(t.name,'America/New_York'))::date dcheck
    from public.user_mobility_schedule s left join public.notification_preferences np on np.user_id = s.user_id
    left join lateral (select name from pg_timezone_names where name = np.timezone limit 1) t on true`)).rows
ok('one backfilled row per user', rows.length === users.length, `${rows.length}/${users.length}`)
const byU = Object.fromEntries(rows.map(r => [r.user_id, r]))
let bad = [], checked = 0, open = 0, openBad = []
const buckets = {}, bucketsNoQuick = {}
const bk = (d) => d <= 6 ? '0-6' : d <= 14 ? '7-14' : d <= 41 ? '15-41' : '42+'
const cases = []
for (const x of users) {
  const r = byU[x.u]; const day = Math.round((r.today - r.d0) / D)
  if (Math.abs(Date.parse(r.last_assessed_at.toISOString()) - Date.parse(x.at)) > 1000) bad.push(`${x.u} latest full not picked`)
  if (x.quick && r.next_check_at.getTime() !== r.next_retest_at.getTime()) bad.push(`${x.u} quick but check != retest`)
  buckets[x.quick ? 'quick' : bk(day)] = (buckets[x.quick ? 'quick' : bk(day)] ?? 0) + 1
  if (!x.quick) bucketsNoQuick[bk(day)] = (bucketsNoQuick[bk(day)] ?? 0) + 1
  if (day >= 15 && day < 42) { checked++; if (!(r.dcheck > r.today)) bad.push(`${x.u} day ${day}: check ${r.dcheck.toISOString().slice(0,10)} not after today`) }
  if (day >= 15 && !x.quick && r.next_check_at.getTime() !== r.next_retest_at.getTime()) bad.push(`${x.u} day ${day}: not rolled`)
  if (day >= 42 && !(r.dcheck <= r.today)) bad.push(`${x.u} day ${day}: retest not due`)
  if (day <= 14 && !x.quick && Math.round((r.dcheck - r.d0) / D) !== 7) bad.push(`${x.u} day ${day}: check not local day 7`)
  if (day >= 7 && day <= 14 && !x.quick) { open++; if (r.next_check_at.getTime() === r.next_retest_at.getTime() || !(r.dcheck <= r.today)) openBad.push(`${x.u} day ${day}`) }
  cases.push({ day, quick: x.quick, tz: r.tz, today: r.today.toISOString().slice(0, 10), schedule: { last_assessment_id: 'a', last_assessed_at: r.last_assessed_at.toISOString(), next_check_at: r.next_check_at.toISOString(), next_retest_at: r.next_retest_at.toISOString() } })
}
ok(`days 15-41 (${checked} rows): next_check_at local date is after today (never today, never past)`, bad.length === 0, bad.slice(0, 5).join('; '))
ok(`days 7-14 no quick (${open} rows): window open, next_check_at stays local day 7 (digest "today")`, openBad.length === 0, openBad.slice(0, 5).join('; '))
const order = ['quick', '0-6', '7-14', '15-41', '42+']
console.log('bucket counts (local day at apply, all 5 tz groups):'); for (const b of order) console.log(`  ${b}: ${buckets[b] ?? 0}`)
console.log('bucket counts, no quick check only:'); for (const b of order.slice(1)) console.log(`  ${b}: ${bucketsNoQuick[b] ?? 0}`)
// Rows on days 0-14 at apply: walk the roll hourly for 16 days. Local days 7-14: check stays local day 7 ("today");
// from local day 15 to 41 the check is the retest date, never today or past.
const young = users.filter(x => { const r = byU[x.u]; return Math.round((r.today - r.d0) / D) <= 14 })
let walkBad = []
let walkOpen = 0, walkAfter = 0
for (let h = 1; h <= 24 * 16; h++) {
  const t = new Date(now + h * 3600000)
  if (t.getUTCMinutes() !== 20) t.setUTCMinutes(20)
  await db.query(`select public.roll_next_check_at($1::timestamptz)`, [t.toISOString()])
  const rr = (await db.query(`select s.user_id, (s.last_assessed_at at time zone z.tz)::date d0, ($1::timestamptz at time zone z.tz)::date today, (s.next_check_at at time zone z.tz)::date dcheck
     from public.user_mobility_schedule s join (select s2.user_id, coalesce(t.name,'America/New_York') tz from public.user_mobility_schedule s2 left join public.notification_preferences np on np.user_id=s2.user_id left join lateral (select name from pg_timezone_names where name = np.timezone limit 1) t on true) z on z.user_id = s.user_id`, [t.toISOString()])).rows
  for (const r of rr) { const y = young.find(y => y.u === r.user_id); if (!y) continue; const day = Math.round((r.today - r.d0) / D)
    if (day >= 7 && day <= 14 && !y.quick) { walkOpen++; if (Math.round((r.dcheck - r.d0) / D) !== 7) walkBad.push(`${r.user_id} day ${day} open but moved`) }
    if (day >= 15 && day < 42) { walkAfter++; if (!(r.dcheck > r.today)) walkBad.push(`${r.user_id} day ${day}`) } }
}
ok(`days 0-14 rows (${young.length}) walked hourly for 16 days (${walkOpen} open-row-hours stayed day 7, ${walkAfter} day-15+ row-hours after today)`, walkBad.length === 0, walkBad.slice(0, 5).join('; '))
const second = (await db.query(`select public.roll_next_check_at() n`)).rows[0].n
ok('roll right after apply-time roll changes 0 rows', second === 0, `n=${second}`)
writeFileSync(join(here, 'backfill-cases.json'), JSON.stringify(cases) + '\n')
console.log(`wrote ${cases.length} backfill cases (apply time ${new Date(now).toISOString()})`)
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAIL`); process.exit(fails ? 1 : 0)
