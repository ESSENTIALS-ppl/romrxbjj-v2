#!/usr/bin/env bash
# Read-only verification + build of Jules's base fixes tag on 50b92ee3. Usage: ./verify_cut_basefixes-v1.sh <tag> <tip> <dist-sha256>
set -euo pipefail
TAG="$1"; WANT_TIP="$2"; WANT="$3"; REPO=/workspace/p1-wt; BASE=50b92ee37947465108be143ffd82512985cdfade
HERE="$(cd "$(dirname "$0")" && pwd)"; OUT="$HERE/verify"; mkdir -p "$OUT"
git -C $REPO fetch -q origin "refs/tags/$TAG:refs/tags/$TAG" 2>/dev/null || true
git -C $REPO ls-remote origin "refs/tags/$TAG" "refs/tags/$TAG^{}" | tee "$OUT/01-tag.txt"
TIP=$(git -C $REPO ls-remote origin "refs/tags/$TAG^{}" | cut -f1)
[ "$TIP" = "$WANT_TIP" ] && echo "remote tag -> $TIP = expected tip: OK" | tee -a "$OUT/01-tag.txt" || { echo "FAIL tip $TIP" | tee -a "$OUT/01-tag.txt"; exit 1; }
[ "$(git -C $REPO rev-parse "$TAG^{commit}")" = "$TIP" ] && echo "local tag agrees: OK" | tee -a "$OUT/01-tag.txt"
git -C $REPO merge-base --is-ancestor $BASE $TIP && echo "50b92ee3 is an ancestor: OK" | tee -a "$OUT/01-tag.txt"
git -C $REPO log --format='%H %s' $BASE..$TIP | cut -c1-150 | tee "$OUT/02-commits.txt"
git -C $REPO diff --name-status $BASE $TIP | tee "$OUT/03-files-vs-50b92ee3.txt"
ALLOWED='(app/index\.html|app/src/index\.css|app/src/hooks/useFitToViewport\.ts|app/src/lib/__fixtures__/baseLibrary-20261124\.json|app/src/lib/sessionLength(\.test)?\.ts|app/src/pages/MyProtocol\.tsx|app/src/pages/ROMBot\.tsx|app/src/pages/protocolLengthTiers\.test\.ts|app/src/pages/rombotLayout\.test\.tsx)$'
if cut -f2- "$OUT/03-files-vs-50b92ee3.txt" | tr '\t' '\n' | grep -Ev "^$ALLOWED"; then echo "FAIL: files outside tiers/ROMBot layout (above)"; exit 1; fi
echo "files: tiers + ROMBot layout only: OK" | tee -a "$OUT/03-files-vs-50b92ee3.txt"
{ for f in app/public/sw.js sw.js app/src/lib/pushSubscribe.ts app/src/lib/pushCopy.ts app/src/pages/Settings.tsx app/src/components/ReminderOptIn.tsx; do
  if git -C $REPO cat-file -e "$TIP:$f" 2>/dev/null; then git -C $REPO diff --quiet $BASE $TIP -- "$f" && echo "unchanged: $f $(git -C $REPO rev-parse $TIP:$f | cut -c1-12)" || { echo "FAIL changed: $f"; exit 1; }; else echo "absent at tip: $f"; fi; done
  P=$(git -C $REPO diff --name-only $BASE $TIP | grep -Ei 'bjj|bodybuild|/bb|pack|coach|athlete' || true); [ -z "$P" ] && echo "pack paths touched: 0" || { echo "FAIL pack: $P"; exit 1; }
  git -C $REPO diff $BASE $TIP | grep -E '^\+' | grep -Eo '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}' | sort -u | sed 's/^/email in diff: /' || echo "emails added in diff: 0"
} | tee "$OUT/04-scope.txt"
B="$OUT/build"; rm -rf "$B"; mkdir -p "$B"; git -C $REPO archive $TIP | tar -x -C "$B"
( cd "$B" && COMMIT_REF=$TIP NETLIFY_SITE_ID=d9bc6384-fc26-44fb-a51d-32aa8f28dd7b netlify build --context production > "$OUT/06-build.log" 2>&1; echo "EXIT $?" >> "$OUT/06-build.log" )
tail -1 "$OUT/06-build.log"
( cd "$B" && find . -type f -not -path '*/node_modules/*' -not -path './.netlify/*' | LC_ALL=C sort | xargs -d '\n' sha256sum ) > "$OUT/07-dist-manifest.txt"
D=$(sha256sum "$OUT/07-dist-manifest.txt" | cut -c1-64); N=$(wc -l < "$OUT/07-dist-manifest.txt")
echo "dist $D ($N files); Jules $WANT: $([ "$D" = "$WANT" ] && echo MATCH || echo MISMATCH)" | tee "$OUT/08-dist.txt"
[ "$D" = "$WANT" ] || exit 1
