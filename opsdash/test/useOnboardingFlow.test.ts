import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'

import { useOnboardingFlow } from '../composables/useOnboardingFlow'
import type { OnboardingState } from '../composables/useDashboard'
import { createDefaultTargetsConfig } from '../src/services/targets'
import type { OnboardingActions } from '../composables/useOnboardingActions'

function setupFlow(overrides: Partial<Parameters<typeof useOnboardingFlow>[0]> = {}) {
  const onboardingState = ref<OnboardingState | null>(null)
  const calendars = ref<any[]>([{ id: 'cal-1', displayname: 'Primary', color: '#ff0000' }])
  const selected = ref<string[]>(['cal-1'])
  const targetsConfig = ref(createDefaultTargetsConfig())
  const hasInitialLoad = ref(false)
  const actions: OnboardingActions = {
    isOnboardingSaving: ref(false),
    isSnapshotSaving: ref(false),
    snapshotNotice: ref(null),
    complete: vi.fn().mockResolvedValue(undefined),
    skip: vi.fn().mockResolvedValue(undefined),
    saveSnapshot: vi.fn().mockResolvedValue(undefined),
  }

  const flow = useOnboardingFlow({
    onboardingState,
    calendars,
    selected,
    targetsConfig,
    hasInitialLoad,
    actions,
    ...overrides,
  })

  return {
    onboardingState,
    calendars,
    selected,
    targetsConfig,
    hasInitialLoad,
    actions,
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

  it('delegates snapshot saving through onboarding actions', async () => {
    const ctx = setupFlow()
    await ctx.handleWizardSaveSnapshot()
    expect(ctx.actions.saveSnapshot).toHaveBeenCalledTimes(1)
  })

  it('delegates completion to onboarding actions and updates flags', async () => {
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

    expect(ctx.actions.complete).toHaveBeenCalledTimes(1)
    expect(ctx.autoWizardNeeded.value).toBe(false)
  })
})
