# SPEC-P1-26-OFFLINE — offline assessment and media caching (Base web app)

Avery, Mon Nov 16, 2026, evening ET (America/New_York). Web app only; no native. Build sits behind a flag that defaults off. Nothing in this item is for deploy until gated.

## Goal

A signed-in member can keep moving through the Base assessment and protocol media when the network drops, without a second source of user data beyond the live save-as-you-go drafts.

## Flag and kill switch

- Env flag: `VITE_P1_26_OFFLINE_CACHE`. Only the exact string `on` enables the feature (same rule as other ROMRx flags). Unset, empty, `true`, `1`, or anything else is off.
- Default: off. Production builds stay unchanged until a later gate turns the flag on and rebuilds.
- Kill switch / rollback: set the flag off (or leave it unset) and rebuild. On boot, if the flag is off, the app unregisters this service worker and deletes this feature's Cache Storage entries. See `ROLLBACK.md`.

## Service worker

- One worker, URL `/app/sw.js`, scope `/app/`. The Base app is already mounted at `/app/`.
- Registered from the app entry only when the flag is on. Never registered otherwise.
- P1-14 (web push) is not in this tree (`SHOW_PUSH` is false; there is no worker on 8bf3d601). This worker is the one later push work should join, so we do not ship a second worker that would collide. This item does not add push.

## Cache Storage

Two versioned caches:

- `romrx-p1-26-shell-v1` — app shell: `/app/` navigations (`index.html`) and hashed `/app/assets/*` static files (js, css, fonts served by the app, icons). HTML is network-first, falling back to cache when offline. Hashed assets are cache-first.
- `romrx-p1-26-media-v1` — same-origin `/videos/*` (mp4 and poster jpg) for assessment and protocol screens. Cache-first, LRU cap of 24 files (about 12 videos plus posters). A miss while offline returns a network error the existing video slot already hides.

Cache names are versioned. On activate, any `romrx-p1-26-*` cache that is not a current name is deleted.

## What is never cached

The worker does not intercept, and never writes to Cache Storage:

- Requests with an `Authorization` header.
- Any non-GET request.
- Auth and API URLs: Supabase hosts (`*.supabase.co`), `/auth/v1`, `/rest/v1`, `/functions/v1`, `/storage/v1`, `/realtime`.
- Any response that holds user data from the API.

This is stricter than "cache it but don't store": those requests fall through to the browser default, so the worker cannot accidentally keep a copy.

## Save-as-you-go

Live save-as-you-go (`lib/assessmentDraft.ts` + `assessmentDraftStore.ts`, signed-in only) already:

- upserts the member's `assessment_drafts` row when online, and
- keeps a per-user local mirror (`romrx.assessment_draft.v1.<userId>`) so a draft can be restored if the network save fails.

This item does not add a second draft store and does not cache draft API responses. Offline measuring continues to use that existing mirror. The 48-hour / 7-day draft rules are unchanged.

## Offline submit queue

When the flag is on and a signed-in `submit-assessment` call fails because the network is down, the payload is queued on the device (IndexedDB, not Cache Storage) and sent again on reconnect (`online` event, and once at start-up). Replay uses a fresh access token; the queue does not store bearer tokens.

- Success path is unchanged when the network works.
- HTTP error responses (4xx/5xx) are not treated as offline and are not queued.
- Lead (signed-out) `submit-lead-assessment` is not queued: there is no signed-in draft mirror for that path, and this item does not add one.
- The outro / "great-job" success screen is not shown until the request actually succeeds. A queued submit leaves the member on the assessment with a pending message.
- Quick Check uses the same helper so a dropped connection there also queues, behind the same flag.

## Out of scope

Native apps, web push, precaching the entire video library, caching Google Fonts or other third-party hosts, CSP changes (P1-30), turning the flag on, and any deploy.
