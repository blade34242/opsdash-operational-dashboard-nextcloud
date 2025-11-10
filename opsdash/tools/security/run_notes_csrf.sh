#!/usr/bin/env bash
set -euo pipefail

BASE=${OPSDASH_BASE:-http://localhost:8088}
LOGIN_PATH=${OPSDASH_LOGIN_PATH:-/index.php/login}
APP_PATH=${OPSDASH_APP_PATH:-/index.php/apps/opsdash}
NOTES_URL="$BASE$APP_PATH/overview/notes"

USER=${OPSDASH_USER:-admin}
PASS=${OPSDASH_PASS:-admin}

COOKIES=$(mktemp)
trap 'rm -f "$COOKIES"' EXIT

# Step 1: login form (fetch requesttoken)
# Establish session via Basic auth and capture SPA token
SPA_JSON=$(curl -s -u "$USER:$PASS" -c "$COOKIES" -b "$COOKIES" "$BASE$APP_PATH/overview")
NEW_TOKEN=$(echo "$SPA_JSON" | jq -r '.app?.token // empty')
if [ -z "$NEW_TOKEN" ]; then
  echo "Failed to extract SPA requesttoken" >&2
  exit 1
fi

PAYLOAD='{"range":"week","offset":0,"content":"Automation note via CSRF script"}'

echo "Posting notes with session cookies + token..."
RESULT=$(curl -s -b "$COOKIES" -c "$COOKIES" -H "requesttoken: $NEW_TOKEN" \
  -H 'Content-Type: application/json' -X POST "$NOTES_URL" --data "$PAYLOAD")

echo "$RESULT" | jq '.ok'

echo "Reading back..."
curl -s -b "$COOKIES" -c "$COOKIES" -H "requesttoken: $NEW_TOKEN" \
  "$NOTES_URL?range=week&offset=0" | jq '.notes.current'
