#!/usr/bin/env bash
# Export the rescore backup tables (and, with "live", the live rows) to local CSV files. READ ONLY (\copy ... TO).
# Usage at ship time: SUPABASE_DB_URL=... scripts/rescore_backup_export_20261021.sh [backup|live] [out_dir]
#   backup = public.rescore_backup_20261021_* (after the migration);  live = public.assessments / joint_scores / protocols
#   (run "live" BEFORE the migration and again after, for a before/after file trail). Never prints row data.
set -euo pipefail
: "${SUPABASE_DB_URL:?set SUPABASE_DB_URL (connection string; never echo it)}"
mode="${1:-backup}"; out="${2:-./rescore-export-$(date +%Y%m%d-%H%M%S)-$mode}"
mkdir -p "$out"; chmod 700 "$out"
for t in assessments joint_scores protocols; do
  if [ "$mode" = backup ]; then src="public.rescore_backup_20261021_$t"; else src="public.$t"; fi
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q -c "\\copy (SELECT * FROM $src ORDER BY 1) TO '$out/$t.csv' WITH CSV HEADER"
  echo "$t: $(($(wc -l < "$out/$t.csv") - 1)) rows, sha256 $(sha256sum "$out/$t.csv" | cut -c1-16)"
done
echo "exported to $out (contains personal data: keep local, do not share)"
