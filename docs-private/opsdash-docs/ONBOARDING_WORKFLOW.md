# Onboarding Workflow

## Entry Conditions
- First load without onboarding state.
- Stored onboarding version older than required.
- Manual reset via `?onboarding=reset`.

## Flow (current)
1. Intro (edit current vs create new profile, optional backup).
2. Strategy (Single Goal/Balanced/Advanced).
3. Dashboard layout (Compact/Standard/Workspace).
4. Calendars (no defaults; at least one required).
5. Categories/Targets (only for Balanced/Advanced).
6. Preferences (theme, all-day hours, reporting, activity day-off).
7. Deck boards (enable Deck + choose visible boards).
8. Review (summary + optional "save as new profile").

## Rules
- Calendar targets only show in the Advanced strategy.
- Category assignment is optional; Unassigned calendars are allowed.
- Category presets seed common defaults.
- Wizard can save per step without finishing.

## Persistence
- Writes through `/overview/persist`.
- Profiles (via `/overview/presets`) include widgets/tabs, theme, Deck, reporting, and targets.
