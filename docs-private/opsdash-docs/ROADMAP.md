# Roadmap & Targets Overview

Single source of truth for the Opsdash backlog: high-level roadmap, target system upgrades, strategy profiles, and the architecture refactor plan. Updated after every milestone so release planning, testing, and docs stay in sync.

**Status legend** — ✅ Done · 🔄 In progress · ⏳ Todo/Not started · ⚠️ Partial (needs follow-up)

---

## 1. Product Snapshot (Q4 2025)

- Build artifacts are Vite manifest–driven; sidebar panes have independent components with shared validation.
- `useDashboard*`, `useTheme*`, `useCalendarLinks`, and onboarding composables now power `App.vue`, leaving it as an orchestration shell.
- All-day events respect the configurable “All-day event (h per day)” slider; range switching keeps targets, charts, and KPIs aligned.
- Calendars exposes a reliable “Re-run onboarding” action; wizard state is snapshot-safe, theming hooks persist, and the “Final tweaks” step now includes Deck boards, reporting cadence, and the Activity heatmap toggle.
- Deck tab (preview) pulls real boards/cards via the Deck OCS API; CI seeds deterministic boards via `apps/opsdash/tools/seed_deck_boards.php` so Playwright stays reliable.
- Activity & Schedule card surfaces the “Days off” comparison as a heatmap, matching Balance’s trend lookback UX.
- Core docs (Architecture, API, Dev Workflow, Packaging, Troubleshooting) match the shipping behaviour.
- Security scripts: CSRF token helper shared across scripts; CI runs curl-based clamps/CSRF/preset/import checks. Notes sanitised server-side; deck settings clamp hidden board IDs/booleans. DAV probe tolerates 405 with fallback to `/overview/load` colors.

---

## 2. Execution Order (Lean + Tested)

1. ✅ **Requirements lock** for onboarding/targets/theming — docs in `ONBOARDING_WORKFLOW.md`, `TARGET_STRATEGIES`, `LIGHT_DARK_THEMING.md`. Keep pairing changes with Vitest/PHPUnit and refresh week/month fixtures.
2. ✅ **Testing infrastructure** baseline (PHPUnit + Vitest). Next: keep adding coverage for new helpers (see Testing Guide).
3. ✅ **Shared validation helpers** with inline feedback (numeric helpers + 400 responses).
4. 🔄 **Architecture refactor** — `App.vue` carved into composables; controllers/components are being split. Next: keep carving `/overview/load` into smaller services + fixtures, and continue shrinking the remaining large Vue components.
5. ✅ **Onboarding wizard + strategy profiles** — rerun entry point and preset seeding shipped.
6. 🔄 **Theming, collapsed controls, keyboard shortcuts overlay** — theme persistence + collapsed toolbar + modal exist; polish UX/backlog items next.
7. ✅ **Endpoint/docs rename to** `/overview/*` — copy polish pending.
8. 🔄 **Keep tests green after every milestone** — ensure npm/composer/playwright run before marking done; broaden fixtures.

---

## 3. Priority Buckets

### P0 – Confidence & Maintenance

- ⏳ Trend lookback bug: fix Balance + Activity history so offsets > 1 load/visualise correctly (respect sidebar config + `/overview/load` payloads). Start by adding fixtures for offsets 2–4 and Vitest assertions on lookback charts.
- ⚠️ Balance UI/config simplification: deprecated knobs removed; still need 1-decimal rounding server-side, default lookback=4 by default, and lean `/overview/persist` payloads. Add PHPUnit for rounding + lookback defaults.
- ⏳ Expand Vitest around `buildTargetsSummary`, `computePaceInfo`, chart helpers, keyboard shortcuts. Seed small unit fixtures first.
- ⏳ Ensure `/overview/persist` echoes `balance.ui.*` flags. Add fixture + PHPUnit guard.
- 🔄 Maintain curl docs for `/overview/persist`, `/overview/notes`, preset flows — docs exist; wire into CI check or add a README cue.
- ⚠️ **Calendar API integration harness** — fixtures exist for load/persist/notes; missing NC-version matrix + PHP harness. Next: capture week/month ± offsets per NC version and replay in Vitest/PHPUnit.
  - Capture `/overview/load` payloads for week/month ± offsets, multi-calendar, and multi-user scenarios; mirror them in Vitest + PHPUnit so SPA and controller stay aligned.
  - Add `/overview/persist` + `/overview/notes` fixtures (per user) to validate sanitisation.
  - Extend Playwright flows with OCC seeding helpers (or nightly scripts) so each supported NC/PHP combo exercises real CalDAV data, not just mocked payloads.
  - ✅ Playwright now clicks the Deck tab and asserts QA cards render, proving the Deck seed + SPA wiring end-to-end.
  - Document the workflow (seed via OCC → capture fixtures → replay in tests) as the blessed best practice for future contributors.
- 🔄 **CalDAV colour probe** — Script exists (`tools/security/probe_dav_colors.sh`); now tolerates 405 with `/overview/load` fallback in CI. Next: assert colors per NC version when PROPFIND succeeds.
- ✅ Remove obsolete `php occ opsdash:seed-deck` job from CI — replaced by `tools/seed_opsdash.sh` in workflow.
- 🔄 **Security CI** — curl security scripts now run in CI; keep extending coverage (preset import/export, CSRF regression).

### P1 – Frontend Structure

- ~~Finish carving~~ `App.vue` ~~(range toolbar, export/import helpers) + dedicated theme bootstrap module.~~ ✅ `useRangeToolbar`, `useKeyboardShortcuts`, theme bootloader now own modules (0.4.6).
- ⏳ Merge Activity & Schedule data into Balance top card and move descriptive copy into Summary card. Start by reusing ActivityScheduleCard data in BalanceOverviewCard props.
- ⏳ Add a dedicated “Charts” sidebar tab for chart config; relocate projection controls there.
- ⏳ Improve floating header/toolbar when sidebar collapsed; repro jumpiness with scroll tests.
- 🔄 Extend Vitest/Playwright per Testing Guide Phase 2 (coverage gaps noted above). Added deck_settings client test; onboarding Playwright flow exercises final tweaks (reporting/deck).
- ⏳ Explore “By Calendar Events” drill-down UX (no code yet).
- ⏳ Enhance chart labelling + info badges alignment.
- ⏳ Category rows: add “Today” mini callouts in Targets chart.
- ⏳ Balance chart: overlay current slice (e.g., “31% ^+3% Today”) + keep 5 columns; add tests for lookback 3/4/5 clamp.
- ⚠️ Create “Deck Summary” top card — shipping as `DeckSummaryCard.vue` but not wired to Deck tab filters; next: sync bucket clicks to filters.
- ⏳ Improve Deck tab utility (filters/actions/freshness cues) before relying on summary card.
- ⏳ Show Deck board colours in sidebar Deck tab.
- ⏳ **Deck top card + filter sync** – build bucket card that toggles Deck tab filters; extend fixtures/Playwright for bucket clicks and ticker sync. Visual example:
 - `Created by me`  ● Opsdash Deck QA   count: 07   │ Card A · Card B · Card C · Card D → cycles to Card E+
 - `Solved by me`   ● Opsdash Opsplan  count: 03   │ Done item 3 · Done item 12 · …
 - `Created by all` ● Opsdash Roadmap  count: 12   │ Board ticket 9 · Board ticket 10 · …
 - `Solved by all`  ● Opsdash Fixes   count: 18   │ Released card X · Closed issue Y · …
 - ⏳ **Tab naming refresh** – pick new labels, log candidates here, cover with a11y/keyboard tests.
 - ⏳ Testing hook: capture Deck API fixtures per bucket; extend Playwright/Vitest to click every row + Deck tab filters and assert ticker/count sync for week/month offsets.

### Time Summary & Offset spec

- ⏳ **Goal**: make the “time summary” element offset-aware (today + derived stats + Activity snapshot + Δ vs configured offset). Not implemented yet — start with `TimeSummaryCard.vue` to add offset labels + comparison line and wire `meta.offset`.
- **Inputs**:
  1. `range` (`week` or `month`) + `offset` (−24..+24) from the sidebar/query string.
  2. `/overview/load` payload: `meta.range`, `meta.offset`, `summary.totals`, `summary.targets`, `summary.activity`, `summary.pace`, `charts.daily`.
  3. Optional “comparison offset” config (default −1) stored per user (sidebar hint/config panel).
- **Behavior**:
  1. Heading shows `Time Summary · <range>` plus the full span (e.g., “Week (Mar 4 – 10)”) resolved from `offset`.  
  2. Display `6.50 h total today` in a bold/emphasized font larger than surrounding stats.  
  3. Show derived stats inline: `6.50 h/day (active days) · 1.30 h/event · 6.50 h median/day` and `Busiest <date> — <hours>`.  
  4. Render two rows for “Workdays” and “Weekend,” each with `<avg> h avg · <median> h median` plus weekend percent (e.g., `(0.0%)`).  
  5. List calendars/categories: `10 calendars · IT-AI-Learn 69.2%, IT-HackingInfraMain 30.8%, Trips/Tours 0.0%`, followed by `Top category · Learn — 4.50 h (113% of 4.00 h)`.  
  6. Drop the “Done” label and the `Balance · 0.31 (1 = perfect)` line entirely so the summary focuses solely on time/targets/activity data.  
  7. Activity snapshot (Week or Month) below: `Events 5 • Active Days 1 • Typical 10:00–17:00`, `Weekend 0.0% • Evening 0.0%`, `Earliest/Late 10:00 / 17:00`, `Overlaps 0`, `Longest Session 2.5 h`, `Last day off Sun, Nov 23`.  
  8. Offset comparison line at the end: `Δ vs. offset −2 (Feb 18 – 24): +2 h / +6%` (calculated from the configured comparison offset).  
  9. Ensure the Activity “Weekend/Evening” line also references the offset span so it reads like `Weekend 0.0% (Δ vs. offset −1 → 2.0%) • Evening 0.0% (Δ vs. offset −1 → 5.0%)` when applicable.
- **Bug fix detail**: wire the summary to the active `offset` via `useDashboardSelection` or `meta.offset` so the “Δ vs.” line respects the exact offset slider value instead of assuming −1; clamp within ±24 and recalc on every slider change.
- **Example layout**:
  ```
  Time Summary · Week (Mar 4 – 10)
  6.50 h total today
  6.50 h/day (active days) · 1.30 h/event · 6.50 h median/day
  Busiest 2025‑11‑17 — 6.50 h

  Workdays
  6.50 h avg · 6.50 h median

  Weekend
  0.00 h avg · 0.00 h median (0.0%)  (Δ vs. offset −2 → +2.0%)

  10 calendars · IT-AI-Learn 69.2%, IT-HackingInfraMain 30.8%, Trips/Tours 0.0%
  Top category · Learn — 4.50 h (113% of 4.00 h)

  Done

  Events 5 • Active Days 1 • Typical 10:00–17:00 (offset −2)
  Weekend 0.0% • Evening 0.0% (offset −2)
  Earliest/Late 10:00 / 17:00
  Overlaps 0
  Longest Session 2.5 h
  Last day off Sun, Nov 23

  Δ vs. offset −2 (Feb 18 – 24): +2 h / +6%
  ```
  (The bold “6.50 h total today” line, inline stats, Activity snippet, and offset comparison line keep the summary tight while staying synced with the actual offset.)

**Today’s hours spec (examples)**
- Targets chart (top card): Preserve the multi-category chart colors, but wrap today’s line/bar slice with the existing palette’s glow so it visually pops. Add the persistent badge text after each category summary line, e.g.  
  ```
  Work · 2h / 45h Δ −43h Need 6.5h/day · 7 days left | 1 calendar   1.5h 3% Today
  ```
  This badge is always visible, reuses the same color, and the tooltip provides the full story (hours logged today, remaining target, pace).  
- Balance chart (main content): Only the current-week/month column gets the treatment. Inside the column cell, place a tiny upper-right overlay such as `31% ^+3% Today` that uses the column color plus a halo/underline accent, but keeps the rest of the column untouched. This badge also persists and its tooltip explains the richer data (actual hours, remaining target, week/month impact). All other columns remain unchanged.
- **Balance chart column count** – ensure the canned Balance chart keeps five columns (current + four offsets) even when the sidebar shows fewer cards. Display the category name on the left and render five cells per row (current week/month plus four lookback offsets, one per column). Each cell should cap at the configured max lookback (e.g., 4) and highlight the current slice, then fade the older ones. Add Vitest + Playwright tests that run through week/month loads, verify the column count matches the configured lookback, and ensure the first (current) cell gets the special overlay while the offsets just show the standard bars.
- Testing note: cover lookback values `3` and `4` (valid) plus `5` (invalid) so fixtures confirm the chart respects the max lookback (clamps 5 down to 4) while still drawing the labeled columns.

### P2 – Server & Performance

- ⏳ Implement response caching for `/overview/load` per `CACHING_STRATEGY.md` (Option 1) using `ICacheFactory` + PHPUnit/Playwright coverage.
- ⏳ Normalize heatmap bucketing to user timezone (Known Issues).
- ⚠️ Profile aggregation & split large PHP services (controller still heavy).
- ⏳ Upgrade seeding scripts to more realistic schedules (expand variety).

- ⚠️ **Deck top card** – partially done via `DeckSummaryCard.vue` (auto-scroll + board badge); must wire All/My filters and bucket groups to Deck tab data/filters.

### Watchlist / Questions

- NC 33 support timeline; update `<nextcloud max-version>` when ready.
- CalDAV color refresh cost for large tenants (debounce?).
- **Deck/calendar light theme alignment** – refresh the default Opsdash light palette so cards, backgrounds, borders, and hover states mirror Nextcloud’s Deck and Calendar apps, then roll the new palette into the sidebar theme picker. Document the token mapping, add Visual regression snapshots for the updated light theme, and prove the switch yields consistent colors in both Vitest snapshots and Playwright screenshots before release.

---

## 4. Targets Program

### Goals

- Communicate status (percent, remaining, pace) at a glance.
- Make feasibility obvious (projection, days left).
- Keep week/month parity with transparent conversions.
- Fit small screens without losing clarity.

### Delivered (Oct 2025)

- Targets card shows percent chip, remaining delta, pace gap, forecast band.
- Days-left + need-per-day metrics per total/category.
- Week↔month conversions automatic with clear labels; all-day slider respected server + client side.
- Category colour overrides align with Nextcloud palette and propagate through onboarding/presets.

### Next Iterations

1. **Phase 2 – Insights**: per-calendar/group deltas, highlight largest deficit/excess, optional progress overlays on charts.
2. **Phase 3 – Configuration UX**: custom status thresholds, adjustable conversion factor, toggles for projection/pace, persist advanced preferences.
3. **Phase 4 – Backend Enhancements**: return period metadata (`daysElapsed`, `eligibleDays`), cache derived summaries for large tenants.

### Testing Matrix

- Empty targets messaging, extreme values (≤0.25 h, ≥1000 h), range switches, DST/leap coverage, negative offsets.

### 4.1 Balance Index & Alerts Relation

- Balance index is derived from the current category shares (`balance_index` in the `/overview/load` payload) by clamping `1 − (maxShare − minShare)` between 0 and 1 and comparing it against the `balance.thresholds.warnIndex` flag; this is the same number surfaced on the Time Summary card and the Balance overview (see `useSummaries`/`useBalance`), so we can persist that index on the client and use it for risk labels in reports.
- Relations (Work:Hobby, Work:Sport, (H+S):Work) reuse `balanceConfig.relations.displayMode`/`balance.ui.roundRatio` so that the same ratio/factor strings shown in Balance can be reused in notifications and emails when the `alertOnRisk` toggle fires.
- The total target (`targetsConfig.totalHours`) flows into `buildTargetsSummary`, which also evaluates each category target (`targetsConfig.categories[].targetHours`) plus the per-calendar overrides stored in the `cal_targets_week/month` user settings (cleaned via `cleanTargets`). Those per-calendar values feed `targetsWeek` / `targetsMonth` in the dashboard payload, which `App.vue` turns into `currentTargets` used by `useCategories`/`useCharts` and will be the source for any calendar-level alerts.
- Forecast mode choices (`total`, `calendar`, `category`) control how remaining hours are distributed across future days; that same data (`currentTargets`, the mapped categories, and `makeProgress` statuses such as `on_track`/`at_risk`/`behind`) is the canonical relation between total/category/calendar goals, so the reporting engine should read those values when deciding whether to send the configured email or Nextcloud notification (`reportingConfig.notifyEmail` / `notifyNotification`).
- Balance Index Basis dropdown (sidebar) – new config lets the user choose whether the index is derived solely from category shares, solely from calendar totals, or by combining both series when the slider says “both”; the dropdown writes the selection to the targets config and the sidebar provides short help text for each choice (“Category: aggregate `targetsConfig.categories` shares from actual event hours”, “Calendar: honor `targetsWeek/month` values and compare each calendar’s actual hours against its own target”, “Both: show both card values and let the index badge highlight whichever ratio is lower”).
- Whatever the dropdown selects flows through `buildTargetsSummary` (`makeProgress` + `categoryTotals`) so the balance card, trend history, and time summary reuse the same number; the server still calculates shares from `categoryTotals`/`totalHours`, but the client filters/presents whichever subset the user asked for. Config persistence ensures reruns of onboarding or preset loads keep the same index basis.
 - Testing hook: add Vitest fixtures that simulate each basis (category-only, calendar-only, both) plus `balanceIndex` expectations in PHPUnit, and refresh the offset ocs fixtures so `balance.thresholds` warnings align in week/month probes.

---

## 5. Strategy Profiles (Onboarding + Sidebar)

| ID                    | Name     | Layers                        | Ideal For                                |
|-----------------------|----------|-------------------------------|------------------------------------------|
| `total_only`            | Focused  | Total                         | Simple overall budget                    |
| `total_plus_categories` | Balanced | Total + Categories            | Users juggling multiple areas            |
| `full_granular`         | Power    | Total + Categories + Calendar | Power users needing per-calendar control |

**Common traits**

- Share the all-day hour budget and week↔month conversion.
- Switching strategies prompts confirmation, snapshots previous config, and can trigger onboarding rerun.
- Downgrades retain previous data but mark advanced layers inactive.

**Strategy Details**

- `total_only`: hides category/calendar panes; defaults 40 h/week, month auto at ×4; CTA to “Enable categories”.
- `total_plus_categories`: seeds Work/Personal/Recovery categories (32/8/4 h) with weekday/weekend rules; calendar target inputs hidden unless advanced toggle enabled.
- `full_granular`: shows all layers, per-calendar inputs derived from category splits, advanced pace/forecast controls, warns when totals drift >10% from sum.

**Validation matrix**: toggle strategies with 0/1/many calendars, locale variants, accessibility focus order.

---

## 6. Architecture Refactor Tracker

### Pain Points

- `App.vue`, `Sidebar.vue`, `targets.ts`, `OverviewController.php` historically oversized; theme bootloader + validation logic were scattered; tests sparse.

### Completed

- Composables: `useDashboard`, `useDashboardPersistence`, `useDashboardSelection`, `useDashboardPresets`, `useChartScheduler`, `useOcHttp`, `useAppMeta`, `useCalendarLinks`, onboarding helpers.
- Sidebar panes split into dedicated components with shared validation helper (`sidebar/validation.ts`).
- Numeric validation + localisation delivered; onboarding wizard + strategy cards shipped.
- Backend: presets + persist + notes endpoints extracted into dedicated controllers (`PresetsController`, `PersistController`, `NotesController`).
- Frontend: `DashboardLayout` split into grid/toolbar/add-menu/advanced-overlay components; widgets registry moved to per-widget modules and supports async component loading.

### In Progress / Next

1. Continue splitting `targets.ts` (already partially split under `src/services/targets/`) and add targeted Vitest coverage for the remaining heavy helpers.
2. Carve `/overview/load` further: extract remaining read helpers from `OverviewController` and expand fixture-backed tests for week/month offsets.
3. Move theme/favicons out of `main.ts` into `services/theme.ts` invoked at boot.
4. Add PHPUnit + Vitest for new services/composables.
5. Update `ARCHITECTURE.md` after each refactor slice.

### Success Criteria

- Components <300 LOC, explicit responsibilities.
- Shared reusable helpers for data + validation.
- Controller orchestrates services instead of containing logic.
- Coverage uplift across composables and server services.

---

## 7. Validation Checklist

- 🔄 `npm run build` produces hashed bundles referenced via manifest — rerun after changes.
- 🔄 `/apps/opsdash/overview/load` returns expected stats for seeded data — add CI probe.
- 🔄 Sidebar tabs persist state; Targets card reflects week/month ranges — cover with Playwright smoke.
- 🔄 Docs (CHANGELOG, DEV_WORKFLOW, TROUBLESHOOTING, RELEASE) align with release artifacts — review before release.

---

## 8. Immediate Next Actions

1. ⚠️ Audit onboarding wiring (theme persistence + wizard snapshot hooks) per Architecture plan; add Vitest to guard.
2. 🔄 Land preset export/import + multi-user Playwright coverage (Testing Guide Phase 2).
3. ⏳ Extend Vitest fixture harness to cover `/overview/load` offsets (week/month ±1→±4) and update assertions.
4. 🔄 Keep this roadmap updated whenever backlog items move across phases.
5. ⏳ Prototype reporting CLI/delivery (per `REPORTING_FEATURE.md`) now that config storage/onboarding toggles exist; align with Deck notes.
