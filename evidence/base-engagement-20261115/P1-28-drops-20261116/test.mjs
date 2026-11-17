// P1-28 DROP files, BUILD ONLY. Does not touch live.
// Checks: each drop_*.sql names the L1112 CSV and restore shas, contains
// exactly one DROP TABLE IF EXISTS for that table (no CASCADE), and in
// PGlite drops only that table. Then restore -> drop -> restore keeps
// the pinned row count (uses the L1112 restore files, not modified).
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const pins = JSON.parse(readFileSync(path.join(here, 'PINS.json'), 'utf8'))
const restoreDir = path.join(here, '..', 'P1-28')
const EXPECT = Object.fromEntries(pins.tables.map((t) => [t.name, t.rows]))
let fails = 0
const results = {}
const ok = (n, c, x = '') => {
  const line = `${c ? 'PASS' : 'FAIL'} ${n}${x ? ' ' + x : ''}`
  console.log(line)
  results[n] = { pass: !!c, detail: x }
  if (!c) fails++
}

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex')
}

async function fresh() {
  const db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role;`)
  return db
}

async function runRestore(db, file) {
  const dir = restoreDir + '/'
  const lines = readFileSync(path.join(restoreDir, file), 'utf8').split('\n').filter((l) => !l.startsWith('\\set '))
  let buf = []
  for (const l of lines) {
    const m = l.match(/^\\copy (\S+) \((.*)\) FROM '(.+\.csv)' WITH \((.*)\)$/)
    if (!m) { buf.push(l); continue }
    if (buf.join('\n').trim()) await db.exec(buf.join('\n')); buf = []
    await db.query(`COPY ${m[1]} (${m[2]}) FROM '/dev/blob' WITH (${m[4]})`, [], { blob: new Blob([readFileSync(dir + m[3])]) })
  }
  if (buf.join('\n').trim()) await db.exec(buf.join('\n'))
}

async function tableExists(db, t) {
  const r = await db.query(`select to_regclass($1) is not null as e`, [`public.${t}`])
  return r.rows[0].e
}

async function count(db, t) {
  const r = await db.query(`select count(*)::int n from public.${t}`)
  return r.rows[0].n
}

// L1112 pack still on disk and unchanged
const sumsText = readFileSync(path.join(restoreDir, 'SHA256SUMS'))
ok('L1112 SHA256SUMS file sha', sha256(sumsText) === pins.sums, sha256(sumsText))

const dropFiles = readdirSync(here).filter((f) => f.startsWith('drop_') && f.endsWith('.sql')).sort()
ok('eight drop files', dropFiles.length === 8, String(dropFiles.length))

for (const t of pins.tables) {
  const fname = `drop_${t.name}.sql`
  const text = readFileSync(path.join(here, fname), 'utf8')
  ok(`${t.name} file present`, dropFiles.includes(fname))
  ok(`${t.name} names CSV sha`, text.includes(t.csv_sha256))
  ok(`${t.name} names restore sha`, text.includes(t.restore_sha256))
  ok(`${t.name} names SUMS 4183afb9 pin`, text.includes(pins.sums))
  ok(`${t.name} names restore-all sha`, text.includes(pins.restore_all))
  const drops = [...text.matchAll(/^\s*DROP\s+TABLE\b.*$/gim)].map((m) => m[0])
  ok(`${t.name} exactly one DROP`, drops.length === 1, String(drops.length))
  const d = drops[0] || ''
  ok(`${t.name} DROP is IF EXISTS public.${t.name}`, /^\s*DROP TABLE IF EXISTS public\.[a-z0-9_]+;\s*$/i.test(d) && d.includes(`public.${t.name}`))
  ok(`${t.name} no CASCADE`, !/cascade/i.test(d))
  const other = pins.tables.map((x) => x.name).filter((n) => n !== t.name)
  const dropLineOthers = other.filter((n) => d.includes(n))
  ok(`${t.name} DROP line names only this table`, dropLineOthers.length === 0, dropLineOthers.join(','))
}

// Isolated drop: eight empty tables, one DROP removes only its table
{
  const db = await fresh()
  for (const t of pins.tables) {
    await db.exec(`create table public.${t.name} (id int)`)
  }
  const victim = pins.tables[0].name
  const dropSql = readFileSync(path.join(here, `drop_${victim}.sql`), 'utf8')
  // execute only the DROP statement (skip comments)
  const dropStmt = dropSql.split('\n').filter((l) => /^\s*DROP TABLE/i.test(l)).join('\n')
  await db.exec(dropStmt)
  ok('isolated drop removes target', !(await tableExists(db, victim)))
  let allOthers = true
  for (const t of pins.tables.slice(1)) {
    if (!(await tableExists(db, t.name))) allOthers = false
  }
  ok('isolated drop leaves the other seven', allOthers)
}

// Per table: restore (L1112 file) -> count -> drop this file -> gone -> restore again -> count
for (const t of pins.tables) {
  const db = await fresh()
  await runRestore(db, t.restore)
  const n1 = await count(db, t.name)
  ok(`restore-then-drop ${t.name} restored rows`, n1 === t.rows, `got ${n1}`)
  const dropStmt = readFileSync(path.join(here, `drop_${t.name}.sql`), 'utf8')
    .split('\n').filter((l) => /^\s*DROP TABLE/i.test(l)).join('\n')
  await db.exec(dropStmt)
  ok(`restore-then-drop ${t.name} dropped`, !(await tableExists(db, t.name)))
  // A real rollback is a new psql session. In this same PGlite session the
  // restore file's TEMP load table from the first restore would still exist
  // (CREATE TEMP TABLE p1_28_load_<t>). Discard temp objects, then restore.
  await db.exec('discard temp')
  await runRestore(db, t.restore)
  const n2 = await count(db, t.name)
  ok(`drop-then-restore ${t.name} rows`, n2 === t.rows, `got ${n2}`)
}

const total = Object.keys(results).length
const summary = { passed: total - fails, total, failed: Object.keys(results).filter((k) => !results[k].pass), results }
writeFileSync(path.join(here, 'results.json'), JSON.stringify(summary, null, 2) + '\n')
console.log(`\n${total - fails}/${total} ${fails ? 'FAIL' : 'ALL PASS'}`)
process.exitCode = fails ? 1 : 0
