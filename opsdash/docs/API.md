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
  charts: {
    pie,
    perDay,
    perDaySeries, // labels always span the full requested range; missing days are filled with 0 totals so the SPA can render projections for future dates.
    dow,
    dowSeries,
    hod
  }
}
```

## Persist Selection (save)
- Method: POST `/config_dashboard/persist`
- Body: JSON `{ cals: string[]; groups?: Record<string,number>; targets_week?: Record<string,number>; targets_month?: Record<string,number> }`
- Optional: include `targets_config` (mirrors the structure returned by `/load`, covering `categories`, `pace`, `forecast`, `ui`, `timeSummary`, `activityCard`, `balance`). The `activityCard` payload now carries a `forecastMode` field (`off` | `total` | `calendar` | `category`) which drives the per-day projection overlay in the stacked charts.
- CSRF: required (`window.oc_requesttoken`)
- Response: `{ ok, saved, read, groups_saved?, groups_read?, targets_week_saved?, targets_week_read?, targets_month_saved?, targets_month_read?, targets_config_saved?, targets_config_read?, warnings? }`

Errors
- Validation failures return **HTTP 400** with a structured payload:
  ```json
  {
    "ok": false,
    "message": "Validation failed",
    "errors": [
      {
        "field": "targets_week.cal-a1",
        "message": "Enter a valid number",
        "severity": "error",
        "code": "invalid_number",
        "expected": { "min": 0, "max": 10000, "step": 0.25 },
        "received": "abc"
      }
    ],
    "warnings": [
      {
        "field": "targets_month.cal-a1",
        "message": "Adjusted to allowed value (Allowed range 0 - 10000, step 0.25)",
        "severity": "warning",
        "code": "number_adjusted",
        "expected": { "min": 0, "max": 10000, "step": 0.25 },
        "received": "10000.8",
        "adjusted": 10000
      }
    ]
  }
  ```
- `errors` contains the fields that blocked the save; `warnings` (optional) lists values that were clamped during a successful save so the client can surface inline feedback. Messages honour the requester’s locale via Nextcloud l10n.

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

## Presets
- List summaries
  - Method: GET `/config_dashboard/presets`
  - Response: `{ ok, presets: Array<{ name, createdAt, updatedAt, selectedCount, calendarCount }> }`
- Save/overwrite preset
  - Method: POST `/config_dashboard/presets`
  - Body: `{ name: string, selected: string[], groups: Record<string,number>, targets_week: Record<string,number>, targets_month: Record<string,number>, targets_config: TargetsConfig }`
  - Response: `{ ok, preset: { name, createdAt, updatedAt }, presets: [...], warnings?: string[] }`
  - Notes: payload is sanitised against the user’s current calendars; unknown ids are dropped with a warning.
- Load preset
  - Method: GET `/config_dashboard/presets/{name}`
  - Response: `{ ok, preset: { name, createdAt, updatedAt, selected, groups, targets_week, targets_month, targets_config, warnings?: string[] }, warnings?: string[] }`
  - The response already includes a sanitised payload; if warnings are present the client should surface them (and ideally ask for confirmation) before applying the result.
- Delete preset
  - Method: DELETE `/config_dashboard/presets/{name}`
  - Response: `{ ok, presets: [...] }`
