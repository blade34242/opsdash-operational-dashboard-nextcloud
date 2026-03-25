import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'

import { useOnboardingFlow } from '../composables/useOnboardingFlow'
import type { OnboardingState } from '../composables/useDashboard'
import { createDefaultTargetsConfig } from '../src/services/targets'
import { createDefaultDeckSettings, createDefaultReportingConfig } from '../src/services/reporting'
import type { OnboardingActions } from '../composables/useOnboardingActions'

function setupFlow(overrides: Partial<Parameters<typeof useOnboardingFlow>[0]> = {}) {
  const onboardingState = ref<OnboardingState | null>(null)
  const calendars = ref<any[]>([{ id: 'cal-1', displayname: 'Primary', color: '#ff0000' }])
  const selected = ref<string[]>(['cal-1'])
  const targetsWeek = ref<Record<string, number>>({})
  const groupsById = ref<Record<string, number>>({ 'cal-1': 0 })
  const targetsConfig = ref(createDefaultTargetsConfig())
  const deckSettings = ref(createDefaultDeckSettings())
  const reportingConfig = ref(createDefaultReportingConfig())
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
    targetsWeek,
    groupsById,
    targetsConfig,
    deckSettings,
    reportingConfig,
    hasInitialLoad,
    actions,
    ...overrides,
  })

  return {
    onboardingState,
    calendars,
    selected,
    targetsWeek,
    groupsById,
    targetsConfig,
    deckSettings,
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

  it('does not treat normalized default targets config as existing setup', () => {
    const ctx = setupFlow()

    expect(ctx.hasExistingConfig.value).toBe(false)
    expect(ctx.wizardInitialStrategy.value).toBe('total_only')
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
      deckSettings: ctx.deckSettings.value,
    })

    expect(ctx.actions.complete).toHaveBeenCalledTimes(1)
    expect(ctx.autoWizardNeeded.value).toBe(false)
  })

  it('clears requested start step when onboarding is required again', async () => {
    const ctx = setupFlow()
    ctx.wizardStartStep.value = 'categories'
    ctx.hasInitialLoad.value = true
    ctx.onboardingState.value = { completed: false, version: 0 } as any

    ctx.evaluateOnboarding()
    await nextTick()

    expect(ctx.autoWizardNeeded.value).toBe(true)
    expect(ctx.wizardStartStep.value).toBeNull()
  })

  it('closes the wizard immediately while skip is still pending', async () => {
    let resolveSkip: (() => void) | null = null
    const skip = vi.fn().mockImplementation(() => new Promise<void>((resolve) => {
      resolveSkip = resolve
    }))
    const ctx = setupFlow({
      actions: {
        isOnboardingSaving: ref(false),
        isSnapshotSaving: ref(false),
        snapshotNotice: ref(null),
        complete: vi.fn().mockResolvedValue(undefined),
        skip,
        saveSnapshot: vi.fn().mockResolvedValue(undefined),
      } as OnboardingActions,
    })

    ctx.autoWizardNeeded.value = true
    const pending = ctx.handleWizardSkip()

    expect(ctx.onboardingWizardVisible.value).toBe(false)
    expect(skip).toHaveBeenCalledTimes(1)

    resolveSkip?.()
    await pending
  })

  it('prefers persisted onboarding strategy over stale category config', () => {
    const ctx = setupFlow()
    ctx.onboardingState.value = {
      completed: true,
      version: 1,
      strategy: 'total_plus_categories',
      completed_at: new Date().toISOString(),
    }
    ctx.targetsConfig.value = {
      ...ctx.targetsConfig.value,
      categories: [
        {
          id: 'focus',
          label: 'Focus',
          targetHours: 12,
          includeWeekend: false,
          paceMode: 'days_only',
          color: '#2563EB',
          groupId: 1,
        } as any,
      ],
    }

    expect(ctx.wizardInitialStrategy.value).toBe('total_plus_categories')
  })

  it('recognizes existing config from persisted setup even when onboarding is incomplete', () => {
    const ctx = setupFlow()
    ctx.onboardingState.value = {
      completed: false,
      version: 1,
      strategy: 'total_plus_categories',
      completed_at: '',
      dashboardMode: 'standard',
    }
    ctx.targetsWeek.value = { 'cal-1': 8 }

    expect(ctx.hasExistingConfig.value).toBe(true)
    expect(ctx.wizardInitialStrategy.value).toBe('total_plus_categories')
  })

  it('does not auto-open onboarding for existing config until opened manually', async () => {
    const ctx = setupFlow()
    ctx.hasInitialLoad.value = true
    ctx.onboardingState.value = {
      completed: false,
      version: 1,
      strategy: 'total_plus_categories',
      completed_at: '',
      dashboardMode: 'standard',
    }
    ctx.targetsWeek.value = { 'cal-1': 8 }

    ctx.evaluateOnboarding()
    await nextTick()

    expect(ctx.hasExistingConfig.value).toBe(true)
    expect(ctx.autoWizardNeeded.value).toBe(false)
    expect(ctx.onboardingWizardVisible.value).toBe(false)
  })

  it('falls back to calendar goals when only calendar targets exist', () => {
    const ctx = setupFlow()
    ctx.targetsConfig.value = {
      ...ctx.targetsConfig.value,
      categories: [],
    }
    ctx.targetsWeek.value = { 'cal-1': 8 }

    expect(ctx.wizardInitialStrategy.value).toBe('total_plus_categories')
  })
})
