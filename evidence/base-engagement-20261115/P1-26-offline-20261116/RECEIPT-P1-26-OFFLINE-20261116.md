# RECEIPT: P1-26 offline assessment and media caching (BUILD ONLY), 2026-11-16 7:16 PM ET (Avery)

BUILD ONLY. Not deployed. Flag defaults off. No emails, no data changes, no Supabase writes. The earlier docs-only plan in `P1-26/` (15 Nov) is unchanged.

## Commit

- Repo ESSENTIALS-ppl/romrx-io-web, branch **feat/p1-26-offline-cache-20261116** (plain push, new branch, not main).
- Commit **d631afab3db02c09ec600579034f2238e9bd6f19**, parent **8bf3d601674fe9bd6ff2252e71409d29a71df662**.
- `git show --format= --patch` sha256 **402d666835376921fedee5ce1d2c68d388c6d49d570ddfd8ba2ea7e0404d9d87**. `git patch-id --stable` **3a25a97a1bb34ac9e5a96d0d3a3047848bb64da0**. 14 files, +777/-21.

## What shipped on the branch

Spec first: `docs/p1-26/SPEC-P1-26-OFFLINE.md` (sha256 **a81bd984b288e8ee8365b34ceb63eb1c08209eb1565157b0e7d889fed2c92802**).

- Flag `VITE_P1_26_OFFLINE_CACHE`: only the exact string `on` enables. Default off.
- Service worker `/app/sw.js` (sha256 **08a668b5f37ccda094be38a3395762f4c83ffcb5103a02d87c88b087772db686**): Cache Storage for the app shell (`romrx-p1-26-shell-v1`, HTML network-first, hashed `/app/assets/*` cache-first) and same-origin `/videos/*` (`romrx-p1-26-media-v1`, cache-first, LRU cap 24). Versioned; old `romrx-p1-26-*` names are dropped on activate.
- Never intercepts or caches: non-GET, `Authorization` headers, `*.supabase.co`, `/auth|/rest|/functions|/storage|/realtime/v*`, or `access_token` query params. No API user data is stored in Cache Storage, beyond the live save-as-you-go draft mirror that already exists (`romrx.assessment_draft.v1.<userId>`). Draft rules are unchanged.
- Offline signed-in `submit-assessment` queues in IndexedDB (`romrx-p1-26-offline`) and replays on reconnect with a fresh access token. No bearer is stored. HTTP errors are not queued. Lead `submit-lead-assessment` is not queued. The outro is not shown until the request succeeds.
- Rollback: flag off (or unset) and rebuild. On boot, `startOfflineCache()` unregisters `/app/sw.js` and deletes these caches. See `docs/p1-26/ROLLBACK.md`.

## Tests and build

- `vitest run`: **1267 passed, 5 skipped** (84 files). 14 new tests (flag, bypass/allow rules, sw.js sync, register/kill switch, queue/flush).
- `tsc -b && vite build`: pass. `dist/sw.js` is emitted; dist is not committed.

## Rollback

Flag off + rebuild. The app unregisters the worker and deletes `romrx-p1-26-*` caches. No database or edge rollback. Queued submits are not replayed while the flag is off.

## Client-file overlap (Jules's area)

Touched: `app/src/pages/Assessment.tsx`, `app/src/pages/QuickCheck.tsx`, `app/src/main.tsx`, plus new `app/src/lib/offlineCache*.ts`, `offlineSubmitQueue.ts`, `app/public/sw.js`, `app/src/vite-env.d.ts`, and `docs/p1-26/*`.

Overlap not edited: `AssessmentMeasureScreen.tsx`, `AssessmentPhases.tsx`, `assessmentSteps.ts`, `StepVideo.tsx`, `GuidedPlayer.tsx`, `MyProtocol.tsx`, `assessmentDraft.ts`, `assessmentDraftStore.ts`, `assessmentDraftCopy.ts`, `stepVideo.ts`, `pushSubscribe.ts` (uses `serviceWorker.ready`; this worker is the one later P1-14 push should join), `App.tsx`.

No agent was messaged. Coordination is left to Grant.
