#!/usr/bin/env bash
set -euo pipefail

# Seed Opsdash calendars + Deck by running the app's helper inside a running
# Nextcloud container. Defaults to nc31-dev (override via NEXTCLOUD_CONTAINER).

CONTAINER="${NEXTCLOUD_CONTAINER:-nc31-dev}"
BASE_URL="${BASE_URL:-http://localhost}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:-admin}"
QA_USER="${QA_USER:-qa}"
QA_PASS="${QA_PASS:-qa}"
QA2_USER="${QA2_USER:-qa2}"
QA2_PASS="${QA2_PASS:-qa2}"
WEEKS="${WEEKS:-4}"
APP_PATH="${APP_PATH:-}"

fail() {
  echo "[opsdash-seed] error: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required command \"$1\""
}

require_cmd docker

if ! docker ps --format '{{.Names}}' | grep -Fxq "$CONTAINER"; then
  fail "container \"${CONTAINER}\" is not running (override via NEXTCLOUD_CONTAINER)"
fi

seed_env=(
  -e "NC_ROOT=/var/www/html"
  -e "BASE=${BASE_URL}"
  -e "ADMIN_USER=${ADMIN_USER}"
  -e "ADMIN_PASS=${ADMIN_PASS}"
  -e "QA_USER=${QA_USER}"
  -e "QA_PASS=${QA_PASS}"
  -e "QA2_USER=${QA2_USER}"
  -e "QA2_PASS=${QA2_PASS}"
  -e "WEEKS=${WEEKS}"
)

if [[ -n "$APP_PATH" ]]; then
  seed_env+=( -e "APP_PATH=${APP_PATH}" )
fi

echo "[opsdash-seed] seeding calendars + Deck via container ${CONTAINER}"
docker exec "${seed_env[@]}" "$CONTAINER" \
  bash /var/www/html/apps/opsdash/tools/seed_opsdash.sh

echo "[opsdash-seed] done. Login at ${BASE_URL%/}/index.php/apps/opsdash"
