import { describe, it, expect } from 'vitest'

import { useSidebarState } from '../composables/useSidebarState'

describe('useSidebarState', () => {
  it('initialises open and toggles state', () => {
    const { navOpen, toggleNav, navToggleLabel } = useSidebarState()
    expect(navOpen.value).toBe(true)
    expect(navToggleLabel.value).toBe('Hide sidebar')

    toggleNav()
    expect(navOpen.value).toBe(false)
    expect(navToggleLabel.value).toBe('Show sidebar')
  })
})
