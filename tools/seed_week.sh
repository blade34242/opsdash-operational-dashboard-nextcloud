#!/usr/bin/env bash
set -euo pipefail

# Seed a Nextcloud CalDAV calendar with non-overlapping events for the current week (Mon–Sun).
# - Distributes EVENTS across the 7 days as evenly as possible.
# - Generates sequential, non-overlapping slots starting 08:00 with 60m duration and 15m gaps.
#
# Usage examples:
#   BASE=http://localhost:8090 USER=admin PASS=admin ./tools/seed_week.sh
#   BASE=http://localhost:8088 USER=admin PASS=admin CAL_SLUG=my-week CAL_NAME="My Week" EVENTS=40 ./tools/seed_week.sh

BASE_URL=${BASE:-http://localhost:8090}
USER=${USER:-admin}
PASS=${PASS:-admin}
CAL_SLUG=${CAL_SLUG:-test-week}
CAL_NAME=${CAL_NAME:-Test Week}
EVENTS=${EVENTS:-40}

# Time layout per day
START_HOUR=${START_HOUR:-8}     # 08:00 local → we store as UTC (Z). Adjust if your server TZ differs.
EVT_MIN=${EVT_MIN:-60}          # event duration minutes
GAP_MIN=${GAP_MIN:-15}          # gap between events minutes

DAV_BASE="$BASE_URL/remote.php/dav/calendars/$USER"
CAL_URL="$DAV_BASE/$CAL_SLUG/"

echo "[seed_week] Seeding calendar '$CAL_NAME' at $CAL_URL for user '$USER'"

# Create calendar (ignore error if exists)
MKCAL_BODY='<?xml version="1.0" encoding="utf-8"?>
  <c:mkcalendar xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
    <d:set>
      <d:prop>
        <d:displayname>'"$CAL_NAME"'</d:displayname>
        <c:calendar-description>Seeded by seed_week.sh</c:calendar-description>
      </d:prop>
    </d:set>
  </c:mkcalendar>'
curl -fsS -u "$USER:$PASS" -X MKCALENDAR \
  -H 'Content-Type: application/xml; charset=utf-8' \
  --data-binary "$MKCAL_BODY" \
  "$CAL_URL" || echo "(calendar may already exist)"

# Monday of current week (GNU date)
MON=$(date -d 'monday this week' +%Y%m%d)

pad2(){ printf "%02d" "${1:-0}"; }
utc_ts(){
  local s="$1"
  if [[ "$s" =~ ^([0-9]{4})([0-9]{2})([0-9]{2})[[:space:]]+(.*)$ ]]; then
    s="${BASH_REMATCH[1]}-${BASH_REMATCH[2]}-${BASH_REMATCH[3]} ${BASH_REMATCH[4]}"
  fi
  date -u -d "$s" +%Y%m%dT%H%M%SZ
}

make_event_ics(){
  local ymd="$1"; shift
  local start_hm="$1"; shift  # HH:MM
  local end_hm="$1"; shift    # HH:MM
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

# Distribute EVENTS across 7 days
per=$(( EVENTS / 7 ))
rem=$(( EVENTS % 7 ))
echo "[seed_week] EVENTS=$EVENTS → per-day=$per, first $rem days get +1"

for i in {0..6}; do
  ymd=$(date -d "$MON +$i day" +%Y%m%d)
  dow=$(date -d "$MON +$i day" +%a)
  n=$per; if [ $i -lt $rem ]; then n=$((n+1)); fi
  echo "  Day $i ($dow $ymd): $n events"

  cur_h=$START_HOUR
  cur_m=0
  for seq in $(seq 1 $n); do
    sh=$(pad2 $cur_h); sm=$(pad2 $cur_m)
    # compute end time
    iso="${ymd:0:4}-${ymd:4:2}-${ymd:6:2}"
    start_epoch=$(date -d "$iso $sh:$sm:00" +%s)
    end_epoch=$(( start_epoch + EVT_MIN*60 ))
    end_h=$(date -d "@$end_epoch" +%H); end_m=$(date -d "@$end_epoch" +%M)
    eh=$end_h; em=$end_m
    uid="wk-$ymd-$seq"
    summ="Seeded Event $seq ($dow)"
    ics=$(make_event_ics "$ymd" "$sh:$sm" "$eh:$em" "$uid" "$summ")
    put_event "$uid" "$ics"
    # advance with gap
    gap_epoch=$(( end_epoch + GAP_MIN*60 ))
    cur_h=$(date -d "@$gap_epoch" +%H | sed 's/^0*//')
    cur_m=$(date -d "@$gap_epoch" +%M | sed 's/^0*//')
    if [ -z "${cur_h:-}" ]; then cur_h=0; fi
    if [ -z "${cur_m:-}" ]; then cur_m=0; fi
  done
done

echo "[seed_week] Done. Open: $BASE_URL/index.php/apps/calendar/"
echo "[seed_week] API check: $BASE_URL/index.php/apps/aaacalstatsdashxyz/config_dashboard/load?range=week&offset=0"
