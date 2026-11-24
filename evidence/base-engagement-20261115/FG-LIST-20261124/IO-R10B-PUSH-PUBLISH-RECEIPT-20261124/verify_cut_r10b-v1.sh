#!/usr/bin/env bash
# Read-only verification of Jules's r10b push cut on the live FG-08 base 113f1d45. Usage: ./verify_cut_r10b-v1.sh <tag> <dist-sha256>
set -euo pipefail
TAG="$1"; WANT="$2"; REPO=/workspace/p1-wt; BASE=113f1d45a1fd9a1ac2981a9cd60d485276c67fbc
HERE="$(cd "$(dirname "$0")" && pwd)"; CHECK="$HERE/../IO-FG08-PUBLISH-PREP-20261124/check/mybody_check.mjs"; OUT="$HERE/verify"; mkdir -p "$OUT"
git -C $REPO fetch -q origin "refs/tags/$TAG:refs/tags/$TAG" 2>/dev/null || true
git -C $REPO fetch -q origin feat/r10b-on-fg08-live-v3-20261124 2>/dev/null || true
TIP=$(git -C $REPO rev-parse "$TAG^{commit}"); echo "tag $TAG object $(git -C $REPO rev-parse "$TAG") -> commit $TIP" | tee "$OUT/01-tag.txt"
git -C $REPO merge-base --is-ancestor $BASE $TIP && echo "113f1d45 (live 6b0621ca) is an ancestor: OK" | tee -a "$OUT/01-tag.txt"
git -C $REPO log --format='%H %s' $BASE..$TIP | cut -c1-150 | tee "$OUT/02-commits.txt"
git -C $REPO diff --name-status $BASE $TIP | tee "$OUT/03-files-vs-live.txt"
ALLOWED='(app/src/lib/(pushCopy|pushSubscribe)\.ts|app/src/lib/pushSubscribe\.test\.tsx?|app/src/pages/Settings(\.pushFlag\.test)?\.tsx|app/public/sw\.js|[A-Za-z/]*swPush\.test\.ts|[A-Za-z/]*p1ReminderOptIn\.test\.ts|legal\.html|[A-Za-z/]*legalPushParagraph\.test\.ts)$'
if cut -f2- "$OUT/03-files-vs-live.txt" | tr '\t' '\n' | grep -Ev "^$ALLOWED"; then echo "FAIL: files outside r10b (above)"; exit 1; fi
echo "files vs live: r10b push files only: OK" | tee -a "$OUT/03-files-vs-live.txt"
for f in app/src/components/MyBodyProgress.tsx app/src/components/MyBodyProgress.test.tsx app/src/lib/assessmentReads.ts app/src/lib/fg08MyBodyProgress.test.ts app/src/lib/jointHistory.ts app/src/lib/mobilityBands.ts app/src/pages/MyBody.fg08.test.tsx app/src/pages/MyBody.tsx; do
  git -C $REPO diff --quiet $BASE $TIP -- "$f" && echo "FG-08 unchanged: $f" || { echo "FAIL FG-08 changed: $f"; exit 1; }; done | tee "$OUT/04-fg08-intact.txt"
git -C $REPO show "$TIP:app/src/pages/Settings.tsx" | grep -n "const SHOW_PUSH" | tee -a "$OUT/04-fg08-intact.txt"
node "$CHECK" "$TIP" $REPO > "$OUT/05-mybody-check.txt" 2>&1 && tail -1 "$OUT/05-mybody-check.txt"
B="$OUT/build"; rm -rf "$B"; mkdir -p "$B"; git -C $REPO archive $TIP | tar -x -C "$B"
( cd "$B" && COMMIT_REF=$TIP NETLIFY_SITE_ID=d9bc6384-fc26-44fb-a51d-32aa8f28dd7b netlify build --context production > "$OUT/06-build.log" 2>&1; echo "EXIT $?" >> "$OUT/06-build.log" )
tail -1 "$OUT/06-build.log"
( cd "$B" && find . -type f -not -path '*/node_modules/*' -not -path './.netlify/*' | LC_ALL=C sort | xargs -d '\n' sha256sum ) > "$OUT/07-dist-manifest.txt"
D=$(sha256sum "$OUT/07-dist-manifest.txt" | cut -c1-64); N=$(wc -l < "$OUT/07-dist-manifest.txt")
echo "dist $D ($N files); Jules $WANT: $([ "$D" = "$WANT" ] && echo MATCH || echo MISMATCH)" | tee "$OUT/08-dist.txt"
[ "$D" = "$WANT" ] || exit 1
