import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { vi } from 'vitest'

let useThemePreference: typeof import('../composables/useThemePreference').useThemePreference

describe('useThemePreference', () => {
  let root: HTMLElement
  let bootstrapEl: HTMLElement

  beforeEach(async () => {
    vi.resetModules()
    ;({ useThemePreference } = await import('../composables/useThemePreference'))
    root = document.createElement('div')
    root.id = 'opsdash'
    document.body.appendChild(root)
    bootstrapEl = document.createElement('div')
    bootstrapEl.id = 'app'
    document.body.appendChild(bootstrapEl)
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
    document.body.removeChild(bootstrapEl)
    delete (window as any).matchMedia
  })

  it('applies theme classes when preference changes', async () => {
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
    expect(window.localStorage.getItem('opsdash:theme-preference')).toBeNull()

    state.setThemePreference('light')
    await nextTick()
    expect(state.preference.value).toBe('light')
    expect(root.classList.contains('opsdash-theme-light')).toBe(true)
    expect(window.localStorage.getItem('opsdash:theme-preference')).toBeNull()

    wrapper.unmount()
  })

  it('bootstraps preference from server data attribute', async () => {
    bootstrapEl.setAttribute('data-opsdash-theme-preference', 'dark')

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
