# Sidebar Configuration Reference (Opsdash 0.4.4)

Canonical map of every setting that lives in the sidebar and how it persists.
Keep this file updated whenever a new toggle/value is added or renamed.

---

## 1. Canonical payload

All sidebar state can be represented as a single JSON envelope:

```json
{
  "version": "0.4.4",
  "generated": "2025-11-04T19:45:00Z",
  "payload": {
    "cals": ["cal-1", "cal-3"],
    "groups": { "cal-1": 0, "cal-3": 2 },
    "targets_week": { "cal-1": 12 },
    "targets_month": { "cal-1": 48 },
    "targets_config": { ... see sections below ... },
    "theme_preference": "auto",
    "onboarding": {
      "completed": true,
      "version": 4,
      "strategy": "balanced",
      "completed_at": "2025-11-02T12:34:56Z"
    }
  }
}
```

- Only the `payload` object is fed into `/overview/persist`.
- Unknown keys are ignored by the server; missing keys leave existing values untouched.

### Export / import workflow
1. **Export**: `GET /apps/opsdash/overview/load?save=1` → wrap in the envelope above.
2. **Import**: Submit the payload to a helper endpoint or script that whitelists the fields and then POSTs to `/overview/persist`.
3. **Legacy / dropped keys**: remove them from the whitelist; the importer will report them as “ignored”.

---

## 2. Top-level keys

| Key | Type | Stores | Notes |
| --- | --- | --- | --- |
| `cals` | `string[]` | Selected calendars | Empty array ⇒ no calendars selected. |
| `groups` | `Record<string, number>` | Calendar → target group mapping (0–9) | Every calendar ID should be present. |
| `targets_week` | `Record<string, number>` | Weekly goal per calendar | Hours, floats allowed. |
| `targets_month` | `Record<string, number>` | Monthly goal per calendar | Hours, floats allowed. |
| `targets_config` | `TargetsConfig` object | All targets/balance/activity/summary UI + numeric settings | See sections 3–6. |
| `theme_preference` | `'auto' | 'light' | 'dark'` | Config & Setup theme toggle | Empty / unknown ⇒ falls back to `auto`. |
| `onboarding` | `OnboardingState` | Wizard completion state | Optional. `onboarding_reset` in payload clears it. |

---

## 3. Targets tab (`targets_config` root)

| Path | Description |
| ---- | ----------- |
| `totalHours` | Total weekly target (h). |
| `allDayHours` | Contribution per all-day event (h). |
| `includeZeroDaysInStats` | Include zero-event days in pace calculation. |
| `categories[]` | Array of category definitions (see below). |

**Categories (`categories[].*`)**

| Field | Description |
| ----- | ----------- |
| `id` | Stable identifier. |
| `label` | Display name. |
| `targetHours` | Weekly target (h). |
| `includeWeekend` | `true` to spread weekend load. |
| `paceMode` | `'days_only'` or `'time_aware'`. |
| `color` | HEX colour (uppercase) used by charts. |
| `groupIds[]` | Array of numeric target groups (matches `groups`). |

**Pace (`targets_config.pace`)**

| Field | Description |
| ----- | ----------- |
| `includeWeekendTotal` | Include weekends in total pace. |
| `mode` | `'days_only' \| 'time_aware'`. |
| `thresholds.onTrack` | % gap for on-track warning (float). |
| `thresholds.atRisk` | % gap for at-risk warning (float). |

**Forecast (`targets_config.forecast`)**

| Field | Description |
| ----- | ----------- |
| `methodPrimary` | `'linear'` or `'momentum'`. |
| `momentumLastNDays` | Lookback days (1–14). |
| `padding` | Buffer in hours. |

**UI toggles (`targets_config.ui`)**

| Field | Description |
| ----- | ----------- |
| `showTotalDelta` | Show Δ vs target. |
| `showNeedPerDay` | Show required hours/day. |
| `showCategoryBlocks` | Render category breakdowns. |
| `badges` | Display status badges. |
| `includeWeekendToggle` | Show “Weekend” checkbox per category. |
| `showCalendarCharts` | Show per-calendar chart set. |
| `showCategoryCharts` | Show per-category chart set. |

---

## 4. Balance tab (`targets_config.balance`)

| Path | Description |
| ---- | ----------- |
| `thresholds.noticeMaxShare` | Float 0–1. |
| `thresholds.warnMaxShare` | Float 0–1. |
| `thresholds.warnIndex` | Float 0–1. |
| `categories[]` | Ordered list of category IDs for balance view. |
| `useCategoryMapping` | Enable category mapping. |
| `index.method` | `'simple_range'` (default) or `'shannon_evenness'`. |
| `relations.displayMode` | `'ratio'` or `'factor'`. |
| `trend.lookbackWeeks` | Integer 1–12. |
| `dayparts.enabled` | Toggle day-part analysis. |
| `ui.roundPercent` | Integer 0–3 (decimal places). |
| `ui.roundRatio` | Integer 0–3. |
| `ui.showDailyStacks` | Show day stacks. |
| `ui.showInsights` | Show balance insights. |
| `ui.showNotes` | Surface notes on the balance card. |

---

## 5. Activity & schedule tab (`targets_config.activityCard`)

| Field | Description |
| ----- | ----------- |
| `forecastMode` | `'off' \| 'total' \| 'calendar' \| 'category'`. |
| `showWeekendShare` | Include weekend badge. |
| `showEveningShare` | Evening share metric. |
| `showEarliestLatest` | Earliest/latest start times. |
| `showOverlaps` | Overlap counter. |
| `showLongestSession` | Longest session metric. |
| `showLastDayOff` | “Last day off” metric. |
| `showHint` | Helper hint at bottom of card. |

---

## 6. Summary tab (`targets_config.timeSummary`)

| Field | Description |
| ----- | ----------- |
| `showTotal` | Show total hours. |
| `showAverage` | Average per day. |
| `showMedian` | Median per day. |
| `showBusiest` | Busiest day. |
| `showWorkday` | Workday stats. |
| `showWeekend` | Weekend stats. |
| `showWeekendShare` | Weekend share percentage. |
| `showCalendarSummary` | Calendar drill-down snippet. |
| `showTopCategory` | Top category highlight. |
| `showBalance` | Balance index summary. |

---

## 7. Notes tab

| Persistence | Description |
| ----------- | ----------- |
| `/apps/opsdash/overview/notes` | Stores current & previous period notes (`week` / `month`). |
| `targets_config.balance.ui.showNotes` | Whether to show the current note in the Balance card. |

---

## 8. Config & Setup tab

| Field | Description |
| ----- | ----------- |
| `theme_preference` | Stored alongside other payload keys. Valid values: `auto`, `light`, `dark`. |
| Presets | Saved separately under the presets store (full snapshot of `payload`). |

Transient fields (profile input, preset form state) remain local and are cleared after save.

---

## 9. Calendars tab

Already covered by top-level keys:
- `cals`: selected calendars.
- `groups`: calendar grouping.
- `targets_week` / `targets_month`: per-calendar targets.

Buttons such as “All/None” are pure UI helpers and require no persistence.

---

## 10. Local storage & ephemeral state

| Key | Description |
| --- | ----------- |
| `opsdash.sidebarOpen` | Tracks whether the navigation pane is collapsed. |
| `opsdash:theme-preference` | Client fallback (overridden by server `theme_preference`). |
| Range / offset / active tab | Determined per request; not persisted server side. |

---

## 11. Maintenance checklist

- Updating /adding a toggle ➜ edit this document **and** the importer whitelist.
- Removing a feature ➜ drop the key from the whitelist so imported configs report it as ignored.
- Before releases ➜ export a baseline config, verify it matches the tables above, bump the envelope `version` if anything notable changed.
- When the backend still returns an older `targets_config`, the SPA merges any newly introduced `balance.ui.*` keys from the previous client state (e.g. `showNotes`) so user-facing toggles do not silently disable themselves. Plan a server-side schema update to stop relying on this client-side safety net.

## 12. UI import / export

The Config & Setup tab now exposes two buttons:

- **Export configuration** – downloads the current payload wrapped in the envelope described above.
- **Import configuration** – upload a JSON export; the app sanitises it with the whitelist and persists via `/overview/persist`, reporting any ignored keys.

The resulting file is version-tagged (`opsdash-config-YYYY-MM-DD.json`) so it can be tracked per release.
