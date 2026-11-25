/* P1-26 offline cache worker. Registered only when VITE_P1_26_OFFLINE_CACHE=on.
 * Keep the URL rules in sync with app/src/lib/offlineCachePolicy.ts.
 * Never caches auth or API responses that hold user data.
 */
const SHELL_CACHE = 'romrx-p1-26-shell-v1'
const MEDIA_CACHE = 'romrx-p1-26-media-v1'
const CACHE_PREFIX = 'romrx-p1-26-'
const MEDIA_CACHE_CAP = 24
const CURRENT = [SHELL_CACHE, MEDIA_CACHE]

function isSupabaseHost(hostname) {
  return hostname === 'supabase.co' || hostname.endsWith('.supabase.co')
}
function isUserApiPath(pathname) {
  return /^\/(auth|rest|functions|storage|realtime)\/v\d+/.test(pathname)
}
function isMediaPath(pathname) {
  return pathname === '/videos' || pathname.startsWith('/videos/')
}
function isShellPath(pathname) {
  return pathname === '/app' || pathname === '/app/' || pathname.startsWith('/app/')
}
function isHashedAsset(pathname) {
  return pathname.startsWith('/app/assets/')
}
function shouldBypass(request) {
  if (request.method !== 'GET') return true
  if (request.headers.has('Authorization')) return true
  let url
  try { url = new URL(request.url) } catch { return true }
  if (isSupabaseHost(url.hostname)) return true
  if (isUserApiPath(url.pathname)) return true
  if (url.searchParams.has('access_token')) return true
  return false
}
function cacheKind(request) {
  if (shouldBypass(request)) return null
  let url
  try { url = new URL(request.url) } catch { return null }
  if (url.origin !== self.location.origin) return null
  if (isMediaPath(url.pathname)) return 'media'
  if (!isShellPath(url.pathname)) return null
  if (isHashedAsset(url.pathname)) return 'shell-asset'
  return 'shell-html'
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    await Promise.all(names.filter((n) => n.startsWith(CACHE_PREFIX) && !CURRENT.includes(n)).map((n) => caches.delete(n)))
    await self.clients.claim()
  })())
})

async function trimMediaCache(cache) {
  const keys = await cache.keys()
  const extra = keys.length - MEDIA_CACHE_CAP
  for (let i = 0; i < extra; i++) await cache.delete(keys[i])
}

async function cacheFirst(cacheName, request, cap) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request, { ignoreSearch: true })
  if (hit) return hit
  const res = await fetch(request)
  if (res && res.ok) {
    await cache.put(request, res.clone())
    if (cap) await trimMediaCache(cache)
  }
  return res
}

async function networkFirst(cacheName, request) {
  const cache = await caches.open(cacheName)
  try {
    const res = await fetch(request)
    if (res && res.ok) await cache.put(request, res.clone())
    return res
  } catch (err) {
    const hit = await cache.match(request, { ignoreSearch: true })
    if (hit) return hit
    throw err
  }
}

self.addEventListener('fetch', (event) => {
  const kind = cacheKind(event.request)
  if (!kind) return
  if (kind === 'media') {
    event.respondWith(cacheFirst(MEDIA_CACHE, event.request, MEDIA_CACHE_CAP))
    return
  }
  if (kind === 'shell-asset') {
    event.respondWith(cacheFirst(SHELL_CACHE, event.request, 0))
    return
  }
  event.respondWith(networkFirst(SHELL_CACHE, event.request))
})

/* P1-14 web push (client contract P1-14-CLIENT-CONTRACT-20261116.md, d4f72a35). Same worker, no second path.
 * The sender sends {"title","body"} only. No new words here: a missing or bad payload shows Stacy's cleared title
 * "ROMRx Base" (STACY-P1-14-PUSH-AND-P1-31-TITLES-20261116-2029.md, 219378b5) with an empty body.
 * Inert while the client flag SHOW_PUSH is false (no subscription is ever made) and the sender's WEB_PUSH_SEND is not "on".
 */
const PUSH_FALLBACK_TITLE = 'ROMRx Base'
const PUSH_OPEN_URL = '/app/'

function readPushPayload(event) {
  let title = PUSH_FALLBACK_TITLE
  let body = ''
  try {
    const data = event && event.data ? event.data.json() : null
    if (data && typeof data === 'object') {
      if (typeof data.title === 'string' && data.title.trim()) title = data.title
      if (typeof data.body === 'string') body = data.body
    }
  } catch {
    // Not JSON: keep the fallback.
  }
  return { title, body }
}

self.addEventListener('push', (event) => {
  const { title, body } = readPushPayload(event)
  event.waitUntil(self.registration.showNotification(title, { body }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) {
      let path = ''
      try { path = new URL(client.url).pathname } catch { path = '' }
      if (isShellPath(path) && typeof client.focus === 'function') return client.focus()
    }
    if (self.clients.openWindow) return self.clients.openWindow(PUSH_OPEN_URL)
    return undefined
  })())
})
