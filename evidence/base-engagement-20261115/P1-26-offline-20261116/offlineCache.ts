// P1-26 registration and kill switch. Safe to call on every boot.
import { flushSubmitQueue } from './offlineSubmitQueue'
import {
  CACHE_PREFIX, SW_SCOPE, SW_URL, currentCacheNames, isOurCache, offlineCacheOn,
} from './offlineCachePolicy'

export { PENDING_MESSAGE, postSubmitAssessment, flushSubmitQueue } from './offlineSubmitQueue'
export { offlineCacheOn, SHELL_CACHE, MEDIA_CACHE, FLAG_NAME } from './offlineCachePolicy'

type ServiceWorkerLike = {
  register(url: string, opts?: { scope?: string }): Promise<unknown>
  getRegistrations(): Promise<Array<{ scope: string; unregister(): Promise<boolean>; active?: { scriptURL: string } | null }>>
}

function swContainer(): ServiceWorkerLike | null {
  if (typeof navigator === 'undefined') return null
  const sw = (navigator as Navigator & { serviceWorker?: ServiceWorkerLike }).serviceWorker
  return sw ?? null
}

export async function unregisterOfflineWorker(
  container: ServiceWorkerLike | null = swContainer(),
  cachesApi: Pick<CacheStorage, 'keys' | 'delete'> | undefined = typeof caches === 'undefined' ? undefined : caches,
): Promise<{ unregistered: number; cachesDeleted: number }> {
  let unregistered = 0
  if (container) {
    const regs = await container.getRegistrations()
    for (const r of regs) {
      const script = r.active?.scriptURL ?? ''
      if (r.scope.endsWith(SW_SCOPE) || script.endsWith(SW_URL) || script.includes('/app/sw.js')) {
        await r.unregister()
        unregistered++
      }
    }
  }
  let cachesDeleted = 0
  if (cachesApi) {
    const names = await cachesApi.keys()
    for (const name of names) {
      if (isOurCache(name) || currentCacheNames().includes(name) || name.startsWith(CACHE_PREFIX)) {
        await cachesApi.delete(name)
        cachesDeleted++
      }
    }
  }
  return { unregistered, cachesDeleted }
}

export async function startOfflineCache(opts?: {
  env?: Record<string, unknown>
  container?: ServiceWorkerLike | null
  cachesApi?: Pick<CacheStorage, 'keys' | 'delete'>
  getAccessToken?: () => Promise<string | null>
  apikey?: string
}): Promise<'registered' | 'unregistered' | 'unsupported'> {
  const env = opts?.env ?? ((import.meta as ImportMeta).env as Record<string, unknown>)
  const container = opts?.container === undefined ? swContainer() : opts.container
  if (!offlineCacheOn(env)) {
    await unregisterOfflineWorker(container, opts?.cachesApi ?? (typeof caches === 'undefined' ? undefined : caches))
    return container ? 'unregistered' : 'unsupported'
  }
  if (!container) return 'unsupported'
  await container.register(SW_URL, { scope: SW_SCOPE })
  if (opts?.getAccessToken && opts.apikey) {
    void flushSubmitQueue({ getAccessToken: opts.getAccessToken, apikey: opts.apikey, flagOn: true })
  }
  if (typeof window !== 'undefined' && opts?.getAccessToken && opts.apikey) {
    window.addEventListener('online', () => {
      void flushSubmitQueue({ getAccessToken: opts.getAccessToken!, apikey: opts.apikey!, flagOn: true })
    })
  }
  return 'registered'
}
