# P1-26 BUILD-NOTES — offline assessment and media caching (BUILD ONLY)

Started and finished: Mon Nov 16, 2026, evening ET (America/New_York). Spec first, then the build. Flag defaults off. Nothing deployed.

Branch: romrx-io-web `feat/p1-26-offline-cache-20261116` off `8bf3d601674fe9bd6ff2252e71409d29a71df662`.

## Hunks (every changed path)

### New

1. `docs/p1-26/SPEC-P1-26-OFFLINE.md` — spec (written first).
2. `docs/p1-26/ROLLBACK.md` — unregister the worker and flag off.
3. `docs/p1-26/BUILD-NOTES.md` — this file.
4. `app/public/sw.js` — service worker (shell + `/videos/*`). Not registered unless the flag is on.
5. `app/src/lib/offlineCachePolicy.ts` — flag (`=== 'on'` only), cache names, bypass rules.
6. `app/src/lib/offlineCachePolicy.test.ts`
7. `app/src/lib/offlineSubmitQueue.ts` — IndexedDB/memory queue, no bearer stored, replay with a fresh token.
8. `app/src/lib/offlineSubmitQueue.test.ts`
9. `app/src/lib/offlineCache.ts` — register when on; unregister + delete our caches when off.
10. `app/src/lib/offlineCache.test.ts`

### Edited

11. `app/src/main.tsx` — `startOfflineCache()` on boot (no-op / kill switch when the flag is off).
12. `app/src/vite-env.d.ts` — `VITE_P1_26_OFFLINE_CACHE?: string`.
13. `app/src/pages/Assessment.tsx` — signed-in submit goes through `postSubmitAssessment` (queue only when the flag is on and the network is down). Lead path unchanged.
14. `app/src/pages/QuickCheck.tsx` — same signed-in helper. Success and HTTP-error outcomes unchanged.

No other paths. No Netlify header change, no CSP change, no edge or database change, no flag turned on.

## Jules overlap (client files)

Touched in Jules's area: `app/src/pages/Assessment.tsx`, `app/src/pages/QuickCheck.tsx`, and the boot file `app/src/main.tsx`.

Overlap not edited: `app/src/pages/AssessmentMeasureScreen.tsx`, `app/src/pages/AssessmentPhases.tsx`, `app/src/pages/assessmentSteps.ts`, `app/src/components/StepVideo.tsx`, `app/src/components/GuidedPlayer.tsx`, `app/src/pages/MyProtocol.tsx`, `app/src/lib/assessmentDraft.ts`, `app/src/lib/assessmentDraftStore.ts`, `app/src/lib/assessmentDraftCopy.ts`, `app/src/lib/stepVideo.ts`, `app/src/lib/pushSubscribe.ts` (uses `serviceWorker.ready`; this worker is the one later P1-14 push should join), `app/src/App.tsx`.

Not messaged. Coordination is left to Grant.
