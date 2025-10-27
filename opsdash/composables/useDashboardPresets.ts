import { ref, type Ref } from 'vue'

import { normalizeTargetsConfig, cloneTargetsConfig, type TargetsConfig } from '../src/services/targets'

export type PresetSummary = {
  name: string
  createdAt?: string | null
  updatedAt?: string | null
  selectedCount: number
  calendarCount: number
}

interface DashboardPresetsDeps {
  route: (name: 'presetsList' | 'presetsSave' | 'presetsLoad' | 'presetsDelete', param?: string) => string
  getJson: (url: string, params: Record<string, unknown>) => Promise<any>
  postJson: (url: string, body: Record<string, unknown>) => Promise<any>
  deleteJson: (url: string) => Promise<any>
  notifyError: (message: string) => void
  notifySuccess: (message: string) => void
  queueSave: (reload?: boolean) => void
  selected: Ref<string[]>
  groupsById: Ref<Record<string, number>>
  targetsWeek: Ref<Record<string, number>>
  targetsMonth: Ref<Record<string, number>>
  targetsConfig: Ref<TargetsConfig>
  userChangedSelection: Ref<boolean>
}

export function useDashboardPresets(deps: DashboardPresetsDeps) {
  const presets = ref<PresetSummary[]>([])
  const presetsLoading = ref(false)
  const presetSaving = ref(false)
  const presetApplying = ref(false)
  const presetWarnings = ref<string[]>([])
  const lastLoadedPreset = ref<string | null>(null)

  async function refreshPresets() {
    presetsLoading.value = true
    try {
      const res = await deps.getJson(deps.route('presetsList'), {})
      presets.value = Array.isArray(res?.presets) ? res.presets : []
    } catch (error) {
      console.error(error)
      deps.notifyError('Failed to load presets')
    } finally {
      presetsLoading.value = false
    }
  }

  async function savePreset(name: string) {
    const trimmed = name.trim()
    if (trimmed === '') {
      deps.notifyError('Enter a preset name.')
      return
    }
    presetSaving.value = true
    try {
      const payload = {
        name: trimmed,
        selected: deps.selected.value,
        groups: deps.groupsById.value,
        targets_week: deps.targetsWeek.value,
        targets_month: deps.targetsMonth.value,
        targets_config: deps.targetsConfig.value,
      }
      const res = await deps.postJson(deps.route('presetsSave'), payload)
      presets.value = Array.isArray(res?.presets) ? res.presets : presets.value
      const warnings = Array.isArray(res?.warnings) ? res.warnings : []
      presetWarnings.value = warnings
      lastLoadedPreset.value = trimmed
      deps.notifySuccess(`Profile "${trimmed}" saved`)
    } catch (error) {
      console.error(error)
      deps.notifyError('Failed to save preset')
    } finally {
      presetSaving.value = false
    }
  }

  function applyPresetData(preset: any) {
    const sel = Array.isArray(preset?.selected) ? preset.selected.map((id: any) => String(id)) : []
    deps.selected.value = sel
    const groups = preset?.groups && typeof preset.groups === 'object' ? preset.groups : {}
    deps.groupsById.value = { ...groups }
    deps.targetsWeek.value = preset?.targets_week && typeof preset.targets_week === 'object' ? preset.targets_week : {}
    deps.targetsMonth.value = preset?.targets_month && typeof preset.targets_month === 'object' ? preset.targets_month : {}
    const cfg = preset?.targets_config && typeof preset.targets_config === 'object'
      ? normalizeTargetsConfig(preset.targets_config as TargetsConfig)
      : cloneTargetsConfig(deps.targetsConfig.value)
    deps.targetsConfig.value = cfg
    deps.userChangedSelection.value = false
  }

  async function loadPreset(name: string) {
    const trimmed = name.trim()
    if (trimmed === '') return
    presetApplying.value = true
    try {
      const res = await deps.getJson(deps.route('presetsLoad', trimmed), {})
      const preset = res?.preset ?? {}
      const warnings = Array.isArray(preset?.warnings)
        ? preset.warnings
        : (Array.isArray(res?.warnings) ? res.warnings : [])
      if (warnings.length) {
        const message = `Some items in the saved profile are no longer available:\n\n${warnings.map((w: string) => `• ${w}`).join('\n')}\n\nApply the remaining values?`
        if (!window.confirm(message)) {
          presetWarnings.value = warnings
          presetApplying.value = false
          return
        }
      }
      applyPresetData(preset)
      presetWarnings.value = warnings
      lastLoadedPreset.value = trimmed
      deps.notifySuccess(`Profile "${trimmed}" applied`)
      deps.queueSave(true)
      refreshPresets().catch((err) => console.warn('[opsdash] refresh presets after load failed', err))
    } catch (error) {
      console.error(error)
      deps.notifyError('Failed to load preset')
    } finally {
      presetApplying.value = false
    }
  }

  async function deletePreset(name: string) {
    const trimmed = name.trim()
    if (trimmed === '') return
    try {
      const res = await deps.deleteJson(deps.route('presetsDelete', trimmed))
      presets.value = Array.isArray(res?.presets) ? res.presets : presets.value
      deps.notifySuccess(`Profile "${trimmed}" deleted`)
      if (lastLoadedPreset.value === trimmed) {
        lastLoadedPreset.value = null
      }
    } catch (error) {
      console.error(error)
      deps.notifyError('Failed to delete preset')
    }
  }

  function clearPresetWarnings() {
    presetWarnings.value = []
  }

  return {
    presets,
    presetsLoading,
    presetSaving,
    presetApplying,
    presetWarnings,
    lastLoadedPreset,
    refreshPresets,
    savePreset,
    loadPreset,
    deletePreset,
    clearPresetWarnings,
  }
}
