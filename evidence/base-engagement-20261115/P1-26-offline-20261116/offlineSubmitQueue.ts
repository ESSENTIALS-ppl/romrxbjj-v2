// P1-26 offline submit queue. IndexedDB (or an injected store in tests), never Cache Storage.
// Stores the submit-assessment JSON body only. Replay uses a fresh access token; no bearer is kept.
import { offlineCacheOn } from './offlineCachePolicy'

export const QUEUE_DB = 'romrx-p1-26-offline'
export const QUEUE_STORE = 'submit-queue'
export const PENDING_MESSAGE = 'You appear to be offline. Your assessment is saved on this device and will submit when you are back online.'

export interface QueuedSubmit {
  id: string
  url: string
  body: string
  createdAt: number
}

export interface QueueStore {
  getAll(): Promise<QueuedSubmit[]>
  put(item: QueuedSubmit): Promise<void>
  delete(id: string): Promise<void>
}

export function isNetworkFailure(err: unknown, online: boolean = typeof navigator === 'undefined' ? true : navigator.onLine): boolean {
  if (online === false) return true
  if (!err) return false
  const msg = err instanceof Error ? err.message : String(err)
  return /failed to fetch|networkerror|network request failed|load failed|offline/i.test(msg)
}

export function memoryQueueStore(seed: QueuedSubmit[] = []): QueueStore {
  const rows = new Map(seed.map((r) => [r.id, r]))
  return {
    async getAll() { return [...rows.values()].sort((a, b) => a.createdAt - b.createdAt) },
    async put(item) { rows.set(item.id, item) },
    async delete(id) { rows.delete(id) },
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(QUEUE_DB, 1)
    req.onupgradeneeded = () => { req.result.createObjectStore(QUEUE_STORE, { keyPath: 'id' }) }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export function idbQueueStore(): QueueStore {
  return {
    async getAll() {
      const db = await openDb()
      return new Promise((resolve, reject) => {
        const q = db.transaction(QUEUE_STORE, 'readonly').objectStore(QUEUE_STORE).getAll()
        q.onsuccess = () => resolve((q.result as QueuedSubmit[]).sort((a, b) => a.createdAt - b.createdAt))
        q.onerror = () => reject(q.error)
      })
    },
    async put(item) {
      const db = await openDb()
      return new Promise((resolve, reject) => {
        const q = db.transaction(QUEUE_STORE, 'readwrite').objectStore(QUEUE_STORE).put(item)
        q.onsuccess = () => resolve()
        q.onerror = () => reject(q.error)
      })
    },
    async delete(id) {
      const db = await openDb()
      return new Promise((resolve, reject) => {
        const q = db.transaction(QUEUE_STORE, 'readwrite').objectStore(QUEUE_STORE).delete(id)
        q.onsuccess = () => resolve()
        q.onerror = () => reject(q.error)
      })
    },
  }
}

export function defaultQueueStore(): QueueStore {
  return typeof indexedDB === 'undefined' ? memoryQueueStore() : idbQueueStore()
}

export interface SubmitResult {
  ok: boolean
  queued: boolean
  status?: number
  data?: Record<string, unknown>
  error?: string
}

export async function enqueueSubmit(
  url: string,
  body: unknown,
  store: QueueStore,
  now: number = Date.now(),
  id: string = `${now}-${Math.random().toString(36).slice(2, 10)}`,
): Promise<QueuedSubmit> {
  const item: QueuedSubmit = { id, url, body: typeof body === 'string' ? body : JSON.stringify(body), createdAt: now }
  await store.put(item)
  return item
}

/**
 * POST submit-assessment. On a network failure, and only when the flag is on, the body is queued.
 * HTTP error responses are not queued. Tokens are not stored.
 */
export async function postSubmitAssessment(opts: {
  url: string
  accessToken: string
  apikey: string
  body: unknown
  fetchImpl?: typeof fetch
  store?: QueueStore
  flagOn?: boolean
  online?: boolean
}): Promise<SubmitResult> {
  const flagOn = opts.flagOn ?? offlineCacheOn()
  const fetchImpl = opts.fetchImpl ?? fetch
  try {
    const res = await fetchImpl(opts.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opts.accessToken}`,
        apikey: opts.apikey,
      },
      body: JSON.stringify(opts.body),
    })
    const data = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` })) as Record<string, unknown>
    if (!res.ok || data.ok === false) {
      return { ok: false, queued: false, status: res.status, data, error: String(data.error ?? `HTTP ${res.status}`) }
    }
    return { ok: true, queued: false, status: res.status, data }
  } catch (err) {
    if (flagOn && isNetworkFailure(err, opts.online)) {
      const store = opts.store ?? defaultQueueStore()
      await enqueueSubmit(opts.url, opts.body, store)
      return { ok: false, queued: true, error: PENDING_MESSAGE }
    }
    return { ok: false, queued: false, error: 'Something went wrong. Please try again.' }
  }
}

export async function flushSubmitQueue(opts: {
  getAccessToken: () => Promise<string | null>
  apikey: string
  fetchImpl?: typeof fetch
  store?: QueueStore
  flagOn?: boolean
}): Promise<{ sent: number; remaining: number }> {
  if (!(opts.flagOn ?? offlineCacheOn())) return { sent: 0, remaining: 0 }
  const store = opts.store ?? defaultQueueStore()
  const fetchImpl = opts.fetchImpl ?? fetch
  const items = await store.getAll()
  let sent = 0
  for (const item of items) {
    const token = await opts.getAccessToken()
    if (!token) break
    try {
      const res = await fetchImpl(item.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: opts.apikey,
        },
        body: item.body,
      })
      if (res.ok) {
        const data = await res.json().catch(() => ({ ok: true })) as Record<string, unknown>
        if (data.ok === false) {
          if (res.status >= 500 || res.status === 401 || res.status === 429) break
          await store.delete(item.id)
          continue
        }
        await store.delete(item.id)
        sent++
        continue
      }
      if (res.status >= 500 || res.status === 401 || res.status === 429) break
      await store.delete(item.id)
    } catch {
      break
    }
  }
  const remaining = (await store.getAll()).length
  return { sent, remaining }
}
