#!/usr/bin/env bash
#
# Capture Opsdash fixtures from a running Nextcloud instance (for local/CI snapshots).
# Output files land in tools/fixtures/ by default.
#
# Usage:
#   BASE=http://localhost:8088 ADMIN_USER=admin ADMIN_PASS=admin \
#     bash tools/capture_opsdash_fixtures.sh
#
# Optional env:
#   OUT_DIR=tools/fixtures
#   RANGE=week|month (defaults: captures both)

set -euo pipefail

BASE=${BASE:-http://localhost:8080}
ADMIN_USER=${ADMIN_USER:-admin}
ADMIN_PASS=${ADMIN_PASS:-admin}
OUT_DIR=${OUT_DIR:-tools/fixtures}

mkdir -p "$OUT_DIR"

fetch_json() {
  local url=$1
  curl -sS -u "${ADMIN_USER}:${ADMIN_PASS}" \
    -H 'OCS-APIREQUEST: true' \
    "$url"
}

echo "[capture] writing to ${OUT_DIR}"

echo "[capture] /overview/load week"
fetch_json "${BASE%/}/index.php/apps/opsdash/overview/load?range=week&offset=0" >"${OUT_DIR%/}/load-week.json"

echo "[capture] /overview/load month"
fetch_json "${BASE%/}/index.php/apps/opsdash/overview/load?range=month&offset=0" >"${OUT_DIR%/}/load-month.json"

echo "[capture] Deck boards (ocs)"
fetch_json "${BASE%/}/ocs/v2.php/apps/deck/api/v1/boards?details=1" >"${OUT_DIR%/}/deck-boards.json"

echo "[capture] done"
