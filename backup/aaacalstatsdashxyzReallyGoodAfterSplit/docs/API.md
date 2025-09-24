# API Reference

Base path: `/apps/aaacalstatsdashxyz`

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
  stats: { total_hours, avg_per_day, ... },
  byCal: [...], byDay: [...], longest: [...],
  charts: { pie, perDay, perDaySeries, dow, dowSeries, hod }
}
```

## Persist Selection (save)
- Method: POST `/config_dashboard/persist`
- Body: JSON `{ cals: string[]; groups?: Record<string,number> }`
- CSRF: required (`window.oc_requesttoken`)
- Response: `{ ok, saved, read, groups_saved?, groups_read? }`

## Save Selection (legacy)
- Method: POST `/config_dashboard/save`
- Body: JSON `{ cals: string[]; groups?: Record<string,number> }`
- CSRF: required
- Response: `{ ok, saved }`

## Notes (read)
- Method: GET `/config_dashboard/notes`
- Query: `range`, `offset` as above
- Response: `{ ok, period: { type, current_from, previous_from }, notes: { current, previous } }`

## Notes (save)
- Method: POST `/config_dashboard/notes`
- Body: `{ range: 'week'|'month', offset: number, content: string }` (max 32k)
- CSRF: required
- Response: `{ ok: true }`

## Ping (health)
- Method: GET `/config_dashboard/ping`
- Response: `{ ok, app, ts }`
