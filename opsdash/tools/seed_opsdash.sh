#!/usr/bin/env bash
#
# Seed Nextcloud with realistic Opsdash data (calendars + Deck) for local/dev QA.
# - Creates users (admin/qa/qa2 by default).
# - Ensures Calendar + Deck apps are enabled.
# - Creates 3–5 calendars per user and uploads events for current week/month.
# - Creates 5 Deck boards with mixed open/done/archived cards across users.
# - Safe to re-run; calendar creation skips existing IDs, Deck boards reuse titles.
#
# Usage (from NC server root or set NC_ROOT):
#   NC_ROOT=../server BASE=http://localhost:8088 USER=admin PASS=admin \
#     QA_USER=qa QA_PASS=qa QA2_USER=qa2 QA2_PASS=qa2 \
#     bash tools/seed_opsdash.sh
#
# Requirements: bash, curl, php, Nextcloud instance with occ available.

set -euo pipefail

NC_ROOT=${NC_ROOT:-.}
BASE=${BASE:-http://localhost:8080}
ADMIN_USER=${ADMIN_USER:-admin}
ADMIN_PASS=${ADMIN_PASS:-admin}
QA_USER=${QA_USER:-qa}
QA_PASS=${QA_PASS:-qa}
QA2_USER=${QA2_USER:-qa2}
QA2_PASS=${QA2_PASS:-qa2}
APP_PATH=${APP_PATH:-}
WEEKS=${WEEKS:-4}

OCC_BIN="${NC_ROOT%/}/occ"
OCC="php ${OCC_BIN}"

require_occ() {
  if ! command -v php >/dev/null; then
    echo "php not found; install php first" >&2
    exit 1
  fi
  if [ ! -x "${OCC_BIN}" ]; then
    echo "occ not found at ${OCC_BIN}; set NC_ROOT to your Nextcloud root" >&2
    exit 1
  fi
}

enable_app() {
  local app=$1
  php "$OCC_BIN" app:install "$app" >/dev/null 2>&1 || true
  php "$OCC_BIN" app:enable "$app" >/dev/null 2>&1 || true
}

resolve_app_path() {
  if [ -n "$APP_PATH" ] && [ -d "$APP_PATH" ]; then
    echo "$APP_PATH"
    return
  fi
  local candidates=(
    "${NC_ROOT%/}/apps/opsdash"
    "${NC_ROOT%/}/apps-extra/opsdash"
    "${NC_ROOT%/}/apps-extra/aaacalstatsdashxyz"
  )
  for path in "${candidates[@]}"; do
    if [ -d "$path" ]; then
      APP_PATH="$path"
      echo "$APP_PATH"
      return
    fi
  done
  echo "App path not found; set APP_PATH to your opsdash app directory" >&2
  exit 1
}

ensure_user() {
  local user=$1 pass=$2 display=$3
  if ! php "$OCC_BIN" user:list --output=json | grep -q "\"$user\""; then
    OC_PASS="$pass" php "$OCC_BIN" user:add --password-from-env --display-name="$display" "$user"
  fi
}

create_calendar() {
  local user=$1 cal_id=$2 color=$3
  php "$OCC_BIN" dav:create-calendar "$user" "$cal_id" >/dev/null 2>&1 || true
}

rfc3339_z() {
  date -u -d "$1" "+%Y%m%dT%H%M%SZ"
}

put_event() {
  local user=$1 pass=$2 cal=$3 uid=$4 summary=$5 start=$6 end=$7
  local url="${BASE%/}/remote.php/dav/calendars/${user}/${cal}/${uid}.ics"
  cat <<EOF | curl -sS -u "${user}:${pass}" -X PUT -T - "$url" >/dev/null
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Opsdash//seed//EN
BEGIN:VEVENT
UID:${uid}
SUMMARY:${summary}
DTSTART:${start}
DTEND:${end}
END:VEVENT
END:VCALENDAR
EOF
}

seed_calendar_events() {
  local user=$1 pass=$2 cal=$3
  # Seed past-only weeks (default 4) with realistic work + weekend events
  for i in $(seq 0 $((WEEKS-1))); do
    local offset=$((i+1))
    put_event "$user" "$pass" "$cal" "${cal}-w${offset}-mon-standup" "Team standup" "$(rfc3339_z "${offset} weeks ago monday 09:00")" "$(rfc3339_z "${offset} weeks ago monday 09:30")"
    put_event "$user" "$pass" "$cal" "${cal}-w${offset}-mon-focus" "Deep work (feature)" "$(rfc3339_z "${offset} weeks ago monday 14:00")" "$(rfc3339_z "${offset} weeks ago monday 16:00")"
    put_event "$user" "$pass" "$cal" "${cal}-w${offset}-tue-arch" "Architecture review" "$(rfc3339_z "${offset} weeks ago tuesday 11:00")" "$(rfc3339_z "${offset} weeks ago tuesday 12:30")"
    put_event "$user" "$pass" "$cal" "${cal}-w${offset}-wed-pair" "Pairing session (backend)" "$(rfc3339_z "${offset} weeks ago wednesday 10:00")" "$(rfc3339_z "${offset} weeks ago wednesday 12:00")"
    put_event "$user" "$pass" "$cal" "${cal}-w${offset}-thu-1on1" "1:1 with manager" "$(rfc3339_z "${offset} weeks ago thursday 15:00")" "$(rfc3339_z "${offset} weeks ago thursday 16:30")"
    put_event "$user" "$pass" "$cal" "${cal}-w${offset}-fri-review" "Sprint review" "$(rfc3339_z "${offset} weeks ago friday 09:00")" "$(rfc3339_z "${offset} weeks ago friday 11:00")"
    put_event "$user" "$pass" "$cal" "${cal}-w${offset}-fri-bugbash" "Bug bash" "$(rfc3339_z "${offset} weeks ago friday 13:00")" "$(rfc3339_z "${offset} weeks ago friday 15:00")"
    put_event "$user" "$pass" "$cal" "${cal}-w${offset}-sat-family" "Family brunch" "$(rfc3339_z "${offset} weeks ago saturday 10:00")" "$(rfc3339_z "${offset} weeks ago saturday 12:00")"
    put_event "$user" "$pass" "$cal" "${cal}-w${offset}-sun-friends" "Friends BBQ" "$(rfc3339_z "${offset} weeks ago sunday 17:00")" "$(rfc3339_z "${offset} weeks ago sunday 19:00")"
  done
}

seed_calendars() {
  echo "[seed] calendars"
  create_calendar "$ADMIN_USER" "opsdash-work" "#2563EB"
  create_calendar "$ADMIN_USER" "opsdash-personal" "#F59E0B"
  create_calendar "$QA_USER" "opsdash-qa" "#10B981"
  create_calendar "$QA2_USER" "opsdash-qa2" "#A855F7"
  seed_calendar_events "$ADMIN_USER" "$ADMIN_PASS" "opsdash-work"
  seed_calendar_events "$ADMIN_USER" "$ADMIN_PASS" "opsdash-personal"
  seed_calendar_events "$QA_USER" "$QA_PASS" "opsdash-qa"
  seed_calendar_events "$QA2_USER" "$QA2_PASS" "opsdash-qa2"
}

seed_deck() {
  echo "[seed] deck boards + cards"
  local app_path
  app_path=$(resolve_app_path)
  # Board titles + colors reused per user to keep fixtures predictable.
  local titles=(
    "Opsdash Ops QA"
    "Opsdash Roadmap"
    "Opsdash Support"
    "Opsdash Automation"
    "Opsdash Experiments"
  )
  local colors=("#2563EB" "#F97316" "#0EA5E9" "#10B981" "#A855F7")
  seed_for_user() {
    local user=$1
    local other=$2
    local idx=0
    for title in "${titles[@]}"; do
      local color=${colors[$idx]:-"#2563EB"}
      QA_USER="$user" QA_DECK_BOARD_TITLE="$title" QA_DECK_BOARD_COLOR="$color" QA_DECK_KEEP_STACKS=1 QA_OTHER_USER="$other" \
        php "${app_path%/}/tools/seed_deck_boards.php"
      idx=$((idx + 1))
    done
  }

  # Seed boards for QA (default owner) and also for admin so both users see Deck cards.
  seed_for_user "$QA_USER" "$QA2_USER"
  seed_for_user "$ADMIN_USER" "$QA_USER"
}

main() {
  require_occ
  echo "[seed] enabling apps calendar+deck"
  enable_app calendar
  enable_app deck

  echo "[seed] users"
  ensure_user "$ADMIN_USER" "$ADMIN_PASS" "Admin User"
  ensure_user "$QA_USER" "$QA_PASS" "QA User"
  ensure_user "$QA2_USER" "$QA2_PASS" "QA User 2"

  seed_calendars
  seed_deck

  echo "[seed] done. Test at ${BASE%/}/index.php/apps/opsdash"
}

main "$@"
