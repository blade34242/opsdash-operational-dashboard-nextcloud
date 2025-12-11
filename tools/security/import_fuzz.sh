#!/usr/bin/env bash
set -euo pipefail

BASE=${OPSDASH_BASE:-http://localhost:8088/index.php/apps/opsdash}
PERSIST_URL="$BASE/overview/persist"
USER=${OPSDASH_USER:-admin}
PASS=${OPSDASH_PASS:-admin}
AUTH="$USER:$PASS"
TOKEN=${OPSDASH_TOKEN:-}
OVERVIEW_URL="$BASE/overview"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOKEN_HELPER="$SCRIPT_DIR/_token.sh"
if [[ ! -f "$TOKEN_HELPER" ]]; then
  TOKEN_HELPER="$SCRIPT_DIR/../../opsdash/tools/security/_token.sh"
fi
. "$TOKEN_HELPER"

ENVELOPE=$(cat <<'JSON'
{
  "version": 1,
  "generated": "2025-11-10T00:00:00Z",
  "payload": {
    "cals": ["personal", "missing-cal"],
    "groups": {"personal": 3},
    "targets_week": {"personal": 12},
    "targets_month": {"personal": 48},
    "targets_config": {
      "totalHours": 12,
      "categories": [
        {"id": "focus", "label": "Focus", "targetHours": 10, "includeWeekend": false}
      ]
    },
    "theme_preference": "dark",
    "evilKey": "<img src=x onerror=alert(1)>"
  }
}
JSON
)

PAYLOAD=$(printf '%s' "$ENVELOPE" | jq '.payload')

if [[ -z "$TOKEN" ]]; then
  TOKEN=$(fetch_requesttoken "$BASE" "$USER" "$PASS" || true)
fi

curl -s -u "$AUTH" -H 'OCS-APIREQUEST: true' -H "requesttoken: $TOKEN" -H 'Content-Type: application/json' \
  -X POST "$PERSIST_URL" --data "$PAYLOAD" | jq '{warnings, theme_preference_read, targets_week_read}'
