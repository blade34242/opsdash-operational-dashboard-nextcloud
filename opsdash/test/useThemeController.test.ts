import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick, createApp, defineComponent } from 'vue'

import { useThemeController } from '../composables/useThemeController'

function mountComposable<T>(factory: () => T) {
  let composable!: T
  const app = createApp(
    defineComponent({
      setup() {
        composable = factory()
        return () => null
      },
    }),
  )
  const el = document.createElement('div')
  document.body.appendChild(el)
  app.mount(el)
  return {
    composable,
    unmount: () => {
      app.unmount()
      el.remove()
    },
  }
}

let originalMatchMedia: typeof window.matchMedia | undefined

describe('useThemeController', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = '<div id="opsdash"></div>'
    originalMatchMedia = window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }),
    })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
    document.body.innerHTML = ''
    window.matchMedia = (originalMatchMedia ?? undefined) as any
  })

  it('tracks server preference changes', async () => {
    const serverPreference = ref<'auto' | 'light' | 'dark'>('auto')
    const postJson = vi.fn().mockResolvedValue({})
    const route = vi.fn().mockReturnValue('/persist')
    const notifySuccess = vi.fn()
    const notifyError = vi.fn()

    const { composable: controller, unmount } = mountComposable(() =>
      useThemeController({
        serverPreference,
        route,
        postJson,
        notifySuccess,
        notifyError,
      }),
    )

    expect(controller.themePreference.value).toBe('auto')

    serverPreference.value = 'dark'
    await nextTick()

    expect(controller.themePreference.value).toBe('dark')
    expect(controller.effectiveTheme.value).toBe('dark')
    unmount()
  })

  it('persists local changes unless disabled', async () => {
    const serverPreference = ref<'auto' | 'light' | 'dark'>('auto')
    const postJson = vi.fn().mockResolvedValue({})
    const route = vi.fn().mockReturnValue('/persist')
    const notifySuccess = vi.fn()
    const notifyError = vi.fn()

    const { composable: controller, unmount } = mountComposable(() =>
      useThemeController({
        serverPreference,
        route,
        postJson,
        notifySuccess,
        notifyError,
      }),
    )

    controller.setThemePreference('light')
    await vi.advanceTimersByTimeAsync(250)
    expect(postJson).toHaveBeenCalledWith('/persist', { theme_preference: 'light' })
    expect(notifySuccess).toHaveBeenCalledWith('Theme preference saved')

    postJson.mockClear()
    controller.setThemePreference('dark', { persist: false })
    await vi.advanceTimersByTimeAsync(250)
    expect(postJson).not.toHaveBeenCalled()
    unmount()
  })
})
