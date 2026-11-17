# P1-26 rollback

BUILD ONLY. Flag defaults off, so live behavior does not change until a later gate turns `VITE_P1_26_OFFLINE_CACHE=on` and rebuilds.

To roll back after the flag has been on:

1. Remove `VITE_P1_26_OFFLINE_CACHE` or set it to anything other than `on`.
2. Rebuild and publish the Base web app as usual (not from this item).
3. On load, `startOfflineCache()` sees the flag off, unregisters `/app/sw.js`, and deletes the `romrx-p1-26-shell-v1` and `romrx-p1-26-media-v1` caches (and any older `romrx-p1-26-*` names).
4. Queued offline submits are not replayed while the flag is off. They stay in IndexedDB (`romrx-p1-26-offline`) until the flag is on again or the member clears site data.

No service worker remains registered for this feature after step 3. No database or edge-function rollback is needed; this item is client-only.
