# Changelog — Operational Dashboard (opsdash)

All notable changes to this project are documented here. This file is served locally for development.

## [Unreleased]
- Pending changes.
- UI: Sidebar removed Activity/Balance pane; projection + trend lookback now live under Calendars.
- UI: “Config & Setup” renamed to Theme; rerun onboarding + keyboard shortcuts moved into Calendars; All/None calendar buttons removed.
- Config: Sidebar and widget layout no longer persist via localStorage; server persistence only.
- Backend: extracted `/overview/persist` + `/overview/notes` into `PersistController` and `NotesController` (URLs unchanged); `OverviewController` focuses on `/overview/load` (+ index/ping).
- Frontend: split `DashboardLayout` into smaller layout components; widgets are lazy-loaded via `defineAsyncComponent()` in the per-widget registry files.
- Tests/fixtures: removed deprecated `roundPercent`/`roundRatio`/`showDailyStacks` balance fields from all week/month load, persist, onboarding, and preset fixtures to match the streamlined balance config.
- UI: Summary sidebar tab removed; summary toggles now live per-widget (`time_summary_v2`). Sidebar docs updated.
- UI: Time Summary widget gained a Today block (total + per-category today hours) and gear-menu defaults (only one menu open at a time).
- UI: Targets sidebar display toggles (delta, need/day, categories, badges, weekend toggle, include zero days) moved into the Targets widget gear.
- UI: Onboarding wizard steps now include per-step save controls to persist changes without finishing the full flow.
- Security: Added shared requesttoken helper for curl scripts; CSRF regression script; `/overview/notes` sanitized; deck settings clamp hidden board IDs/booleans; CI runs curl security suite; DAV probe tolerates 405 with `/overview/load` fallback.
- Testing: Added deck_settings client Vitest, balanceIndex test fixed; onboarding Playwright flow steps through final tweaks (reporting/deck) and saves presets.
- UI: Deck cards filters now show counts; custom filters built with tags + assignees from the widget options menu (no JSON).
- UI: Deck cards widget respects title prefix and card background settings.
- UI: Sidebar keyboard shortcuts button opens a compact popover list.
- UI: Widget options menu widened and aligned into two columns; layout toolbar tightened to reduce height.

## [0.4.6] - Unreleased
- Feat: Onboarding wizard “Final tweaks” step now covers Deck boards, reporting cadence/reminders, and the Activity day-off heatmap toggle, and the review summary reflects those choices.
- Feat: Reporting cadence + Activity heatmap preferences persist via `/overview/persist` (wizard + sidebar share the same payload), closing the loop on client/server defaults.
- UI: Activity & Schedule card renders the “Days off” comparison as a compact heatmap grid that highlights the current week/month vs lookback windows.
- Tooling: CI workflow installs/enables Deck via `occ` and seeds deterministic boards for admin + QA users, keeping Deck e2e runs deterministic; README mirrors the new seeding commands.
- Fix: Theme bootloader + `useThemePreference` now read the server bootstrap attribute before `/load` completes, so “Force light/dark” sticks even after clearing cache or reloading without localStorage.
- Feat: Deck integration preview – `tools/seed_deck_boards.php` seeds QA boards/cards, `src/services/deck.ts` + `useDeckCards` composable fetch Deck data, and App.vue now exposes a Deck tab powered by `DeckCardsPanel.vue`.
- Tests: Added Vitest suites for the Deck service + composable plus fixtures (`test/fixtures/deck-week.json`).
- Docs: Updated README + `DECK_INTEGRATION.md` with seeding instructions, UI behaviour, and next steps.
- Polish: Deck tab caches responses per week/month, adds a deep-link to the Deck app, and shows explicit empty/error states instead of relying on shell scripts.
- Playwright: New dashboard spec clicks the Deck tab and asserts QA cards render so CI catches regressions.
- Feature: Deck tab exposes All vs My cards filters (based on Deck assignees) for quick personal focus before reviewing the full board.
- Feature: Sidebar now includes a “Report” tab for configuring weekly/monthly digests, interim reminders, delivery channels, and toggling Deck visibility/filter defaults (persisted per user).
- UI: Balance Overview’s mix rows display as a heatmap grid with inline percentages and tone-aware up/down/flat states, making multi-week comparisons easier to scan.
- Tooling: Removed the OCC `opsdash:seed-deck` command from CI builds—use `apps/opsdash/tools/seed_deck_boards.php` (or the Docker helper) whenever QA boards/cards are required.
- Fix: `/overview/load` no longer fatals when all-day events attempt to share `$daysSeen` without a valid reference; the controller now updates the accumulator defensively.

## [0.4.5] - 2025-11-10 (NC 30–31 line)
- Fix: theme persistence no longer spams duplicate `/persist` calls or desyncs when onboarding resets theme state; added `useThemeSync` composable to keep SPA + server in lockstep.
- Fix: onboarding wizard orchestration now lives in `useOnboardingFlow`, eliminating the `ReferenceError: Cannot access 'J' before initialization` regression after the previous refactor.
- Feat: Wizard snapshot button surfaces progress (disabled while saving) and inline notices so QA/support can confirm backups before applying onboarding changes.
- Refactor: `App.vue` sheds the remaining onboarding/theme glue code, relying on composables that are fully unit-tested (new Vitest suites for `useThemeSync`, `useOnboardingFlow`, and the wizard component).
- Fix: Sanitized preset names (strip HTML/path chars) so `/overview/presets/{name}` can never crash, and added curl automation (`tools/security/run_curl_checks.sh`) to cover clamps/auth/preset/notes endpoints.
- Build: npm/composer suites extended to cover the new helpers; production bundle rebuilt.
- Docs: Updated NEXT_STEPS, SIDEBAR_CONFIGURATION, TESTING_IMPROVEMENT_PLAN, PROD_READINESS, and ONBOARDING_WORKFLOW with the 0.4.5 work.
- Docs: Consolidated internal references into `DEV_WORKFLOW.md`, `TESTING.md`, and `ROADMAP.md`, archiving the superseded Configuration/Operations/Seeding/Testing/Roadmap documents for historical lookup.
- Tooling: Added `opsdash/tools/security/rerun_onboarding.sh` to replay the onboarding wizard payload (strategy + theme + targets) via `/overview/persist`; documented it in DEV_WORKFLOW and the security README.
- Testing: Added Config & Setup export fixtures (`preset-export.json`, `onboarding-export.json`) plus Vitest + PHPUnit coverage to guarantee preset/onboarding envelopes import without warnings.

## [0.4.4] - 2025-11-04 (NC 30–31 line)
- Fix: Config & Setup “Re-run onboarding” now uses the shared `createOnboardingWizardState` helper, ensuring the wizard remounts cleanly after every manual trigger and resetting internal flags.
- Refactor: Extracted the onboarding wizard state helper to `composables/useOnboardingWizard.ts` and wired `App.vue` to consume it, trimming local state duplication.
- Fix: Restored onboarding colour palette popover behaviour by explicitly tracking `openColorId` in the wizard component.
- Fix: Balance card note toggle now persists reliably—the client merges backend snapshots that omit newer `balance.ui.showNotes` keys so notes stay visible until the server schema catches up.
- Fix: Target category colour overrides now persist after refresh—`/overview/persist` sanitises and stores `categories[].color`, echoing the chosen hex back to the SPA.
- Feat: Theme preference now persists via `/overview/persist`; Config & Setup toggles and onboarding final tweaks keep the server, local storage, and DOM classes aligned.
- UI: Polished the Config & Setup and Calendars panes (centered All/None buttons, refined range toggle styling, compact target colour chips, aligned info icons) and ensured tests supply the new theme props.
- Fix: Category progress bars in the Targets card now clamp at 100% width so line charts never overflow into adjacent tabs.
- Docs: Added `docs/SIDEBAR_CONFIGURATION.md` to catalogue every sidebar option and its persistence path.
- Config: Config & Setup tab now offers Export/Import buttons for the canonical sidebar payload (whitelisted + sanitised), and Vitest coverage guards future schema changes.
- Tests: Added Vitest coverage for the onboarding state helper and re-ran the full suite to guarantee the updated wiring stays green.
- Docs: Updated roadmap, onboarding workflow, testing plan, production readiness notes, and changelog for the 0.4.4 release; rebuilt assets and packaged `opsdash-0.4.4.zip`.

## [0.4.3] - 2025-10-30 (NC 30–31 line)
- UI: Config & Setup now includes a “Theme & appearance” toggle (Auto / Force light / Force dark) that switches the Opsdash palette instantly while keeping chart colours intact; the preference is stored locally for returning sessions.
- UI: Polished sidebar panes — Balance tab references the 4-week trend lookback and can pin the current note, calendar pane gained All/None controls with clearer copy, notes pane explains the workflow with a Balance-card toggle, targets pane drops legacy presets and adds Nextcloud-aligned category colour pickers, and pane headings are bold + underlined for scanability.
- Onboarding: reminder to back up existing presets, category colour picker, theme/all-day/total target preferences step, and payload now honours custom colours + all-day hours directly in the generated targets config.
- Refactor: split the sidebar into dedicated pane components (calendars, targets, summary, activity, balance, notes) to keep the parent shell lean.
- Refactor: extracted shared composables (`useCategories`, `useCharts`, `useSummaries`, `useBalance`) and a reusable validation helper so panes share mutations.
- Refactor: wrapped notes handling in `SidebarNotesPane` for parity with other panes.
- Tests: added Vitest coverage for charts and the new sidebar panes to lock down emitted events/validation.
- Docs: refreshed architecture and refactor plans to reflect the composable-driven structure; bumped default prompts and testing docs.
- Localisation: routed server/SPA strings through Nextcloud l10n helpers; translation files cover all current UI copy (en,de).
- Fix: restored all-day event detection when using the structured calendar query, matching ICS behaviour, and introduced a configurable “all-day hours per day” target setting that feeds both aggregation and the dashboard UI.
- UI: Added a “Presets” tab to the sidebar to save/load entire configurations (calendars, groups, targets) by name; includes server-side validation with warnings for missing calendars.
- Fix: Week/Month toggle now swaps the entire targets stack (summary card, categories, charts) to month metrics, converting weekly definitions on the fly when no explicit monthly targets are stored.
- UI: Stacked bar charts now layer forecasted hours for future days with a slim, dashed overlay instead of a full-width tint; projection behaviour is configurable (“Bar chart projection” in the Activity & Schedule tab).
- Targets: Introduced `activityCard.forecastMode` (`off` | `total` | `calendar` | `category`) so chart forecasts can respect remaining total hours, per-calendar goals, or per-category targets.
- Tests: Added Vitest coverage for the chart projection logic to ensure each mode distributes hours as expected.
- Docs: Configuration and API references updated with the new projection control and payload field.
- Refactor: Lifted dashboard shell helpers into composables (`useDashboardSelection`, `useDashboardPersistence`, `useDashboardPresets`, `useOcHttp`, `useAppMeta`, `useChartScheduler`, `useCalendarLinks`) so `App.vue` now only orchestrates state and rendering; added dedicated Vitest coverage for the new modules.
- Feat: Added an onboarding wizard with strategy presets, calendar selection, and persisted onboarding state (re-run from Config & Setup tab) so new users can bootstrap the dashboard confidently.
- Feat: Onboarding wizard supports custom category creation + per-calendar assignment before first load, producing tailored targets/groups out of the box.
- Fix: Align calendar colour palette with the Nextcloud Calendar app by preferring display colours when available, preserving server-provided values, and matching the fallback generator (plus Vitest/PHPUnit coverage to catch regressions).

## [0.4.2] - 2025-10-12 (NC 30–31 line)
- UI: Sidebar dock with persistent open/close state; main content spans full width when collapsed.
- UI: Sidebar calendars/targets split into tabs; each pane scrolls independently.
- Targets: configurable categories (add/remove/rename), per-category pacing/forecast options, and category assignment for calendars.
- Sidebar: new Cards tab to toggle Activity & Schedule metrics and Balance thresholds/insights.
- Targets: client summary now computes totals from aggregated `byCal` data to keep the cards in sync with tables.
- Targets: fixed `computePaceInfo` to read `opts.dailyHours`, preventing “[opsdash] targets summary failed” and zero-value cards.
- Docs: refreshed README, Architecture, Configuration, Dev Workflow notes; clarified manifest-based bundle handling.

## [0.4.1] - 2025-10-04 (NC 30–31 line)
- Rename finalized: app id `opsdash`, display name “Operational Dashboard”
- Routing: unified canonical endpoints under `/apps/opsdash/overview/*`; navigation points to index
- Bootstrap: removed legacy `appinfo/app.php` (IBootstrap warning fixed); nav added in `Application::boot()`
- Icons: ensured `img/app.svg` and `img/app-dark.svg` are used consistently; removed duplicate root `app.svg`; favicon resolution fixed
- Layout: full-width cards/tabs/tables; empty state remains full-height and scrollable; defensive NC shell width overrides
- Build: added local `tsconfig.json`; verified Vite manifest and bundle naming; updated scripts
- Docs: updated README and operations/dev workflow; seeding docs updated to opsdash routes
- Tools: multi-calendar seeding verified for monthly spread across 10 calendars (TOTAL=250)

## [0.4.0] - 2025-09-30 (NC 31 line)
- Targets: per‑calendar targets (hours) for week and month; edit in sidebar; auto‑convert week⇄month (×4/÷4); persisted per user
- By Calendar: added Target, Δ, and % columns (per current range)
- Sidebar: redesigned calendar entries as cards with labeled Group and Target inputs
- Charts: bar segment labels and column totals; pie labels include percentages
- Timezone: heatmap, per-day stacks, and DOW now bucket in the user’s timezone (DST-safe). Event count remains on the start day.
- UI: Events card reformatted (Active Days, Typical, Weekend, Evening)
- CSP: removed inline styles from template fallback; uses CSS classes
- Footer: version + changelog link (package.json aligned)
- Assets: controller uses Vite manifest to resolve JS entry (no hard-coded filename)
- Docs: Dev workflow, Known issues, Operations updated; local changelog
- Rename: app id to `opsdash`, display name `OpsDash`, primary route `/dashboard` (NC 31 line).

## [0.5.0] - Planned (NC 32 line)
- Compatibility window: NC 32 (later extend to 33 after test).

## [0.3.1] - 2025-09-30
- UI: App icon next to header title
- UI: Load button restored above Week/Month radios
- UI: Stats card shows workday/weekend avg & median; weekend share (%)
- Footer: Version and Changelog link
- Tools: Seeding scripts for week/month across 10 calendars (CalDAV)
- Docs: Added SEEDING.md with usage examples

## [0.2.0] - 2025-08-28
- Initial public dev build with week/month stats, charts and notes

---

Unreleased work and internal experiments are tracked in docs/NEXT_STEPS.md.
