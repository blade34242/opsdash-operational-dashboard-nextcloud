# API Reference

Base path: `/apps/opsdash`

## Load Statistics (read-only)
- Method: GET `/config_dashboard/load`
- Query params:
  - `range`: `week` | `month` (default: `week`)
  - `offset`: integer −24..24 (default: 0)
  - Optional preview: `cals[]=id` or `calsCsv=id1,id2`
- Response: JSON
```
{
  ok: true,
  meta: {
    uid: string,
    range: 'week'|'month',
    offset: number,
    from: 'YYYY-MM-DD', to: 'YYYY-MM-DD',
    truncated: boolean,
    limits: { maxPerCal: number, maxTotal: number, totalProcessed: number }
  },
  calendars: [{ id, displayname, color }],
  selected: [id,...],
  colors: { byId: { [id]: '#RRGGBB' }, byName: { [name]: '#RRGGBB' } },
  groups: { byId: { [id]: 0..9 } },
  targets: { week: { [id]: number }, month: { [id]: number } },
  stats: { total_hours, avg_per_day, ... },
  byCal: [...], byDay: [...], longest: [...],
  charts: { pie, perDay, perDaySeries, dow, dowSeries, hod }
}
```

## Persist Selection (save)
- Method: POST `/config_dashboard/persist`
- Body: JSON `{ cals: string[]; groups?: Record<string,number>; targets_week?: Record<string,number>; targets_month?: Record<string,number> }`
- Optional: include `targets_config` (mirrors the structure returned by `/load`, covering `categories`, `pace`, `forecast`, `ui`, `timeSummary`, `activityCard`, `balance`).
- CSRF: required (`window.oc_requesttoken`)
- Response: `{ ok, saved, read, groups_saved?, groups_read?, targets_week_saved?, targets_week_read?, targets_month_saved?, targets_month_read? }`

Example (replace cookie + token with values from your browser session):
```bash
BASE="http://localhost:8088"
TOKEN="OcQ7.../Aa=="                 # from window.oc_requesttoken
COOKIES="oc_sessionPassphrase=k...; oc8abcd123ef=2...; NC_CSRF_TOKEN=$TOKEN"

curl -sS "${BASE}/index.php/apps/opsdash/config_dashboard/persist" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "requesttoken: ${TOKEN}" \
  -H "Cookie: ${COOKIES}" \
  -d '{"cals":["cal-1","cal-2"],"targets_week":{"cal-1":24,"cal-2":12}}' | jq
```

Validation
- `cals`: intersected with user’s calendars; unknown ids ignored.
- `groups`: per-calendar 0..9; missing ids default to 0 (the UI sets these automatically when a category is chosen).
- `targets_*`: per-calendar hours clamped to [0..10000], decimals allowed; unknown ids ignored.

## Notes (read)
- Method: GET `/config_dashboard/notes`
- Query: `range`, `offset` as above
- Response: `{ ok, period: { type, current_from, previous_from }, notes: { current, previous } }`

## Notes (save)
- Method: POST `/config_dashboard/notes`
- Body: `{ range: 'week'|'month', offset: number, content: string }` (max 32k)
- CSRF: required
- Response: `{ ok: true }`

Example:
```bash
BASE="http://localhost:8088"
TOKEN="OcQ7.../Aa=="
COOKIES="oc_sessionPassphrase=k...; oc8abcd123ef=2...; NC_CSRF_TOKEN=$TOKEN"

curl -sS "${BASE}/index.php/apps/opsdash/config_dashboard/notes" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "requesttoken: ${TOKEN}" \
  -H "Cookie: ${COOKIES}" \
  -d '{"range":"week","offset":0,"content":"Updated via curl ✔"}' | jq
```

## Ping (health)
- Method: GET `/config_dashboard/ping`
- Response: `{ ok, app, ts }`
