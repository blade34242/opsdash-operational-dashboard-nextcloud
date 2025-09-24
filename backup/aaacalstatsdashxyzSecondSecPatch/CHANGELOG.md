# Changelog

## 0.3.0 — Groups, charts, heatmap palette, stability
- Add calendar grouping (0–9 per calendar; default 0). Groups 1–9 render per‑group pie + stacked charts when selected.
- Reintroduce overall charts (pie and per‑day stacked) with calendar‑accurate colors; improve color sourcing (DAV fallback) and normalization.
- Restore Heatmap tab with blue→purple spectrum and better low‑value contrast.
- Frontend stability: prevent canvas/layout thrash, avoid ResizeObserver feedback loops, and fix a potential render loop when assigning refs.
- Persist groups alongside selection via `POST /config_dashboard/persist` without forcing unnecessary reloads.
- Docs: update README endpoints, features, colors, and build artifact name.

## 0.2.0 — Nextcloud 32 upgrade
- Bump Nextcloud support to 32 (min/max set to 32)
- Replace dynamic nav with `appinfo/navigation.xml`
- Remove inline scripts/styles; Vue 3 + Vite frontend
- Add `@nextcloud/vue` integration (NcAppContent, NcAppNavigation, NcButton)
- Use time-range calendar search only; deprecated `search('', ...)` removed
- Add optional admin metrics (open/load/save), with enable toggle, reset, and debug-only diagnostics

## 0.1.0 — Initial
- Calendar stats dashboard (beta)
