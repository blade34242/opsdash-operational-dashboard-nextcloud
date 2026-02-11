# Opsdash — Operational Calendar Dashboard for Nextcloud

![Nextcloud Server Tests](https://github.com/blade34242/nexcloud-operational-cal-deck-dashboard/actions/workflows/server-tests.yml/badge.svg)

> ✨ *Your calendar time, but actually useful.* Opsdash aggregates events, compares them to your targets, keeps balance visible, and stays 100 % inside your Nextcloud instance.

## 📸 UI Preview
| Screenshot 1 | Screenshot 2 | Screenshot 3 |
| --- | --- | --- |
| ![Opsdash Screenshot 1](img/picture1.png) | ![Opsdash Screenshot 2](img/picture2.png) | ![Opsdash Screenshot 3](img/picture3.png) |
| ![Opsdash Screenshot 4](img/picture4.png) | ![Opsdash Screenshot 5](img/picture5.png) | ![Opsdash Screenshot 6](img/picture6.png) |

![Opsdash Screenshot 7](img/picture7.png)

## 💡 Why teams install Opsdash
- **Know where the week went** – totals, averages, busiest days, workday/weekend split, top categories, longest tasks.
- **Stay on target** – per-calendar & per-category goals with pacing badges, Δ indicators, and quick forecasting.
- **Balance at a glance** – stacked bars, category pies, heatmaps, and configurable chart widgets inside dashboard tabs.
- **Onboarding & profiles** – pick Quick/Standard/Pro layouts in the wizard, save profile snapshots (widgets/tabs + theme + Deck + reporting), rerun onboarding from Calendars, and keep teammates aligned.
- **Notes + theming** – week/month notes (editable + read-only history) and per-user theme preferences that load instantly even after clearing cache.
- **Native & private** – Vue 3 SPA rendered via Nextcloud’s CSP, CSRF, and permissions. No telemetry, no external APIs.

## 🧭 Compatibility Matrix
| Branch | NC support | Version |
| --- | --- | --- |
| `master` | NC 30-32 | 0.5.5 (current) |
| `release/0.5.x` | NC 30-32 | App Store-ready builds |

Install via the Nextcloud App Store (once published) **or** drop the `opsdash` folder inside `custom_apps/` and enable it:
```bash
occ app:enable opsdash
```

## 🚀 Feature Rundown
- 📅 **Dashboard** – KPIs for week/month, busiest days, averages, weekend share, per-category chips, longest events, and multi-tab layouts.
- 🎯 **Targets & pacing** – per calendar/category goals, pace hints, momentum forecasts, daypart insights, and badges.
- ⚖️ **Balance** – share cards, stacked bars, relations/ratios, trend lookback, heatmaps, longest sessions, daypart toggles.
- 🧠 **Notes** – edit “This week/month”, read “Last week/month”, optional display on the Balance card.
- 🧩 **Onboarding wizard & profiles** – guided setup (calendars, targets, Deck boards, reporting cadence, Activity heatmap toggle), rerun from Calendars, save/load/delete profiles, export/import, theme selector.
- 🗓️ **Activity & schedule** – KPIs for events/active days plus a “Days off” heatmap that compares the current range with the last few weeks/months.
- 🔐 **Nextcloud-native** – same theme, request token, permissions, Dav colors, and zero external calls.
- 🗂️ **Deck widgets** – Deck cards widget with per-widget board/filter selection, auto-scroll ticker, counts; optional Deck summary widget.
- 📨 **Report tab (preview)** – configure weekly/monthly digests, interim reminders, and Deck visibility using Nextcloud notifications + email.
- 📐 **Widget sizing controls** – per-widget width/height plus Scale/Dense tuning; tabs and layout editing now sit left-aligned for quicker access.

## 🛠 Local Development
```bash
# install deps & build assets
cd opsdash
npm ci
npm run build
composer install

# unit/integration tests
npm run test -- --run    # Vitest
composer run test:unit   # PHPUnit

# Playwright smoke suite (Chromium only)
npx playwright install --with-deps chromium
npm run test:e2e
```

Smoke-check a running Nextcloud container (defaults: `nc31-dev admin/admin`):
```bash
make smoke
```

### Packaging (App Store tarball)
```bash
# from repo root
make appstore VERSION=0.5.5
```
This runs a clean copy into `build/opsdash`, installs deps, builds, strips dev files, and outputs `build/dist/opsdash-<version>.tar.gz`. If your environment blocks native binaries during `npm ci` (esbuild), rerun with sufficient permissions so the esbuild helper can execute.

## 🧪 QA Seeding & Fixtures
```bash
# run from Nextcloud root
php apps/opsdash/tools/seed_qa_calendars.php
QA_USER=admin php apps/opsdash/tools/seed_deck_boards.php
QA_USER=qa php apps/opsdash/tools/seed_deck_boards.php

# or from the repo root (executes OCC inside the docker container, default nc31-dev)
./tools/seed_opsdash_occ.sh         # seeds calendars + Deck (admin/qa/qa2)
./tools/seed_deck_occ.sh            # seeds admin + qa
NEXTCLOUD_CONTAINER=nc-ci ./tools/seed_deck_occ.sh admin qa extrauser
```
Seeds the `opsdash-focus` calendar plus deterministic Deck boards/cards used by Playwright and fixture captures. The OCC command is CI-friendly (resets stacks by default, supports `--board-title`, `--board-color`, `--keep-stacks`). Additional fixtures (load/persist/notes/deck) live under `opsdash/test/fixtures/` with capture instructions.  
The helper script now shells into your container and invokes `apps/opsdash/tools/seed_deck_boards.php` with the relevant `QA_*` env vars (`QA_DECK_BOARD_TITLE`, `QA_DECK_BOARD_COLOR`, `QA_DECK_KEEP_STACKS`).

## 📋 Roadmap Highlights
- Current release line is `0.5.5` (NC 30-32).
- Balance config simplified: server rounds ratios to 1 decimal, precision toggles are gone, and Balance lookback defaults to 3 weeks (clamped 1–6) to keep week/month history aligned.
- Deck integration spike (see `docs-private/opsdash-docs/DECK_INTEGRATION.md`) and reporting concept for NC App Store metadata.
- i18n workflow (`npm run i18n:scan` / `npm run i18n:extract`) ready — de/fr/es packs coming.

## 🙌 Contributing
1. Fork & clone.
2. Work on a branch, keeping fixtures/docs updated.
3. Run Vitest + PHPUnit before opening a PR.
4. For Playwright fixes, add/update QA fixtures or seeding scripts as needed.

### Architecture note
The `/overview/load` flow lives in `OverviewController.php` and is being carved into services (`OverviewEventsCollector`, `OverviewAggregationService`, etc.) so aggregation, sanitisation, and HTTP wiring stay separate. Write endpoints are already split into dedicated controllers (`PersistController`, `NotesController`, `PresetsController`). Keep tests/fixtures in sync whenever backend payloads change.

Happy dashboarding! 🎉
