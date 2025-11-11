export interface ShortcutItem {
  id: string
  label: string
  combo: string[]
  description?: string
}

export interface ShortcutGroup {
  id: string
  title: string
  items: ShortcutItem[]
}

export const KEYBOARD_SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    id: 'navigation',
    title: 'Navigation',
    items: [
      { id: 'nav-prev', label: 'Previous period', combo: ['Alt', '←'], description: 'Go to the previous week or month' },
      { id: 'nav-next', label: 'Next period', combo: ['Alt', '→'], description: 'Go to the next week or month' },
      { id: 'nav-toggle-range', label: 'Toggle week/month', combo: ['Alt', 'Shift', 'R'], description: 'Switch between week and month range' },
    ],
  },
  {
    id: 'notes',
    title: 'Notes',
    items: [
      { id: 'notes-toggle', label: 'Open Notes pane', combo: ['Alt', 'N'], description: 'Show the Notes tab in the sidebar' },
      { id: 'notes-save', label: 'Save note', combo: ['Ctrl / ⌘', 'S'], description: 'Persist the current note draft' },
    ],
  },
  {
    id: 'targets',
    title: 'Targets',
    items: [
      { id: 'targets-focus', label: 'Open Config & Setup', combo: ['Alt', 'T'], description: 'Jump to preset + theme controls' },
    ],
  },
  {
    id: 'misc',
    title: 'Misc',
    items: [
      { id: 'shortcuts-open', label: 'Open cheat sheet', combo: ['?'], description: 'Display this overlay' },
    ],
  },
]
