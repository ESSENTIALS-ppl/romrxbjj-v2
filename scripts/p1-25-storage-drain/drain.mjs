#!/usr/bin/env node
// P1-25 storage drain, option A (Node 18+). BUILD ONLY until pinned and released.
// Reads SUPABASE_SERVICE_ROLE_KEY from the environment and never prints it.
// Usage:
//   node scripts/p1-25-storage-drain/drain.mjs [--dry-run] [--log <file>]
// Env: SUPABASE_SERVICE_ROLE_KEY (required), SUPABASE_URL (default https://cqzvqzwwevnflinxgnpp.supabase.co),
//      P1_25_DRAIN_LOG (default log file below), P1_25_DRAIN_PAGE (page size, default 500).
// Exit: 0 = no failures (including empty queue), 2 = some rows failed and stayed queued, 1 = setup or read error.
import fs from 'node:fs';
import path from 'node:path';
import { drainQueue } from '../../supabase/functions/_shared/p1_25_storage_drain_core.mjs';

const DEFAULT_LOG = '/workspace/process/batches/base-engagement-20261115/P1-25-purge-20261116/drain-log/P1-25-DRAIN.log';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const li = args.indexOf('--log');
const logFile = li >= 0 ? args[li + 1] : (process.env.P1_25_DRAIN_LOG || DEFAULT_LOG);
const baseUrl = (process.env.SUPABASE_URL || 'https://cqzvqzwwevnflinxgnpp.supabase.co').replace(/\/+$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const pageSize = Number(process.env.P1_25_DRAIN_PAGE || 500);

function etNow() {
  const s = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour12: true, year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' });
  return `${s} ET`;
}
function scrub(s) {
  return key ? String(s).split(key).join('[key]') : String(s);
}
function writeLog(obj) {
  const line = scrub(JSON.stringify({ at: etNow(), ...obj })) + '\n';
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.appendFileSync(logFile, line);
  process.stdout.write(line);
}

try {
  const r = await drainQueue({ baseUrl, key, pageSize, dryRun, log: writeLog });
  process.exit(r.failed > 0 ? 2 : 0);
} catch (e) {
  writeLog({ event: 'error', message: scrub(e && e.message ? e.message : e) });
  process.exit(1);
}
