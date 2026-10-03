#!/usr/bin/env bash
# flag-fixture.sh <email>
# Marks an EXISTING fixture account as a test fixture (auth.users app_metadata.test_fixture=true) after signup.
# Required since 2026-10-02: public.is_test_account(email) is true only when the email matches
#   ^jim\+romrx-[a-z0-9._-]+@romrx\.io$  AND the account carries this flag. Without the flag the account
# is treated as a normal customer (live checkout only, no test-mode path).
#
# Usage:   bash scripts/flag-fixture.sh jim+romrx-reid-r7@romrx.io
# Needs:   SUPABASE_SERVICE_ROLE_KEY in your environment (service role only, never commit or paste it).
#          SUPABASE_URL optional (defaults to the ROMRx project).
# No key?  The script prints the one-line SQL; run it with the Supabase MCP execute_sql tool or ask Jim's agent.
# Safe:    the SQL helper refuses any email that does not match the fixture pattern, and returns the number
#          of rows flagged (must be 1).
set -euo pipefail
email="${1:-}"
[ -n "$email" ] || { echo "usage: $0 <email>" >&2; exit 2; }
shopt -s nocasematch
[[ "$email" =~ ^jim\+romrx-[a-z0-9._-]+@romrx\.io$ ]] || { echo "refusing: '$email' is not a jim+romrx-*@romrx.io fixture address" >&2; exit 3; }
shopt -u nocasematch
sql="select public.flag_test_fixture('${email}');"
if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "SUPABASE_SERVICE_ROLE_KEY not set. Run this SQL instead (Supabase MCP execute_sql, project cqzvqzwwevnflinxgnpp):" >&2
  echo "$sql"
  exit 4
fi
url="${SUPABASE_URL:-https://cqzvqzwwevnflinxgnpp.supabase.co}"
n=$(curl -sS -X POST "$url/rest/v1/rpc/flag_test_fixture" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" -d "{\"p_email\":\"${email}\"}")
if [ "$n" = "1" ]; then echo "flagged 1 account: $email"; else echo "unexpected result: $n (expected 1; did the account sign up yet?)" >&2; exit 5; fi
