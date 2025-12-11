#!/usr/bin/env bash

# fetch_requesttoken <base_app_path> <user> <pass>
# base_app_path example: http://localhost:8088/index.php/apps/opsdash or http://127.0.0.1:8080/index.php/apps/opsdash
fetch_requesttoken() {
  local base="$1"
  local user="$2"
  local pass="$3"
  local url="${base%/}/overview"
  for headers in "-H OCS-APIREQUEST: true" ""; do
    token=$(curl -s -L -u "$user:$pass" $headers "$url" \
      | grep -o 'data-requesttoken="[^"]*"' \
      | head -n1 \
      | cut -d'"' -f2)
    if [[ -n "$token" ]]; then
      echo "$token"
      return 0
    fi
  done
  return 1
}
