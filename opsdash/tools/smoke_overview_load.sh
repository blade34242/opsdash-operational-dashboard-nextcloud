#!/usr/bin/env bash
set -euo pipefail

container="${1:-}"
user="${2:-}"
pass="${3:-}"

if [[ -z "$container" || -z "$user" || -z "$pass" ]]; then
  echo "usage: $0 <container> <user> <pass>" >&2
  exit 2
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "[smoke] docker is not available" >&2
  exit 2
fi

if ! docker inspect "$container" >/dev/null 2>&1; then
  echo "[smoke] container not found: $container" >&2
  exit 2
fi

url="http://localhost/index.php/apps/opsdash/overview/load?range=week&offset=0"

if docker exec "$container" sh -lc 'command -v jq >/dev/null 2>&1' ; then
  docker exec "$container" sh -lc \
    "curl -sS -u \"$user:$pass\" -H 'OCS-APIREQUEST: true' \"$url\" | jq -e '.ok==true and (.stats.balance_overview|type==\"object\")' >/dev/null"
else
  docker exec "$container" sh -lc \
    "curl -sS -u \"$user:$pass\" -H 'OCS-APIREQUEST: true' \"$url\" | grep -q '\"balance_overview\"'"
fi

echo "[smoke] ok"

