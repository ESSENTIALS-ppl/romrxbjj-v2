#!/usr/bin/env bash
# Read-only verification of Jules's FG-08 no-push cut before any publish. Usage: ./verify_cut.sh <tag> <expected-dist-sha256-prefix> [SKIP_BUILD=1]
# Writes OUT=$PWD/verify-<tag-sanitized>/ ; never deploys, never prints secrets.
set -euo pipefail
TAG="$1"; WANT_DIST="$2"; REPO=/workspace/p1-wt; BASE=01954ec4f9e7c512617c4ee97804ac6c7de80343; REF_TREE=b2fb699aec658a10aa0a1d2895ca0977e6f87e28
HERE="$(cd "$(dirname "$0")" && pwd)"; OUT="$HERE/verify-$(echo "$TAG" | tr '/' '_')"; mkdir -p "$OUT"
git -C $REPO fetch -q origin "refs/tags/$TAG:refs/tags/$TAG" 2>/dev/null || echo "note: tag not on origin yet, using local ref"
TIP=$(git -C $REPO rev-parse "$TAG^{commit}"); OBJ=$(git -C $REPO rev-parse "$TAG")
echo "tag $TAG object $OBJ -> commit $TIP" | tee "$OUT/01-tag.txt"
git -C $REPO merge-base --is-ancestor $BASE $TIP && echo "base 01954ec4 is an ancestor: OK" | tee -a "$OUT/01-tag.txt"
git -C $REPO log --format='%H %s' $BASE..$TIP | cut -c1-160 | tee "$OUT/02-commits.txt"
git -C $REPO diff --name-only $BASE $TIP | tee "$OUT/03-files-vs-live.txt"
ALLOWED='^app/src/(components/MyBodyProgress(\.test)?\.tsx|lib/(assessmentReads|jointHistory|mobilityBands)\.ts|lib/fg08MyBodyProgress\.test\.ts|pages/MyBody(\.fg08\.test)?\.tsx)$'
if grep -Ev "$ALLOWED" "$OUT/03-files-vs-live.txt"; then echo "FAIL: files outside the FG-08/chip set (above)"; exit 1; else echo "files vs live: only the 8 FG-08/chip files: OK" | tee -a "$OUT/03-files-vs-live.txt"; fi
for f in app/public/sw.js app/src/lib/pushSubscribe.ts app/src/lib/pushCopy.ts app/src/pages/Settings.tsx legal.html; do
  if git -C $REPO diff --quiet $BASE $TIP -- "$f"; then echo "unchanged vs live: $f"; else echo "FAIL changed: $f"; exit 1; fi
done | tee "$OUT/04-push-files.txt"
git -C $REPO show "$TIP:app/src/pages/Settings.tsx" | grep -n "const SHOW_PUSH" | tee -a "$OUT/04-push-files.txt"
git -C $REPO show "$TIP:app/src/pages/Settings.tsx" | grep -q "const SHOW_PUSH = false" && echo "SHOW_PUSH false: OK" | tee -a "$OUT/04-push-files.txt"
TREE=$(git -C $REPO rev-parse "$TIP^{tree}"); echo "tree $TREE; Avery reference cherry-pick tree $REF_TREE: $([ "$TREE" = "$REF_TREE" ] && echo IDENTICAL || echo DIFFERENT)" | tee "$OUT/05-tree.txt"
[ "$TREE" = "$REF_TREE" ] || git -C $REPO diff --stat $REF_TREE $TREE | tee -a "$OUT/05-tree.txt"
node "$HERE/check/mybody_check.mjs" "$TIP" $REPO > "$OUT/06-mybody-check.txt" 2>&1 && tail -1 "$OUT/06-mybody-check.txt"
[ "${SKIP_BUILD:-0}" = 1 ] && { echo "SKIP_BUILD=1: stopping before the local build"; exit 0; }
# Local production build exactly like the live 01954ec4 build (git archive, COMMIT_REF = tip, live site env).
B="$OUT/build"; rm -rf "$B"; mkdir -p "$B"; git -C $REPO archive $TIP | tar -x -C "$B"
( cd "$B" && COMMIT_REF=$TIP NETLIFY_SITE_ID=d9bc6384-fc26-44fb-a51d-32aa8f28dd7b netlify build --context production > "$OUT/07-build.log" 2>&1; echo "EXIT $?" >> "$OUT/07-build.log" )
tail -1 "$OUT/07-build.log"
( cd "$B" && find . -type f -not -path '*/node_modules/*' -not -path './.netlify/*' | LC_ALL=C sort | xargs -d '\n' sha256sum ) > "$OUT/08-dist-manifest.txt"
D=$(sha256sum "$OUT/08-dist-manifest.txt" | cut -c1-64); N=$(wc -l < "$OUT/08-dist-manifest.txt")
echo "dist $D ($N files); Jules $WANT_DIST: $([[ $D == $WANT_DIST* ]] && echo MATCH || echo MISMATCH)" | tee "$OUT/09-dist.txt"
# Built bundle: push-client markers must equal the LIVE 01954ec4 bundle (read 6:43 PM ET from romrx.io/app/assets/index-BP9LXJi1.js):
# requestPermission 2, save-push-subscription 0, pushManager.subscribe 0, "Push notifications" 0.
JS=$(ls "$B"/app/dist/assets/index-*.js); declare -A LIVE=([requestPermission]=2 [save-push-subscription]=0 [pushManager.subscribe]=0 ["Push notifications"]=0); BAD=0
for s in requestPermission save-push-subscription pushManager.subscribe "Push notifications"; do n=$(cat $JS | grep -oF "$s" | wc -l); echo "$s: built $n live ${LIVE[$s]}"; [ "$n" = "${LIVE[$s]}" ] || BAD=1; done | tee "$OUT/10-push-markers.txt"
grep -q "built [1-9].* live 0\|FAIL" "$OUT/10-push-markers.txt" && { echo "FAIL: push markers differ from live"; exit 1; } || echo "push markers equal live: OK" | tee -a "$OUT/10-push-markers.txt"
