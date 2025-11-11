#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
APP_DIR="${REPO_ROOT}/opsdash"
DEFAULT_NC_ROOT="${REPO_ROOT}/server"
NEXTCLOUD_ROOT="${NEXTCLOUD_ROOT:-$DEFAULT_NC_ROOT}"

if [[ ! -d "${NEXTCLOUD_ROOT}" || ! -f "${NEXTCLOUD_ROOT}/occ" ]]; then
  echo "[i18n] Please set NEXTCLOUD_ROOT to a Nextcloud checkout (found: ${NEXTCLOUD_ROOT})." >&2
  echo "[i18n] The script needs access to occ to run translations:create-app." >&2
  exit 1
fi

APP_INSTALL_DIR="${NEXTCLOUD_ROOT}/apps/opsdash"
if [[ ! -d "${APP_INSTALL_DIR}" ]]; then
  echo "[i18n] opsdash is not installed under ${APP_INSTALL_DIR}." >&2
  echo "[i18n] Symlink ${APP_DIR} into your Nextcloud instance before running extraction." >&2
  exit 1
fi

pushd "${NEXTCLOUD_ROOT}" >/dev/null
echo "[i18n] Running occ translations:create-app opsdash (this may take a moment)..."
php occ translations:create-app opsdash --force >/dev/null
popd >/dev/null

echo "[i18n] Syncing generated l10n files back to repository..."
if command -v rsync >/dev/null 2>&1; then
  rsync -a "${APP_INSTALL_DIR}/l10n/" "${APP_DIR}/l10n/"
else
  cp -R "${APP_INSTALL_DIR}/l10n/." "${APP_DIR}/l10n/"
fi

echo "[i18n] Done. Commit any updated files under opsdash/l10n/."
