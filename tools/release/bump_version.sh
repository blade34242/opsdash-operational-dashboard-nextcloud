#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

VERSION_INPUT="${1:-}"
if [[ -z "$VERSION_INPUT" ]]; then
  echo "Usage: bash tools/release/bump_version.sh <x.y.z>" >&2
  exit 1
fi

VERSION="${VERSION_INPUT#v}"
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "[version-bump] Invalid version '$VERSION_INPUT'. Expected x.y.z." >&2
  exit 1
fi

SUPPORTED_LINE="${VERSION%.*}.x"

if [[ ! -f "opsdash/appinfo/info.xml" || ! -f "opsdash/package.json" || ! -f "opsdash/package-lock.json" || ! -f "opsdash/VERSION" ]]; then
  echo "[version-bump] Missing one or more required files under opsdash/." >&2
  exit 1
fi

python3 - <<'PY' "$VERSION" "$SUPPORTED_LINE"
import json
import pathlib
import re
import sys

version = sys.argv[1]
supported_line = sys.argv[2]
root = pathlib.Path('.')

info_path = root / 'opsdash' / 'appinfo' / 'info.xml'
info_text = info_path.read_text(encoding='utf-8')
info_text, count = re.subn(r'<version>\s*[^<]+\s*</version>', f'<version>{version}</version>', info_text, count=1)
if count != 1:
    raise SystemExit('[version-bump] Could not update appinfo/info.xml version tag.')
info_path.write_text(info_text, encoding='utf-8')

for rel in ['opsdash/package.json', 'opsdash/package-lock.json']:
    path = root / rel
    data = json.loads(path.read_text(encoding='utf-8'))
    data['version'] = version
    if rel.endswith('package-lock.json'):
        packages = data.get('packages')
        if isinstance(packages, dict):
            root_pkg = packages.get('')
            if isinstance(root_pkg, dict):
                root_pkg['version'] = version
    path.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')

security_path = root / 'SECURITY.md'
if security_path.exists():
    security_text = security_path.read_text(encoding='utf-8')
    security_text = re.sub(r'`\d+\.\d+\.x`', f'`{supported_line}`', security_text)
    security_path.write_text(security_text, encoding='utf-8')
PY

printf '%s\n' "$VERSION" > "opsdash/VERSION"

bash tools/ci/check_versions.sh
echo "[version-bump] Updated version sources to ${VERSION}."
