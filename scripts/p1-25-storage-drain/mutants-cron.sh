#!/usr/bin/env bash
# Mutants for the optional drain cron command; each must make cron-cmd.test.mjs fail. Env: PGLITE_PATH.
set -u
F=supabase/migrations-unapplied/20261124120000_p1_25_storage_drain_cron.sql; k=0; t=0
m(){ t=$((t+1)); python3 -c 'import sys;s=open(sys.argv[1]).read();assert sys.argv[2] in s;open("/tmp/p125-cronmut.sql","w").write(s.replace(sys.argv[2],sys.argv[3],1))' "$F" "$2" "$3" || exit 3
 if P1_25_CRON_SQL=/tmp/p125-cronmut.sql node scripts/p1-25-storage-drain/cron-cmd.test.mjs >/tmp/p125-cronmut.out 2>&1; then echo "SURVIVED $1"; else echo "KILLED $1 <- $(grep ^FAIL /tmp/p125-cronmut.out | cut -c6-40 | tr '\n' ';')"; k=$((k+1)); fi; }
m "MC1 empty-queue guard removed" " where exists (select 1 from public.p1_25_storage_delete_queue)" ""
m "MC2 guard inverted" "where exists" "where not exists"
m "MC3 schedule collides with job 14" "  '53 4 * * *'," "  '23 4 * * *',"
m "MC4 default 5 s timeout" "120000)" "5000)"
rm -f /tmp/p125-cronmut.sql /tmp/p125-cronmut.out
echo "$k/$t KILLED"; [ "$k" = "$t" ]
