#!/bin/bash
# usage: _stage.sh <sha> <fn>  -> staged/<sha8>-<fn>/ in deploy-file-name layout (same names as the live function files)
set -euo pipefail
R=/workspace/romrxbjj-v2; sha=$1; fn=$2; out=staged/${sha:0:8}-$fn
[ -e "$out" ] && { echo "exists: $out" >&2; exit 1; }
mkdir -p "$out"
put(){ mkdir -p "$out/$(dirname "$2")"; git -C $R show "$sha:$1" > "$out/$2"; }
case $fn in
 unsubscribe|lifecycle-emails)
   for p in $(git -C $R ls-tree -r --name-only $sha supabase/functions/$fn | grep -v -E '\.test\.ts$|/test/'); do put "$p" "${p#supabase/functions/$fn/}"; done;;
 compute-tiers)
   for f in index.ts joint_totals.ts pack_recompute.ts; do put supabase/functions/compute-tiers/$f source/$f; done
   put supabase/functions/_shared/t1_narrow_bands.ts _shared/t1_narrow_bands.ts;;
 submit-assessment)
   for f in index.ts mood_block.ts schedule.ts; do git -C $R cat-file -e $sha:supabase/functions/submit-assessment/$f 2>/dev/null && put supabase/functions/submit-assessment/$f functions/submit-assessment/$f; done
   for f in rate_limit.ts events.ts email_footer.ts capture_methods.ts; do put supabase/functions/_shared/$f functions/_shared/$f; done;;
esac
