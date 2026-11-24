// Tests the command text of the OPTIONAL drain cron migration on PGlite (pg_cron itself is not available here).
// C1 empty queue: no HTTP call. C2 one queued row: exactly one call to p1-25-storage-drain. C3 schedule/name exact.
// Run: PGLITE_PATH=... node scripts/p1-25-storage-drain/cron-cmd.test.mjs   (P1_25_CRON_SQL overrides the file for mutants)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const { PGlite } = await import(process.env.PGLITE_PATH ? pathToFileURL(process.env.PGLITE_PATH).href : '@electric-sql/pglite');
const SQL = fs.readFileSync(process.env.P1_25_CRON_SQL || path.join(ROOT, 'supabase/migrations-unapplied/20261124120000_p1_25_storage_drain_cron.sql'), 'utf8');
const MIG = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20261124194129_p1_25_purge_storage_queue.sql'), 'utf8');
const DDL = MIG.slice(MIG.indexOf('CREATE TABLE IF NOT EXISTS public.p1_25_storage_delete_queue'), MIG.indexOf('CREATE OR REPLACE FUNCTION'));
const m = SQL.match(/cron\.schedule\(\s*'([^']+)',\s*'([^']+)',\s*\$cmd\$([\s\S]*?)\$cmd\$\s*\)/);
let pass = 0, fail = 0;
const t = (name, ok, info = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${info}`); };
if (!m) { console.log('FAIL C0 cron.schedule not found'); process.exit(1); }
const [, jobname, schedule, cmd] = m;
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role; create schema storage;`);
await db.exec(DDL);
await db.exec(`create table public._calls (fn text, t int); create function public.cron_call_edge(p_fn text, p_timeout_ms integer default 5000) returns bigint language sql as $$ insert into public._calls values (p_fn, p_timeout_ms) returning 1::bigint $$;`);
await db.query(cmd);
let c = (await db.query('select fn, t from public._calls')).rows;
t('C1 empty queue: no call', c.length === 0, JSON.stringify(c));
await db.query(`insert into public.p1_25_storage_delete_queue (bucket_id, name) values ('progress-photos','00000000-0000-4000-8000-0000000000a1/a.jpg'), ('progress-photos','00000000-0000-4000-8000-0000000000a1/b.jpg')`);
await db.query(cmd);
c = (await db.query('select fn, t from public._calls')).rows;
t('C2 two queued rows: exactly one call, right function and timeout', c.length === 1 && c[0].fn === 'p1-25-storage-drain' && c[0].t === 120000, JSON.stringify(c));
t('C3 job name and schedule exact', jobname === 'p1-25-storage-drain-daily' && schedule === '53 4 * * *', `${jobname} ${schedule}`);
const rb = fs.readFileSync(path.join(ROOT, 'supabase/migrations-unapplied/20261124120000_p1_25_storage_drain_cron_rollback.sql'), 'utf8');
t('C4 rollback unschedules exactly that job name and nothing else', /cron\.unschedule\('p1-25-storage-drain-daily'\)/.test(rb) && (rb.match(/cron\./g) || []).length === 1);
console.log(`${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
