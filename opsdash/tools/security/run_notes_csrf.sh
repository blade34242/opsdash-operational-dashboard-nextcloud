#!/usr/bin/env bash
set -euo pipefail

BASE=${OPSDASH_BASE:-http://localhost:8088}
APP_PATH=${OPSDASH_APP_PATH:-/index.php/apps/opsdash}
NOTES_URL="$BASE$APP_PATH/overview/notes"

USER=${OPSDASH_USER:-admin}
PASS=${OPSDASH_PASS:-admin}

COOKIES=$(mktemp)
trap 'rm -f "$COOKIES"' EXIT

# Use Basic auth to fetch the overview page and scrape the requesttoken attribute
PAGE=$(curl -s -u "$USER:$PASS" -c "$COOKIES" -b "$COOKIES" \
  -H 'OCS-APIREQUEST: true' "$BASE$APP_PATH/overview")
TOKEN=$(echo "$PAGE" | sed -n 's/.*data-requesttoken="\([^"]*\)".*/\1/p' | head -n1)
if [ -z "$TOKEN" ]; then
  echo "Failed to extract requesttoken from overview HTML" >&2
  exit 1
fi

PAYLOAD='{"range":"week","offset":0,"content":"Automation note via CSRF script"}'

echo "Posting notes with session cookies + token..."
RESULT=$(curl -s -b "$COOKIES" -c "$COOKIES" -H "requesttoken: $TOKEN" \
  -H 'Content-Type: application/json' -X POST "$NOTES_URL" --data "$PAYLOAD")

echo "$RESULT" | jq '.ok'

echo "Reading back..."
curl -s -b "$COOKIES" -c "$COOKIES" -H "requesttoken: $TOKEN" \
  "$NOTES_URL?range=week&offset=0" | jq '.notes.current'
