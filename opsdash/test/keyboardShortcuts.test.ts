import { describe, it, expect, vi } from 'vitest'

import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts'

describe('useKeyboardShortcuts', () => {
  it('opens and closes shortcuts modal', () => {
    const goPrevious = vi.fn()
    const goNext = vi.fn()
    const toggleRange = vi.fn()
    const saveNotes = vi.fn()
    const openNotesPanel = vi.fn()
    const openConfigPanel = vi.fn()
    const ensureSidebarVisible = vi.fn()
    const onOpen = vi.fn()

    const { shortcutsOpen, openShortcuts, closeShortcuts, shortcutGroups } = useKeyboardShortcuts({
      goPrevious,
      goNext,
      toggleRange,
      saveNotes,
      openNotesPanel,
      openConfigPanel,
      ensureSidebarVisible,
      onOpen,
    })

    expect(shortcutsOpen.value).toBe(false)
    openShortcuts(null, 'button')
    expect(shortcutsOpen.value).toBe(true)
    closeShortcuts()
    expect(shortcutsOpen.value).toBe(false)
    expect(Array.isArray(shortcutGroups)).toBe(true)
    expect(shortcutGroups.length).toBeGreaterThan(0)
  })
})
