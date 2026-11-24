#!/usr/bin/env bash
# Option B gate mutants: each one-place edit of a temp copy of index.ts must make index.test.ts fail.
# Run from the repo root: bash supabase/functions/p1-25-storage-drain/mutants-b.sh
set -u
D=supabase/functions/p1-25-storage-drain
killed=0; total=0
run() { # name, python-replace-from, to
  total=$((total+1)); local f="$D/.mut-$total.ts"
  python3 -c 'import sys;s=open(sys.argv[1]).read();a,b=sys.argv[3],sys.argv[4];assert a in s,"anchor";open(sys.argv[2],"w").write(s.replace(a,b,1))' "$D/index.ts" "$f" "$2" "$3" || { echo "BAD-MUTANT $1"; rm -f "$f"; exit 3; }
  if P1_25_B_INDEX="./.mut-$total.ts" deno test --allow-env --allow-read "$D/index.test.ts" >/dev/null 2>&1; then echo "SURVIVED $1"; else echo "KILLED $1"; killed=$((killed+1)); fi
  rm -f "$f"
}
run "MB1 short/empty secret not rejected" '  if (got.length < 32) return false;' '  // length check removed'
run "MB2 RPC answer ignored (any 200 passes)" 'return r.ok && (await r.json()) === true;' 'return r.ok;'
run "MB3 RPC error fails open" '  } catch (_e) {
    return false;' '  } catch (_e) {
    return true;'
run "MB4 gate result ignored" 'if (!(await cronCallerOk(req)))' 'if (!(await cronCallerOk(req)) && false)'
run "MB5 GET allowed" 'if (req.method !== "POST")' 'if (false)'
echo "$killed/$total KILLED"
[ "$killed" = "$total" ]
