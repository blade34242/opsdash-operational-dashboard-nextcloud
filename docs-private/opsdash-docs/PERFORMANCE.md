# Performance Guide

## Server Aggregation
- Time range limited to week/month; offset clamped to +/-24.
- Soft caps: 2,000 events per calendar, 5,000 total per request.
- Response includes `meta.truncated` and `meta.limits` when caps are hit.
- Response cache is available; see `DEV_WORKFLOW.md` for toggles.

## Client Rendering
- Canvas draws are batched via `requestAnimationFrame`.
- Resize events are debounced; avoid observing large containers to prevent feedback loops.
- Heatmap uses a blue->purple gradient tuned for contrast.

## Tips
- For extremely busy users, suggest filtering calendars or switching to weekly range.
- Admins can monitor caps/truncation via logs and UI banner.
