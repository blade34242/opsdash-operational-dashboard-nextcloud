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

run_seed() {
  local user="$1"
  local envs=(-e "QA_USER=${user}" -e "QA_DECK_BOARD_TITLE=${BOARD_TITLE}" -e "QA_DECK_BOARD_COLOR=${BOARD_COLOR}")
  if [[ -n "$KEEP_STACKS" ]]; then
    envs+=(-e "QA_DECK_KEEP_STACKS=${KEEP_STACKS}")
  fi
  docker exec "${envs[@]}" "$CONTAINER" php apps/opsdash/tools/seed_deck_boards.php
}

echo "[deck-seed] enabling deck + opsdash apps inside ${CONTAINER}..."
run_occ app:enable deck >/dev/null 2>&1 || true
run_occ app:enable opsdash >/dev/null 2>&1 || true

echo "[deck-seed] seeding Deck boards via PHP helper (container=${CONTAINER})"
for user in "${USERS[@]}"; do
  echo "[deck-seed] -> user=${user}"
  run_seed "$user"
done

echo "[deck-seed] done."
