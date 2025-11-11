#!/usr/bin/env bash
set -euo pipefail

BASE=${OPSDASH_BASE:-http://localhost:8088/index.php/apps/opsdash}
LOAD_URL="$BASE/overview/load?range=week&offset=0&save=false"
PERSIST_URL="$BASE/overview/persist"
USER=${OPSDASH_USER:-admin}
PASS=${OPSDASH_PASS:-admin}
STRATEGY_OVERRIDE=${ONBOARDING_STRATEGY:-}
THEME_OVERRIDE=${ONBOARDING_THEME:-}
ONBOARDING_VERSION=${ONBOARDING_VERSION:-1}

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing dependency: $1" >&2
    exit 1
  }
}

need curl
need jq

AUTH_CURL=(curl -s -u "$USER:$PASS" -H 'OCS-APIREQUEST: true')

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

echo "[onboarding] Fetching existing dashboard state..."
"${AUTH_CURL[@]}" "$LOAD_URL" >"$TMP"

selected_json=$(jq '[ (.selected // .saved // [])[] | tostring ]' "$TMP")
selected_count=$(jq 'length' <<<"$selected_json")
if [[ "$selected_count" -eq 0 ]]; then
  echo "No selected calendars found; launch the dashboard once before rerunning onboarding." >&2
  exit 1
fi

groups_json=$(jq '.groups.byId // .groups // {}' "$TMP")
targets_week_json=$(jq '.targets.week // {}' "$TMP")
targets_month_json=$(jq '.targets.month // {}' "$TMP")
targets_config_json=$(jq '.targetsConfig // {}' "$TMP")
default_strategy=$(jq -r '.onboarding.strategy // "total_only"' "$TMP")
default_theme=$(jq -r '.themePreference // "auto"' "$TMP")

strategy=${STRATEGY_OVERRIDE:-$default_strategy}
theme=${THEME_OVERRIDE:-$default_theme}
timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

if [[ ! "$strategy" =~ ^(total_only|total_plus_categories|full_granular)$ ]]; then
  echo "Unsupported strategy \"$strategy\". Use total_only | total_plus_categories | full_granular." >&2
  exit 1
fi
if [[ ! "$theme" =~ ^(auto|light|dark)$ ]]; then
  echo "Unsupported theme \"$theme\". Use auto | light | dark." >&2
  exit 1
fi

payload=$(jq -n \
  --argjson selected "$selected_json" \
  --argjson groups "$groups_json" \
  --argjson targets_week "$targets_week_json" \
  --argjson targets_month "$targets_month_json" \
  --argjson targets_config "$targets_config_json" \
  --arg strategy "$strategy" \
  --arg theme "$theme" \
  --arg completed_at "$timestamp" \
  --arg version "$ONBOARDING_VERSION" \
  '{
    cals: $selected,
    groups: $groups,
    targets_week: $targets_week,
    targets_month: $targets_month,
    targets_config: ($targets_config // {}),
    theme_preference: $theme,
    onboarding: {
      completed: true,
      version: ($version | tonumber),
      strategy: $strategy,
      completed_at: $completed_at
    }
  }')

echo "[onboarding] Replaying wizard payload (strategy=$strategy, theme=$theme)"
response=$("${AUTH_CURL[@]}" -H 'Content-Type: application/json' -X POST "$PERSIST_URL" --data "$payload")

echo "$response" | jq '{ok, saved, theme_preference_read, onboarding: .onboarding}'
