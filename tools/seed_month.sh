#!/usr/bin/env bash
set -euo pipefail

# Seed a Nextcloud CalDAV calendar with non-overlapping events for the current month.
# - Distributes EVENTS across all days of the month as evenly as possible.
# - Generates sequential, non-overlapping slots starting 07:30 with 45m duration and 15m gaps.
#
# Usage examples:
#   BASE=http://localhost:8090 USER=admin PASS=admin ./tools/seed_month.sh
#   BASE=http://localhost:8088 USER=admin PASS=admin CAL_SLUG=my-month CAL_NAME="My Month" EVENTS=250 ./tools/seed_month.sh

BASE_URL=${BASE:-http://localhost:8090}
USER=${USER:-admin}
PASS=${PASS:-admin}
CAL_SLUG=${CAL_SLUG:-test-month}
CAL_NAME=${CAL_NAME:-Test Month}
EVENTS=${EVENTS:-250}

# Time layout per day
START_H=${START_H:-7}
START_M=${START_M:-30}
EVT_MIN=${EVT_MIN:-45}
GAP_MIN=${GAP_MIN:-15}

DAV_BASE="$BASE_URL/remote.php/dav/calendars/$USER"
CAL_URL="$DAV_BASE/$CAL_SLUG/"

echo "[seed_month] Seeding calendar '$CAL_NAME' at $CAL_URL for user '$USER'"

# Create calendar (ignore error if exists)
MKCAL_BODY='<?xml version="1.0" encoding="utf-8"?>
  <c:mkcalendar xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
    <d:set>
      <d:prop>
        <d:displayname>'"$CAL_NAME"'</d:displayname>
        <c:calendar-description>Seeded by seed_month.sh</c:calendar-description>
      </d:prop>
    </d:set>
  </c:mkcalendar>'
curl -fsS -u "$USER:$PASS" -X MKCALENDAR \
  -H 'Content-Type: application/xml; charset=utf-8' \
  --data-binary "$MKCAL_BODY" \
  "$CAL_URL" || echo "(calendar may already exist)"

pad2(){ printf "%02d" "$1"; }
utc_ts(){
  local s="$1"
  if [[ "$s" =~ ^([0-9]{4})([0-9]{2})([0-9]{2})[[:space:]]+(.*)$ ]]; then
    s="${BASH_REMATCH[1]}-${BASH_REMATCH[2]}-${BASH_REMATCH[3]} ${BASH_REMATCH[4]}"
  fi
  date -u -d "$s" +%Y%m%dT%H%M%SZ
}

make_event_ics(){
  local ymd="$1"; shift
  local start_hm="$1"; shift
  local end_hm="$1"; shift
  local uid="$1"; shift
  local summary="$1"; shift
  cat <<ICS
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//aaacalstatsdashxyz//seed//EN
BEGIN:VEVENT
UID:$uid@$CAL_SLUG
DTSTAMP:$(date -u +%Y%m%dT%H%M%SZ)
DTSTART:$(utc_ts "${ymd} ${start_hm}:00")
DTEND:$(utc_ts "${ymd} ${end_hm}:00")
SUMMARY:$summary
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
ICS
}

put_event(){
  local name="$1"; shift
  local ics="$1"; shift
  curl -fsS -u "$USER:$PASS" -X PUT \
    -H 'Content-Type: text/calendar; charset=utf-8' \
    --data-binary "$ics" \
    "$CAL_URL$name.ics" >/dev/null
}

# Determine current month boundaries
YM=$(date +%Y-%m)
FIRST_DAY=${YM}-01
DAYS_IN_MONTH=$(date -d "$FIRST_DAY +1 month -1 day" +%d | sed 's/^0*//')

# Distribute EVENTS over DAYS_IN_MONTH
per=$(( EVENTS / DAYS_IN_MONTH ))
rem=$(( EVENTS % DAYS_IN_MONTH ))
echo "[seed_month] EVENTS=$EVENTS, days=$DAYS_IN_MONTH → per-day=$per, first $rem days get +1"

day_counter=0
for d in $(seq 1 $DAYS_IN_MONTH); do
  ymd=$(date -d "$FIRST_DAY +$((d-1)) day" +%Y%m%d)
  dow=$(date -d "$FIRST_DAY +$((d-1)) day" +%a)
  n=$per; if [ $((d-1)) -lt $rem ]; then n=$((n+1)); fi
  echo "  Day $d ($dow $ymd): $n events"

  cur_h=$START_H
  cur_m=$START_M
  for seq in $(seq 1 $n); do
    sh=$(pad2 $cur_h); sm=$(pad2 $cur_m)
    iso="${ymd:0:4}-${ymd:4:2}-${ymd:6:2}"
    start_epoch=$(date -d "$iso $sh:$sm:00" +%s)
    end_epoch=$(( start_epoch + EVT_MIN*60 ))
    eh=$(date -d "@$end_epoch" +%H)
    em=$(date -d "@$end_epoch" +%M)
    uid="mo-$ymd-$seq"
    summ="Seeded Month Event $seq ($dow)"
    ics=$(make_event_ics "$ymd" "$sh:$sm" "$eh:$em" "$uid" "$summ")
    put_event "$uid" "$ics"
    gap_epoch=$(( end_epoch + GAP_MIN*60 ))
    cur_h=$(date -d "@$gap_epoch" +%H | sed 's/^0*//')
    cur_m=$(date -d "@$gap_epoch" +%M | sed 's/^0*//')
  done
done

echo "[seed_month] Done. Open: $BASE_URL/index.php/apps/calendar/"
echo "[seed_month] API check (month): $BASE_URL/index.php/apps/aaacalstatsdashxyz/config_dashboard/load?range=month&offset=0"
