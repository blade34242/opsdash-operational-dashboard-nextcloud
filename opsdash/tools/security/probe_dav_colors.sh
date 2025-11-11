#!/usr/bin/env bash
set -euo pipefail

BASE=${OPSDASH_BASE:-http://localhost:8080/index.php/apps/opsdash}
ROOT=${BASE%%/index.php/apps/opsdash*}
ROOT=${ROOT%/}
USER=${OPSDASH_USER:-admin}
PASS=${OPSDASH_PASS:-admin}
CALENDAR=${CALDAV_CALENDAR:-personal}

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing $1" >&2; exit 1; }; }
need curl
need jq >/dev/null 2>&1 || true

URL="$ROOT/remote.php/dav/calendars/$USER/$CALENDAR/"
BODY='<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:ical="http://apple.com/ns/ical/"><d:prop><ical:calendar-color/></d:prop></d:propfind>'

echo "[dav-probe] PROPFIND $URL"
RESPONSE=$(curl -s -u "$USER:$PASS" -X PROPFIND -H 'Depth: 0' -H 'Content-Type: application/xml' --data "$BODY" "$URL") || {
  echo "CalDAV request failed" >&2
  exit 7
}
COLOR=$(echo "$RESPONSE" | grep -o '<ical:calendar-color>[^<]*' | sed 's/<ical:calendar-color>//')
if [[ -z "$COLOR" ]]; then
  echo "No calendar-color property found in CalDAV response" >&2
  echo "$RESPONSE"
  exit 8
fi
if [[ ! "$COLOR" =~ ^#?[0-9A-Fa-f]{6}$ ]]; then
  echo "Unexpected calendar color: $COLOR" >&2
  exit 9
fi
printf '[dav-probe] calendar %s => %s\n' "$CALENDAR" "$COLOR"
