// P1-25 storage drain core (BUILD ONLY; nothing here runs on import).
// Drains public.p1_25_storage_delete_queue: for each queued (bucket_id, name), delete the file through the
// Supabase Storage API (DELETE /storage/v1/object/<bucket>/<path>) with the service role, and only after that
// delete succeeds, or the API says the object is already gone, delete that one queue row through PostgREST.
// Any other Storage answer (or a network error) leaves the row in place for the next run.
// Never uses SQL to touch storage.objects, never sets storage.allow_delete_query, never logs the key.
// Shared by scripts/p1-25-storage-drain/drain.mjs (Node, option A) and
// supabase/functions/p1-25-storage-drain/index.ts (edge function, option B).

export const QUEUE = 'p1_25_storage_delete_queue';

// Path segments are encoded one by one so '/' stays a separator and every other byte is safe.
export function storageObjectUrl(baseUrl, bucket, name) {
  const path = String(name).split('/').map(encodeURIComponent).join('/');
  return `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${path}`;
}

// Mask user ids inside paths for logs: keep the first 8 hex chars of any uuid.
export function maskPath(p) {
  return String(p).replace(/([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '$1-…');
}

// Storage answers a missing object with HTTP 404, or (current storage-api) HTTP 400 with
// body {"statusCode":"404","error":"not_found","message":"Object not found"}. Only those count as already gone.
export function isNotFound(status, bodyText) {
  if (status === 404) return true;
  if (status !== 400) return false;
  try {
    const b = JSON.parse(bodyText || '{}');
    return String(b.statusCode) === '404' || b.error === 'not_found' || b.code === 'NoSuchKey';
  } catch (_e) {
    return false;
  }
}

function headers(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

async function countQueue(fetchImpl, baseUrl, key) {
  const r = await fetchImpl(`${baseUrl}/rest/v1/${QUEUE}?select=bucket_id`, {
    method: 'HEAD',
    headers: headers(key, { Prefer: 'count=exact', Range: '0-0' }),
  });
  if (!r.ok && r.status !== 206) throw new Error(`queue count failed: HTTP ${r.status}`);
  const cr = r.headers.get('content-range') || '';
  const n = Number(cr.split('/')[1]);
  if (!Number.isFinite(n)) throw new Error('queue count failed: no content-range total');
  return n;
}

// Snapshot the whole queue first (stable PK order, paged), then process it, so deletes during the run
// cannot shift pages.
async function readQueue(fetchImpl, baseUrl, key, pageSize) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const url = `${baseUrl}/rest/v1/${QUEUE}?select=bucket_id,name,queued_at&order=bucket_id.asc,name.asc`;
    const r = await fetchImpl(url, {
      method: 'GET',
      headers: headers(key, { Range: `${from}-${from + pageSize - 1}`, 'Range-Unit': 'items' }),
    });
    if (!r.ok) throw new Error(`queue read failed: HTTP ${r.status}`);
    const page = await r.json();
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

async function deleteQueueRow(fetchImpl, baseUrl, key, row) {
  const url = `${baseUrl}/rest/v1/${QUEUE}?bucket_id=eq.${encodeURIComponent(row.bucket_id)}&name=eq.${encodeURIComponent(row.name)}`;
  const r = await fetchImpl(url, { method: 'DELETE', headers: headers(key, { Prefer: 'return=representation' }) });
  if (!r.ok) return { ok: false, status: r.status };
  const gone = await r.json();
  return { ok: Array.isArray(gone) && gone.length === 1, status: r.status, n: Array.isArray(gone) ? gone.length : -1 };
}

// opts: { baseUrl, key, fetch, pageSize=500, dryRun=false, log=(obj)=>{} }
// Returns { queued_at_start, deleted, already_missing, failed, remaining, oldest_queued_at_start, failures[] }.
export async function drainQueue(opts) {
  const { baseUrl, key } = opts;
  const fetchImpl = opts.fetch || globalThis.fetch;
  const pageSize = opts.pageSize || 500;
  const log = opts.log || (() => {});
  if (!baseUrl || !/^https?:\/\//.test(baseUrl)) throw new Error('missing or bad SUPABASE_URL');
  if (!key || key.length < 20) throw new Error('missing SUPABASE_SERVICE_ROLE_KEY');

  const out = { queued_at_start: 0, deleted: 0, already_missing: 0, failed: 0, remaining: 0, oldest_queued_at_start: null, failures: [], dry_run: !!opts.dryRun };
  const start = await countQueue(fetchImpl, baseUrl, key);
  out.queued_at_start = start;
  if (start === 0) {
    // Runs only when the queue count is above 0: nothing is read or deleted otherwise.
    out.remaining = 0;
    log({ event: 'queue_empty', ...out });
    return out;
  }
  const rows = await readQueue(fetchImpl, baseUrl, key, pageSize);
  out.oldest_queued_at_start = rows.reduce((m, r) => (m === null || r.queued_at < m ? r.queued_at : m), null);
  if (opts.dryRun) {
    out.remaining = await countQueue(fetchImpl, baseUrl, key);
    log({ event: 'dry_run', ...out, snapshot: rows.length });
    return out;
  }
  for (const row of rows) {
    let status = 0;
    let body = '';
    try {
      const r = await fetchImpl(storageObjectUrl(baseUrl, row.bucket_id, row.name), { method: 'DELETE', headers: headers(key) });
      status = r.status;
      body = await r.text();
    } catch (e) {
      status = -1;
      body = String((e && e.name) || 'network_error');
    }
    let kind;
    if (status >= 200 && status < 300) kind = 'deleted';
    else if (isNotFound(status, body)) kind = 'already_missing';
    else {
      out.failed++;
      out.failures.push({ bucket: row.bucket_id, path: maskPath(row.name), step: 'storage_delete', status });
      continue; // row stays queued for retry
    }
    const q = await deleteQueueRow(fetchImpl, baseUrl, key, row);
    if (!q.ok) {
      // File is gone but the row stayed: next run sees not-found and removes it.
      out.failed++;
      out.failures.push({ bucket: row.bucket_id, path: maskPath(row.name), step: 'queue_row_delete', status: q.status, rows: q.n });
      continue;
    }
    out[kind]++;
  }
  out.remaining = await countQueue(fetchImpl, baseUrl, key);
  log({ event: 'drained', ...out });
  return out;
}
