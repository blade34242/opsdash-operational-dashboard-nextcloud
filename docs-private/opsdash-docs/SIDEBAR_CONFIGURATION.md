# Sidebar Configuration (short)

## Persisted via `/overview/persist`
- `cals`, `groups`, `targets_week`, `targets_month`
- `targets_config` (categories, pace, forecast, balance, activity, timeSummary)
- `theme_preference`
- `widgets` (tabs + layout)
- `deck_settings`, `reporting_config`
- `onboarding` (state only)

## Profiles
- Saved via `/overview/presets` (endpoint name kept for legacy).
- Profiles include widgets/tabs, theme, Deck, reporting, targets, and selection.

For detailed shapes, inspect:
- `opsdash/src/services/targets/config.ts`
- `opsdash/lib/Service/PersistSanitizer.php`
- `opsdash/src/services/widgetsRegistry/types.ts`
