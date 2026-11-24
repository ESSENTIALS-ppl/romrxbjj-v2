// PGlite test for the P1-25 W2 fix (BUILD ONLY; no network, no live data). Run: NODE_PATH=/tmp/pgl/node_modules node test-w2.mjs
// Base = the applied 20261124194129 migration (1f48a120: queue table + current live body), then the W2 migration on top.
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
const CUR = fs.readFileSync('../apply-L1469-20261124/APPLY-QUERY-1f48a120.sql', 'utf8');
const MIG = fs.readFileSync('20261124213000_p1_25_purge_w2_queue_from_backup.sql', 'utf8');
const RB = fs.readFileSync('20261124213000_p1_25_purge_w2_queue_from_backup_rollback.sql', 'utf8');
const t5 = fs.readFileSync('../test-v5.mjs', 'utf8');
const SCHEMA = t5.slice(t5.indexOf('const SCHEMA = `') + 16, t5.indexOf('`;', t5.indexOf('const SCHEMA = `')));
const tf = fs.readFileSync('../purge-fix-20261117/test-purge-fix.mjs', 'utf8');
const STORAGE = tf.slice(tf.indexOf('const STORAGE = `') + 17, tf.indexOf('`;', tf.indexOf('const STORAGE = `')));
const HARD = '7c71e421-929b-4691-a6bc-cc614ed2a08d';
const Q = '00000000-0000-4000-8000-000000000201', OTHER = '00000000-0000-4000-8000-000000000202';
const SEED = `insert into auth.users (id, email) values ('${Q}','fixture-q'),('${HARD}','fixture-hard'),('${OTHER}','fixture-other');
insert into public.users (id, email) select id, email from auth.users;
insert into public.account_deletion_requests (user_id, status, completed_at) values ('${Q}','completed', now() - interval '100 days'), ('${HARD}','completed', now() - interval '100 days');
insert into storage.objects (bucket_id, name, owner, owner_id) values
 ('progress-photos','${Q}/front.jpg','${Q}','${Q}'), ('progress-photos','${Q}/back.jpg','${Q}',null), ('progress-photos','${Q}/legacy.jpg',null,'${Q}'),
 ('progress-photos','${Q}/pathonly.jpg',null,null), ('progress-photos','${HARD}/side.jpg','${HARD}','${HARD}'), ('progress-photos','${OTHER}/x.jpg','${OTHER}','${OTHER}');
insert into public.progress_photos (user_id, storage_path) values ('${Q}','${Q}/front.jpg'),('${Q}','${Q}/pathonly.jpg'),('${HARD}','${HARD}/side.jpg');`;
let fails = 0; const res = [];
const ok = (n, c, i) => { res.push({ n, pass: !!c }); if (!c) fails++; console.log(`${c ? 'PASS' : 'FAIL'} ${n}${i ? ' ' + JSON.stringify(i) : ''}`); };
const mk = async (fn, seed = SEED) => { const db = new PGlite(); await db.exec(SCHEMA); await db.exec(STORAGE); await db.exec(seed); await db.exec(CUR); if (fn) await db.exec(fn); return db; };
const run = async (db, mode = 'apply') => { try { return { r: (await db.query(`select public.purge_deleted_accounts($1, interval '90 days') j`, [mode])).rows[0].j }; } catch (e) { return { err: String(e.message || e) }; } };
const q = async (db) => (await db.query('select name from public.p1_25_storage_delete_queue order by 1')).rows.map((r) => r.name);
const md5 = async (db) => (await db.query(`select md5(prosrc) m from pg_proc where proname='purge_deleted_accounts'`)).rows[0].m;
async function suite(L, fn) {
  { const db = await mk(fn); const x = await run(db); const qq = await q(db);
    ok(`${L} W1 path-only photo object is queued`, qq.includes(`${Q}/pathonly.jpg`), { err: x.err, qq }); 
    ok(`${L} W2 all 4 qualifying objects queued, queued == table_counts storage.objects`, x.r?.storage_objects_queued === 4 && x.r.table_counts['storage.objects'] === 4 && qq.length === 4, { q: x.r?.storage_objects_queued, c: x.r?.table_counts?.['storage.objects'] });
    ok(`${L} W3 7c71e421 and other-account objects not queued; files not deleted by SQL`, !qq.some((n) => n.startsWith(HARD) || n.startsWith(OTHER)) && Number((await db.query('select count(*) n from storage.objects')).rows[0].n) === 6);
    await new Promise((r) => setTimeout(r, 1100)); const y = await run(db); ok(`${L} W4 rerun: 0 qualifying, queue unchanged`, y.r?.qualifying_count === 0 && (await q(db)).length === 4, { err: y.err }); }
  { const db = await mk(fn, `insert into auth.users (id,email) values ('${HARD}','fixture-hard'); insert into public.users (id,email) select id,email from auth.users;`);
    const x = await run(db); ok(`${L} W5 0 qualifying, 0 objects: ok, queued 0`, x.r?.ok === true && x.r.storage_objects_queued === 0, { err: x.err }); }
  { const a = await mk(null), b = await mk(fn); const s = (r) => JSON.stringify({ ...r, backup_schema: 0, backup_created_at: 0, sources: (r?.sources ?? []).map((x) => ({ ...x, marked_at: 0 })) }); // seed now() differs per db
    const ad = await run(a, 'dry_run'), bd = await run(b, 'dry_run'); ok(`${L} W6 dry_run identical to live body`, s(ad.r) === s(bd.r) && !ad.err, s(ad.r) === s(bd.r) ? undefined : { a: s(ad.r), b: s(bd.r), e: ad.err }); }
}
{ const db = await mk(null); const x = await run(db); const qq = await q(db);
  ok('C1 control: live body misses the path-only object (W2 reproduced)', !qq.includes(`${Q}/pathonly.jpg`) && x.r?.storage_objects_queued === 3, { q: x.r?.storage_objects_queued }); }
await suite('MAIN', MIG);
{ const db = await mk(MIG); await db.exec(RB); ok('R1 rollback restores live prosrc md5 cb7bde65', (await md5(db)) === 'cb7bde65b246fd50e107f5dcb6571641', { m: await md5(db) }); }
{ const db = await mk(null); ok('R0 base = live prosrc md5 cb7bde65', (await md5(db)) === 'cb7bde65b246fd50e107f5dcb6571641'); }
const muts = [
  ['M1 queue from live storage.objects after delete (old body)', (s) => s.replace("SELECT b.bucket_id, b.name FROM %I.storage__objects b", "SELECT o.bucket_id, o.name FROM storage.objects o WHERE o.owner IN (SELECT user_id FROM _classed WHERE class = ''qualifying'')")],
  ['M2 guard > 0 changed to > 10', (s) => s.replace("'storage.objects')::bigint, 0) > 0", "'storage.objects')::bigint, 0) > 10")],
  ['M3 queued count not captured', (s) => s.replace("    GET DIAGNOSTICS v_storage_queued = ROW_COUNT;\n  END IF;", "  END IF;")],
];
for (const [n, f] of muts) { const m = f(MIG); if (m === MIG) { console.log(`MUTANT ${n}: PATTERN MISS`); fails++; continue; }
  const before = fails, k = res.length; await suite(n.split(' ')[0], m); const killed = res.slice(k).some((r) => !r.pass); fails = before; res.length = k;
  console.log(`MUTANT ${n}: ${killed ? 'KILLED' : 'SURVIVED'}`); if (!killed) fails++; }
console.log(`TOTAL fails ${fails}`); process.exit(fails ? 1 : 0);
