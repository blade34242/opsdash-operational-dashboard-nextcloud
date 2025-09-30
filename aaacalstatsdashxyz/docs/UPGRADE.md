# Upgrade Notes

## 0.3.x
- `load` is now strictly read-only and ignores any `save` parameter.
- `save` rejects non-POST requests.
- CSS is extracted and loaded via `Util::addStyle`; avoid inline styles/scripts.
- Aggregation caps return `meta.truncated` and `meta.limits`.

## 0.2.x → 0.3.x
- If you referenced `js/main.js`, update to `js/main46.js`.
- Ensure your CSP allows the new CSS file `css/style.css`.
## 0.4.x
- Adds per‑calendar targets (week/month). No breaking API; `load` now returns `targets.week/month`, and `persist` accepts `targets_week/targets_month`.
- Sidebar redesigned to include labeled Group and Target inputs.
- Charts show additional labels (pie % and bar values).
