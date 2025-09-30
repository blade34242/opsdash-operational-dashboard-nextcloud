#!/usr/bin/env bash
set -euo pipefail

# Create a set of CalDAV calendars for a Nextcloud user.
# Defaults: 10 calendars named seed-cal-01..10 (display names: Seed Cal 01..10)
#
# Usage examples:
#   BASE=http://localhost:8090 USER=admin PASS=admin ./tools/create_calendars.sh
#   BASE=http://localhost:8088 USER=admin PASS=admin COUNT=5 PREFIX=demo-cal NAME_PREFIX="Demo Cal" ./tools/create_calendars.sh

BASE_URL=${BASE:-http://localhost:8090}
USER=${USER:-admin}
PASS=${PASS:-admin}
COUNT=${COUNT:-10}
PREFIX=${PREFIX:-seed-cal}
NAME_PREFIX=${NAME_PREFIX:-Seed Cal}

DAV_BASE="$BASE_URL/remote.php/dav/calendars/$USER"

pad2(){ printf "%02d" "$1"; }

create_calendar(){
  local slug="$1"; shift
  local name="$1"; shift
  local url="$DAV_BASE/$slug/"
  local body='<?xml version="1.0" encoding="utf-8"?>
  <c:mkcalendar xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
    <d:set>
      <d:prop>
        <d:displayname>'"$name"'</d:displayname>
        <c:calendar-description>Created by create_calendars.sh</c:calendar-description>
      </d:prop>
    </d:set>
  </c:mkcalendar>'
  echo "[create_calendars] MKCALENDAR $url ($name)"
  curl -fsS -u "$USER:$PASS" -X MKCALENDAR \
    -H 'Content-Type: application/xml; charset=utf-8' \
    --data-binary "$body" \
    "$url" || echo "(already exists)"
}

for i in $(seq 1 "$COUNT"); do
  num=$(pad2 "$i")
  slug="$PREFIX-$num"
  name="$NAME_PREFIX $num"
  create_calendar "$slug" "$name"
done

echo "[create_calendars] Done. Check in Calendar app: $BASE_URL/index.php/apps/calendar/"

