#!/usr/bin/env bash
set -euo pipefail

BASE=${OPSDASH_BASE:-http://localhost:8088/index.php/apps/opsdash}
PRESETS_URL="$BASE/overview/presets"
USER=${OPSDASH_USER:-admin}
PASS=${OPSDASH_PASS:-admin}
AUTH=(curl -s -u "$USER:$PASS" -H 'OCS-APIREQUEST: true')

PAYLOAD=$(cat <<'JSON'
{
  "name": "QA<script>",
  "selected": ["personal", "missing-cal"],
  "groups": {"personal": 3},
  "targets_week": {"personal": 7},
  "targets_month": {"personal": 30},
  "targets_config": {
    "totalHours": 40,
    "categories": [
      {"id": "focus", "label": "Focus", "targetHours": 20, "includeWeekend": false},
      {"id": "ops", "label": "Ops &<br>", "targetHours": 10, "includeWeekend": true}
    ]
  }
}
JSON
)

RESP=$("${AUTH[@]}" -H 'Content-Type: application/json' -X POST "$PRESETS_URL" --data "$PAYLOAD")
NAME=$(echo "$RESP" | jq -r '.preset.name')
WARNINGS=$(echo "$RESP" | jq '.warnings')

echo "Saved preset as: $NAME"
echo "Warnings: $WARNINGS"

LOAD=$("${AUTH[@]}" "$PRESETS_URL/$NAME")
echo "Loaded preset summary:"
echo "$LOAD" | jq '{preset: {name: .preset.name, selected: .preset.selected, warnings: .warnings}}'

"${AUTH[@]}" -X DELETE "$PRESETS_URL/$NAME" | jq '.ok'
