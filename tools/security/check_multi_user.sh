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

echo "[multi-user] Setting selection for $USER_A"
post_payload "$USER_A" "$PASS_A" '{"selected":["personal"]}'

echo "[multi-user] Setting selection for $USER_B"
post_payload "$USER_B" "$PASS_B" '{"selected":["opsdash-focus"]}'

sel_a=$(fetch_selected "$USER_A" "$PASS_A")
sel_b=$(fetch_selected "$USER_B" "$PASS_B")

echo "User $USER_A selected: $sel_a"
echo "User $USER_B selected: $sel_b"

if echo "$sel_a" | grep -q 'personal' && echo "$sel_b" | grep -q 'opsdash-focus'; then
  echo "[multi-user] Isolation OK"
else
  echo "[multi-user] Unexpected selections" >&2
  exit 1
fi
