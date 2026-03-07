#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <version>" >&2
  exit 1
fi

VERSION=$1
SCRIPT_DIR=$(cd -- "$(dirname -- "$0")" && pwd)
REPO_DIR=$(cd -- "$SCRIPT_DIR/../../.." && pwd)

echo "[release] tools/release/package.sh is deprecated."
echo "[release] Using the canonical packaging path: make appstore VERSION=$VERSION"
make -C "$REPO_DIR" appstore VERSION="$VERSION"
