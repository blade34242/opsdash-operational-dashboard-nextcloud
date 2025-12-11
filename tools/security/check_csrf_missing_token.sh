#!/usr/bin/env bash
set -euo pipefail

# Probes whether /overview/notes accepts POSTs that lack the Nextcloud requesttoken
# header, even when the OCS-APIREQUEST header is present.
#
# Usage:
#   OPSDASH_BASE=http://localhost:8088/index.php/apps/opsdash \
#   OPSDASH_USER=admin OPSDASH_PASS=admin \
#   ./tools/security/check_csrf_missing_token.sh

BASE=${OPSDASH_BASE:-http://localhost:8088/index.php/apps/opsdash}
NOTES_URL="$BASE/overview/notes"
USER=${OPSDASH_USER:-admin}
PASS=${OPSDASH_PASS:-admin}
RANGE=${RANGE:-week}
OFFSET=${OFFSET:-0}
NOTE="csrf-probe-$(date +%s)"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1" >&2; exit 2; }; }
need curl

post_body=$(cat <<JSON
{"range":"$RANGE","offset":$OFFSET,"content":"$NOTE"}
JSON
)

echo "[csrf-check] Posting note WITHOUT requesttoken header (user=$USER, range=$RANGE, offset=$OFFSET)"
curl -s -u "$USER:$PASS" -H 'OCS-APIREQUEST: true' -H 'Content-Type: application/json' \
  -X POST "$NOTES_URL" --data "$post_body" >/dev/null

echo "[csrf-check] Fetching notes to see if the payload was stored"
resp=$(curl -s -u "$USER:$PASS" -H 'OCS-APIREQUEST: true' "$NOTES_URL?range=$RANGE&offset=$OFFSET")

if printf '%s' "$resp" | grep -q "$NOTE"; then
  echo "[csrf-check] WARNING: note persisted without requesttoken (likely CSRF gap)"
  echo "[csrf-check] Stored payload fragment: $NOTE"
  exit 1
else
  echo "[csrf-check] OK: note not stored without requesttoken"
fi
