import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'

import { useOnboardingFlow } from '../composables/useOnboardingFlow'
import type { OnboardingState } from '../composables/useDashboard'
import { createDefaultTargetsConfig } from '../src/services/targets'

function setupFlow(overrides: Partial<Parameters<typeof useOnboardingFlow>[0]> = {}) {
  const onboardingState = ref<OnboardingState | null>(null)
  const calendars = ref<any[]>([{ id: 'cal-1', displayname: 'Primary', color: '#ff0000' }])
  const selected = ref<string[]>(['cal-1'])
  const targetsConfig = ref(createDefaultTargetsConfig())
  const hasInitialLoad = ref(false)
  const postJson = vi.fn().mockResolvedValue({})
  const route = vi.fn().mockReturnValue('/persist')
  const notifySuccess = vi.fn()
  const notifyError = vi.fn()
  const setThemePreference = vi.fn()
  const savePreset = vi.fn().mockResolvedValue(undefined)
  const reloadAfterPersist = vi.fn().mockResolvedValue(undefined)

  const flow = useOnboardingFlow({
    onboardingState,
    calendars,
    selected,
    targetsConfig,
    hasInitialLoad,
    route,
    postJson,
    notifySuccess,
    notifyError,
    setThemePreference,
    savePreset,
    reloadAfterPersist,
    ...overrides,
  })

  return {
    onboardingState,
    calendars,
    selected,
    targetsConfig,
    hasInitialLoad,
    postJson,
    route,
    notifySuccess,
    notifyError,
    setThemePreference,
    savePreset,
    reloadAfterPersist,
    ...flow,
  }
}

describe('useOnboardingFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('flags onboarding requirement after initial load until completed', async () => {
    const ctx = setupFlow()
    ctx.hasInitialLoad.value = true
    ctx.evaluateOnboarding()
    await nextTick()

    expect(ctx.autoWizardNeeded.value).toBe(true)

    ctx.onboardingState.value = {
      completed: true,
      version: 1,
      strategy: 'total_only',
      completed_at: new Date().toISOString(),
    }
    ctx.evaluateOnboarding()
    await nextTick()

    expect(ctx.autoWizardNeeded.value).toBe(false)
  })

  it('saves preset snapshots and surfaces a notice', async () => {
    const ctx = setupFlow()
    await ctx.handleWizardSaveSnapshot()

    expect(ctx.isSnapshotSaving.value).toBe(false)
    expect(ctx.snapshotNotice.value).not.toBeNull()
    expect(ctx.snapshotNotice.value?.type).toBe('success')
    expect(ctx.savePreset).toHaveBeenCalledTimes(1)
  })

  it('persists onboarding completion payload and reloads', async () => {
    const ctx = setupFlow()
    ctx.hasInitialLoad.value = true

    await ctx.handleWizardComplete({
      strategy: 'total_only',
      selected: ['cal-1'],
      targetsConfig: ctx.targetsConfig.value,
      groups: {},
      targetsWeek: {},
      targetsMonth: {},
      themePreference: 'auto',
    })

    expect(ctx.postJson).toHaveBeenCalledWith('/persist', expect.objectContaining({
      onboarding: expect.objectContaining({
        completed: true,
        version: expect.any(Number),
      }),
      theme_preference: 'auto',
    }))
    expect(ctx.reloadAfterPersist).toHaveBeenCalledTimes(1)
    expect(ctx.notifySuccess).toHaveBeenCalledWith('Onboarding saved')
  })
})
