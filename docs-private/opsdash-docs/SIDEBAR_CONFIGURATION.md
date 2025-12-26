# Sidebar Configuration Reference (Opsdash 0.5.1)

Canonical map of every setting that lives in the sidebar and how it persists.
Keep this file updated whenever a new toggle/value is added or renamed.

---

## 1. Canonical payload

All sidebar state can be represented as a single JSON envelope:

```json
{
  "version": "0.5.1",
  "generated": "2025-12-21T19:45:00Z",
  "payload": {
    "cals": ["cal-1", "cal-3"],
    "groups": { "cal-1": 0, "cal-3": 2 },
    "targets_week": { "cal-1": 12 },
    "targets_month": { "cal-1": 48 },
    "targets_config": { ... see sections below ... },
    "theme_preference": "auto",
    "widgets": {
      "defaultTabId": "tab-1",
      "tabs": [
        {
          "id": "tab-1",
          "label": "Overview",
          "widgets": [
            {
              "id": "widget-balance-1700000000000",
              "type": "balance_index",
              "layout": { "width": "half", "height": "m", "order": 10 },
              "options": {},
              "version": 1
            }
          ]
        }
      ]
    },
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
| `theme_preference` | `'auto' | 'light' | 'dark'` | Theme tab toggle | Empty / unknown ⇒ falls back to `auto`. |
| `widgets` | `WidgetTabsState` | Dashboard layout tabs + widget layouts | Stored via `/overview/persist`; each tab holds its own widget list. |
| `onboarding` | `OnboardingState` | Wizard completion state | Optional. `onboarding_reset` in payload clears it. |
| `deck_settings` | `DeckFeatureSettings` | Deck tab visibility, filters, hidden boards, mine-mode, solved/archived toggle, ticker prefs | Enabled flag doubles as Deck tab toggle. |
| `reporting_config` | `ReportingConfig` | Recap cadence (week/month/both), interim reminders, alerting | Shared between Sidebar → Report tab and onboarding final tweaks. |

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
| `showTotalDelta` | Show Δ vs target. (Now configurable in Targets widget; sidebar control removed in 0.4.7) |
| `showNeedPerDay` | Show required hours/day. (widget-only) |
| `showCategoryBlocks` | Render category breakdowns. (widget-only) |
| `badges` | Display status badges. (widget-only) |
| `includeWeekendToggle` | Show “Weekend” checkbox per category. (widget-only) |
| `showCalendarCharts` | Show per-calendar chart set. |
| `showCategoryCharts` | Show per-category chart set. |

---

## 4. Balance config (`targets_config.balance`)

| Path | Description |
| ---- | ----------- |
| `thresholds.noticeMaxShare` | Float 0–1. |
| `thresholds.warnMaxShare` | Float 0–1. |
| `thresholds.warnIndex` | Float 0–1. |
| `categories[]` | Ordered list of category IDs for balance view. |
| `useCategoryMapping` | Enable category mapping. |
| `index.method` | `'simple_range'` (default) or `'shannon_evenness'`. |
| `relations.displayMode` | `'ratio'` or `'factor'`. |
| `trend.lookbackWeeks` | Integer 1–12 (legacy default; chart widgets now store lookback per widget). |
| `dayparts.enabled` | Toggle day-part analysis. |
| `ui.roundPercent` | Integer 0–3 (decimal places). |
| `ui.roundRatio` | Integer 0–3. |
| `ui.showDailyStacks` | Show day stacks. |
| `ui.showInsights` | Show balance insights. |
| `ui.showNotes` | Surface notes on the balance card. |

### Balance threshold guidance

- **noticeMaxShare** (default `0.65` → 65 %): when a single category exceeds this share of the total tracked hours, the UI surfaces a “dominant category” notice (without flagging the index as at risk). Use values closer to 1.0 to tolerate larger concentrations, and values closer to 0.5 to flag smaller imbalances.
- **warnMaxShare** (default `0.75` → 75 %): once a category breaches this stricter share threshold, the balance card renders a warning badge and `balance_overview.warnings` includes a note. Think of this as “if one focus area already owns 75 %+ of the week, call it out.” Keep it above `noticeMaxShare` (the validator enforces the 0–1 range but not ordering). Lowering it makes the warning trigger earlier.
- **warnIndex** (default `0.60` → 60 %): the balance index (`1 − (maxShare − minShare)`) is compared against this value; the index itself ranges [0,1], where 1 = perfect balance and 0 = all time in one category. When the index falls below `warnIndex`, both the UI and any reporting/notification logic tied to `balance.thresholds.warnIndex` can treat the week as at risk. Raising the threshold makes the alert harder to reach, lowering it makes “slight imbalances” count as warnings.

These thresholds influence both the Balance card and the `warning`/`insight` text arrays returned by `/overview/load`, so adjusting them gives you fine-grained control over how sensitive Opsdash is to imbalance across categories and calendars.

---

## 5. Activity & schedule config (`targets_config.activityCard`)

| Field | Description |
| ----- | ----------- |
| `forecastMode` | Legacy chart projection mode; widget-level projection controls now live inside each chart widget. |
| `showWeekendShare` | Include weekend badge. |
| `showEveningShare` | Evening share metric. |
| `showEarliestLatest` | Earliest/latest start times. |
| `showOverlaps` | Overlap counter. |
| `showLongestSession` | Longest session metric. |
| `showLastDayOff` | “Last day off” metric. |
| `showDayOffTrend` | Toggle the “Days off” heatmap block (enabled by default). |
| `showHint` | Helper hint at bottom of card. |

---

## 6. Summary tab (removed)

- The Summary sidebar tab was removed in 0.4.7. The same toggles now live per-instance in the `time_summary_v2` widget (gear menu). Persisted shape remains in `targets_config.timeSummary` for compatibility.

---

## 7. Notes tab

| Persistence | Description |
| ----------- | ----------- |
| `/apps/opsdash/overview/notes` | Stores current & previous period notes (`week` / `month`). |
| `targets_config.balance.ui.showNotes` | Whether to show the current note in the Balance card. |

---

## 8. Theme tab

| Field | Description |
| ----- | ----------- |
| `theme_preference` | Stored alongside other payload keys. Valid values: `auto`, `light`, `dark` (persisted via `/persist` since 0.4.4, refined in 0.4.5). |
| Presets | Saved separately under the presets store (full snapshot of `payload`). |

Transient fields (profile input, preset form state) remain local and are cleared after save.

---

## 9. Calendars tab

Already covered by top-level keys:
- `cals`: selected calendars.
- `groups`: calendar grouping.
- `targets_week` / `targets_month`: per-calendar targets.

Calendars also exposes:
- “Re-run onboarding” + “Keyboard shortcuts” actions (no persistence). Keyboard shortcuts open a quick popover list; `?` still opens the full overlay.

---

## 10. Local storage & ephemeral state

No sidebar or widget state is persisted in localStorage. Theme preference is bootstrapped into the initial HTML and persisted server-side as `theme_preference`.

---

## 11. Widget layout tabs (`widgets`)

The dashboard layout is stored as a list of tabs, each with its own widget list:

```json
{
  "defaultTabId": "tab-1",
  "tabs": [
    {
      "id": "tab-1",
      "label": "Overview",
      "widgets": [
        {
          "id": "widget-targets-1700000000000",
          "type": "targets",
          "layout": { "width": "half", "height": "l", "order": 10 },
          "options": { "showBadges": true },
          "version": 1
        }
      ]
    }
  ]
}
```

- `defaultTabId` determines which tab is selected after reload.
- Tabs are editable in **Edit layout** mode: rename, set default, add, and remove.
- Widgets inside a tab behave exactly like the single-layout era; legacy arrays are still accepted and are normalized into a single “Overview” tab.

---

## 12. Maintenance checklist

- Updating /adding a toggle ➜ edit this document **and** the importer whitelist.
- Removing a feature ➜ drop the key from the whitelist so imported configs report it as ignored.
- Before releases ➜ export a baseline config, verify it matches the tables above, bump the envelope `version` if anything notable changed.
- When the backend still returns an older `targets_config`, the SPA merges any newly introduced `balance.ui.*` keys from the previous client state (e.g. `showNotes`) so user-facing toggles do not silently disable themselves. Plan a server-side schema update to stop relying on this client-side safety net.

## 12. UI import / export

The Profiles tab exposes two buttons:

- **Export configuration** – downloads the current payload wrapped in the envelope described above.
- **Import configuration** – upload a JSON export; the app sanitises it with the whitelist and persists via `/overview/persist`, reporting any ignored keys.

The resulting file is version-tagged (`opsdash-config-YYYY-MM-DD.json`) so it can be tracked per release.
