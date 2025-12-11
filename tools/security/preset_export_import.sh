#!/usr/bin/env bash
set -euo pipefail

BASE=${OPSDASH_BASE:-http://localhost:8088/index.php/apps/opsdash}
PRESETS_URL="$BASE/overview/presets"
PERSIST_URL="$BASE/overview/persist"
USER=${OPSDASH_USER:-admin}
PASS=${OPSDASH_PASS:-admin}
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1" >&2; exit 1; }; }
need jq
need curl
need sed
TOKEN_HELPER="$SCRIPT_DIR/_token.sh"
if [[ ! -f "$TOKEN_HELPER" ]]; then
  TOKEN_HELPER="$SCRIPT_DIR/../../opsdash/tools/security/_token.sh"
fi
. "$TOKEN_HELPER"

export_preset() {
  curl -s -u "$USER:$PASS" -H 'OCS-APIREQUEST: true' "$PRESETS_URL" | jq -r '.presets[0].name'
}

load_preset() {
  local name=$1
  curl -s -u "$USER:$PASS" -H 'OCS-APIREQUEST: true' "$PRESETS_URL/${name}"
}

fetch_token() {
  for headers in "-H OCS-APIREQUEST: true" ""; do
    token=$(curl -s -L -u "$USER:$PASS" $headers "$BASE/overview" \
      | grep -o 'data-requesttoken=\"[^\"]*\"' \
      | head -n1 \
      | cut -d'"' -f2)
    if [[ -n "$token" ]]; then
      echo "$token"
      return 0
    fi
  done
  return 1
}

selected=$(export_preset)
if [[ -z "$selected" || "$selected" == "null" ]]; then
  echo "[preset-export] No presets available to export; skipping" >&2
  exit 0
fi

echo "[preset-export] exporting $selected"
load_preset "$selected" > "$TMP"

theme=$(jq -r '.preset.themePreference // "auto"' "$TMP")
body=$(jq '.preset | { selected, groups, targets_week, targets_month, targets_config, theme_preference: (.themePreference // "auto") }' "$TMP")

echo "[preset-export] re-importing payload"
token=$(fetch_requesttoken "$BASE" "$USER" "$PASS" || true)
if [[ -z "$token" ]]; then
  echo "[preset-export] failed to obtain requesttoken" >&2
  exit 1
fi
response=$(curl -s -u "$USER:$PASS" -H 'OCS-APIREQUEST: true' -H "requesttoken: $token" -H 'Content-Type: application/json' \
  -X POST "$PERSIST_URL" --data "$body")

echo "$response" | jq '.'

echo "[preset-export] theme preference from preset: $theme"
