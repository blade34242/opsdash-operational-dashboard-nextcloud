import { ref, type Ref } from 'vue'

import {
  cloneTargetsConfig,
  normalizeTargetsConfig,
  type TargetsConfig,
} from '../src/services/targets'
import type { ThemePreference } from './useThemePreference'
import {
  normalizeDeckSettings,
  normalizeReportingConfig,
  type DeckFeatureSettings,
  type ReportingConfig,
} from '../src/services/reporting'

interface DashboardPersistenceDeps {
  route: (name: 'persist') => string
  postJson: (url: string, body: Record<string, unknown>) => Promise<any>
  notifyError: (message: string) => void
  notifySuccess: (message: string) => void
  onReload?: () => Promise<void> | void
  selected: Ref<string[]>
  groupsById: Ref<Record<string, number>>
  targetsWeek: Ref<Record<string, number>>
  targetsMonth: Ref<Record<string, number>>
  targetsConfig: Ref<TargetsConfig>
  themePreference?: Ref<ThemePreference>
  reportingConfig?: Ref<ReportingConfig>
  deckSettings?: Ref<DeckFeatureSettings>
}

export function useDashboardPersistence(deps: DashboardPersistenceDeps) {
  const isSaving = ref(false)
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  function queueSave(reload = true) {
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    saveTimer = setTimeout(async () => {
      saveTimer = null
      try {
        isSaving.value = true
        const previousConfig = cloneTargetsConfig(deps.targetsConfig.value)
        const payload: Record<string, any> = {
          cals: deps.selected.value,
          groups: deps.groupsById.value,
          targets_week: deps.targetsWeek.value,
          targets_month: deps.targetsMonth.value,
          targets_config: previousConfig,
        }
        if (deps.themePreference) {
          payload.theme_preference = deps.themePreference.value
        }
        if (deps.reportingConfig) {
          payload.reporting_config = deps.reportingConfig.value
        }
        if (deps.deckSettings) {
          payload.deck_settings = deps.deckSettings.value
        }
        const result = await deps.postJson(deps.route('persist'), payload)

        if (Array.isArray(result.read)) {
          deps.selected.value = result.read.map((id: any) => String(id))
        } else if (Array.isArray(result.saved)) {
          deps.selected.value = result.saved.map((id: any) => String(id))
        }

        const cfgRead = result.targets_config_read as TargetsConfig | undefined
        const cfgSaved = result.targets_config_saved as TargetsConfig | undefined
        const nextConfig = mergeIncomingTargetsConfig(cfgRead ?? cfgSaved, previousConfig)
        if (nextConfig) {
          deps.targetsConfig.value = nextConfig
        }

        if (deps.themePreference) {
          const nextTheme = normalizeThemePreference(
            result.theme_preference_read ?? result.theme_preference_saved,
          )
          if (nextTheme) {
            deps.themePreference.value = nextTheme
          }
        }
        if (deps.reportingConfig) {
          const nextReporting = normalizeReportingConfig(
            result.reporting_config_read ?? result.reporting_config_saved,
            deps.reportingConfig.value,
          )
          if (nextReporting) {
            deps.reportingConfig.value = nextReporting
          }
        }
        if (deps.deckSettings) {
          const nextDeck = normalizeDeckSettings(
            result.deck_settings_read ?? result.deck_settings_saved,
            deps.deckSettings.value,
          )
          if (nextDeck) {
            deps.deckSettings.value = nextDeck
          }
        }

        if (reload && deps.onReload) {
          await deps.onReload()
        }

        deps.notifySuccess('Selection saved')
      } catch (error) {
        console.error(error)
        deps.notifyError('Failed to save selection')
      } finally {
        isSaving.value = false
      }
    }, 250)
  }

  return {
    queueSave,
    isSaving,
  }
}

function normalizeThemePreference(value: any): ThemePreference | null {
  if (value === 'light' || value === 'dark' || value === 'auto') {
    return value
  }
  return null
}

function mergeIncomingTargetsConfig(
  incoming: TargetsConfig | undefined,
  previous: TargetsConfig,
): TargetsConfig | undefined {
  if (!incoming) return undefined

  const raw = JSON.parse(JSON.stringify(incoming)) as any
  const prevBalanceUi = previous?.balance?.ui
  const rawBalance = raw.balance ?? (raw.balance = {})
  if (!rawBalance.ui && prevBalanceUi) {
    rawBalance.ui = { ...prevBalanceUi }
  }

  const prevCategories = Array.isArray(previous?.categories) ? previous.categories : []
  const prevCategoryMap = new Map<string, any>()
  prevCategories.forEach((cat: any) => {
    const id = String(cat?.id ?? '')
    if (id) prevCategoryMap.set(id, cat)
  })
  if (Array.isArray(raw.categories)) {
    raw.categories = raw.categories.map((cat: any) => {
      const id = String(cat?.id ?? '')
      if (!id) return cat
      const prev = prevCategoryMap.get(id)
      if (prev && (cat?.color == null || cat.color === '')) {
        if (typeof prev.color === 'string' && prev.color) {
          cat.color = prev.color
        }
      }
      return cat
    })
  }

  return normalizeTargetsConfig(raw as TargetsConfig)
}
