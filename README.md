# Opsdash — Operational Calendar Dashboard for Nextcloud

![Nextcloud Server Tests](https://github.com/blade34242/nexcloud-operational-cal-deck-dashboard/actions/workflows/server-tests.yml/badge.svg)

Opsdash keeps teams honest about their calendar time: it aggregates week/month totals, shows balance across focus areas, and turns raw events into targets, pacing badges, and dashboards — all without leaving your Nextcloud instance.

## UI Preview (placeholders)
| Overview | Config & Setup |
| --- | --- |
| ![Overview](img/overview.png) | ![Config](img/config.png) |
| Targets | Balance |
| ![Targets](img/targets.png) | ![Balance](img/balance.png) |

> Final screenshots will replace these placeholder images before the 0.4.5 release.

## Why Opsdash?
- **Know where the week went**: totals, averages, busiest days, workday/weekend split, top categories.
- **Stay on target**: per-calendar and per-category goals with pace hints, Δ badges, and simple forecasting.
- **Keep balance visible**: dedicated charts for focus areas, longest tasks, daily/weekly heatmaps.
- **Stay native**: Vue 3 SPA rendered inside Nextcloud, using its theme, permissions, and CSRF guard. No telemetry, no external services.

## Compatibility & Installation
| Branch | NC support | Version |
| --- | --- | --- |
| `master` | NC 31 | 0.4.x (current) |
| `release/0.4.x` | NC 31 | App Store releases |
| `feature/nc32` *(planned)* | NC 32 | 0.5.x once CI passes |

Install via the Nextcloud App Store (once published) or copy the folder under `custom_apps/opsdash`, then:
```bash
occ app:enable opsdash
```

## Feature Highlights
- Calendar dashboard with totals, averages, busiest days, and share of workdays/weekend.
- Targets & pacing (per calendar + per category) with badges, forecasts, and weekly/daypart insights.
- Balance overview, stacked bars, pie chart, heatmap, and longest-task table.
- Presets and onboarding wizard to keep sidebars in sync across teammates.
- Notes per week/month (HTML safely escaped) and theme preference per user.

## For Administrators & Contributors
```bash
# install deps & build assets
cd opsdash && npm ci && npm run build && composer install

# vitest + phpunit
npm run test -- --run
composer run test:unit

 # Playwright smoke (dashboard load, onboarding rerun, preset save, multi-user)
npm run test:e2e   # requires `npx playwright install --with-deps chromium`
`.
## QA Seeding
Run this inside your Nextcloud root to create the QA calendar and import the demo ICS:
```bash
php apps/opsdash/tools/seed_qa_calendars.php
```
This seeds the `opsdash-focus` calendar with the sample events used by Playwright.
