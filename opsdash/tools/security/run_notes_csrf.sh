#!/usr/bin/env bash
set -euo pipefail

BASE=${OPSDASH_BASE:-http://localhost:8088}
APP_PATH=${OPSDASH_APP_PATH:-/index.php/apps/opsdash}
NOTES_URL="$BASE$APP_PATH/overview/notes"
OVERVIEW_URL="$BASE$APP_PATH/overview"

USER=${OPSDASH_USER:-admin}
PASS=${OPSDASH_PASS:-admin}

echo "[notes-csrf] Using basic auth for API calls"
AUTH=(curl -s -u "$USER:$PASS" -H 'OCS-APIREQUEST: true')

TOKEN=$("${AUTH[@]}" "$OVERVIEW_URL" | sed -n 's/.*data-requesttoken="\([^"]*\)".*/\1/p' | head -n1)
if [ -z "$TOKEN" ]; then
  echo "Failed to extract requesttoken from overview HTML" >&2
  exit 1
fi

echo "[notes-csrf] Token: ${TOKEN:0:8}..."
PAYLOAD='{"range":"week","offset":0,"content":"Automation note via CSRF script"}'

"${AUTH[@]}" -H 'Content-Type: application/json' -H "requesttoken: $TOKEN" \
  -X POST "$NOTES_URL" --data "$PAYLOAD" | jq '.ok'

"${AUTH[@]}" -H "requesttoken: $TOKEN" \
  "$NOTES_URL?range=week&offset=0" | jq '.notes.current'
