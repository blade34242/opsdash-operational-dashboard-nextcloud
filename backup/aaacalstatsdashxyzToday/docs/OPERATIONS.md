# Operations Guide

## Requirements
- Nextcloud 32
- Node.js 18+ to build frontend (dev only)

## Deploy
1. Place app directory under `apps/aaacalstatsdashxyz/`.
2. Run `npm ci && npm run build` to generate `js/main46.js`.
3. Enable the app in Nextcloud admin.

## Logs & Metrics
- App logs use Nextcloud logging; set system log level to Debug to see query diagnostics (non-sensitive).
- Optional aggregate metrics are available via admin settings. Only counters are kept.

## CSP
- CSS is loaded via `Util::addStyle($app, 'style')`.
- No inline scripts; avoid adding any inline styles in templates.

## Performance Caps
- Aggregation caps are reported in `meta.truncated` and `meta.limits`.
- If users often hit caps, consider narrowing calendar selection or reducing range.

## Troubleshooting
- If the frontend does not load, verify `js/main46.js` is present and readable.
- For missing colors, server falls back to DAV discover; ensure DAV endpoints are reachable.
- If charts do not render, check browser console and ensure CSP is not blocking assets.
