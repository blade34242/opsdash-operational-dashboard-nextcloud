import { ref, watch, onBeforeUnmount, getCurrentInstance, type Ref } from 'vue'

import type { ThemePreference } from './useThemePreference'

interface ThemeSyncDeps {
  serverPreference: Ref<ThemePreference | string | null | undefined>
  localPreference: Ref<ThemePreference>
  applyLocalPreference: (value: ThemePreference) => void
  route: (name: 'persist') => string
  postJson: (url: string, body: Record<string, unknown>) => Promise<any>
  notifySuccess: (message: string) => void
  notifyError: (message: string) => void
  debounceMs?: number
}

const normalize = (value: unknown): ThemePreference => {
  if (value === 'light' || value === 'dark') {
    return value
  }
  return 'auto'
}

export function useThemeSync(deps: ThemeSyncDeps) {
  const syncingFromServer = ref(false)
  const lastPersistedTheme = ref<ThemePreference>(normalize(deps.serverPreference.value))
  let persistTimer: ReturnType<typeof setTimeout> | null = null

  const persistDelay = typeof deps.debounceMs === 'number' ? deps.debounceMs : 250

  const clearTimer = () => {
    if (persistTimer) {
      clearTimeout(persistTimer)
      persistTimer = null
    }
  }

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      clearTimer()
    })
  }

  watch(
    deps.serverPreference,
    (value) => {
      const normalized = normalize(value)
      lastPersistedTheme.value = normalized
      if (deps.localPreference.value === normalized) {
        return
      }
      syncingFromServer.value = true
      deps.applyLocalPreference(normalized)
      syncingFromServer.value = false
    },
    { immediate: true },
  )

  function scheduleThemePersist(value: ThemePreference) {
    if (syncingFromServer.value) return
    if (value === lastPersistedTheme.value) return
    clearTimer()
    persistTimer = setTimeout(async () => {
      persistTimer = null
      try {
        await deps.postJson(deps.route('persist'), { theme_preference: value })
        lastPersistedTheme.value = value
        deps.notifySuccess('Theme preference saved')
      } catch (error) {
        console.error(error)
        deps.notifyError('Failed to save theme preference')
      }
    }, persistDelay)
  }

  function setThemePreference(value: ThemePreference, options?: { persist?: boolean }) {
    const normalized = normalize(value)
    deps.applyLocalPreference(normalized)
    if (options?.persist === false) {
      return
    }
    scheduleThemePersist(normalized)
  }

  return {
    setThemePreference,
  }
}
