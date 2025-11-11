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
- Reuse Nextcloud modal component (`NcModal`) for consistency.
- Content generated from a structured array (easier to localize/update).
- For screen readers, ensure the modal has `role="dialog"` and `aria-labelledby`.
- Add analytics event (`shortcuts_opened`).

## Dependencies
- Shortcut definitions maintained centrally (e.g., `src/services/shortcuts.ts`).
- Onboarding doc should mention the overlay once shortcuts ship.

## Open Questions
- Should we make the overlay available before all shortcuts are implemented?
- Do we allow users to customize shortcuts (later phase)?
- Where to document these shortcuts outside the app (docs/KEYBOARD_SHORTCUTS.md).
