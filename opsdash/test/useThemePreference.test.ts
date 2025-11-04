import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { vi } from 'vitest'

let useThemePreference: typeof import('../composables/useThemePreference').useThemePreference

describe('useThemePreference', () => {
  let root: HTMLElement

  beforeEach(async () => {
    vi.resetModules()
    ;({ useThemePreference } = await import('../composables/useThemePreference'))
    root = document.createElement('div')
    root.id = 'opsdash'
    document.body.appendChild(root)
    window.localStorage.clear()
    ;(window as any).matchMedia = (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    })
  })

  afterEach(() => {
    document.body.removeChild(root)
    window.localStorage.clear()
    delete (window as any).matchMedia
  })

  it('applies theme classes and persists to localStorage', async () => {
    let api: ReturnType<typeof useThemePreference> | null = null
    const wrapper = mount(defineComponent({
      setup() {
        api = useThemePreference()
        return () => null
      },
    }))

    const state = api!
    expect(state.preference.value).toBe('auto')
    expect(root.classList.contains('opsdash-theme-light')).toBe(true)

    state.setThemePreference('dark')
    await nextTick()
    expect(state.preference.value).toBe('dark')
    expect(root.classList.contains('opsdash-theme-dark')).toBe(true)
    expect(window.localStorage.getItem('opsdash:theme-preference')).toBe('dark')

    state.setThemePreference('light')
    await nextTick()
    expect(state.preference.value).toBe('light')
    expect(root.classList.contains('opsdash-theme-light')).toBe(true)
    expect(window.localStorage.getItem('opsdash:theme-preference')).toBe('light')

    wrapper.unmount()
  })

  it('bootstraps preference from localStorage', async () => {
    window.localStorage.setItem('opsdash:theme-preference', 'dark')

    let api: ReturnType<typeof useThemePreference> | null = null
    const wrapper = mount(defineComponent({
      setup() {
        api = useThemePreference()
        return () => null
      },
    }))

    const state = api!
    await nextTick()

    expect(state.preference.value).toBe('dark')
    expect(state.effectiveTheme.value).toBe('dark')
    expect(root.classList.contains('opsdash-theme-dark')).toBe(true)

    wrapper.unmount()
  })
})
