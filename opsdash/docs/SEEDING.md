# Seeding Calendars for Testing

These scripts create non-overlapping dummy events via CalDAV so you can test the dashboard quickly on NC 31/32.

## Requirements
- Running dev stack (e.g., `docker-compose.yml` at http://localhost:8090 or `docker-compose31.yml` at http://localhost:8088)
- Nextcloud user credentials (dev image defaults to `admin:admin`)
- GNU `date` (standard on Linux)

## Create Seed Calendars (10)
- Script: `tools/create_calendars.sh`
- Creates 10 calendars `seed-cal-01` … `seed-cal-10` by default.

Examples:
- `BASE=http://localhost:8090 USER=admin PASS=admin ./tools/create_calendars.sh`
- `BASE=http://localhost:8088 USER=admin PASS=admin COUNT=5 PREFIX=demo-cal NAME_PREFIX="Demo Cal" ./tools/create_calendars.sh`

## Weekly Seeding (single calendar)
- Script: `tools/seed_week.sh`
- Calendar: `test-week` (override with `CAL_SLUG`/`CAL_NAME`)
- Default: `EVENTS=40` spread across Mon–Sun, sequential slots starting 08:00 (60m + 15m gap).

Examples:
- `BASE=http://localhost:8090 USER=admin PASS=admin ./tools/seed_week.sh`
- `BASE=http://localhost:8088 USER=admin PASS=admin CAL_SLUG=my-week EVENTS=40 ./tools/seed_week.sh`

## Monthly Seeding (single calendar)
- Script: `tools/seed_month.sh`
- Calendar: `test-month` (override with `CAL_SLUG`/`CAL_NAME`)
- Default: `EVENTS=250` spread across all days, slots from 07:30 (45m + 15m gap).

Examples:
- `BASE=http://localhost:8090 USER=admin PASS=admin ./tools/seed_month.sh`
- `BASE=http://localhost:8088 USER=admin PASS=admin CAL_SLUG=my-month EVENTS=250 ./tools/seed_month.sh`

## Weekly Seeding (10 calendars)
- Script: `tools/seed_week_multi.sh`
- Uses/creates calendars with prefix `seed-cal-01..10` by default.
- Distributes `TOTAL` events across 7 days and 10 calendars round‑robin, ensuring no overlaps within a calendar.

Examples:
- `BASE=http://localhost:8090 USER=admin PASS=admin ./tools/seed_week_multi.sh`
- `BASE=http://localhost:8090 USER=admin PASS=admin CAL_COUNT=10 PREFIX=seed-cal TOTAL=40 ./tools/seed_week_multi.sh`

## Monthly Seeding (10 calendars)
- Script: `tools/seed_month_multi.sh`
- Uses/creates calendars with prefix `seed-cal-01..10` by default.
- Distributes `TOTAL` events across month days and calendars round‑robin, non‑overlapping within a calendar.

Examples:
- `BASE=http://localhost:8090 USER=admin PASS=admin ./tools/seed_month_multi.sh`
- `BASE=http://localhost:8090 USER=admin PASS=admin CAL_COUNT=10 PREFIX=seed-cal TOTAL=250 ./tools/seed_month_multi.sh`

## Verify Data
- Calendar UI: `BASE/index.php/apps/calendar/`
- Dashboard API:
  - Week: `BASE/index.php/apps/opsdash/config_dashboard/load?range=week&offset=0`
  - Month: `BASE/index.php/apps/opsdash/config_dashboard/load?range=month&offset=0`

## Notes
- Times are saved in UTC (`Z`) to avoid timezone ambiguity. Adjust `START_*`, `EVT_MIN`, `GAP_MIN` via environment variables as needed.
- Scripts are idempotent for calendar creation; re-running adds new events with unique UIDs.
- To remove data, delete the specific calendar in the UI or
  `DELETE BASE/remote.php/dav/calendars/<user>/<slug>/` with caution.
