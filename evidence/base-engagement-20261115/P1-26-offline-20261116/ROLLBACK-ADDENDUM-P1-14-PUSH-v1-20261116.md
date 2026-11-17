# P1-26 rollback addendum v1: effect on P1-14 web push (2026-11-16, Avery)

Adds to `ROLLBACK.md` (sha256 de7f3fcac5acd102cad6dcad9f39c850e7d519d29510a207e35454887003a85c). That file and `SHA256SUMS` (26e88d4a…) are unchanged. This note has its own sha file: `ROLLBACK-ADDENDUM-P1-14-PUSH-v1-20261116.sha256`.

Source: Jules, `/workspace/process/evidence/JULES-P1-14-WIP-NOTES-20261116.md` (sha256 3b9707373abfcab8f52b1002bb8d8fe69020453689e469b24bf2aa6b486b5737), lines 24-28.

## What the kill switch does to push

- ROLLBACK.md step 3 says that with `VITE_P1_26_OFFLINE_CACHE` off, `startOfflineCache()` unregisters `/app/sw.js` (`offlineCache.ts`, `unregisterOfflineWorker`).
- A browser push subscription belongs to its service worker registration. Unregistering `/app/sw.js` ends every push subscription made through it. No push can be shown on that device after that.
- Push also needs P1-26 on to have a worker at all (Jules L24).
- Subscriptions do not come back when the flag is turned back on. Each member has to turn push on again in the app to make a new subscription (a new `push_subscriptions` row through save-push-subscription).

## Server side after a flip

- The old rows stay in `public.push_subscriptions`. The browser does not tell the server.
- The next live send to such an endpoint normally gets 404 or 410. send-push-notification then sets `disabled_at` on that row (`markFailure`, only when the candidate came from the table).
- Gap (described, not built): candidates from the legacy `notification_preferences.push_subscription` jsonb have no row id. `markFailure` returns early for them, so they are never disabled. They would fail every day and use up that day's dedupe claim. A cheap server guard would be: on 404 or 410 for a jsonb candidate, set `notification_preferences.push_subscription = null` for that user. Not built in P1-14 r2; needs a decision.
- Old rows count toward the 10-device limit (`push_subscriptions_cap_trg`) until a send disables them. With sends off (`WEB_PUSH_SEND` not exactly `on`) nothing disables them.

## Rollback steps to add when push is live

1. Before flipping P1-26 off, set `WEB_PUSH_SEND` to anything other than `on` (Jim runs secrets himself), or accept that every push device is lost.
2. After the flip, expect `push_subscriptions` rows with no working browser behind them.
3. After P1-26 is back on, members must turn push on again. Count new rows to confirm.

Options still open (Jules L25-27, not decided here): (a) push registers `/app/sw.js` itself while SHOW_PUSH is on; (b) the kill switch skips unregistering while push is on; (c) document that push requires P1-26 on (this note does (c) only).
