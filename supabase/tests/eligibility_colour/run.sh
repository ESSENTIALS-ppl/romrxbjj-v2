#!/usr/bin/env bash
# Local Postgres only. Usage: run.sh <function-def-file> [migration...]
set -euo pipefail
P="psql -X -q -v ON_ERROR_STOP=1 -h ${PGHOST:-/tmp} -p ${PGPORT:-55432} -U postgres"
D=$(dirname "$0"); def=$1; shift
$P -f "$D/fixture.sql" >/dev/null
$P -f "$def" >/dev/null
for m in "$@"; do $P -f "$m" >/dev/null; done
$P -f "$D/assert.sql"
