# Keyboard Shortcuts Overlay Specification

## Purpose
Provide an accessible way for users to discover and memorize keyboard shortcuts
once we introduce them (range navigation, notes editor, etc.). The overlay will
be triggered from the sidebar and via a shortcut (`?`).

## Requirements
- Accessible from Sidebar (“Keyboard shortcuts” link/button).
- Overlay shows grouped shortcuts (Navigation, Targets, Notes, Misc).
- Supports keyboard-only operation (open, navigate, close).
- Closes with `Esc` and restores focus to the originating element.
- Respects light/dark theming tokens.

## Proposed Layout
```
┌───────────────────────────────┐
│ Keyboard Shortcuts            │
│                               │
│ Navigation                    │
│   Week back    Alt + ←        │
│   Week forward Alt + →        │
│   Toggle range Alt + Shift + R│
│                               │
│ Notes                         │
│   Save note      Ctrl + S     │
│   Toggle panel   Alt + N      │
│                               │
│ Targets (future)              │
│   Open settings  Alt + T      │
│                               │
│ Misc                           │
│   Open cheat sheet ?          │
│                               │
│ [Close]                       │
└───────────────────────────────┘
```

## Interaction Flow
1. User clicks “Keyboard shortcuts” in sidebar (or presses `?`).
2. Modal overlay appears; focus moves to the first shortcut line.
3. User navigates with arrow keys / Tab.
4. Press `Esc` or click “Close” to dismiss; focus returns to the trigger.

## Implementation Notes
- Shipped in 0.4.6 via `KeyboardShortcutsModal.vue` + `useKeyboardShortcuts`.
- Content is sourced from `src/services/shortcuts.ts` so the overlay, README, and
  automated tests stay aligned.
- The overlay uses a custom panel (`role="dialog"`, focus trap, Esc to close) to
  satisfy CSP without relying on runtime-injected styles.
- `useKeyboardShortcuts` binds listeners immediately (Alt+←/→, Alt+Shift+R,
  Alt+N, Alt+T, Ctrl/⌘+S, `?`) and exposes helpers for Notes/Config tabs.
- Opening the overlay fires a `shortcuts_opened` telemetry event via
  `trackTelemetry`, capturing whether it came from keyboard or UI.
- Add analytics event (`shortcuts_opened`) once telemetry is approved.

### Implemented Shortcuts
| Group | Action | Keys |
| --- | --- | --- |
| Navigation | Previous period | `Alt` + `←` |
| Navigation | Next period | `Alt` + `→` |
| Navigation | Toggle week/month | `Alt` + `Shift` + `R` |
| Notes | Open Notes pane | `Alt` + `N` |
| Notes | Save note | `Ctrl / ⌘` + `S` |
| Targets | Open Config & Setup | `Alt` + `T` |
| Misc | Keyboard overlay | `?` |

## Dependencies
- Shortcut definitions maintained centrally (e.g., `src/services/shortcuts.ts`).
- Onboarding + README now mention the overlay; update screenshots once real
  assets replace the placeholders.

## Open Questions
- Should we make the overlay available before all shortcuts are implemented?
- Do we allow users to customize shortcuts (later phase)?
- Where to document these shortcuts outside the app (docs/KEYBOARD_SHORTCUTS.md).
