#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <version>" >&2
  exit 1
fi

VERSION=$1
SCRIPT_DIR=$(cd -- "$(dirname -- "$0")" && pwd)
REPO_DIR=$(cd -- "$SCRIPT_DIR/../../.." && pwd)
APP_DIR="$REPO_DIR/opsdash"
DIST_DIR="$REPO_DIR/dist"
BUILD_DIR="$DIST_DIR/opsdash"

cd "$REPO_DIR"
export NPM_CONFIG_CACHE="$APP_DIR/.npm-cache"

mkdir -p "$DIST_DIR"

echo "[release] building frontend..."
(cd "$APP_DIR" && npm ci && npm run build)

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

echo "[release] copying app files..."
rsync -a --exclude 'node_modules' --exclude 'src' --exclude 'tests' --exclude 'tools' \
  --exclude '.git' --exclude '.github' --exclude '.idea' --exclude 'Dockerfile*' \
  --exclude 'docker-compose*.yml' --exclude 'docs/PENTEST_*' --exclude 'vendor' \
  "$APP_DIR/" "$BUILD_DIR/"

echo "[release] installing composer deps in staged copy..."
(cd "$BUILD_DIR" && composer install --no-dev --optimize-autoloader)

echo "[release] packaging..."
(cd "$DIST_DIR" && tar -czf "opsdash-$VERSION.tar.gz" opsdash)
(cd "$DIST_DIR" && zip -qr "opsdash-$VERSION.zip" opsdash)

echo "[release] done -> $DIST_DIR/opsdash-$VERSION.{tar.gz,zip}"
