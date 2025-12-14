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
#   OUT_DIR=test/fixtures
#   RANGE=week|month (defaults: captures both)
#   OFFSETS="-4 -3 -2 -1 0 1 2 3 4" (defaults: -4..4)
#   REQUESTTOKEN="<token>" (optional; only needed for endpoints requiring CSRF)

set -euo pipefail

BASE=${BASE:-http://localhost:8080}
ADMIN_USER=${ADMIN_USER:-admin}
ADMIN_PASS=${ADMIN_PASS:-admin}
OUT_DIR=${OUT_DIR:-test/fixtures}
RANGE=${RANGE:-all}
OFFSETS=${OFFSETS:-"-4 -3 -2 -1 0 1 2 3 4"}
REQUESTTOKEN=${REQUESTTOKEN:-}

mkdir -p "$OUT_DIR"

fetch_json() {
  local url=$1
  local args=()
  args+=(-sS -u "${ADMIN_USER}:${ADMIN_PASS}")
  args+=(-H 'OCS-APIREQUEST: true')
  if [[ -n "${REQUESTTOKEN}" ]]; then
    args+=(-H "requesttoken: ${REQUESTTOKEN}")
  fi
  curl "${args[@]}" "$url"
}

echo "[capture] writing to ${OUT_DIR}"

capture_load() {
  local range=$1
  local offset=$2
  local out
  if [[ "${offset}" == "0" ]]; then
    out="load-${range}.json"
  else
    out="load-${range}-offset${offset}.json"
  fi
  echo "[capture] /overview/load ${range} offset=${offset} -> ${out}"
  fetch_json "${BASE%/}/index.php/apps/opsdash/overview/load?range=${range}&offset=${offset}" >"${OUT_DIR%/}/${out}"
}

if [[ "${RANGE}" == "all" || "${RANGE}" == "week" ]]; then
  for off in ${OFFSETS}; do
    capture_load "week" "${off}"
  done
fi

if [[ "${RANGE}" == "all" || "${RANGE}" == "month" ]]; then
  for off in ${OFFSETS}; do
    capture_load "month" "${off}"
  done
fi

echo "[capture] Deck boards (ocs)"
fetch_json "${BASE%/}/ocs/v2.php/apps/deck/api/v1/boards?details=1" >"${OUT_DIR%/}/deck-boards.json"

echo "[capture] done"
