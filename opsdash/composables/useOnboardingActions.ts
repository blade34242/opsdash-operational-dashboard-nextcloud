import { ref, type Ref } from 'vue'

import type { OnboardingState } from './useDashboard'
import type { ThemePreference } from './useThemePreference'
import type { TargetsConfig } from '../src/services/targets'
import { ONBOARDING_VERSION, type StrategyDefinition } from '../src/services/onboarding'

export type WizardSnapshotNotice = {
  type: 'success' | 'error'
  message: string
}

export interface WizardCompletePayload {
  strategy: StrategyDefinition['id']
  selected: string[]
  targetsConfig: TargetsConfig
  groups: Record<string, number>
  targetsWeek: Record<string, number>
  targetsMonth: Record<string, number>
  themePreference: ThemePreference
}

interface OnboardingActionDeps {
  onboardingState: Ref<OnboardingState | null>
  route: (name: 'persist') => string
  postJson: (url: string, body: Record<string, unknown>) => Promise<any>
  notifySuccess: (message: string) => void
  notifyError: (message: string) => void
  setThemePreference: (value: ThemePreference, options?: { persist?: boolean }) => void
  savePreset: (name: string) => Promise<void>
  reloadAfterPersist: () => Promise<void>
}

export function useOnboardingActions(deps: OnboardingActionDeps) {
  const isOnboardingSaving = ref(false)
  const isSnapshotSaving = ref(false)
  const snapshotNotice = ref<WizardSnapshotNotice | null>(null)

  async function complete(payload: WizardCompletePayload) {
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
      await deps.reloadAfterPersist()
      deps.notifySuccess('Onboarding saved')
    } catch (error) {
      console.error(error)
      deps.notifyError('Failed to save onboarding')
      throw error
    } finally {
      isOnboardingSaving.value = false
    }
  }

  async function skip() {
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
      await deps.reloadAfterPersist()
      deps.notifySuccess('You can revisit onboarding from the Targets tab any time.')
    } catch (error) {
      console.error(error)
      deps.notifyError('Failed to update onboarding state')
      throw error
    } finally {
      isOnboardingSaving.value = false
    }
  }

  async function saveSnapshot() {
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
      throw error
    } finally {
      isSnapshotSaving.value = false
    }
  }

  return {
    isOnboardingSaving,
    isSnapshotSaving,
    snapshotNotice,
    complete,
    skip,
    saveSnapshot,
  }
}

export type OnboardingActions = ReturnType<typeof useOnboardingActions>
