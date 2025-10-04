#!/usr/bin/env bash
set -euo pipefail

# Seed multiple CalDAV calendars (default 10) with non-overlapping events for the current week.
# Distributes TOTAL events across days and calendars, ensuring no overlaps within a calendar.
#
# Usage:
#   BASE=http://localhost:8090 USER=admin PASS=admin ./tools/seed_week_multi.sh
#   BASE=http://localhost:8090 USER=admin PASS=admin CAL_COUNT=10 PREFIX=seed-cal TOTAL=40 ./tools/seed_week_multi.sh

BASE_URL=${BASE:-http://localhost:8090}
USER=${USER:-admin}
PASS=${PASS:-admin}
CAL_COUNT=${CAL_COUNT:-10}
PREFIX=${PREFIX:-seed-cal}
TOTAL=${TOTAL:-40}

# Time layout
START_H=${START_H:-8}
START_M=${START_M:-0}
EVT_MIN=${EVT_MIN:-60}
GAP_MIN=${GAP_MIN:-15}

DAV_BASE="$BASE_URL/remote.php/dav/calendars/$USER"

pad2(){ printf "%02d" "$1"; }
utc_ts(){
  local s="$1"
  if [[ "$s" =~ ^([0-9]{4})([0-9]{2})([0-9]{2})[[:space:]]+(.*)$ ]]; then
    s="${BASH_REMATCH[1]}-${BASH_REMATCH[2]}-${BASH_REMATCH[3]} ${BASH_REMATCH[4]}"
  fi
  date -u -d "$s" +%Y%m%dT%H%M%SZ
}

ensure_calendar(){
  local slug="$1"; shift
  local url="$DAV_BASE/$slug/"
  local body='<?xml version="1.0" encoding="utf-8"?>
  <c:mkcalendar xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
    <d:set>
      <d:prop>
        <d:displayname>'"$slug"'</d:displayname>
        <c:calendar-description>Seeded by seed_week_multi.sh</c:calendar-description>
      </d:prop>
    </d:set>
  </c:mkcalendar>'
  curl -fsS -u "$USER:$PASS" -X MKCALENDAR \
    -H 'Content-Type: application/xml; charset=utf-8' \
    --data-binary "$body" \
    "$url" >/dev/null || true
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
UID:$uid@$PREFIX
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
  local slug="$1"; shift
  local name="$1"; shift
  local ics="$1"; shift
  curl -fsS -u "$USER:$PASS" -X PUT \
    -H 'Content-Type: text/calendar; charset=utf-8' \
    --data-binary "$ics" \
    "$DAV_BASE/$slug/$name.ics" >/dev/null
}

# Build calendar list
CAL_SLUGS=()
for i in $(seq 1 "$CAL_COUNT"); do
  num=$(pad2 "$i"); CAL_SLUGS+=("$PREFIX-$num"); ensure_calendar "$PREFIX-$num"; done

# Monday of current week
MON=$(date -d 'monday this week' +%Y%m%d)

# Distribute TOTAL across week days
per=$(( TOTAL / 7 ))
rem=$(( TOTAL % 7 ))
echo "[seed_week_multi] TOTAL=$TOTAL, per-day=$per (+1 for first $rem days), calendars=$CAL_COUNT"

for i in {0..6}; do
  ymd=$(date -d "$MON +$i day" +%Y%m%d)
  dow=$(date -d "$MON +$i day" +%a)
  n=$per; if [ $i -lt $rem ]; then n=$((n+1)); fi
  echo "  Day $i ($dow $ymd): $n events"

  # Track per-calendar time cursor
  declare -A CUR_H=(); declare -A CUR_M=()
  for idx in $(seq 0 $((CAL_COUNT-1))); do CUR_H[$idx]=$START_H; CUR_M[$idx]=$START_M; done

  for seq in $(seq 1 $n); do
    idx=$(( (i + seq - 1) % CAL_COUNT ))
    slug=${CAL_SLUGS[$idx]}
    sh=$(pad2 ${CUR_H[$idx]}); sm=$(pad2 ${CUR_M[$idx]})
    iso="${ymd:0:4}-${ymd:4:2}-${ymd:6:2}"
    start_epoch=$(date -d "$iso $sh:$sm:00" +%s)
    end_epoch=$(( start_epoch + EVT_MIN*60 ))
    eh=$(date -d "@$end_epoch" +%H)
    em=$(date -d "@$end_epoch" +%M)
    uid="wk-$ymd-$seq-$slug"
    summ="Seeded $seq ($dow) [$slug]"
    ics=$(make_event_ics "$ymd" "$sh:$sm" "$eh:$em" "$uid" "$summ")
    put_event "$slug" "$uid" "$ics"
    gap_epoch=$(( end_epoch + GAP_MIN*60 ))
    CUR_H[$idx]=$(date -d "@$gap_epoch" +%H | sed 's/^0*//')
    CUR_M[$idx]=$(date -d "@$gap_epoch" +%M | sed 's/^0*//')
  done
done

echo "[seed_week_multi] Done. Open: $BASE_URL/index.php/apps/calendar/"
echo "[seed_week_multi] API check: $BASE_URL/index.php/apps/opsdash/config_dashboard/load?range=week&offset=0"
