import { describe, it, expect } from 'vitest'

import { useSidebarState } from '../composables/useSidebarState'

describe('useSidebarState', () => {
  it('initialises from localStorage and toggles state', () => {
    window.localStorage.setItem('opsdash.sidebarOpen', '0')
    const { navOpen, toggleNav, navToggleLabel } = useSidebarState()
    expect(navOpen.value).toBe(false)
    expect(navToggleLabel.value).toBe('Show sidebar')

    toggleNav()
    expect(navOpen.value).toBe(true)
    expect(navToggleLabel.value).toBe('Hide sidebar')
  })
})
