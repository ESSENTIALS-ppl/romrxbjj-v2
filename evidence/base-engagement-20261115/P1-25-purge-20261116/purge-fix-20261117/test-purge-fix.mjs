// PGlite replay for the P1-25 purge fix (BUILD ONLY; no network, no live data). Run from this folder:
//   NODE_PATH=/tmp/pgl/node_modules node test-purge-fix.mjs <migration.sql> <rollback.sql>
// Schema = test-v5.mjs SCHEMA (P1-25 tables) + a storage stub with the live storage.protect_delete body as a
// statement-level BEFORE DELETE trigger + public.progress_photos. Fixture emails are plain non-address strings (fixture-q, fixture-hard, fixture-other).
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
const [MIG_F, RB_F] = process.argv.slice(2);
const LIVE = fs.readFileSync('live-def-purge_deleted_accounts-20261117.sql', 'utf8') + ';\n';
const MIG = fs.readFileSync(MIG_F, 'utf8');
const RB = fs.readFileSync(RB_F, 'utf8');
const t5 = fs.readFileSync('../test-v5.mjs', 'utf8');
const SCHEMA = t5.slice(t5.indexOf('const SCHEMA = `') + 16, t5.indexOf('`;', t5.indexOf('const SCHEMA = `')));
const STORAGE = `
create schema storage;
create table storage.buckets (id text primary key);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),
  name text, owner uuid, owner_id text);
create function storage.protect_delete() returns trigger language plpgsql as $f$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$f$;
create trigger protect_objects_delete before delete on storage.objects for each statement execute function storage.protect_delete();
insert into storage.buckets (id) values ('progress-photos');
create table public.progress_photos (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, storage_path text);
comment on function storage.protect_delete() is 'stub';
`;
const HARD = '7c71e421-929b-4691-a6bc-cc614ed2a08d';
const Q = '00000000-0000-4000-8000-000000000201'; // qualifying fixture account (not a test fixture by flag)
const OTHER = '00000000-0000-4000-8000-000000000202'; // active account, no request
const SEED_ACCTS = `
insert into auth.users (id, email) values ('${Q}', 'fixture-q'), ('${HARD}', 'fixture-hard'), ('${OTHER}', 'fixture-other');
insert into public.users (id, email) select id, email from auth.users;
insert into public.account_deletion_requests (user_id, status, completed_at) values
  ('${Q}', 'completed', now() - interval '100 days'), ('${HARD}', 'completed', now() - interval '100 days');
insert into public.leads (email) values ('fixture-q'), ('fixture-hard');
`;
const OBJ_Q = `insert into storage.objects (bucket_id, name, owner, owner_id) values ('progress-photos', '${Q}/front.jpg', '${Q}', '${Q}');
insert into public.progress_photos (user_id, storage_path) values ('${Q}', '${Q}/front.jpg');`;
const OBJ_Q_MORE = `insert into storage.objects (bucket_id, name, owner, owner_id) values ('progress-photos', '${Q}/back.jpg', '${Q}', null), ('progress-photos', '${Q}/legacy.jpg', null, '${Q}');`;
const OBJ_HARD = `insert into storage.objects (bucket_id, name, owner, owner_id) values ('progress-photos', '${HARD}/side.jpg', '${HARD}', '${HARD}');`;

const results = []; let fails = 0;
const ok = (n, c, info) => { results.push({ n, pass: !!c, info }); if (!c) fails++; console.log(`${c ? 'PASS' : 'FAIL'} ${n}${info ? ' ' + JSON.stringify(info) : ''}`); };
const mk = async (fnSql, seed = '') => { const db = new PGlite(); await db.exec(SCHEMA); await db.exec(STORAGE); await db.exec(seed); await db.exec(fnSql); return db; };
const run = async (db, mode = 'apply') => { try { return { r: (await db.query(`select public.purge_deleted_accounts($1, interval '90 days') j`, [mode])).rows[0].j }; } catch (e) { return { err: String(e.message || e) }; } };
const n = async (db, sql) => Number((await db.query(sql)).rows[0].n);
const state = async (db) => ({
  objects: await n(db, 'select count(*) n from storage.objects'),
  queue: (await db.query(`select to_regclass('public.p1_25_storage_delete_queue') is not null t`)).rows[0].t ? (await db.query('select bucket_id, name from public.p1_25_storage_delete_queue order by 1,2')).rows : null,
  auth_q: await n(db, `select count(*) n from auth.users where id='${Q}'`),
  auth_hard: await n(db, `select count(*) n from auth.users where id='${HARD}'`),
  auth_other: await n(db, `select count(*) n from auth.users where id='${OTHER}'`),
  leads_q: await n(db, `select count(*) n from public.leads where email='fixture-q'`),
  leads_hard: await n(db, `select count(*) n from public.leads where email='fixture-hard'`),
});
export async function suite(label, MIGSQL) {
  // T1 live body reproduces the live failure (0 objects, 0 qualifying).
  { const db = await mk(LIVE); const x = await run(db); ok(`${label} T1 live body, 0 objects, 0 qualifying: apply FAILS on protect_delete (reproduces runid 22334)`, x.err && x.err.includes('Direct deletion from storage tables is not allowed'), { err: x.err?.slice(0, 90) }); }
  // T2 new body, 0 objects, 0 qualifying.
  { const db = await mk(MIGSQL); const x = await run(db); const s = await state(db);
    ok(`${label} T2 new body, 0 objects, 0 qualifying: apply ok, queued 0`, x.r?.ok === true && x.r.qualifying_count === 0 && x.r.storage_objects_queued === 0 && s.queue.length === 0, { err: x.err, q: x.r?.storage_objects_queued }); }
  // T3 new body, 1 qualifying account with 0 objects + 7c71e421 with a completed 100-day request.
  { const db = await mk(MIGSQL, SEED_ACCTS); const x = await run(db); const s = await state(db);
    ok(`${label} T3 new body, 1 qualifying (0 objects): purged, queued 0, 7c71e421 excluded`, x.r?.ok === true && x.r.qualifying_count === 1 && x.r.excluded.hardcoded_7c71e421 === 1 && x.r.storage_objects_queued === 0 && s.auth_q === 0 && s.auth_hard === 1 && s.auth_other === 1 && s.leads_q === 0 && s.leads_hard === 1, { err: x.err, s, ids: x.r?.ids }); }
  // T4 new body, 1 qualifying with 1 object + 7c71e421 with 1 object: file queued, not deleted.
  { const d1 = await mk(MIGSQL, SEED_ACCTS + OBJ_Q); const x1 = await run(d1); const s1 = await state(d1);
    ok(`${label} T4a new body, 1 qualifying with exactly 1 object: queued (bucket+path), NOT deleted`,
      x1.r?.ok === true && x1.r.storage_objects_queued === 1 && s1.objects === 1 && JSON.stringify(s1.queue) === JSON.stringify([{ bucket_id: 'progress-photos', name: `${Q}/front.jpg` }]) && s1.auth_q === 0, { err: x1.err, s1 }); }
  { const db = await mk(MIGSQL, SEED_ACCTS + OBJ_Q + OBJ_Q_MORE + OBJ_HARD); const x = await run(db); const s = await state(db);
    ok(`${label} T4b new body, 1 qualifying with 3 objects (owner+owner_id+photo / owner only / owner_id only) all queued (bucket+path), NOT deleted; 7c71e421 object not queued`,
      x.r?.ok === true && x.r.qualifying_count === 1 && x.r.table_counts['storage.objects'] === 3 && x.r.storage_objects_queued === 3 &&
      s.objects === 4 && JSON.stringify(s.queue) === JSON.stringify(['back', 'front', 'legacy'].map((f) => ({ bucket_id: 'progress-photos', name: `${Q}/${f}.jpg` }))) && s.auth_q === 0 && s.auth_hard === 1,
      { err: x.err, s, queued: x.r?.storage_objects_queued });
    await new Promise((r) => setTimeout(r, 1100)); // backup schema name has 1 s resolution (pre-existing; daily cron never collides)
    const y = await run(db); ok(`${label} T5 rerun after T4: ok, 0 qualifying, queue unchanged`, y.r?.ok === true && y.r.qualifying_count === 0 && (await state(db)).queue.length === 3, { err: y.err });
    const bak = await n(db, `select count(*) n from pg_namespace where nspname like 'zz_bak_p1_25_%'`);
    ok(`${label} T6 backup schema still written by the fixed body`, bak >= 1, { bak });
  }
  // T7 dry_run and count results identical between live and new bodies on the same seed.
  { const a = await mk(LIVE, SEED_ACCTS + OBJ_Q + OBJ_Q_MORE + OBJ_HARD), b = await mk(MIGSQL, SEED_ACCTS + OBJ_Q + OBJ_Q_MORE + OBJ_HARD);
    const strip = (j) => JSON.stringify(j, (k, v) => (k === 'marked_at' ? '<ts>' : v)); // marked_at = completed_at = now() - 100 days per DB instance
    const ad = await run(a, 'dry_run'), bd = await run(b, 'dry_run'), ac = await run(a, 'count'), bc = await run(b, 'count');
    ok(`${label} T7 dry_run and count outputs identical to the live body`, strip(ad.r) === strip(bd.r) && strip(ac.r) === strip(bc.r) && ad.r?.qualifying_count === 1, { qd: bd.r?.qualifying_count }); }
  // T8 7c71e421 alone (completed 100 days) never qualifies; its object is never queued.
  { const db = await mk(MIGSQL, `insert into auth.users (id, email) values ('${HARD}', 'fixture-hard'); insert into public.users (id, email) select id, email from auth.users;
      insert into public.account_deletion_requests (user_id, status, completed_at) values ('${HARD}', 'completed', now() - interval '100 days');` + OBJ_HARD);
    const x = await run(db); const s = await state(db);
    ok(`${label} T8 7c71e421 with a 100-day completed request: excluded, kept, object not queued`, x.r?.ok === true && x.r.qualifying_count === 0 && x.r.excluded.hardcoded_7c71e421 === 1 && s.auth_hard === 1 && s.objects === 1 && s.queue.length === 0, { err: x.err }); }
}
await suite('MAIN', MIG);
// R1/R2 rollback restores the exact live body and drops the queue only when empty.
{ const db = await mk(MIG); await db.exec(RB);
  const src = (await db.query(`select md5(prosrc) m from pg_proc where proname='purge_deleted_accounts'`)).rows[0].m;
  const t = (await db.query(`select to_regclass('public.p1_25_storage_delete_queue')::text t`)).rows[0].t;
  ok('R1 rollback: prosrc md5 = live 83a038673c6f8ffbef7fddabb2b2cc9e, empty queue table dropped', src === '83a038673c6f8ffbef7fddabb2b2cc9e' && t === null, { src, t });
  const db2 = await mk(MIG, SEED_ACCTS + OBJ_Q + OBJ_Q_MORE); await run(db2); await db2.exec(RB);
  const t2 = (await db2.query(`select count(*)::int n from public.p1_25_storage_delete_queue`)).rows[0].n;
  ok('R2 rollback with queued rows: queue table kept (3 rows), body restored', t2 === 3, { t2 }); }
// Mutants: each must make at least one MAIN test fail.
const mut = [
  ['M1 queue INSERT reverted to DELETE FROM storage.objects', (s) => s.replace(/INSERT INTO public\.p1_25_storage_delete_queue \(bucket_id, name\)\n        SELECT o\.bucket_id, o\.name FROM storage\.objects o/g, 'DELETE FROM storage.objects o').replace(/\n        ON CONFLICT \(bucket_id, name\) DO NOTHING/g, '')],
  ['M2 guard > 0 changed to > 1', (s) => s.replace("'storage.objects')::bigint, 0) > 0", "'storage.objects')::bigint, 0) > 1")],
  ['M3 hardcoded 7c71e421 id changed', (s) => s.replace("v_hardcoded uuid := '7c71e421-929b-4691-a6bc-cc614ed2a08d'", "v_hardcoded uuid := '00000000-0000-0000-0000-000000000000'")],
  ['M4 owner predicate dropped from the queue insert', (s) => s.replace(/(INSERT INTO public\.p1_25_storage_delete_queue[\s\S]*?WHERE )o\.owner IN \(SELECT user_id FROM _classed WHERE class = 'qualifying'\)\n           OR /g, '$1')],
  ['M6 owner_id predicate dropped from the queue insert', (s) => s.replace(/(INSERT INTO public\.p1_25_storage_delete_queue[\s\S]*?)\n           OR o\.owner_id IN \(SELECT user_id::text FROM _classed WHERE class = 'qualifying'\)/g, '$1')],
  ['M5 queued count not reported', (s) => s.replace("'storage_objects_queued', v_storage_queued", "'storage_objects_queued', 0")],
];
const mres = [];
for (const [name, f] of mut) {
  const m = f(MIG); if (m === MIG) { console.log(`MUTANT ${name}: NOT APPLIED (pattern miss)`); mres.push({ name, killed: false, applied: false }); fails++; continue; }
  const before = fails; const keep = results.length; await suite(name.split(' ')[0], m);
  const killed = results.slice(keep).some((r) => !r.pass); fails = before; results.length = keep;
  console.log(`MUTANT ${name}: ${killed ? 'KILLED' : 'SURVIVED'}`); mres.push({ name, killed, applied: true }); if (!killed) fails++;
}
fs.writeFileSync('test-purge-fix-results.json', JSON.stringify({ results, mutants: mres, fails }, null, 1));
console.log(`TOTAL fails ${fails}`);
process.exit(fails ? 1 : 0);
