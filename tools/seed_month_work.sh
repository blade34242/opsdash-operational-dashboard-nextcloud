#!/usr/bin/env bash
#
# Seed a realistic work-focused dataset covering the current (or offset) month.
# Creates multiple calendars (Focus, Sync, Support, Wellness) and populates
# weekdays with structured work blocks while keeping weekends for recovery.
# Existing UIDs are overwritten so the script can be re-run safely.
#
# Usage (defaults shown):
#   BASE=http://localhost:8088 USER=admin PASS=admin ./tools/seed_month_work.sh
#   BASE=... USER=... PASS=... MONTH_OFFSET=1 ./tools/seed_month_work.sh  # seed next month
#
set -euo pipefail

BASE_URL=${BASE:-http://localhost:8088}
USER=${USER:-admin}
PASS=${PASS:-admin}
MONTH_OFFSET=${MONTH_OFFSET:-0}

DAV_BASE="$BASE_URL/remote.php/dav/calendars/$USER"

declare -A CALENDARS=(
  ["opsdash-focus"]="Opsdash · Focus Blocks"
  ["opsdash-sync"]="Opsdash · Sync & Meetings"
  ["opsdash-support"]="Opsdash · Support & Reviews"
  ["opsdash-wellness"]="Opsdash · Wellness & Personal"
)

log() { printf '[seed_month_work] %s\n' "$*"; }

utc_ts() {
  local stamp="$1"
  date -u -d "$stamp" +%Y%m%dT%H%M%SZ
}

ensure_calendar() {
  local slug="$1"
  local name="$2"
  local url="$DAV_BASE/$slug/"
  local body='<?xml version="1.0" encoding="utf-8"?>
  <c:mkcalendar xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
    <d:set>
      <d:prop>
        <d:displayname>'"$name"'</d:displayname>
        <c:calendar-description>Seeded by seed_month_work.sh</c:calendar-description>
      </d:prop>
    </d:set>
  </c:mkcalendar>'
  curl -fsS -u "$USER:$PASS" -X MKCALENDAR \
    -H 'Content-Type: application/xml; charset=utf-8' \
    --data-binary "$body" \
    "$url" >/dev/null || true
}

make_event_ics() {
  local date_iso="$1"; shift
  local start="$1"; shift
  local end="$1"; shift
  local uid="$1"; shift
  local summary="$1"; shift
  cat <<ICS
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//opsdash//seed-month-work//EN
BEGIN:VEVENT
UID:$uid@opsdash-seed
DTSTAMP:$(date -u +%Y%m%dT%H%M%SZ)
DTSTART:$(utc_ts "$date_iso $start:00")
DTEND:$(utc_ts "$date_iso $end:00")
SUMMARY:$summary
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
ICS
}

put_event() {
  local slug="$1"; shift
  local name="$1"; shift
  local ics_payload="$1"
  curl -fsS -u "$USER:$PASS" -X PUT \
    -H 'Content-Type: text/calendar; charset=utf-8' \
    --data-binary "$ics_payload" \
    "$DAV_BASE/$slug/$name.ics" >/dev/null
}

add_block() {
  local slug="$1"
  local date_iso="$2"
  local start="$3"
  local minutes="$4"
  local title="$5"

  local start_epoch
  start_epoch=$(date -d "$date_iso $start:00" +%s)
  local end_epoch=$(( start_epoch + minutes * 60 ))
  local end_time
  end_time=$(date -d "@$end_epoch" +%H:%M)
  local uid="work-${date_iso//-/}-${slug}-${start//:/}"

  local ics
  ics=$(make_event_ics "$date_iso" "$start" "$end_time" "$uid" "$title")
  put_event "$slug" "$uid" "$ics"
}

for slug in "${!CALENDARS[@]}"; do
  ensure_calendar "$slug" "${CALENDARS[$slug]}"
done

MONTH_START=$(date -d "$(date +%Y-%m-01) +${MONTH_OFFSET} month" +%Y-%m-01)
YM_HUMAN=$(date -d "$MONTH_START" +%B\ %Y)
DAYS_IN_MONTH=$(date -d "$MONTH_START +1 month -1 day" +%d | sed 's/^0*//')

log "Populating calendars for $YM_HUMAN ($DAYS_IN_MONTH days, offset $MONTH_OFFSET)"

for offset in $(seq 0 $((DAYS_IN_MONTH - 1))); do
  date_iso=$(date -d "$MONTH_START +$offset day" +%Y-%m-%d)
  dow=$(date -d "$date_iso" +%u) # 1=Mon .. 7=Sun

  case "$dow" in
    1) # Monday
      add_block opsdash-focus   "$date_iso" "09:00" 150 "Weekly roadmap & deep work"
      add_block opsdash-sync    "$date_iso" "11:45" 45  "Week kickoff sync"
      add_block opsdash-focus   "$date_iso" "13:30" 120 "Project implementation sprint"
      add_block opsdash-support "$date_iso" "16:00" 75  "Inbox triage & reviews"
      add_block opsdash-wellness "$date_iso" "18:15" 60 "Strength reset"
      ;;
    2) # Tuesday
      add_block opsdash-focus   "$date_iso" "08:30" 135 "Design & architecture block"
      add_block opsdash-sync    "$date_iso" "11:45" 30  "Daily stand-up"
      add_block opsdash-focus   "$date_iso" "13:15" 120 "Feature build loop"
      add_block opsdash-sync    "$date_iso" "15:45" 60  "Customer feedback review"
      add_block opsdash-wellness "$date_iso" "18:30" 75 "Evening ride"
      ;;
    3) # Wednesday
      add_block opsdash-focus   "$date_iso" "09:00" 180 "Deep work marathon"
      add_block opsdash-sync    "$date_iso" "13:00" 60  "Product alignment"
      add_block opsdash-support "$date_iso" "15:15" 90  "Mentoring & code reviews"
      add_block opsdash-wellness "$date_iso" "19:00" 60 "Family dinner"
      ;;
    4) # Thursday
      add_block opsdash-focus   "$date_iso" "08:30" 150 "Experiment iteration"
      add_block opsdash-sync    "$date_iso" "11:45" 45  "Cross-team sync"
      add_block opsdash-focus   "$date_iso" "13:30" 120 "Delivery prep"
      add_block opsdash-support "$date_iso" "16:00" 60  "Operations window"
      add_block opsdash-wellness "$date_iso" "18:30" 60 "Run & reset"
      ;;
    5) # Friday
      add_block opsdash-focus   "$date_iso" "09:00" 120 "Wrap-up & documentation"
      add_block opsdash-sync    "$date_iso" "11:30" 45  "Demo + retrospective"
      add_block opsdash-support "$date_iso" "14:00" 90  "Planning next sprint"
      add_block opsdash-wellness "$date_iso" "17:30" 120 "Unplug & recharge"
      ;;
    6) # Saturday
      add_block opsdash-wellness "$date_iso" "09:30" 180 "Weekend adventure"
      add_block opsdash-wellness "$date_iso" "18:00" 90  "Recovery session"
      ;;
    7) # Sunday
      add_block opsdash-wellness "$date_iso" "10:00" 150 "Slow morning & brunch"
      add_block opsdash-wellness "$date_iso" "16:00" 120 "Creative recharge"
      ;;
  esac
done

log "Done. Calendars:"
for slug in "${!CALENDARS[@]}"; do
  log "  - ${CALENDARS[$slug]} → $BASE_URL/remote.php/dav/calendars/$USER/$slug/"
done
log "Calendar UI: $BASE_URL/index.php/apps/calendar/"
log "Opsdash load (month): $BASE_URL/index.php/apps/opsdash/overview/load?range=month&offset=$MONTH_OFFSET"
