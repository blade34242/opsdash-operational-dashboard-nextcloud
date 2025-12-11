#!/usr/bin/env bash
set -euo pipefail

BASE=${OPSDASH_BASE:-http://localhost:8088/index.php/apps/opsdash}
LOAD_URL="$BASE/overview/load"
PERSIST_URL="$BASE/overview/persist"

USER_A=${OPSDASH_USER_A:-}
PASS_A=${OPSDASH_PASS_A:-}
USER_B=${OPSDASH_USER_B:-}
PASS_B=${OPSDASH_PASS_B:-}

if [[ -z "$USER_A" || -z "$PASS_A" || -z "$USER_B" || -z "$PASS_B" ]]; then
  echo "Set OPSDASH_USER_A / PASS_A and OPSDASH_USER_B / PASS_B" >&2
  exit 1
fi

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1" >&2; exit 1; }; }
need jq

post_payload() {
  local user=$1 pass=$2 payload=$3
  curl -s -u "$user:$pass" -H 'OCS-APIREQUEST: true' -H 'Content-Type: application/json' \
    -X POST "$PERSIST_URL" --data "$payload" >/dev/null
}

fetch_selected() {
  local user=$1 pass=$2
  curl -s -u "$user:$pass" -H 'OCS-APIREQUEST: true' "$LOAD_URL?range=week&offset=0" | jq -r '.selected[]' 2>/dev/null || true
}

first_two_calendars() {
  local user=$1 pass=$2
  curl -s -u "$user:$pass" -H 'OCS-APIREQUEST: true' "$LOAD_URL?range=week&offset=0" \
    | jq -r '.calendars[]?.id' 2>/dev/null | head -n2
}

cal_a=($(first_two_calendars "$USER_A" "$PASS_A"))
cal_b=($(first_two_calendars "$USER_B" "$PASS_B"))

if [[ ${#cal_a[@]} -eq 0 || ${#cal_b[@]} -eq 0 ]]; then
  echo "[multi-user] Skipping: not enough calendars to compare" >&2
  exit 0
fi

expected_a=${cal_a[0]}
expected_b=${cal_b[-1]}

echo "[multi-user] Setting selection for $USER_A -> $expected_a"
post_payload "$USER_A" "$PASS_A" "{\"cals\":[\"$expected_a\"]}"

echo "[multi-user] Setting selection for $USER_B -> $expected_b"
post_payload "$USER_B" "$PASS_B" "{\"cals\":[\"$expected_b\"]}"

sel_a_result=$(fetch_selected "$USER_A" "$PASS_A")
sel_b_result=$(fetch_selected "$USER_B" "$PASS_B")

echo "User $USER_A selected: $sel_a_result"
echo "User $USER_B selected: $sel_b_result"

if echo "$sel_a_result" | grep -q "$expected_a" && echo "$sel_b_result" | grep -q "$expected_b"; then
  echo "[multi-user] Isolation OK"
else
  echo "[multi-user] Unexpected selections" >&2
  exit 1
fi
