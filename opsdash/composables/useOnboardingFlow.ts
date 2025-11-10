import { computed, ref, watch, type Ref } from 'vue'

import { ONBOARDING_VERSION, type StrategyDefinition, type CalendarSummary } from '../src/services/onboarding'
import type { TargetsConfig } from '../src/services/targets'

import { createOnboardingWizardState } from './useOnboardingWizard'
import type { OnboardingState } from './useDashboard'
import type { ThemePreference } from './useThemePreference'

export type WizardSnapshotNotice = {
  type: 'success' | 'error'
  message: string
}

interface WizardCompletePayload {
  strategy: StrategyDefinition['id']
  selected: string[]
  targetsConfig: TargetsConfig
  groups: Record<string, number>
  targetsWeek: Record<string, number>
  targetsMonth: Record<string, number>
  themePreference: ThemePreference
}

interface OnboardingFlowDeps {
  onboardingState: Ref<OnboardingState | null>
  calendars: Ref<Array<Record<string, any>>>
  selected: Ref<string[]>
  targetsConfig: Ref<TargetsConfig>
  hasInitialLoad: Ref<boolean>
  route: (name: 'persist') => string
  postJson: (url: string, body: Record<string, unknown>) => Promise<any>
  notifySuccess: (message: string) => void
  notifyError: (message: string) => void
  setThemePreference: (value: ThemePreference, options?: { persist?: boolean }) => void
  savePreset: (name: string) => Promise<void>
  reloadAfterPersist: () => Promise<void>
}

export function useOnboardingFlow(deps: OnboardingFlowDeps) {
  const {
    autoWizardNeeded,
    manualWizardOpen,
    onboardingRunId,
    onboardingWizardVisible,
    openWizardFromSidebar,
  } = createOnboardingWizardState()

  const hasExistingConfig = computed(() => Boolean(deps.onboardingState.value?.completed))
  const isOnboardingSaving = ref(false)
  const isSnapshotSaving = ref(false)
  const snapshotNotice = ref<WizardSnapshotNotice | null>(null)

  const wizardCalendars = computed<CalendarSummary[]>(() =>
    (deps.calendars.value || [])
      .map((cal: any) => ({
        id: String(cal?.id ?? ''),
        displayname: String(cal?.displayname ?? cal?.name ?? cal?.id ?? ''),
        color: typeof cal?.color === 'string' ? cal.color : '',
      }))
      .filter((cal) => cal.id),
  )

  const wizardInitialSelection = computed(() => [...deps.selected.value])
  const wizardInitialStrategy = computed<StrategyDefinition['id']>(
    () => (deps.onboardingState.value?.strategy as StrategyDefinition['id']) ?? 'total_only',
  )

  const wizardInitialAllDayHours = computed(() => deps.targetsConfig.value?.allDayHours ?? 8)
  const wizardInitialTotalHours = computed(() => deps.targetsConfig.value?.totalHours ?? 40)

  function shouldRequireOnboarding(state: OnboardingState | null): boolean {
    if (!state) return true
    const required = state.version_required ?? ONBOARDING_VERSION
    if (!state.completed) return true
    if ((state.version ?? 0) < required) return true
    return false
  }

  function evaluateOnboarding(state?: OnboardingState | null) {
    const next = state ?? deps.onboardingState.value
    if (!deps.hasInitialLoad.value && !next) return
    const needs = shouldRequireOnboarding(next)
    autoWizardNeeded.value = needs || !!next?.resetRequested
    if (next?.resetRequested) {
      manualWizardOpen.value = true
    }
  }

  watch(
    () => deps.onboardingState.value,
    (state) => {
      if (!deps.hasInitialLoad.value) return
      evaluateOnboarding(state)
    },
  )

  async function handleWizardComplete(payload: WizardCompletePayload) {
    try {
      isOnboardingSaving.value = true
      snapshotNotice.value = null
      deps.setThemePreference(payload.themePreference, { persist: false })
      await deps.postJson(deps.route('persist'), {
        cals: payload.selected,
        groups: payload.groups,
        targets_week: payload.targetsWeek,
        targets_month: payload.targetsMonth,
        targets_config: payload.targetsConfig,
        theme_preference: payload.themePreference,
        onboarding: {
          completed: true,
          version: ONBOARDING_VERSION,
          strategy: payload.strategy,
          completed_at: new Date().toISOString(),
        },
      })
      manualWizardOpen.value = false
      autoWizardNeeded.value = false
      await deps.reloadAfterPersist()
      deps.notifySuccess('Onboarding saved')
    } catch (error) {
      console.error(error)
      deps.notifyError('Failed to save onboarding')
    } finally {
      isOnboardingSaving.value = false
    }
  }

  async function handleWizardSkip() {
    try {
      isOnboardingSaving.value = true
      snapshotNotice.value = null
      await deps.postJson(deps.route('persist'), {
        onboarding: {
          completed: true,
          version: ONBOARDING_VERSION,
          strategy: deps.onboardingState.value?.strategy ?? 'total_only',
          completed_at: new Date().toISOString(),
        },
      })
      manualWizardOpen.value = false
      autoWizardNeeded.value = false
      await deps.reloadAfterPersist()
      deps.notifySuccess('You can revisit onboarding from the Targets tab any time.')
    } catch (error) {
      console.error(error)
      deps.notifyError('Failed to update onboarding state')
    } finally {
      isOnboardingSaving.value = false
    }
  }

  function handleWizardClose() {
    if (autoWizardNeeded.value) return
    manualWizardOpen.value = false
  }

  async function handleWizardSaveSnapshot() {
    try {
      isSnapshotSaving.value = true
      snapshotNotice.value = null
      const stamp = new Date()
      const name = `Before onboarding ${stamp.toISOString().slice(0, 16).replace('T', ' ')}`
      await deps.savePreset(name)
      snapshotNotice.value = {
        type: 'success',
        message: `Preset "${name}" saved — find it under Config & Setup.`,
      }
    } catch (error) {
      console.error('[opsdash] preset backup failed', error)
      snapshotNotice.value = {
        type: 'error',
        message: 'Failed to save preset backup. Please try again.',
      }
    } finally {
      isSnapshotSaving.value = false
    }
  }

  return {
    autoWizardNeeded,
    manualWizardOpen,
    onboardingRunId,
    onboardingWizardVisible,
    openWizardFromSidebar,
    hasExistingConfig,
    wizardCalendars,
    wizardInitialSelection,
    wizardInitialStrategy,
    wizardInitialAllDayHours,
    wizardInitialTotalHours,
    isOnboardingSaving,
    isSnapshotSaving,
    snapshotNotice,
    evaluateOnboarding,
    handleWizardComplete,
    handleWizardSkip,
    handleWizardClose,
    handleWizardSaveSnapshot,
  }
}
