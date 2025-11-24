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

URL="$ROOT/index.php/apps/dav/calendars/$USER/$CALENDAR/"
BODY='<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:ical="http://apple.com/ns/ical/"><d:prop><ical:calendar-color/></d:prop></d:propfind>'

echo "[dav-probe] PROPFIND $URL"
curl_flags=()
if [[ "${OPSDASH_CURL_INSECURE:-}" != "" ]]; then
  curl_flags+=("-k")
fi

HTTP_STATUS=0
RESPONSE=$(curl -s "${curl_flags[@]}" -u "$USER:$PASS" -w '%{http_code}' -X PROPFIND -H 'Depth: 0' -H 'Content-Type: application/xml' --data "$BODY" "$URL" || true)
HTTP_STATUS=${RESPONSE: -3}
BODY_CONTENT=${RESPONSE::-3}

if [[ -z "$BODY_CONTENT" ]]; then
  echo "CalDAV request failed (empty response, status $HTTP_STATUS)" >&2
  exit 7
fi
if [[ "$HTTP_STATUS" != "200" ]]; then
  echo "CalDAV request failed (status $HTTP_STATUS):" >&2
  echo "$BODY_CONTENT" >&2
  exit 7
fi
if echo "$BODY_CONTENT" | grep -qi "error"; then
  echo "$BODY_CONTENT" >&2
  exit 7
fi
COLOR=$(echo "$BODY_CONTENT" | grep -o '<ical:calendar-color>[^<]*' | sed 's/<ical:calendar-color>//')
if [[ -z "$COLOR" ]]; then
  echo "No calendar-color property found in CalDAV response" >&2
  echo "$BODY_CONTENT"
  exit 8
fi
if [[ ! "$COLOR" =~ ^#?[0-9A-Fa-f]{6}$ ]]; then
  echo "Unexpected calendar color: $COLOR" >&2
  exit 9
fi
printf '[dav-probe] calendar %s => %s\n' "$CALENDAR" "$COLOR"
