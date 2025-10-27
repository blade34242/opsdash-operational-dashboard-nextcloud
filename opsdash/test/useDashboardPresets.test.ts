import { ref } from 'vue'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { useDashboardPresets } from '../composables/useDashboardPresets'
import { createDefaultTargetsConfig } from '../src/services/targets'

function createPresetManager(overrides: Partial<Parameters<typeof useDashboardPresets>[0]> = {}) {
  const selected = ref<string[]>(['cal-1'])
  const groupsById = ref<Record<string, number>>({ 'cal-1': 2 })
  const targetsWeek = ref<Record<string, number>>({ 'cal-1': 10 })
  const targetsMonth = ref<Record<string, number>>({ 'cal-1': 40 })
  const targetsConfig = ref(createDefaultTargetsConfig())
  const userChangedSelection = ref(false)

  const route = vi.fn<(name: 'presetsList' | 'presetsSave' | 'presetsLoad' | 'presetsDelete', param?: string) => string>().mockImplementation((name, param?: string) => {
    switch (name) {
      case 'presetsList':
      case 'presetsSave':
        return '/presets'
      case 'presetsLoad':
      case 'presetsDelete':
        return `/presets/${param ?? ''}`
      default:
        return '/presets'
    }
  })

  const getJson = vi.fn().mockResolvedValue({ presets: [] })
  const postJson = vi.fn().mockResolvedValue({ presets: [] })
  const deleteJson = vi.fn().mockResolvedValue({ presets: [] })
  const notifyError = vi.fn()
  const notifySuccess = vi.fn()
  const queueSave = vi.fn()

  const manager = useDashboardPresets({
    route,
    getJson,
    postJson,
    deleteJson,
    notifyError,
    notifySuccess,
    queueSave,
    selected,
    groupsById,
    targetsWeek,
    targetsMonth,
    targetsConfig,
    userChangedSelection,
    ...overrides,
  })

  return {
    selected,
    groupsById,
    targetsWeek,
    targetsMonth,
    targetsConfig,
    userChangedSelection,
    route,
    getJson,
    postJson,
    deleteJson,
    notifyError,
    notifySuccess,
    queueSave,
    ...manager,
  }
}

describe('useDashboardPresets', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('refreshes presets list', async () => {
    const getJson = vi.fn().mockResolvedValue({ presets: [{ name: 'Focus', selectedCount: 2, calendarCount: 3 }] })
    const manager = createPresetManager({ getJson })

    await manager.refreshPresets()

    expect(getJson).toHaveBeenCalledWith('/presets', {})
    expect(manager.presets.value).toEqual([{ name: 'Focus', selectedCount: 2, calendarCount: 3 }])
    expect(manager.notifyError).not.toHaveBeenCalled()
  })

  it('saves presets and records warnings', async () => {
    const postJson = vi.fn().mockResolvedValue({ presets: [], warnings: ['Calendar missing'] })
    const manager = createPresetManager({ postJson })

    await manager.savePreset(' Deep Work ')

    expect(postJson).toHaveBeenCalledWith('/presets', expect.objectContaining({ name: 'Deep Work' }))
    expect(manager.presetWarnings.value).toEqual(['Calendar missing'])
    expect(manager.notifySuccess).toHaveBeenCalledWith('Profile "Deep Work" saved')
    expect(manager.notifyError).not.toHaveBeenCalled()
  })

  it('loads preset, applies data, queues save, and refreshes list', async () => {
    const presetPayload = {
      preset: {
        selected: ['cal-1', 'cal-2'],
        groups: { 'cal-1': 1 },
        targets_week: { 'cal-1': 5 },
        targets_month: { 'cal-1': 20 },
        targets_config: { ...createDefaultTargetsConfig(), totalHours: 120 },
      },
      presets: [],
    }
    const getJson = vi.fn().mockResolvedValueOnce(presetPayload).mockResolvedValueOnce({ presets: [] })
    const queueSave = vi.fn()
    const manager = createPresetManager({ getJson, queueSave })

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    await manager.loadPreset('Focus')

    expect(getJson).toHaveBeenCalledWith('/presets/Focus', {})
    expect(manager.selected.value).toEqual(['cal-1', 'cal-2'])
    expect(manager.targetsWeek.value['cal-1']).toBe(5)
    expect(manager.targetsConfig.value.totalHours).toBe(120)
    expect(queueSave).toHaveBeenCalledWith(true)
    expect(manager.notifySuccess).toHaveBeenCalledWith('Profile "Focus" applied')
    expect(confirmSpy).not.toHaveBeenCalled()
  })

  it('aborts preset load when user declines warnings', async () => {
    const getJson = vi.fn().mockResolvedValue({ preset: { warnings: ['Missing cal'] } })
    const manager = createPresetManager({ getJson })
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    await manager.loadPreset('Focus')

    expect(manager.presetWarnings.value).toEqual(['Missing cal'])
    expect(manager.presetApplying.value).toBe(false)
    expect(manager.queueSave).not.toHaveBeenCalled()
    expect(manager.notifySuccess).not.toHaveBeenCalled()
    expect(confirmSpy).toHaveBeenCalledTimes(1)
  })
})
