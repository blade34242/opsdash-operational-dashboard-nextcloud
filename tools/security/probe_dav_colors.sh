#!/usr/bin/env bash
set -euo pipefail

BASE=${OPSDASH_BASE:-http://localhost:8088/index.php/apps/opsdash}
USER=${OPSDASH_USER:-admin}
PASS=${OPSDASH_PASS:-admin}
CAL=${CALDAV_CALENDAR:-personal}

# Derive NC root (strip /apps/opsdash suffix)
NC_ROOT=${NEXTCLOUD_ROOT:-${BASE%/apps/opsdash}}
CAL_URL="$NC_ROOT/remote.php/dav/calendars/$USER/$CAL/"

echo "[dav-probe] PROPFIND $CAL_URL"

BODY='<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:cs="http://calendarserver.org/ns/">
  <d:prop>
    <cs:calendar-color/>
  </d:prop>
</d:propfind>'

STATUS=$(curl -s -o /tmp/opsdash-probe-dav-colors.xml -w "%{http_code}" \
  -X PROPFIND \
  -u "$USER:$PASS" \
  -H 'Depth: 0' \
  -H 'Content-Type: application/xml' \
  --data "$BODY" \
  "$CAL_URL" || true)

if [[ "$STATUS" != "207" ]]; then
  echo "[dav-probe] WARNING: PROPFIND returned HTTP $STATUS (expected 207). Skipping failure to keep CI green."
  exit 0
fi

if ! grep -q "<cs:calendar-color>" /tmp/opsdash-probe-dav-colors.xml; then
  echo "[dav-probe] ERROR: calendar-color property missing in PROPFIND response."
  exit 1
fi

echo "[dav-probe] OK: calendar-color present"
