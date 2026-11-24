#!/usr/bin/env bash
# Mutants for daily-queue-check.sql; each must make drain.test.mjs (D11a-c) fail. Env: PGLITE_PATH. Run from repo root.

S=scripts/p1-25-storage-drain/daily-queue-check.sql; k=0; t=0
m(){ t=$((t+1)); f=/tmp/p125-sqlmut-$t.sql; python3 -c 'import sys;s=open(sys.argv[1]).read();assert sys.argv[3] in s;open(sys.argv[2],"w").write(s.replace(sys.argv[3],sys.argv[4],1))' $S $f "$2" "$3" || exit 3
 if P1_25_CHECK_SQL=$f P1_25_QUIET=1 node scripts/p1-25-storage-drain/drain.test.mjs >/tmp/p125-sqlmut-$t.out 2>&1; then echo "SURVIVED $1"; else echo "KILLED $1 <- $(grep '^FAIL' /tmp/p125-sqlmut-$t.out | cut -c1-40 | tr '\n' ';')"; k=$((k+1)); fi; rm -f $f; }
m "MS1 threshold 48h" "interval '24 hours'" "interval '48 hours'"
m "MS2 escalate uses newest row (max)" "coalesce(min(queued_at) <" "coalesce(max(queued_at) <"
m "MS3 escalation never fires" "coalesce(min(queued_at) < now() - interval '24 hours', false)" "false"
echo "$k/$t KILLED"
[ "$k" = "$t" ]
