#!/usr/bin/env bash
set -euo pipefail

BASE=${OPSDASH_BASE:-http://localhost:8088/index.php/apps/opsdash}
LOAD_URL="$BASE/overview/load"
PERSIST_URL="$BASE/overview/persist"
NOTES_URL="$BASE/overview/notes"
PRESETS_URL="$BASE/overview/presets"
USER=${OPSDASH_USER:-admin}
PASS=${OPSDASH_PASS:-admin}
AUTH="$USER:$PASS"

json_get() {
  curl -s -u "$AUTH" -H 'OCS-APIREQUEST: true' "$@"
}

json_post() {
  curl -s -u "$AUTH" -H 'OCS-APIREQUEST: true' -H 'Content-Type: application/json' -X POST "$1" --data "$2"
}

print_section() {
  printf '\n=== %s ===\n' "$1"
}

print_section "Range clamp"
json_get "$LOAD_URL?range=year&offset=0" | jq '.meta.range'

print_section "Offset clamp"
json_get "$LOAD_URL?range=week&offset=999" | jq '.meta.offset'

print_section "Unauthorized request"
curl -s -o /dev/null -w '%{http_code}\n' "$LOAD_URL?range=week&offset=0"

print_section "Missing OCS header / CSRF"
curl -s -u "$AUTH" -H 'Content-Type: application/json' -X POST "$PERSIST_URL" --data '{}' -o /dev/null -w '%{http_code}\n'

print_section "Fuzz persist"
FZZ='{"cals":["personal"],"groups":{"personal":999},"targets_week":{"personal":-123},"targets_month":{"personal":987654321},"targets_config":{"totalHours":100000,"categories":[{"id":"<script>alert(1)</script>","label":"<img src=x onerror=alert(1)>","targetHours":-50,"includeWeekend":true}]},"theme_preference":"purple"}'
json_post "$PERSIST_URL" "$FZZ" | jq '.targets_config_read.totalHours, .targets_config_read.categories[0].id'

print_section "Preset sanitisation"
PRESET_PAYLOAD='{"name":"evil<script>","selected":["personal"],"groups":{"personal":0},"targets_week":{"personal":5},"targets_month":{"personal":20},"targets_config":{"totalHours":5,"categories":[]}}'
SANITIZED_NAME=$(json_post "$PRESETS_URL" "$PRESET_PAYLOAD" | jq -r '.preset.name')
echo "Saved preset as: $SANITIZED_NAME"
curl -s -u "$AUTH" -H 'OCS-APIREQUEST: true' "$PRESETS_URL/$SANITIZED_NAME" | jq '.preset.name'
curl -s -u "$AUTH" -H 'OCS-APIREQUEST: true' -X DELETE "$PRESETS_URL/$SANITIZED_NAME" | jq '.ok'

print_section "Notes injection"
NOTE=$(cat <<'JSON'
{"range":"week","offset":0,"content":"<script>alert('note')</script>"}
JSON
)
json_post "$NOTES_URL" "$NOTE" | jq '.ok'
json_get "$NOTES_URL?range=week&offset=0" | jq '.notes.current'
