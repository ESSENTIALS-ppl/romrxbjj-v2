// P1-26 cache policy. Pure URL/request rules used by tests and documented for app/public/sw.js
// (keep the two in sync). Never caches auth or API responses that hold user data.

export const SHELL_CACHE = 'romrx-p1-26-shell-v1'
export const MEDIA_CACHE = 'romrx-p1-26-media-v1'
export const CACHE_PREFIX = 'romrx-p1-26-'
export const MEDIA_CACHE_CAP = 24
export const SW_URL = '/app/sw.js'
export const SW_SCOPE = '/app/'
export const FLAG_NAME = 'VITE_P1_26_OFFLINE_CACHE'

/** Only the exact string "on" enables the feature. */
export function offlineCacheOn(env: Record<string, unknown> = (import.meta as ImportMeta).env): boolean {
  return env[FLAG_NAME] === 'on'
}

export function isSupabaseHost(hostname: string): boolean {
  return hostname === 'supabase.co' || hostname.endsWith('.supabase.co')
}

const API_PATH = /^\/(auth|rest|functions|storage|realtime)\/v\d+/

export function isUserApiPath(pathname: string): boolean {
  return API_PATH.test(pathname)
}

export function isMediaPath(pathname: string): boolean {
  return pathname === '/videos' || pathname.startsWith('/videos/')
}

export function isShellPath(pathname: string): boolean {
  return pathname === '/app' || pathname === '/app/' || pathname.startsWith('/app/')
}

export function isHashedAsset(pathname: string): boolean {
  return pathname.startsWith('/app/assets/')
}

/** True when the service worker must not intercept the request at all. */
export function shouldBypass(input: { method: string; url: string; hasAuthorization: boolean }): boolean {
  if (input.method.toUpperCase() !== 'GET') return true
  if (input.hasAuthorization) return true
  let url: URL
  try { url = new URL(input.url) } catch { return true }
  if (isSupabaseHost(url.hostname)) return true
  if (isUserApiPath(url.pathname)) return true
  if (url.searchParams.has('access_token')) return true
  return false
}

export type CacheKind = 'media' | 'shell-html' | 'shell-asset' | null

export function cacheKind(input: { method: string; url: string; hasAuthorization: boolean; origin?: string }): CacheKind {
  if (shouldBypass(input)) return null
  let url: URL
  try { url = new URL(input.url) } catch { return null }
  if (input.origin && url.origin !== input.origin) return null
  if (isMediaPath(url.pathname)) return 'media'
  if (!isShellPath(url.pathname)) return null
  if (isHashedAsset(url.pathname)) return 'shell-asset'
  return 'shell-html'
}

export function currentCacheNames(): string[] {
  return [SHELL_CACHE, MEDIA_CACHE]
}

export function isOurCache(name: string): boolean {
  return name.startsWith(CACHE_PREFIX)
}
