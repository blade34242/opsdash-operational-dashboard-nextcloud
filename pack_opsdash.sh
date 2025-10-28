#!/usr/bin/env bash
set -euo pipefail

# Package the Nextcloud app in opsdash/ into a distributable zip.
#
# Usage:
#   ./pack_opsdash.sh [--no-build] [--force] [--with-maps] [--include-src] [--include-docs] [--output DIR] [--name BASENAME]
#
# Defaults:
#   - Builds the SPA (npm run build) before packaging
#   - Produces opsdash-<version>.zip in the repo root
#   - Excludes dev artifacts (node_modules, tests, src, docs, caches, maps)
#   - Always includes built assets under js/assets and js/.vite/manifest.json

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
APP_DIR="$SCRIPT_DIR/opsdash"

NO_BUILD=0
FORCE=0
WITH_MAPS=0
INCLUDE_SRC=0
INCLUDE_DOCS=0
INCLUDE_VENDOR=0
OUT_DIR="$SCRIPT_DIR"
NAME=""

fail() { echo "ERROR: $*" >&2; exit 1; }
info() { echo "[pack] $*"; }

need() { command -v "$1" >/dev/null 2>&1 || fail "Missing dependency: $1"; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-build) NO_BUILD=1; shift ;;
    --force) FORCE=1; shift ;;
    --with-maps) WITH_MAPS=1; shift ;;
    --include-src) INCLUDE_SRC=1; shift ;;
    --include-docs) INCLUDE_DOCS=1; shift ;;
    --output) OUT_DIR=${2:-"$OUT_DIR"}; shift 2 ;;
    --name) NAME=${2:-""}; shift 2 ;;
    --include-vendor) INCLUDE_VENDOR=1; shift ;;
    -h|--help)
      sed -n '1,60p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) fail "Unknown option: $1" ;;
  esac
done

[[ -d "$APP_DIR" ]] || fail "Expected app directory: $APP_DIR"

# Discover version from appinfo/info.xml (preferred), else package.json
VERSION=$(sed -n 's/.*<version>\(.*\)<\/version>.*/\1/p' "$APP_DIR/appinfo/info.xml" | head -n1 || true)
if [[ -z "$VERSION" ]]; then
  VERSION=$(jq -r '.version' "$APP_DIR/package.json" 2>/dev/null || true)
fi
[[ -n "$VERSION" ]] || fail "Unable to determine version from appinfo/info.xml or package.json"

BASENAME=${NAME:-"opsdash-$VERSION"}
OUT_PATH="$OUT_DIR/$BASENAME.zip"

need zip

if [[ $NO_BUILD -eq 0 ]]; then
  if [[ -f "$APP_DIR/package.json" ]]; then
    info "Building SPA assets (npm run build)"
    ( cd "$APP_DIR" && npm run --silent build || fail "Build failed. Use --no-build to skip." )
  else
    info "No package.json found; skipping build"
  fi
else
  info "Skipping build (--no-build)"
fi

# Verify required build artifacts
MANIFEST="$APP_DIR/js/.vite/manifest.json"
ASSETS_DIR="$APP_DIR/js/assets"
if [[ ! -f "$MANIFEST" || ! -d "$ASSETS_DIR" ]]; then
  if [[ $FORCE -eq 1 ]]; then
    info "Build artifacts missing, but continuing due to --force"
  else
    fail "Missing build artifacts. Expected $MANIFEST and $ASSETS_DIR. Run without --no-build or use --force."
  fi
fi

info "Creating package: $OUT_PATH"
rm -f "$OUT_PATH"

# Exclusion patterns (relative to the added root folder 'opsdash')
EXCLUDES=(
  'opsdash/node_modules/*'
  'opsdash/.git/*' 'opsdash/.gitignore' 'opsdash/.gitattributes'
  'opsdash/.vscode/*'
  'opsdash/test/*' 'opsdash/tests/*' 'opsdash/coverage/*'
  'opsdash/js/.vite/cache/*' 'opsdash/js/.vite/deps/*'
  'opsdash/.DS_Store' 'opsdash/**/.DS_Store' 'opsdash/**/Thumbs.db'
  'opsdash/*.code-workspace'
)

# By default exclude source and docs; can be overridden via flags
if [[ $INCLUDE_SRC -eq 0 ]]; then EXCLUDES+=( 'opsdash/src/*' ); fi
if [[ $INCLUDE_DOCS -eq 0 ]]; then EXCLUDES+=( 'opsdash/docs/*' ); fi
if [[ $WITH_MAPS -eq 0 ]]; then EXCLUDES+=( 'opsdash/js/assets/*.map' ); fi
# Exclude composer vendor (dev-only) unless requested
if [[ $INCLUDE_VENDOR -eq 0 ]]; then EXCLUDES+=( 'opsdash/vendor/*' 'opsdash/composer.*' ); fi

# Always keep manifest, assets, server code, templates, css, img, appinfo, lib
# Create the zip with the opsdash folder at the root
( cd "$SCRIPT_DIR" && zip -r -9 -q "$OUT_PATH" opsdash -x "${EXCLUDES[@]}" )

# Basic sanity: ensure manifest ended up inside
if ! unzip -l "$OUT_PATH" | grep -q "opsdash/js/.vite/manifest.json"; then
  info "Warning: manifest not found in zip (continuing)"
fi

SIZE=$(du -h "$OUT_PATH" | awk '{print $1}')
info "Done: $OUT_PATH ($SIZE)"
