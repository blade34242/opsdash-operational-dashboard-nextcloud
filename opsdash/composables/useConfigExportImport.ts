import type { Ref } from 'vue'

import { cloneTargetsConfig, normalizeTargetsConfig, type TargetsConfig } from '../src/services/targets'
import { buildConfigEnvelope, sanitiseSidebarPayload } from '../src/utils/sidebarConfig'
import type { OnboardingState } from './useDashboard'
import type { ThemePreference } from './useThemeController'

interface ConfigExportImportDeps {
  selected: Ref<string[]>
  groupsById: Ref<Record<string, number>>
  targetsWeek: Ref<Record<string, number>>
  targetsMonth: Ref<Record<string, number>>
  targetsConfig: Ref<TargetsConfig>
  themePreference: Ref<ThemePreference>
  onboardingState: Ref<OnboardingState | null>
  setThemePreference: (value: ThemePreference, options?: { persist?: boolean }) => void
  postJson: (url: string, body: Record<string, unknown>) => Promise<any>
  route: (name: 'persist') => string
  performLoad: () => Promise<void> | void
  notifySuccess: (message: string) => void
  notifyError: (message: string) => void
  createDownload?: (filename: string, data: unknown) => void
}

export function useConfigExportImport(deps: ConfigExportImportDeps) {
  function collectSidebarPayload() {
    const payload: Record<string, any> = {
      cals: [...deps.selected.value],
      groups: { ...deps.groupsById.value },
      targets_week: { ...deps.targetsWeek.value },
      targets_month: { ...deps.targetsMonth.value },
      targets_config: cloneTargetsConfig(deps.targetsConfig.value),
      theme_preference: deps.themePreference.value,
    }
    if (deps.onboardingState.value) {
      payload.onboarding = { ...deps.onboardingState.value }
    }
    return payload
  }

  function downloadJson(filename: string, data: unknown) {
    if (deps.createDownload) {
      deps.createDownload(filename, data)
      return
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function exportSidebarConfig() {
    try {
      const payload = collectSidebarPayload()
      const envelope = buildConfigEnvelope(payload)
      const filename = `opsdash-config-${envelope.generated.slice(0, 10)}.json`
      downloadJson(filename, envelope)
      deps.notifySuccess('Configuration exported')
    } catch (error) {
      console.error(error)
      deps.notifyError('Failed to export configuration')
    }
  }

  async function applyConfigSource(source: unknown) {
    const { cleaned, ignored } = sanitiseSidebarPayload(source)
    if (!Object.keys(cleaned).length) {
      deps.notifyError('No recognised configuration keys found in file')
      return
    }

    if (cleaned.cals) {
      deps.selected.value = (cleaned.cals as any[]).map((id) => String(id))
    }
    if (cleaned.groups) {
      const nextGroups: Record<string, number> = {}
      Object.entries(cleaned.groups as Record<string, any>).forEach(([key, value]) => {
        const num = Number(value)
        nextGroups[String(key)] = Number.isFinite(num) ? num : 0
      })
      deps.groupsById.value = nextGroups
    }
    if (cleaned.targets_week) {
      const nextWeek: Record<string, number> = {}
      Object.entries(cleaned.targets_week as Record<string, any>).forEach(([key, value]) => {
        const num = Number(value)
        if (Number.isFinite(num)) {
          nextWeek[String(key)] = num
        }
      })
      deps.targetsWeek.value = nextWeek
    }
    if (cleaned.targets_month) {
      const nextMonth: Record<string, number> = {}
      Object.entries(cleaned.targets_month as Record<string, any>).forEach(([key, value]) => {
        const num = Number(value)
        if (Number.isFinite(num)) {
          nextMonth[String(key)] = num
        }
      })
      deps.targetsMonth.value = nextMonth
    }
    if (cleaned.targets_config) {
      deps.targetsConfig.value = normalizeTargetsConfig(cleaned.targets_config as TargetsConfig)
    }
    if (cleaned.theme_preference) {
      deps.setThemePreference(cleaned.theme_preference as ThemePreference, { persist: false })
    }
    if (cleaned.onboarding && typeof cleaned.onboarding === 'object') {
      deps.onboardingState.value = { ...(cleaned.onboarding as OnboardingState) }
    }

    await deps.postJson(deps.route('persist'), cleaned as Record<string, unknown>)
    await deps.performLoad()

    if (ignored.length) {
      deps.notifyError(`Configuration imported with ignored keys: ${ignored.join(', ')}`)
    } else {
      deps.notifySuccess('Configuration imported')
    }
  }

  async function importSidebarConfig(file: File) {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const source = parsed?.payload && typeof parsed.payload === 'object' ? parsed.payload : parsed
      await applyConfigSource(source)
    } catch (error) {
      console.error(error)
      deps.notifyError('Failed to import configuration')
    }
  }

  return {
    collectSidebarPayload,
    exportSidebarConfig,
    importSidebarConfig,
    applyConfigSource,
  }
}
