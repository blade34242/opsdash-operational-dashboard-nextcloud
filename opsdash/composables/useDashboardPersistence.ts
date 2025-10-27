import { ref, type Ref } from 'vue'

import {
  cloneTargetsConfig,
  normalizeTargetsConfig,
  type TargetsConfig,
} from '../src/services/targets'

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
        const result = await deps.postJson(deps.route('persist'), {
          cals: deps.selected.value,
          groups: deps.groupsById.value,
          targets_week: deps.targetsWeek.value,
          targets_month: deps.targetsMonth.value,
          targets_config: cloneTargetsConfig(deps.targetsConfig.value),
        })

        if (Array.isArray(result.read)) {
          deps.selected.value = result.read.map((id: any) => String(id))
        } else if (Array.isArray(result.saved)) {
          deps.selected.value = result.saved.map((id: any) => String(id))
        }

        const cfgRead = result.targets_config_read as TargetsConfig | undefined
        const cfgSaved = result.targets_config_saved as TargetsConfig | undefined
        if (cfgRead) {
          deps.targetsConfig.value = normalizeTargetsConfig(cfgRead)
        } else if (cfgSaved) {
          deps.targetsConfig.value = normalizeTargetsConfig(cfgSaved)
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
