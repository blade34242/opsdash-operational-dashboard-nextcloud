#!/usr/bin/env bash
set -euo pipefail

# Seed a Nextcloud CalDAV calendar for the current week (Mon–Sun)
# Usage: BASE=http://localhost:8090 USER=admin PASS=admin ./tools/seed_week_calendar.sh

BASE_URL=${BASE:-http://localhost:8090}
USER=${USER:-admin}
PASS=${PASS:-admin}
CAL_SLUG=${CAL_SLUG:-test-week}
CAL_NAME=${CAL_NAME:-Test Week}

DAV_BASE="$BASE_URL/remote.php/dav/calendars/$USER"
CAL_URL="$DAV_BASE/$CAL_SLUG/"

echo "Seeding calendar '$CAL_NAME' at $CAL_URL for $USER"

# Create calendar (ignore error if exists)
MKCAL_BODY='<?xml version="1.0" encoding="utf-8"?>
  <c:mkcalendar xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
    <d:set>
      <d:prop>
        <d:displayname>'"$CAL_NAME"'</d:displayname>
        <c:calendar-description>Seeded by seed_week_calendar.sh</c:calendar-description>
      </d:prop>
    </d:set>
  </c:mkcalendar>'

curl -fsS -u "$USER:$PASS" -X MKCALENDAR \
  -H 'Content-Type: application/xml; charset=utf-8' \
  --data-binary "$MKCAL_BODY" \
  "$CAL_URL" || echo "(calendar may already exist)"

# Compute Monday of current week (GNU date)
MON=$(date -d 'monday this week' +%Y%m%d)

make_event() {
  local ymd="$1"; shift
  local uid="$1"; shift
  local summ="$1"; shift
  local start_hm="$1"; shift   # e.g., 090000
  local end_hm="$1"; shift     # e.g., 110000
  cat <<ICS
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//aaacalstatsdashxyz//seed//EN
BEGIN:VEVENT
UID:$uid@$CAL_SLUG
DTSTAMP:$(date -u +%Y%m%dT%H%M%SZ)
DTSTART:${ymd}T${start_hm}Z
DTEND:${ymd}T${end_hm}Z
SUMMARY:$summ
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
ICS
}

post_event() {
  local name="$1"; shift
  local ics="$1"; shift
  curl -fsS -u "$USER:$PASS" -X PUT \
    -H 'Content-Type: text/calendar; charset=utf-8' \
    --data-binary "$ics" \
    "$CAL_URL$name.ics"
}

echo "Creating 2 events per day (Mon–Sun)"

for i in {0..6}; do
  day=$(date -d "$MON +$i day" +%Y%m%d)
  dow=$(date -d "$MON +$i day" +%a)
  # 09:00–11:00 block
  ics1=$(make_event "$day" "focus-$day" "Focus Work ($dow)" 090000 110000)
  post_event "focus-$day" "$ics1"
  # 14:00–15:30 block
  ics2=$(make_event "$day" "meet-$day" "Team Meeting ($dow)" 140000 153000)
  post_event "meet-$day" "$ics2"
done

echo "Done. Verify in Calendar app or via:"
echo "  $BASE_URL/index.php/apps/calendar/"
echo "  $BASE_URL/index.php/apps/aaacalstatsdashxyz/config_dashboard/load?range=week&offset=0"

