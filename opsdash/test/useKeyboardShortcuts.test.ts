import { describe, it, expect, vi } from 'vitest'

import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts'

function setup(overrides: Partial<Parameters<typeof useKeyboardShortcuts>[0]> = {}) {
  const deps = {
    goPrevious: vi.fn(),
    goNext: vi.fn(),
    toggleRange: vi.fn(),
    saveNotes: vi.fn(),
    openWidgetOptions: vi.fn(),
    openNotesPanel: vi.fn(),
    openConfigPanel: vi.fn(),
    ensureSidebarVisible: vi.fn(),
    onOpen: vi.fn(),
    toggleEditLayout: vi.fn(),
    ...overrides,
  }
  const shortcuts = useKeyboardShortcuts(deps)
  return { shortcuts, deps }
}

describe('useKeyboardShortcuts', () => {
  it('opens overlay with ? and closes on escape restoring focus', () => {
    const { shortcuts, deps } = setup()
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: '?', shiftKey: true, bubbles: true }))
    expect(shortcuts.shortcutsOpen.value).toBe(true)
    expect(deps.onOpen).toHaveBeenCalledWith({ source: 'keyboard' })

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(shortcuts.shortcutsOpen.value).toBe(false)
    expect(document.activeElement).toBe(trigger)

    shortcuts.unbindShortcuts()
  })

  it('invokes range navigation shortcuts', () => {
    const { shortcuts, deps } = setup()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, bubbles: true }))
    expect(deps.goPrevious).toHaveBeenCalledTimes(1)
    expect(deps.ensureSidebarVisible).toHaveBeenCalledTimes(1)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, bubbles: true }))
    expect(deps.goNext).toHaveBeenCalledTimes(1)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'R', altKey: true, shiftKey: true, bubbles: true }))
    expect(deps.toggleRange).toHaveBeenCalledTimes(1)

    shortcuts.unbindShortcuts()
  })

  it('handles notes + config shortcuts and save combo', () => {
    const { shortcuts, deps } = setup()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'N', altKey: true, bubbles: true }))
    expect(deps.openNotesPanel).toHaveBeenCalledTimes(1)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'T', altKey: true, bubbles: true }))
    expect(deps.openConfigPanel).toHaveBeenCalledTimes(1)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }))
    expect(deps.openWidgetOptions).toHaveBeenCalledTimes(1)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true, bubbles: true }))
    expect(deps.openWidgetOptions).toHaveBeenCalledTimes(2)

    shortcuts.unbindShortcuts()
  })

  it('toggles edit layout on Ctrl/⌘+E outside inputs', () => {
    const { shortcuts, deps } = setup()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', ctrlKey: true, bubbles: true }))
    expect(deps.toggleEditLayout).toHaveBeenCalledTimes(1)

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', ctrlKey: true, bubbles: true }))
    expect(deps.toggleEditLayout).toHaveBeenCalledTimes(1)

    shortcuts.unbindShortcuts()
  })
})
