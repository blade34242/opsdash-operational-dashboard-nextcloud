# API Reference

Base path: `/apps/opsdash`

## Routing & Controllers (internal)
- `/overview/load`, `/overview`, `/overview/ping` -> `OverviewController`
- `/overview/persist` -> `PersistController`
- `/overview/notes` (GET/POST) -> `NotesController`
- `/overview/presets` -> `PresetsController` (profile storage; endpoint name unchanged)

## Load Statistics (read-only)
- Method: GET `/overview/load`
- Query params:
  - `range`: `week` | `month` (default: `week`)
  - `offset`: integer -24..24 (default: 0)
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
  targetsConfig: { ... },
  reportingConfig: { ... },
  deckSettings: { ... },
  themePreference: 'auto'|'light'|'dark',
  stats: { total_hours, avg_per_day, ... },
  byCal: [...], byDay: [...], longest: [...],
  charts: {
    pie,
    perDay,
    perDaySeries, // labels always span the full requested range; missing days are filled with 0 totals so the SPA can render projections for future dates.
    dow,
    dowSeries,
    hod
  },
  widgets: {
    defaultTabId: string,
    tabs: [
      { id: string, label: string, widgets: Array<{ id, type, layout, options?, version }> }
    ]
  },
  onboarding: { completed, version, ... }
}
```

## Persist Selection (save)
- Method: POST `/overview/persist`
- Body: JSON `{ cals: string[]; groups?: Record<string,number>; targets_week?: Record<string,number>; targets_month?: Record<string,number>; targets_config?: TargetsConfig; widgets?: WidgetTabsState; theme_preference?: 'auto'|'light'|'dark'; reporting_config?: ReportingConfig; deck_settings?: DeckFeatureSettings }`
- Notes: `targets_config` mirrors `/load` (categories, pace, forecast, ui, timeSummary, activityCard, balance). Legacy balance precision fields are ignored server-side.
- CSRF: required (`window.oc_requesttoken`)
- Response (sanitised echo):
  `{ ok, saved, read, groups_read?, targets_week_read?, targets_month_read?, targets_config_read?, theme_preference_read?, reporting_config_read?, deck_settings_read?, widgets_read? }`

Example (replace cookie + token with values from your browser session):
```bash
BASE="http://localhost:8088"
TOKEN="OcQ7.../Aa=="                 # from window.oc_requesttoken
COOKIES="oc_sessionPassphrase=k...; oc8abcd123ef=2...; NC_CSRF_TOKEN=$TOKEN"

curl -sS "${BASE}/index.php/apps/opsdash/overview/persist" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "requesttoken: ${TOKEN}" \
  -H "Cookie: ${COOKIES}" \
  -d '{"cals":["cal-1","cal-2"],"targets_week":{"cal-1":24,"cal-2":12}}' | jq
```

Validation
- `cals`: intersected with user's calendars; unknown ids ignored.
- `groups`: per-calendar 0..9; missing ids default to 0 (the UI sets these automatically when a category is chosen).
- `targets_*`: per-calendar hours clamped to [0..10000], decimals allowed; unknown ids ignored.

## Notes (read)
- Method: GET `/overview/notes`
- Query: `range`, `offset` as above
- Response: `{ ok, period: { type, current_from, previous_from }, notes: { current, previous } }`

## Notes (save)
- Method: POST `/overview/notes`
- Body: `{ range: 'week'|'month', offset: number, content: string }` (max 32k)
- CSRF: required
- Response: `{ ok: true }`

Example:
```bash
BASE="http://localhost:8088"
TOKEN="OcQ7.../Aa=="
COOKIES="oc_sessionPassphrase=k...; oc8abcd123ef=2...; NC_CSRF_TOKEN=$TOKEN"

curl -sS "${BASE}/index.php/apps/opsdash/overview/notes" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "requesttoken: ${TOKEN}" \
  -H "Cookie: ${COOKIES}" \
  -d '{"range":"week","offset":0,"content":"Updated via curl OK"}' | jq
```

## Ping (health)
- Method: GET `/overview/ping`
- Response: `{ ok, app, version, changelog, ts }`

## Profiles (endpoint: `/overview/presets`)
- List summaries
  - Method: GET `/overview/presets`
  - Response: `{ ok, presets: Array<{ name, createdAt, updatedAt, selectedCount, calendarCount }> }`
- Save/overwrite profile
  - Method: POST `/overview/presets`
  - Body: `{ name: string, selected: string[], groups: Record<string,number>, targets_week: Record<string,number>, targets_month: Record<string,number>, targets_config: TargetsConfig, widgets?: WidgetTabsState, theme_preference?: string, deck_settings?: DeckFeatureSettings, reporting_config?: ReportingConfig }`
  - Response: `{ ok, preset: { name, createdAt, updatedAt }, presets: [...], warnings?: string[] }`
  - Notes: payload is sanitised against the user's current calendars; unknown ids are dropped with a warning.
- Load profile
  - Method: GET `/overview/presets/{name}`
  - Response: `{ ok, preset: { name, createdAt, updatedAt, selected, groups, targets_week, targets_month, targets_config, widgets?, theme_preference?, deck_settings?, reporting_config?, warnings?: string[] }, warnings?: string[] }`
  - The response already includes a sanitised payload; if warnings are present the client should surface them before applying the result.
- Delete profile
  - Method: DELETE `/overview/presets/{name}`
  - Response: `{ ok, presets: [...] }`
