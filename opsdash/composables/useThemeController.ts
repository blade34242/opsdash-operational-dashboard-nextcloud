import type { Ref } from 'vue'

import { useThemePreference, type ThemePreference, type ThemeMode } from './useThemePreference'
import { useThemeSync } from './useThemeSync'

interface ThemeControllerDeps {
  serverPreference: Ref<ThemePreference | string | null | undefined>
  route: (name: 'persist') => string
  postJson: (url: string, body: Record<string, unknown>) => Promise<any>
  notifySuccess: (message: string) => void
  notifyError: (message: string) => void
}

export function useThemeController(deps: ThemeControllerDeps) {
  const {
    preference,
    effectiveTheme,
    systemTheme,
    setThemePreference: applyLocalPreference,
  } = useThemePreference()

  const { setThemePreference: syncThemePreference } = useThemeSync({
    serverPreference: deps.serverPreference,
    localPreference: preference,
    applyLocalPreference,
    route: deps.route,
    postJson: deps.postJson,
    notifySuccess: deps.notifySuccess,
    notifyError: deps.notifyError,
  })

  function setThemePreference(value: ThemePreference, options?: { persist?: boolean }) {
    syncThemePreference(value, options)
  }

  return {
    themePreference: preference,
    effectiveTheme,
    systemTheme,
    setThemePreference,
  }
}

export type ThemeController = ReturnType<typeof useThemeController>
export type { ThemePreference, ThemeMode } from './useThemePreference'
