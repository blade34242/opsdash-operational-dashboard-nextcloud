import { computed, ref, watch, type Ref } from 'vue'

import { ONBOARDING_VERSION, type StrategyDefinition, type CalendarSummary } from '../src/services/onboarding'
import type { TargetsConfig } from '../src/services/targets'
import type { DeckFeatureSettings, ReportingConfig } from '../src/services/reporting'

import { createOnboardingWizardState } from './useOnboardingWizard'
import type { OnboardingState } from './useDashboard'
import type { OnboardingActions, WizardSnapshotNotice, WizardCompletePayload } from './useOnboardingActions'

interface OnboardingFlowDeps {
  onboardingState: Ref<OnboardingState | null>
  calendars: Ref<Array<Record<string, any>>>
  selected: Ref<string[]>
  targetsConfig: Ref<TargetsConfig>
  deckSettings: Ref<DeckFeatureSettings>
  reportingConfig: Ref<ReportingConfig>
  hasInitialLoad: Ref<boolean>
  actions: OnboardingActions
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
  const isOnboardingSaving = deps.actions.isOnboardingSaving
  const isSnapshotSaving = deps.actions.isSnapshotSaving
  const snapshotNotice = deps.actions.snapshotNotice

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
  const wizardInitialDeckSettings = computed(() => ({ ...(deps.deckSettings.value || {}) }))
  const wizardInitialReportingConfig = computed(() => ({ ...(deps.reportingConfig.value || {}) }))

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
      await deps.actions.complete(payload)
      manualWizardOpen.value = false
      autoWizardNeeded.value = false
    } catch (error) {
      console.error('[opsdash] onboarding complete failed', error)
    }
  }

  async function handleWizardSkip() {
    try {
      await deps.actions.skip()
      manualWizardOpen.value = false
      autoWizardNeeded.value = false
    } catch (error) {
      console.error('[opsdash] onboarding skip failed', error)
    }
  }

  function handleWizardClose() {
    if (autoWizardNeeded.value) return
    manualWizardOpen.value = false
  }

  async function handleWizardSaveSnapshot() {
    try {
      await deps.actions.saveSnapshot()
    } catch (error) {
      console.error('[opsdash] onboarding snapshot failed', error)
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
    wizardInitialDeckSettings,
    wizardInitialReportingConfig,
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

export type { WizardSnapshotNotice, WizardCompletePayload } from './useOnboardingActions'
