#!/usr/bin/env bash
set -euo pipefail

# Seeds deterministic Deck data by calling Nextcloud's OCC commands inside
# a running container. This mirrors the calendar seed flow and avoids the
# brittle HTTP-based seeding that CI previously used.

CONTAINER="${NEXTCLOUD_CONTAINER:-nc31-dev}"
BOARD_TITLE="${QA_DECK_BOARD_TITLE:-Opsdash Deck QA}"
BOARD_COLOR="${QA_DECK_BOARD_COLOR:-#2563EB}"
KEEP_STACKS="${QA_DECK_KEEP_STACKS:-}"

if [[ $# -gt 0 ]]; then
  USERS=("$@")
else
  USERS=("admin" "qa")
fi

fail() {
  echo "[deck-seed] error: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required command \"$1\""
}

require_cmd docker

# Ensure target container exists and is running.
if ! docker ps --format '{{.Names}}' | grep -Fxq "$CONTAINER"; then
  fail "container \"$CONTAINER\" is not running (override via NEXTCLOUD_CONTAINER)"
fi

run_occ() {
  docker exec "$CONTAINER" php occ "$@"
}

echo "[deck-seed] enabling deck + opsdash apps inside ${CONTAINER}..."
run_occ app:enable deck >/dev/null 2>&1 || true
run_occ app:enable opsdash >/dev/null 2>&1 || true

echo "[deck-seed] seeding Deck boards via OCC (container=${CONTAINER})"
for user in "${USERS[@]}"; do
  args=(opsdash:seed-deck --user "$user" --board-title "$BOARD_TITLE" --board-color "$BOARD_COLOR")
  if [[ -n "$KEEP_STACKS" ]]; then
    args+=("--keep-stacks")
  fi
  echo "[deck-seed] -> user=${user}"
  run_occ "${args[@]}"
done

echo "[deck-seed] done."
