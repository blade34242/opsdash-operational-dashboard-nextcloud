# Onboarding Workflow

## Entry Conditions
- First load without onboarding state.
- Stored onboarding version older than required.
- Manual reset via `?onboarding=reset`.

## Flow (current)
1. Intro (edit current vs create new profile, optional backup).
2. Strategy (Focused/Balanced/Power).
3. Dashboard layout (Quick/Standard/Pro).
4. Calendars (no defaults; at least one required).
5. Categories/Targets (only for Balanced/Power).
6. Preferences (theme, all-day hours, reporting, Deck, activity day-off).
7. Review (summary + optional "save as new profile").

## Rules
- Calendar targets only show in Power mode.
- Category assignment is mandatory; Unassigned blocks continue.
- Quick category presets seed common defaults.
- Wizard can save per step without finishing.

## Persistence
- Writes through `/overview/persist`.
- Profiles (via `/overview/presets`) include widgets/tabs, theme, Deck, reporting, and targets.
