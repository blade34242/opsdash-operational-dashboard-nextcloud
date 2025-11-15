#!/usr/bin/env bash
set -euo pipefail
if [[ -z "${NEXTCLOUD_ROOT:-}" ]]; then
  echo "[i18n] Set NEXTCLOUD_ROOT to your Nextcloud checkout before running this script." >&2
  exit 1
fi
pushd "$NEXTCLOUD_ROOT" >/dev/null
php occ translations:create-app opsdash
popd >/dev/null
rsync -a "$NEXTCLOUD_ROOT/apps/opsdash/l10n/" "$(dirname "$0")/../opsdash/l10n/"
echo "[i18n] Updated l10n/ directory with latest POT/locale files."
