import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'

import { useThemeSync } from '../composables/useThemeSync'

describe('useThemeSync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('syncs local preference when the server value changes', async () => {
    const serverPreference = ref<'auto' | 'light' | 'dark'>('auto')
    const localPreference = ref<'auto' | 'light' | 'dark'>('auto')
    const applyLocalPreference = vi.fn((value: 'auto' | 'light' | 'dark') => {
      localPreference.value = value
    })

    useThemeSync({
      serverPreference,
      localPreference,
      applyLocalPreference,
      route: vi.fn().mockReturnValue('/persist'),
      postJson: vi.fn(),
      notifySuccess: vi.fn(),
      notifyError: vi.fn(),
    })

    serverPreference.value = 'dark'
    await nextTick()

    expect(localPreference.value).toBe('dark')
    expect(applyLocalPreference).toHaveBeenCalledWith('dark')
  })

  it('persists changes with a debounce unless disabled', async () => {
    const serverPreference = ref<'auto' | 'light' | 'dark'>('auto')
    const localPreference = ref<'auto' | 'light' | 'dark'>('auto')
    const applyLocalPreference = (value: 'auto' | 'light' | 'dark') => {
      localPreference.value = value
    }

    const postJson = vi.fn().mockResolvedValue({})
    const route = vi.fn().mockReturnValue('/persist')
    const notifySuccess = vi.fn()
    const notifyError = vi.fn()

    const { setThemePreference } = useThemeSync({
      serverPreference,
      localPreference,
      applyLocalPreference,
      route,
      postJson,
      notifySuccess,
      notifyError,
    })

    setThemePreference('light')
    await vi.advanceTimersByTimeAsync(250)

    expect(postJson).toHaveBeenCalledWith('/persist', { theme_preference: 'light' })
    expect(notifySuccess).toHaveBeenCalledWith('Theme preference saved')

    postJson.mockClear()
    setThemePreference('dark', { persist: false })
    await vi.advanceTimersByTimeAsync(250)
    expect(postJson).not.toHaveBeenCalled()
  })
})
