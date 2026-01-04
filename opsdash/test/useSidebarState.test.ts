import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { useSidebarState } from '../composables/useSidebarState'

const STORAGE_KEY = 'opsdash.sidebarOpen'

beforeEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(STORAGE_KEY)
  }
})

afterEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(STORAGE_KEY)
  }
})

describe('useSidebarState', () => {
  it('initialises open and toggles state', () => {
    const { navOpen, toggleNav, navToggleLabel } = useSidebarState()
    expect(navOpen.value).toBe(true)
    expect(navToggleLabel.value).toBe('Hide sidebar')

    toggleNav()
    expect(navOpen.value).toBe(false)
    expect(navToggleLabel.value).toBe('Show sidebar')
  })

  it('uses stored state when present', () => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return
    }
    window.localStorage.setItem(STORAGE_KEY, 'false')
    const { navOpen } = useSidebarState()
    expect(navOpen.value).toBe(false)
  })
})
