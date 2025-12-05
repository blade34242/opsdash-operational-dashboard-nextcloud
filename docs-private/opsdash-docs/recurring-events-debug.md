Recurring Events Debug (nc31-dev)
=================================

Context
-------
- Tests were run against the local Nextcloud dev container `nc31-dev`.
- Host access to `http://localhost:8088` is blocked; use `docker exec` to query OpsDash APIs from inside the container.

Seeded series (calendar: Personal/admin)
----------------------------------------
- **Daily 10d w/ exceptions**: UID `daily1@opsdash`; start 2025-12-01 10:00 UTC; COUNT=10; EXDATE 2025-12-05, 2025-12-08; override on 2025-12-07 at 12:00.
- **Weekly M/W/F**: UID `weekly1@opsdash`; start 2025-12-01 09:00 UTC; BYDAY=MO,WE,FR; UNTIL=2026-01-31; EXDATE 2025-12-05; override on 2025-12-12 15:00.
- **Monthly on 31st (all-day)**: UID `monthly31@opsdash`; start 2025-12-31 all-day; COUNT=3 (tests month-end edge).
- Existing single events remain untouched.

How to fetch payloads (inside container)
----------------------------------------
Week view (offset 0):
```bash
docker exec nc31-dev curl -s -u admin:admin \
  -H 'OCS-APIREQUEST: true' \
  'http://localhost/index.php/apps/opsdash/overview/load?range=week&offset=0' | jq .
```

Month view (offset 0):
```bash
docker exec nc31-dev curl -s -u admin:admin \
  -H 'OCS-APIREQUEST: true' \
  'http://localhost/index.php/apps/opsdash/overview/load?range=month&offset=0' | jq .
```

Current observations (2025-12 ranges)
-------------------------------------
- Week payload (2025-12-01..12-07): 6 events, `truncated=false`; includes daily series, weekly series (with EXDATE/override applied), and single events.
- Month payload (2025-12-01..12-31): 8 events, `truncated=false`; includes the monthly day-31 all-day instance and weekly/daily occurrences plus overrides.
- Balance meta shows trend history for offsets 1..4; offset 0 remains present when `showCurrent` is enabled.

Notes / follow-ups
------------------
- Use container curling for any repro; host cannot reach the Nextcloud port.
- If you need other offsets, change `offset=` in the URLs (negative = past).
- If the payload ever reports `truncated=true`, raise limits or narrow the calendar selection to debug missing instances.
