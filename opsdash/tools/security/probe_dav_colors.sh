#!/usr/bin/env bash
set -euo pipefail

BASE=${OPSDASH_BASE:-http://localhost:8080/index.php/apps/opsdash}
ROOT=${BASE%%/index.php/apps/opsdash*}
ROOT=${ROOT%/}
USER=${OPSDASH_USER:-admin}
PASS=${OPSDASH_PASS:-admin}
CALENDAR=${CALDAV_CALENDAR:-personal}
DAV_BASE=${OPSDASH_DAV_BASE:-}

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing $1" >&2; exit 1; }; }
need curl
need jq >/dev/null 2>&1 || true

declare -a CANDIDATE_URLS=()
if [[ -n "$DAV_BASE" ]]; then
  DAV_BASE=${DAV_BASE%/}
  CANDIDATE_URLS+=("$DAV_BASE/calendars/$USER/$CALENDAR/")
fi
CANDIDATE_URLS+=("$ROOT/remote.php/dav/calendars/$USER/$CALENDAR/")
CANDIDATE_URLS+=("$ROOT/index.php/apps/dav/calendars/$USER/$CALENDAR/")

BODY='<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:ical="http://apple.com/ns/ical/"><d:prop><ical:calendar-color/></d:prop></d:propfind>'

curl_flags=()
if [[ "${OPSDASH_CURL_INSECURE:-}" != "" ]]; then
  curl_flags+=("-k")
fi

HTTP_STATUS=0
BODY_CONTENT=""
LAST_URL=""

for URL in "${CANDIDATE_URLS[@]}"; do
  LAST_URL="$URL"
  echo "[dav-probe] PROPFIND $URL"
  RESPONSE=$(curl -s "${curl_flags[@]}" -u "$USER:$PASS" -w '%{http_code}' -X PROPFIND -H 'Depth: 0' -H 'Content-Type: application/xml' --data "$BODY" "$URL" || true)
  HTTP_STATUS=${RESPONSE: -3}
  BODY_CONTENT=${RESPONSE::-3}
  # Accept only a non-empty 200 response
  if { [[ "$HTTP_STATUS" == "200" ]] || [[ "$HTTP_STATUS" == "207" ]]; } && [[ -n "$BODY_CONTENT" ]]; then
    break
  fi
done

if [[ "$HTTP_STATUS" == "405" ]]; then
  echo "[dav-probe] WARNING: PROPFIND returned 405 (likely server config); trying /overview/load color fallback." >&2
  COLOR_FALLBACK=$(curl -s "${curl_flags[@]}" -u "$USER:$PASS" -H 'OCS-APIREQUEST: true' "$BASE/overview/load?range=week&offset=0" \
    | grep -o "\"$CALENDAR\" *: *\"#[0-9A-Fa-f]\\{6\\}\"" \
    | head -n1 \
    | sed 's/.*:\"\\(#[0-9A-Fa-f]\\{6\\}\\)\"/\\1/')
  if [[ -n "$COLOR_FALLBACK" ]]; then
    printf '[dav-probe] fallback color via /overview/load %s => %s\n' "$CALENDAR" "$COLOR_FALLBACK"
    exit 0
  fi
  exit 0
fi

if [[ -z "$BODY_CONTENT" ]]; then
  echo "CalDAV request failed (empty response, status $HTTP_STATUS) [$LAST_URL]" >&2
  exit 7
fi
if [[ "$HTTP_STATUS" != "200" && "$HTTP_STATUS" != "207" ]]; then
  echo "CalDAV request failed (status $HTTP_STATUS): $LAST_URL" >&2
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
