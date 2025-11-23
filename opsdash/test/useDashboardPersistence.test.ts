import { ref } from 'vue'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { useDashboardPersistence } from '../composables/useDashboardPersistence'
import { createDefaultTargetsConfig } from '../src/services/targets'
import { createDefaultDeckSettings, createDefaultReportingConfig } from '../src/services/reporting'
import persistFixture from './fixtures/persist-response.json'
import persistQaFixture from './fixtures/persist-qa.json'
import persistWeekOffset from './fixtures/persist-week-offset1.json'
import persistReportingDeck from './fixtures/persist-reporting-deck.json'

function createPersistence(overrides: Partial<Parameters<typeof useDashboardPersistence>[0]> = {}) {
  const selected = ref<string[]>([])
  const groupsById = ref<Record<string, number>>({})
  const targetsWeek = ref<Record<string, number>>({})
  const targetsMonth = ref<Record<string, number>>({})
  const targetsConfig = ref(createDefaultTargetsConfig())
  const themePreference =
    overrides.themePreference ?? ref<'auto' | 'light' | 'dark'>('auto')

  const route = vi.fn<(name: 'persist') => string>().mockReturnValue('/persist')
  const postJson = vi.fn().mockResolvedValue({})
  const notifyError = vi.fn()
  const notifySuccess = vi.fn()
  const onReload = vi.fn().mockResolvedValue(undefined)

  const persistence = useDashboardPersistence({
    route,
    postJson,
    notifyError,
    notifySuccess,
    onReload,
    selected,
    groupsById,
    targetsWeek,
    targetsMonth,
    targetsConfig,
    themePreference,
    ...overrides,
  })

  return {
    route,
    postJson,
    notifyError,
    notifySuccess,
    onReload,
    selected,
    groupsById,
    targetsWeek,
    targetsMonth,
    targetsConfig,
    themePreference,
    ...persistence,
  }
}

describe('useDashboardPersistence', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('posts current payload and updates selection + config', async () => {
    const persistedConfig = createDefaultTargetsConfig()
    persistedConfig.totalHours = 99

    const postJson = vi.fn().mockResolvedValue({
      read: ['cal-1', 'cal-2'],
      targets_config_read: persistedConfig,
    })
    const notifySuccess = vi.fn()
    const notifyError = vi.fn()
    const onReload = vi.fn().mockResolvedValue(undefined)

    const {
      queueSave,
      selected,
      groupsById,
      targetsWeek,
      targetsMonth,
      targetsConfig,
      isSaving,
    } = createPersistence({
      postJson,
      notifySuccess,
      notifyError,
      onReload,
    })

    selected.value = ['cal-1']
    groupsById.value = { 'cal-1': 2 }
    targetsWeek.value = { 'cal-1': 12 }
    targetsMonth.value = { 'cal-1': 48 }
    targetsConfig.value.totalHours = 64
    const configSnapshot = targetsConfig.value

    queueSave(true)
    expect(isSaving.value).toBe(false)
    await vi.runOnlyPendingTimersAsync()

    expect(postJson).toHaveBeenCalledWith('/persist', expect.objectContaining({
      cals: ['cal-1'],
      groups: { 'cal-1': 2 },
      targets_week: { 'cal-1': 12 },
      targets_month: { 'cal-1': 48 },
    }))
    const sentConfig = postJson.mock.calls[0][1]?.targets_config
    expect(sentConfig).toMatchObject(configSnapshot)
    expect(sentConfig).not.toBe(configSnapshot)

    expect(selected.value).toEqual(['cal-1', 'cal-2'])
    expect(targetsConfig.value.totalHours).toBe(99)
    expect(isSaving.value).toBe(false)
    expect(notifySuccess).toHaveBeenCalledWith('Selection saved')
    expect(notifyError).not.toHaveBeenCalled()
    expect(onReload).toHaveBeenCalledTimes(1)
  })

  it('debounces rapid queueSave calls', async () => {
    const postJson = vi.fn().mockResolvedValue({})
    const notifySuccess = vi.fn()

    const { queueSave } = createPersistence({
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

  it('applies server-provided balance UI toggles', async () => {
    const serverConfig = createDefaultTargetsConfig()
    serverConfig.balance.ui.showNotes = false

    const postJson = vi.fn().mockResolvedValue({
      targets_config_read: serverConfig,
    })

    const { queueSave, targetsConfig } = createPersistence({
      postJson,
      notifySuccess: vi.fn(),
    })

    targetsConfig.value.balance.ui.showNotes = true

    queueSave(false)
    await vi.runOnlyPendingTimersAsync()

    expect(postJson).toHaveBeenCalledTimes(1)
    expect(targetsConfig.value.balance.ui.showNotes).toBe(false)
  })

  it('persists theme preference when provided', async () => {
    const postJson = vi.fn().mockResolvedValue({
      theme_preference_read: 'dark',
    })

    const { queueSave, themePreference } = createPersistence({
      postJson,
      themePreference: ref<'auto' | 'light' | 'dark'>('light'),
    })

    queueSave(false)
    await vi.runOnlyPendingTimersAsync()

    expect(postJson).toHaveBeenCalledWith('/persist', expect.objectContaining({
      theme_preference: 'light',
    }))
    expect(themePreference.value).toBe('dark')
  })

  it('replays persist response fixture without dropping UI flags', async () => {
    const postJson = vi.fn().mockResolvedValue(persistFixture)
    const themePref = ref<'auto' | 'light' | 'dark'>('auto')

    const { queueSave, selected, targetsConfig, themePreference } = createPersistence({
      postJson,
      themePreference: themePref,
    })

    targetsConfig.value.balance.ui.showNotes = true

    queueSave(false)
    await vi.runOnlyPendingTimersAsync()

    expect(selected.value).toEqual(persistFixture.saved)
    expect(themePreference.value).toBe('dark')
    expect(targetsConfig.value.categories).toHaveLength(
      persistFixture.targets_config_read.categories.length,
    )
    expect(targetsConfig.value.balance.ui.showNotes).toBe(true)
  })

  it('handles minimal QA persist fixture', async () => {
    const postJson = vi.fn().mockResolvedValue(persistQaFixture)
    const { queueSave, selected } = createPersistence({ postJson })
    queueSave(false)
    await vi.runOnlyPendingTimersAsync()
    expect(selected.value).toEqual(['opsdash-focus'])
  })

  it('replays week offset persist fixture', async () => {
    const postJson = vi.fn().mockResolvedValue(persistWeekOffset)
    const initialWeek = { ...persistWeekOffset.targets_week_read }
    const targetsWeek = ref<Record<string, number>>({ ...initialWeek })

    const { queueSave, selected } = createPersistence({
      postJson,
      targetsWeek,
    })

    queueSave(false)
    await vi.runOnlyPendingTimersAsync()

    expect(selected.value).toEqual(persistWeekOffset.saved)
    expect(targetsWeek.value).toEqual(initialWeek)
  })

  it('applies reporting + Deck settings from persist fixture', async () => {
    const postJson = vi.fn().mockResolvedValue(persistReportingDeck)
    const reportingConfig = ref(createDefaultReportingConfig())
    reportingConfig.value.enabled = false
    const deckSettings = ref(createDefaultDeckSettings())
    deckSettings.value.defaultFilter = 'all'
    deckSettings.value.hiddenBoards = []

    const { queueSave } = createPersistence({
      postJson,
      reportingConfig,
      deckSettings,
    })

    queueSave(false)
    await vi.runOnlyPendingTimersAsync()

    expect(reportingConfig.value.schedule).toBe('week')
    expect(reportingConfig.value.notifyEmail).toBe(false)
    expect(reportingConfig.value.notifyNotification).toBe(true)
    expect(deckSettings.value.enabled).toBe(false)
    expect(deckSettings.value.defaultFilter).toBe('mine')
    expect(deckSettings.value.hiddenBoards).toEqual([42])
  })
})
