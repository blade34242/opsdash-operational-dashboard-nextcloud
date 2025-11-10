#!/usr/bin/env bash
set -euo pipefail

CONTAINER=${1:-nc-ci}
HOST_PORT=${2:-8088}
ADMIN_USER=${OPSDASH_USER:-admin}
ADMIN_PASS=${OPSDASH_PASS:-admin}

retry() {
  local cmd="$1"
  for i in {1..30}; do
    if eval "$cmd"; then
      return 0
    fi
    sleep 2
  done
  return 1
}

echo "[setup] checking if Nextcloud installed..."
if docker exec "$CONTAINER" php occ status >/dev/null 2>&1; then
  echo "[setup] Nextcloud already installed"
else
  echo "[setup] running maintenance:install"
  docker exec "$CONTAINER" bash -c "cd /var/www/html && php occ maintenance:install --database='sqlite' --database-name='nextcloud' --admin-user='$ADMIN_USER' --admin-pass='$ADMIN_PASS' --data-dir='/var/www/html/data'" || true
fi

echo "[setup] configuring trusted domain"
docker exec "$CONTAINER" php occ config:system:set trusted_domains 1 --value=localhost || true

echo "[setup] configuring CLI URL"
docker exec "$CONTAINER" php occ config:system:set overwrite.cli.url --value="http://localhost:${HOST_PORT}" || true

echo "[setup] enabling opsdash app"
docker exec "$CONTAINER" php occ app:enable opsdash || true

echo "[setup] creating admin session via curl"
retry "curl -s -u ${ADMIN_USER}:${ADMIN_PASS} -H 'OCS-APIREQUEST: true' http://localhost:${HOST_PORT}/ocs/v2.php/cloud/user?format=json > /dev/null"
