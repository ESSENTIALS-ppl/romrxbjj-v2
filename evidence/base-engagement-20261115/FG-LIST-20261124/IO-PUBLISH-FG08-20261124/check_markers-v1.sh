#!/usr/bin/env bash
# Step 10 of verify_cut.sh, fixed: grep with no match exits 1 and pipefail stopped the loop after the first marker.
# Adds Notification.requestPermission and DeviceOrientationEvent.requestPermission (Jules: both requestPermission hits are ROMeter).
set -uo pipefail
B="$1"; JS=$(ls "$B"/app/dist/assets/index-*.js); LIVEJS="$2"; BAD=0
for s in requestPermission Notification.requestPermission DeviceOrientationEvent.requestPermission save-push-subscription pushManager.subscribe "Push notifications" serviceWorker.register; do
  n=$( { grep -oF "$s" $JS || true; } | wc -l); l=$( { grep -oF "$s" "$LIVEJS" || true; } | wc -l)
  echo "$s: built $n live $l"; [ "$n" = "$l" ] || BAD=1
done
[ $BAD = 0 ] && echo "push markers equal live: OK" || { echo "FAIL: push markers differ from live"; exit 1; }
