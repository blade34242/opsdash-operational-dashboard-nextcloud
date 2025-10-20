import { ref } from 'vue'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { useDashboard } from '../composables/useDashboard'
import { createDefaultTargetsConfig } from '../src/services/targets'

type QueueSaveDepsOverride = Partial<Parameters<typeof useDashboard>[0]>

function createDashboard(overrides: QueueSaveDepsOverride = {}) {
  const range = ref<'week' | 'month'>('week')
  const offset = ref(0)
  const userChangedSelection = ref(false)

  const route = vi.fn((name: 'load' | 'persist' | 'notes') => {
    if (name === 'persist') return '/persist'
    if (name === 'load') return '/load'
    if (name === 'notes') return '/notes'
    return '/'
  })

  const getJson = vi.fn().mockResolvedValue({})
  const postJson = vi.fn().mockResolvedValue({})
  const notifyError = vi.fn()
  const notifySuccess = vi.fn()
  const scheduleDraw = vi.fn()
  const fetchNotes = vi.fn().mockResolvedValue(undefined)

  const dashboard = useDashboard({
    range,
    offset,
    userChangedSelection,
    route,
    getJson,
    postJson,
    notifyError,
    notifySuccess,
    scheduleDraw,
    fetchNotes,
    isDebug: () => false,
    ...overrides,
  })

  return {
    range,
    offset,
    userChangedSelection,
    route,
    getJson,
    postJson,
    notifyError,
    notifySuccess,
    scheduleDraw,
    fetchNotes,
    ...dashboard,
  }
}

describe('useDashboard queueSave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('posts current payload and updates selection + targets config', async () => {
    const persistedConfig = createDefaultTargetsConfig()
    persistedConfig.totalHours = 99

    const postJson = vi.fn().mockResolvedValue({
      read: ['cal-1', 'cal-2'],
      targets_config_read: persistedConfig,
    })
    const notifySuccess = vi.fn()
    const notifyError = vi.fn()

    const {
      queueSave,
      selected,
      groupsById,
      targetsWeek,
      targetsMonth,
      targetsConfig,
      isSaving,
    } = createDashboard({
      postJson,
      notifySuccess,
      notifyError,
    })

    selected.value = ['cal-1']
    groupsById.value = { 'cal-1': 2 }
    targetsWeek.value = { 'cal-1': 12 }
    targetsMonth.value = { 'cal-1': 48 }
    targetsConfig.value.totalHours = 64
    const configSnapshot = targetsConfig.value

    queueSave(false)
    await vi.runOnlyPendingTimersAsync()

    expect(postJson).toHaveBeenCalledTimes(1)
    expect(postJson).toHaveBeenCalledWith('/persist', expect.objectContaining({
      cals: ['cal-1'],
      groups: { 'cal-1': 2 },
      targets_week: { 'cal-1': 12 },
      targets_month: { 'cal-1': 48 },
    }))
    const sentConfig = postJson.mock.calls[0][1]?.targets_config
    expect(sentConfig).toEqual(configSnapshot)
    expect(sentConfig).not.toBe(configSnapshot)

    expect(selected.value).toEqual(['cal-1', 'cal-2'])
    expect(targetsConfig.value.totalHours).toBe(99)
    expect(isSaving.value).toBe(false)
    expect(notifySuccess).toHaveBeenCalledWith('Selection saved')
    expect(notifyError).not.toHaveBeenCalled()
  })

  it('debounces rapid queueSave calls', async () => {
    const postJson = vi.fn().mockResolvedValue({})
    const notifySuccess = vi.fn()

    const { queueSave } = createDashboard({
      postJson,
      notifySuccess,
    })

    queueSave(false)
    vi.advanceTimersByTime(200)
    queueSave(false)
    await vi.runOnlyPendingTimersAsync()

    expect(postJson).toHaveBeenCalledTimes(1)
    expect(notifySuccess).toHaveBeenCalledTimes(1)
  })
})
