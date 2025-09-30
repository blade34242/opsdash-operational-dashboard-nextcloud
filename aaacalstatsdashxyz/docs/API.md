# API Reference

Base path: `/apps/opsdash`

## Load Statistics (read-only)
- Method: GET `/dashboard/load`
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
- Method: POST `/dashboard/persist`
- Body: JSON `{ cals: string[]; groups?: Record<string,number>; targets_week?: Record<string,number>; targets_month?: Record<string,number> }`
- CSRF: required (`window.oc_requesttoken`)
- Response: `{ ok, saved, read, groups_saved?, groups_read?, targets_week_saved?, targets_week_read?, targets_month_saved?, targets_month_read? }`

Validation
- `cals`: intersected with user’s calendars; unknown ids ignored.
- `groups`: per-calendar 0..9; missing ids default to 0.
- `targets_*`: per-calendar hours clamped to [0..10000], decimals allowed; unknown ids ignored.

## Save Selection (legacy)
- Method: POST `/dashboard/save`
- Body: JSON `{ cals: string[]; groups?: Record<string,number> }`
- CSRF: required
- Response: `{ ok, saved }`

## Notes (read)
- Method: GET `/dashboard/notes`
- Query: `range`, `offset` as above
- Response: `{ ok, period: { type, current_from, previous_from }, notes: { current, previous } }`

## Notes (save)
- Method: POST `/dashboard/notes`
- Body: `{ range: 'week'|'month', offset: number, content: string }` (max 32k)
- CSRF: required
- Response: `{ ok: true }`

## Ping (health)
- Method: GET `/dashboard/ping`
- Response: `{ ok, app, ts }`
