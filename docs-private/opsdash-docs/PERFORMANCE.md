# Performance Guide

## Server Aggregation
- Time range limited to week/month; offset clamped to +/-24.
- Soft caps: 2,000 events per calendar, 5,000 total per request.
- Response includes `meta.truncated` and `meta.limits` when caps are hit.
- Response cache is available; see `DEV_WORKFLOW.md` for toggles.
- Lookback chart history is optional and only computed when `include=lookback` is requested.

## Client Rendering
- Canvas draws are batched via `requestAnimationFrame`.
- Resize events are debounced; avoid observing large containers to prevent feedback loops.
- Heatmap uses a blue->purple gradient tuned for contrast.
- Initial load uses core-first/data-second: layout renders after the core payload, then charts/stats hydrate on the data payload.
- Default widget presets are bootstrapped in the HTML template to avoid a blank main area on hard reloads.

## Tips
- For extremely busy users, suggest filtering calendars or switching to weekly range.
- Admins can monitor caps/truncation via logs and UI banner.
