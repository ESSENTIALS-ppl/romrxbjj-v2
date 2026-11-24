// Mutation check for the P1-25 storage drain core. Each mutant is a one-place edit of a temp copy of the core;
// the test suite (drain.test.mjs, core tests) must FAIL on every mutant. Run: node scripts/p1-25-storage-drain/mutants.mjs
// Env: PGLITE_PATH as for drain.test.mjs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CORE = path.resolve(HERE, '../../supabase/functions/_shared/p1_25_storage_drain_core.mjs');
const SRC = fs.readFileSync(CORE, 'utf8');
const MUTANTS = [
  ['M1 queue row deleted BEFORE the Storage delete', `    let status = 0;\n    let body = '';`, `    await deleteQueueRow(fetchImpl, baseUrl, key, row);\n    let status = 0;\n    let body = '';`],
  ['M2 Storage failures ignored (row removed anyway)', `      continue; // row stays queued for retry`, `      // continue removed`],
  ['M3 any HTTP 400 treated as already gone', `  if (status !== 400) return false;`, `  if (status === 400) return true;`],
  ['M4 HTTP 404 not treated as already gone', `  if (status === 404) return true;`, `  if (status === 404) return false;`],
  ['M5 only the first page of the queue is read', `    if (page.length < pageSize) break;`, `    break;`],
  ['M6 path not URL-encoded per segment', `const path = String(name).split('/').map(encodeURIComponent).join('/');`, `const path = String(name);`],
  ['M7 empty-queue guard removed (reads and loops on 0)', `  if (start === 0) {`, `  if (start === -1) {`],
  ['M8 remaining not recounted (reports start count)', `  out.remaining = await countQueue(fetchImpl, baseUrl, key);\n  log({ event: 'drained'`, `  out.remaining = start;\n  log({ event: 'drained'`],
  ['M9 queue-row delete result ignored', `    if (!q.ok) {`, `    if (false) {`],
  ['M10 network errors counted as success', `      status = -1;`, `      status = 200;`],
  ['M11 dry run still deletes', `  if (opts.dryRun) {`, `  if (false) {`],
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p125mut-'));
const run = (core) => new Promise((resolve) => {
  const c = spawn(process.execPath, [path.join(HERE, 'drain.test.mjs')], { env: { ...process.env, P1_25_DRAIN_CORE: core, P1_25_QUIET: '1' } });
  let out = ''; c.stdout.on('data', (d) => { out += d; }); c.stderr.on('data', (d) => { out += d; });
  const t = setTimeout(() => c.kill('SIGKILL'), 90000);
  c.on('close', (code) => { clearTimeout(t); resolve({ code, out }); });
});
let killed = 0; const rows = [];
for (const [name, from, to] of MUTANTS) {
  if (!SRC.includes(from)) { console.log(`BAD-MUTANT ${name}: anchor not found`); process.exit(3); }
  const f = path.join(tmp, `${name.split(' ')[0]}.mjs`);
  fs.writeFileSync(f, SRC.replace(from, to));
  const r = await run(f);
  const failedTests = r.out.split('\n').filter((l) => l.startsWith('FAIL ')).map((l) => l.slice(5).split(' {')[0].split(':')[0]);
  const k = r.code !== 0;
  if (k) killed++;
  rows.push({ name, killed: k, failed_tests: failedTests });
  console.log(`${k ? 'KILLED' : 'SURVIVED'} ${name}${failedTests.length ? ' <- ' + failedTests.join('; ') : ''}`);
}
const base = await run(CORE);
console.log(`unmutated core: exit ${base.code}`);
console.log(`${killed}/${MUTANTS.length} KILLED`);
if (process.env.P1_25_MUTANTS_RESULTS) fs.writeFileSync(process.env.P1_25_MUTANTS_RESULTS, JSON.stringify({ killed, total: MUTANTS.length, unmutated_exit: base.code, rows }, null, 1));
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(killed === MUTANTS.length && base.code === 0 ? 0 : 1);
