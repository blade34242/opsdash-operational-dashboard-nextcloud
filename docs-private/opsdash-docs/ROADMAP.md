# Roadmap & Targets Overview

Single source of truth for the Opsdash backlog: high-level roadmap, target system upgrades, strategy profiles, and the architecture refactor plan. Updated after every milestone so release planning, testing, and docs stay in sync.

---

## 1. Product Snapshot (Q4 2025)
- Build artifacts are Vite manifest–driven; sidebar panes have independent components with shared validation.
- `useDashboard*`, `useTheme*`, `useCalendarLinks`, and onboarding composables now power `App.vue`, leaving it as an orchestration shell.
- All-day events respect the configurable “All-day event (h per day)” slider; range switching keeps targets, charts, and KPIs aligned.
- Config & Setup exposes a reliable “Re-run onboarding” action; wizard state is snapshot-safe and theming hooks persist.
- Core docs (Architecture, API, Dev Workflow, Packaging, Troubleshooting) match the shipping behaviour.

---

## 2. Execution Order (Lean + Tested)
1. **Requirements lock** for onboarding/targets/theming — ✅ (docs captured in `ONBOARDING_WORKFLOW.md`, `TARGET_STRATEGIES` content folded below, `LIGHT_DARK_THEMING.md`).
2. **Testing infrastructure** (PHPUnit + Vitest) baseline — ✅ with ongoing expansion (see Testing Guide).
3. **Shared validation helpers** with inline feedback — ✅ numeric helpers + 400 responses (Oct–Nov 2025).
4. **Architecture refactor** — 🔄 `App.vue` carved, persistence/selection/presets/composables live separately; continue auditing onboarding wiring (theme persistence + wizard snapshot hooks).
5. **Onboarding wizard + strategy profiles** — ✅ shipped with rerun entry point and preset seeding.
6. **Theming, collapsed controls, keyboard shortcuts overlay** — in progress per UX backlog.
7. **Endpoint/docs rename to `/overview/*`** — ✅ done, copy polish pending.
8. **Keep tests green after every milestone** — ongoing (see Testing Guide for gaps).

---

## 3. Priority Buckets
### P0 – Confidence & Maintenance
- Expand Vitest around `buildTargetsSummary`, `computePaceInfo`, chart helpers, keyboard shortcuts.
- Ensure `/overview/persist` always echoes `balance.ui.*` flags (allows client merge cleanup).
- Maintain curl docs for `/overview/persist`, `/overview/notes`, preset flows.
- **Calendar API integration harness** — Keep fixture coverage in sync across NC releases (stable30/31/32+):
  - Capture `/overview/load` payloads for week/month ± offsets, multi-calendar, and multi-user scenarios; mirror them in Vitest + PHPUnit so SPA and controller stay aligned.
  - Add `/overview/persist` + `/overview/notes` fixtures (per user) to validate sanitisation.
  - Extend Playwright flows with OCC seeding helpers (or nightly scripts) so each supported NC/PHP combo exercises real CalDAV data, not just mocked payloads.
  - Document the workflow (seed via OCC → capture fixtures → replay in tests) as the blessed best practice for future contributors.
- **CalDAV colour probe** — Add automated PROPFIND checks against `remote.php/dav/calendars/<user>/<cal>` (per NC version) to ensure `apple:calendar-color` responses stay compatible; fail builds if colours disappear.

### P1 – Frontend Structure
- ~~Finish carving `App.vue` (range toolbar, export/import helpers) + dedicated theme bootstrap module.~~ ✅ `useRangeToolbar`, `useKeyboardShortcuts`, theme bootloader now own modules (0.4.6).
- Extend vitest/Playwright coverage per Testing Guide Phase 2.
- Explore “By Calendar Events” drill-down UX.
- Enhance chart labelling + info badges alignment.

### P2 – Server & Performance
- Optional caching of `load()` responses (`ICacheFactory`).
- Normalize heatmap bucketing to user timezone (see Known Issues).
- Profile aggregation & split large PHP services.
- Upgrade seeding scripts to more realistic schedules (tools already exist; expand data variety).

### P3 – UX & Platform
- L10n + accessibility pass (sidebar focus order, contrast, aria for charts). See `I18N_PLAN.md` for de/fr/es rollout steps.
- Improve CalDAV color error UX.
- Roll out full theming phases + sidebar-collapsed controls.
- ~~Surface keyboard shortcuts overlay.~~ ✅ overlay + shortcuts shipped in App.vue (0.4.6).
- Add language/label packs for additional locales (de, fr, es). Track per-page label gaps and build i18n tooling before opening translations (`I18N_PLAN.md` covers extraction + review workflow).

### Watchlist / Questions
- NC 33 support timeline; update `<nextcloud max-version>` when ready.
- CalDAV color refresh cost for large tenants (debounce?).

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

---

## 5. Strategy Profiles (Onboarding + Sidebar)
| ID | Name | Layers | Ideal For |
| --- | --- | --- | --- |
| `total_only` | Focused | Total | Simple overall budget |
| `total_plus_categories` | Balanced | Total + Categories | Users juggling multiple areas |
| `full_granular` | Power | Total + Categories + Calendar | Power users needing per-calendar control |

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

### In Progress / Next
1. Break `targets.ts` into focused modules (`config`, `progress`, `forecast`) with Vitest coverage.
2. Carve PHP controller into services (`CalendarService`, `TargetsService`, `NotesService`); keep controller thin.
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
- `npm run build` produces hashed bundles referenced via manifest.
- `/apps/opsdash/overview/load` returns expected stats for seeded data.
- Sidebar tabs persist state; Targets card reflects week/month ranges.
- Docs (CHANGELOG, DEV_WORKFLOW, TROUBLESHOOTING, RELEASE) align with release artifacts.

---

## 8. Immediate Next Actions
1. Finish auditing onboarding wiring (theme persistence + wizard snapshot hooks) per Architecture plan.
2. Land preset export/import + multi-user Playwright coverage (Testing Guide Phase 2).
3. Extend Vitest fixture harness to cover `/overview/load` offsets (week/month ±1) and update failing assertions.
4. Keep this roadmap updated whenever backlog items move across phases.
5. Draft Deck integration notes (`DECK_INTEGRATION.md`) and reporting concept (`REPORTING_FEATURE.md`) so follow-up spikes have a home.
