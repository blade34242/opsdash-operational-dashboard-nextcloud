#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

info_version="$(sed -n 's|.*<version>\(.*\)</version>.*|\1|p' opsdash/appinfo/info.xml | head -n1 | tr -d '[:space:]')"
package_version="$(grep -Eo '"version"\s*:\s*"[^"]+"' opsdash/package.json | head -n1 | sed -E 's/.*"version"\s*:\s*"([^"]+)".*/\1/' | tr -d '[:space:]')"
file_version="$(tr -d '[:space:]' < opsdash/VERSION)"

if [[ -z "$info_version" || -z "$package_version" || -z "$file_version" ]]; then
  echo "[versions] Failed to read one or more version sources." >&2
  exit 1
fi

if [[ "$info_version" != "$package_version" || "$info_version" != "$file_version" ]]; then
  echo "[versions] Mismatch detected:" >&2
  echo "  appinfo/info.xml: $info_version" >&2
  echo "  package.json:     $package_version" >&2
  echo "  VERSION:          $file_version" >&2
  exit 1
fi

supported_line="${info_version%.*}.x"
if ! grep -Eq "Supported Versions|support the" SECURITY.md; then
  echo "[versions] SECURITY.md does not contain a supported-version policy section." >&2
  exit 1
fi
if ! grep -Eq "\\b${supported_line}\\b" SECURITY.md; then
  echo "[versions] SECURITY.md must mention supported line ${supported_line}." >&2
  exit 1
fi

echo "[versions] OK: ${info_version} is consistent across appinfo/package/VERSION and SECURITY.md mentions ${supported_line}."
