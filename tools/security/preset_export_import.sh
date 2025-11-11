#!/usr/bin/env bash
set -euo pipefail

BASE=${OPSDASH_BASE:-http://localhost:8088/index.php/apps/opsdash}
PRESETS_URL="$BASE/overview/presets"
PERSIST_URL="$BASE/overview/persist"
USER=${OPSDASH_USER:-admin}
PASS=${OPSDASH_PASS:-admin}
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1" >&2; exit 1; }; }
need jq
need curl

export_preset() {
  curl -s -u "$USER:$PASS" -H 'OCS-APIREQUEST: true' "$PRESETS_URL" | jq -r '.presets[0].name'
}

load_preset() {
  local name=$1
  curl -s -u "$USER:$PASS" -H 'OCS-APIREQUEST: true' "$PRESETS_URL/${name}"
}

selected=$(export_preset)
if [[ -z "$selected" || "$selected" == "null" ]]; then
  echo "No presets available to export" >&2
  exit 1
fi

echo "[preset-export] exporting $selected"
load_preset "$selected" > "$TMP"

theme=$(jq -r '.preset.themePreference // "auto"' "$TMP")
body=$(jq '.preset | { selected, groups, targets_week, targets_month, targets_config, theme_preference: (.themePreference // "auto") }' "$TMP")

echo "[preset-export] re-importing payload"
response=$(curl -s -u "$USER:$PASS" -H 'OCS-APIREQUEST: true' -H 'Content-Type: application/json' \
  -X POST "$PERSIST_URL" --data "$body")

echo "$response" | jq '.'

echo "[preset-export] theme preference from preset: $theme"
