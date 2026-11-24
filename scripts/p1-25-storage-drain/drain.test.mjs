// Tests for the P1-25 storage drain (BUILD ONLY). No network beyond 127.0.0.1, no live data, no secrets.
// A PGlite database holds the real queue DDL (from the unapplied migration) and a storage.objects stub with the
// LIVE storage.protect_delete body as a statement-level BEFORE DELETE trigger. A local HTTP stub plays PostgREST
// (queue reads/deletes) and the Storage API (object deletes, done the way storage-api does them: set_config
// storage.allow_delete_query = 'true' local to the transaction, then DELETE).
// Run: node scripts/p1-25-storage-drain/drain.test.mjs
// Env: PGLITE_PATH (path to @electric-sql/pglite dist/index.js), P1_25_DRAIN_CORE (core module under test).
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const CORE = process.env.P1_25_DRAIN_CORE || path.join(ROOT, 'supabase/functions/_shared/p1_25_storage_drain_core.mjs');
const { drainQueue } = await import(pathToFileURL(CORE).href);
const { PGlite } = await import(process.env.PGLITE_PATH ? pathToFileURL(process.env.PGLITE_PATH).href : '@electric-sql/pglite');
const QUIET = !!process.env.P1_25_QUIET;

const MIG = fs.readFileSync(path.join(ROOT, 'supabase/migrations-unapplied/20261117120000_p1_25_purge_storage_queue.sql'), 'utf8');
const QUEUE_DDL = MIG.slice(MIG.indexOf('CREATE TABLE IF NOT EXISTS public.p1_25_storage_delete_queue'), MIG.indexOf('CREATE OR REPLACE FUNCTION'));
const CHECK_SQL = fs.readFileSync(process.env.P1_25_CHECK_SQL || path.join(HERE, 'daily-queue-check.sql'), 'utf8');
const KEY = 'test-only-service-role-key-0123456789abcdef';
const STORAGE = `
create role anon; create role authenticated; create role service_role;
create schema storage;
create table storage.buckets (id text primary key);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid, owner_id text, unique (bucket_id, name));
create function storage.protect_delete() returns trigger language plpgsql as $function$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$function$;
create trigger protect_objects_delete before delete on storage.objects for each statement execute function storage.protect_delete();
insert into storage.buckets (id) values ('progress-photos');
`;
const A = '00000000-0000-4000-8000-0000000000a1';
const B = '00000000-0000-4000-8000-0000000000b2';
const KEEP = '00000000-0000-4000-8000-0000000000c3'; // an active account's file: never queued, must survive

async function mkdb() {
  const db = new PGlite();
  await db.exec(STORAGE);
  await db.exec(QUEUE_DDL);
  return db;
}
const obj = (db, name, owner) => db.query(`insert into storage.objects (bucket_id, name, owner, owner_id) values ('progress-photos', $1, $2::uuid, $3)`, [name, owner, owner]);
const enq = (db, name, ago = '0 hours', bucket = 'progress-photos') => db.query(`insert into public.p1_25_storage_delete_queue (bucket_id, name, queued_at) values ($1, $2, now() - $3::interval)`, [bucket, name, ago]);
const qrows = async (db) => (await db.query('select bucket_id, name from public.p1_25_storage_delete_queue order by 1,2')).rows.map((r) => r.name);
const objs = async (db) => (await db.query('select name from storage.objects order by 1')).rows.map((r) => r.name);

// stub: { force: Map(name -> {status, body}|'reset'), missing: '404'|'400', queueDeleteFail: Set(name), calls: [] }
function startStub(db, stub) {
  const srv = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    const authOk = req.headers.apikey === KEY && req.headers.authorization === `Bearer ${KEY}`;
    const send = (status, body, hdrs = {}) => { res.writeHead(status, { 'content-type': 'application/json', ...hdrs }); res.end(body === undefined ? '' : JSON.stringify(body)); };
    try {
      if (u.pathname === '/rest/v1/p1_25_storage_delete_queue') {
        if (!authOk) return send(401, { message: 'no key' });
        if (req.method === 'HEAD') {
          stub.calls.push('queue:HEAD');
          const n = Number((await db.query('select count(*) n from public.p1_25_storage_delete_queue')).rows[0].n);
          return send(206, undefined, { 'content-range': `0-0/${n}` });
        }
        if (req.method === 'GET') {
          stub.calls.push('queue:GET');
          const [from, to] = String(req.headers.range || '0-999').split('-').map(Number);
          const rows = (await db.query(`select bucket_id, name, queued_at from public.p1_25_storage_delete_queue order by bucket_id, name offset $1 limit $2`, [from, to - from + 1])).rows;
          return send(200, rows.map((r) => ({ ...r, queued_at: new Date(r.queued_at).toISOString() })));
        }
        if (req.method === 'DELETE') {
          const b = u.searchParams.get('bucket_id'); const n = u.searchParams.get('name');
          if (!b?.startsWith('eq.') || !n?.startsWith('eq.')) return send(400, { message: 'filters required' });
          const name = n.slice(3);
          stub.calls.push(`queue:DELETE ${name}`);
          if (stub.queueDeleteFail?.has(name)) return send(500, { message: 'stub queue delete failure' });
          const gone = (await db.query('delete from public.p1_25_storage_delete_queue where bucket_id = $1 and name = $2 returning bucket_id, name', [b.slice(3), name])).rows;
          return send(200, gone);
        }
      }
      if (u.pathname.startsWith('/storage/v1/object/') && req.method === 'DELETE') {
        const parts = u.pathname.slice('/storage/v1/object/'.length).split('/').map(decodeURIComponent);
        const bucket = parts[0]; const name = parts.slice(1).join('/');
        stub.calls.push(`storage:DELETE ${name}`);
        if (!authOk) return send(400, { statusCode: '403', error: 'Unauthorized', message: 'invalid signature' });
        const f = stub.force?.get(name);
        if (f === 'reset') { req.socket.destroy(); return; }
        if (f) return send(f.status, f.body);
        let deleted = 0;
        await db.transaction(async (tx) => {
          await tx.query(`select set_config('storage.allow_delete_query', 'true', true)`); // as storage-api scope.ts
          deleted = (await tx.query('delete from storage.objects where bucket_id = $1 and name = $2 returning id', [bucket, name])).rows.length;
        });
        if (deleted === 0) {
          return stub.missing === '404' ? send(404, { message: 'Object not found' }) : send(400, { statusCode: '404', error: 'not_found', message: 'Object not found' });
        }
        return send(200, { message: 'Successfully deleted' });
      }
      send(404, { message: 'no route' });
    } catch (e) {
      send(500, { message: String(e.message || e) });
    }
  });
  return new Promise((resolve) => srv.listen(0, '127.0.0.1', () => resolve({ srv, url: `http://127.0.0.1:${srv.address().port}` })));
}

const results = []; let fails = 0;
const ok = (n, c, info) => { results.push({ n, pass: !!c, info }); if (!c) fails++; if (!QUIET || !c) console.log(`${c ? 'PASS' : 'FAIL'} ${n}${info ? ' ' + JSON.stringify(info) : ''}`); };
async function withEnv(setup, fn, stubOpts = {}) {
  const db = await mkdb(); await setup(db);
  const stub = { force: new Map(), missing: '400', calls: [], ...stubOpts };
  const { srv, url } = await startStub(db, stub);
  try { return await fn({ db, stub, url }); } finally { srv.close(); await db.close(); }
}
const drain = (url, extra = {}) => drainQueue({ baseUrl: url, key: KEY, ...extra });
const counts = (r) => ({ s: r.queued_at_start, d: r.deleted, m: r.already_missing, f: r.failed, r: r.remaining });

// D0 evidence: SQL DELETE on storage.objects is blocked by the trigger; the API path (set_config local) is not.
await withEnv(async (db) => { await obj(db, `${A}/x.jpg`, A); }, async ({ db }) => {
  let err = ''; try { await db.query('delete from storage.objects'); } catch (e) { err = String(e.message); }
  ok('D0a plain SQL DELETE FROM storage.objects raises protect_delete', err.includes('Direct deletion from storage tables is not allowed'), { err: err.slice(0, 60) });
  let n = -1; await db.transaction(async (tx) => { await tx.query(`select set_config('storage.allow_delete_query','true',true)`); n = (await tx.query('delete from storage.objects returning id')).rows.length; });
  const after = (await db.query(`select current_setting('storage.allow_delete_query', true) s`)).rows[0].s;
  ok('D0b with storage-api scope (set_config local) the same DELETE passes; setting does not leak past the transaction', n === 1 && (after === null || after === '' ), { n, after });
});

// D1 empty queue: only a count, no reads, no storage calls.
await withEnv(async (db) => { await obj(db, `${KEEP}/k.jpg`, KEEP); }, async ({ db, stub, url }) => {
  const r = await drain(url);
  ok('D1 empty queue: all counts 0, no row read, no Storage call, files untouched', JSON.stringify(counts(r)) === JSON.stringify({ s: 0, d: 0, m: 0, f: 0, r: 0 }) && stub.calls.every((c) => c === 'queue:HEAD') && (await objs(db)).length === 1, { c: counts(r), calls: stub.calls });
});

// D2 success: file deleted through the API, then its row.
await withEnv(async (db) => { await obj(db, `${A}/front.jpg`, A); await enq(db, `${A}/front.jpg`); await obj(db, `${KEEP}/k.jpg`, KEEP); }, async ({ db, stub, url }) => {
  const r = await drain(url);
  const order = stub.calls.filter((c) => c.includes('DELETE'));
  ok('D2 success: file gone, row gone, deleted 1, remaining 0, other files kept', JSON.stringify(counts(r)) === JSON.stringify({ s: 1, d: 1, m: 0, f: 0, r: 0 }) && (await qrows(db)).length === 0 && JSON.stringify(await objs(db)) === JSON.stringify([`${KEEP}/k.jpg`]), { c: counts(r) });
  ok('D2b order: Storage delete happens before the queue-row delete', order[0] === `storage:DELETE ${A}/front.jpg` && order[1] === `queue:DELETE ${A}/front.jpg`, { order });
});

// D3 not found as HTTP 404, D3b not found as HTTP 400 + statusCode "404" (current storage-api).
for (const [label, missing] of [['D3 HTTP 404', '404'], ['D3b HTTP 400 not_found body', '400']]) {
  await withEnv(async (db) => { await enq(db, `${A}/gone.jpg`); }, async ({ db, url }) => {
    const r = await drain(url);
    ok(`${label}: already-missing 1, row removed`, JSON.stringify(counts(r)) === JSON.stringify({ s: 1, d: 0, m: 1, f: 0, r: 0 }) && (await qrows(db)).length === 0, { c: counts(r) });
  }, { missing });
}

// D4 500: row and file kept, failed 1.
await withEnv(async (db) => { await obj(db, `${A}/front.jpg`, A); await enq(db, `${A}/front.jpg`); }, async ({ db, stub, url }) => {
  stub.force.set(`${A}/front.jpg`, { status: 500, body: { statusCode: '500', error: 'internal', message: 'boom' } });
  const r = await drain(url);
  ok('D4 HTTP 500: row kept for retry, file kept, failed 1, remaining 1, no queue delete sent', JSON.stringify(counts(r)) === JSON.stringify({ s: 1, d: 0, m: 0, f: 1, r: 1 }) && (await qrows(db)).length === 1 && (await objs(db)).length === 1 && !stub.calls.some((c) => c.startsWith('queue:DELETE')), { c: counts(r), failures: r.failures });
  ok('D4b failure log masks the user id in the path', r.failures[0]?.path === '00000000-…/front.jpg' && r.failures[0]?.status === 500, { f: r.failures[0] });
});

// D5 HTTP 400 that is not not-found (e.g. InvalidKey / 403 in body): a failure, row kept.
await withEnv(async (db) => { await obj(db, `${A}/front.jpg`, A); await enq(db, `${A}/front.jpg`); }, async ({ db, stub, url }) => {
  stub.force.set(`${A}/front.jpg`, { status: 400, body: { statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' } });
  const r = await drain(url);
  ok('D5 HTTP 400 other error: failed 1, row kept', JSON.stringify(counts(r)) === JSON.stringify({ s: 1, d: 0, m: 0, f: 1, r: 1 }) && (await qrows(db)).length === 1, { c: counts(r) });
});

// D6 network reset: failure, row kept.
await withEnv(async (db) => { await obj(db, `${A}/front.jpg`, A); await enq(db, `${A}/front.jpg`); }, async ({ db, stub, url }) => {
  stub.force.set(`${A}/front.jpg`, 'reset');
  const r = await drain(url);
  ok('D6 network error: failed 1, row kept, file kept', JSON.stringify(counts(r)) === JSON.stringify({ s: 1, d: 0, m: 0, f: 1, r: 1 }) && (await qrows(db)).length === 1 && (await objs(db)).length === 1, { c: counts(r) });
});

// D7 mixed batch over 3 pages (page size 2), one odd path, then idempotent reruns.
const ODD = `${B}/my photo #2 ü%.jpg`;
await withEnv(async (db) => {
  for (const n of [`${A}/1.jpg`, `${A}/2.jpg`, ODD]) { await obj(db, n, n.startsWith(A) ? A : B); await enq(db, n); }
  await enq(db, `${A}/missing.jpg`);
  await obj(db, `${B}/fail.jpg`, B); await enq(db, `${B}/fail.jpg`);
  await obj(db, `${KEEP}/k.jpg`, KEEP);
}, async ({ db, stub, url }) => {
  stub.force.set(`${B}/fail.jpg`, { status: 500, body: { message: 'boom' } });
  const r = await drain(url, { pageSize: 2 });
  ok('D7 mixed 5 rows over 3 pages: deleted 3, already-missing 1, failed 1, remaining 1', JSON.stringify(counts(r)) === JSON.stringify({ s: 5, d: 3, m: 1, f: 1, r: 1 }) && JSON.stringify(await qrows(db)) === JSON.stringify([`${B}/fail.jpg`]), { c: counts(r) });
  ok('D7b odd path (space, #, %, ü) deleted by exact path; unqueued file kept', !(await objs(db)).includes(ODD) && (await objs(db)).includes(`${KEEP}/k.jpg`) && (await objs(db)).includes(`${B}/fail.jpg`), { objs: await objs(db) });
  stub.force.clear();
  const r2 = await drain(url, { pageSize: 2 });
  ok('D7c rerun after the error clears: the kept row drains, remaining 0', JSON.stringify(counts(r2)) === JSON.stringify({ s: 1, d: 1, m: 0, f: 0, r: 0 }) && (await qrows(db)).length === 0, { c: counts(r2) });
  const before = await objs(db);
  const r3 = await drain(url, { pageSize: 2 });
  ok('D7d third run is a no-op (idempotent): counts 0 and files unchanged', JSON.stringify(counts(r3)) === JSON.stringify({ s: 0, d: 0, m: 0, f: 0, r: 0 }) && JSON.stringify(await objs(db)) === JSON.stringify(before), { c: counts(r3) });
});

// D8 queue-row delete fails after the file delete: counted failed, row kept; next run reports already-missing and removes it.
await withEnv(async (db) => { await obj(db, `${A}/front.jpg`, A); await enq(db, `${A}/front.jpg`); }, async ({ db, stub, url }) => {
  stub.queueDeleteFail = new Set([`${A}/front.jpg`]);
  const r = await drain(url);
  ok('D8 queue-row delete error: file gone, row kept, failed 1 (step queue_row_delete)', JSON.stringify(counts(r)) === JSON.stringify({ s: 1, d: 0, m: 0, f: 1, r: 1 }) && (await objs(db)).length === 0 && r.failures[0]?.step === 'queue_row_delete', { c: counts(r) });
  stub.queueDeleteFail = new Set();
  const r2 = await drain(url);
  ok('D8b next run: already-missing 1, row removed', JSON.stringify(counts(r2)) === JSON.stringify({ s: 1, d: 0, m: 1, f: 0, r: 0 }), { c: counts(r2) });
});

// D9 dry run: reads and counts only.
await withEnv(async (db) => { await obj(db, `${A}/front.jpg`, A); await enq(db, `${A}/front.jpg`, '30 hours'); }, async ({ db, stub, url }) => {
  const r = await drain(url, { dryRun: true });
  ok('D9 dry run: no Storage or queue deletes, queued 1, remaining 1, oldest reported', r.queued_at_start === 1 && r.remaining === 1 && !stub.calls.some((c) => c.includes('DELETE')) && (await objs(db)).length === 1 && !!r.oldest_queued_at_start, { c: counts(r) });
});

// D10 wrong key: Storage refuses, row kept (no silent success).
await withEnv(async (db) => { await obj(db, `${A}/front.jpg`, A); await enq(db, `${A}/front.jpg`); }, async ({ db, url }) => {
  let err = ''; try { await drainQueue({ baseUrl: url, key: 'wrong-key-wrong-key-wrong-key' }); } catch (e) { err = String(e.message); }
  ok('D10 wrong key: the run stops at the count (HTTP 401), nothing deleted', err.includes('HTTP 401') && (await qrows(db)).length === 1 && (await objs(db)).length === 1, { err });
});

// D11 daily check SQL (read-only): count, oldest, escalate flag at 24 h.
for (const [label, setup, want] of [
  ['D11a empty', async () => {}, { queued: 0, escalate: false, oldestNull: true }],
  ['D11b 1 row 23 h old', async (db) => enq(db, `${A}/a.jpg`, '23 hours'), { queued: 1, escalate: false, oldestNull: false }],
  ['D11c 2 rows, oldest 25 h', async (db) => { await enq(db, `${A}/a.jpg`, '1 hour'); await enq(db, `${A}/b.jpg`, '25 hours'); }, { queued: 2, escalate: true, oldestNull: false }],
]) {
  const db = await mkdb(); await setup(db);
  const row = (await db.query(CHECK_SQL)).rows[0];
  ok(`${label}: daily check returns count ${want.queued}, escalate ${want.escalate}`, Number(row.queued) === want.queued && row.escalate_to_grant === want.escalate && (row.oldest_queued_at === null) === want.oldestNull, { row: { ...row, oldest_queued_at: row.oldest_queued_at ? 'set' : null } });
  await db.close();
}

// D12 CLI: counts logged, key never printed or logged, exit codes 0 / 2 / 1.
if (!process.env.P1_25_DRAIN_CORE) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p125drain-'));
  const logf = path.join(tmp, 'drain.log');
  // Async spawn: the stub server lives in this process, so a blocking spawn would deadlock.
  const cli = (url, key, extra = []) => new Promise((resolve) => {
    const c = spawn(process.execPath, [path.join(HERE, 'drain.mjs'), '--log', logf, ...extra], { env: { PATH: process.env.PATH, SUPABASE_URL: url, ...(key ? { SUPABASE_SERVICE_ROLE_KEY: key } : {}) } });
    let stdout = ''; let stderr = '';
    c.stdout.on('data', (d) => { stdout += d; }); c.stderr.on('data', (d) => { stderr += d; });
    c.on('close', (status) => resolve({ status, stdout, stderr }));
  });
  await withEnv(async (db) => { await obj(db, `${A}/front.jpg`, A); await enq(db, `${A}/front.jpg`); await obj(db, `${B}/f.jpg`, B); await enq(db, `${B}/f.jpg`); }, async ({ stub, url }) => {
    stub.force.set(`${B}/f.jpg`, { status: 500, body: { message: 'boom' } });
    const p1 = await cli(url, KEY);
    stub.force.clear();
    const p2 = await cli(url, KEY);
    const p3 = await cli(url, '');
    const all = p1.stdout + p1.stderr + p2.stdout + p2.stderr + p3.stdout + p3.stderr + fs.readFileSync(logf, 'utf8');
    const lines = fs.readFileSync(logf, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    ok('D12 CLI exit 2 with a failure, then 0 after it clears, 1 with no key', p1.status === 2 && p2.status === 0 && p3.status === 1, { s: [p1.status, p2.status, p3.status] });
    ok('D12b CLI log lines carry the five counts and an ET time', lines.length === 3 && ['queued_at_start', 'deleted', 'already_missing', 'failed', 'remaining'].every((k) => k in lines[0]) && lines[0].at.endsWith(' ET') && lines[0].deleted === 1 && lines[0].failed === 1 && lines[1].deleted === 1 && lines[1].remaining === 0, { l0: { d: lines[0].deleted, f: lines[0].failed }, l1: { d: lines[1].deleted, r: lines[1].remaining } });
    ok('D12c the key never appears in stdout, stderr or the log', !all.includes(KEY) && !all.includes(KEY.slice(0, 20)), {});
  });
  fs.rmSync(tmp, { recursive: true, force: true });
}

const total = results.length;
console.log(`${total - fails}/${total} PASS`);
if (process.env.P1_25_RESULTS) fs.writeFileSync(process.env.P1_25_RESULTS, JSON.stringify({ total, fails, results }, null, 1));
process.exit(fails ? 1 : 0);
