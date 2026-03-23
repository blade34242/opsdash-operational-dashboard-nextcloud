# Onboarding Workflow

## Entry Conditions
- First load without onboarding state.
- Stored onboarding version older than required.
- Manual reset via `?onboarding=reset`.

## Flow (current)
1. Intro
   - Existing config: default path is `Change current setup`.
   - New setup: default path is `Quick setup`.
   - `Quick setup` completes onboarding immediately.
2. Strategy
   - Modes: `Single Goal`, `Calendar Goals`, `Calendar + Category Goals`.
   - This decides how the Goals step behaves later.
3. Calendars
   - Select calendars only.
   - No defaults for manual setup; at least one selected calendar is required.
   - Long calendar lists scroll inside the step, like Deck board selection.
4. Deck
   - `Show Deck in this setup` stays positive by default.
   - When boards exist, users choose visible boards from a scrollable list.
   - When Deck or boards are unavailable, the step stays visible with an info/empty state.
5. Goals
   - `Single Goal`: one overall weekly target.
   - `Calendar Goals`: per-calendar weekly goals.
   - `Calendar + Category Goals`: category targets, calendar targets, assignments, suggestions, and reorder controls.
   - Suggestions use the currently available 1-6 week lookback window.
6. Preferences
   - Core defaults on the left, optional recap module on the right.
   - Includes theme, all-day hours, and trend lookback.
7. Dashboard
   - Choose `Empty`, `Standard`, or `Advanced`.
   - Uses visual preview thumbnails that match the saved widget preset.
8. Review
   - Configuration summary, readiness checks, and optional `save as new profile`.

## Rules
- Wizard step order is fixed to `Intro -> Strategy -> Calendars -> Deck -> Goals -> Preferences -> Dashboard -> Review`.
- `Quick setup` selects all calendars, uses `Calendar Goals`, sets the standard dashboard, follows the Nextcloud theme, disables recap by default, and enables all Deck boards when available.
- If recent history exists, `Quick setup` and the Goals step use lookback-based suggestions; otherwise fallback quick targets use small defaults (`4 / 5 / 6h` pattern).
- Calendar targets are used in `Calendar Goals` and `Calendar + Category Goals`.
- Category assignment is optional; `Unassigned` calendars are allowed.
- Each calendar can map to at most one category.
- Category presets seed common defaults for `Calendar + Category Goals`.
- Wizard can save per step without finishing.

## Persistence
- Writes through `/overview/persist`.
- Profiles (via `/overview/presets`) include widgets/tabs, theme, Deck, reporting, and targets.
