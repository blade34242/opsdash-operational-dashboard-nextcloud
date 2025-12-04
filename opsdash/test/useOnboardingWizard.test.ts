import { describe, it, expect } from 'vitest'

import { createOnboardingWizardState } from '../composables/useOnboardingWizard'

describe('createOnboardingWizardState', () => {
  it('opens the wizard when triggered from the sidebar', async () => {
    const state = createOnboardingWizardState()

    state.autoWizardNeeded.value = true
    state.manualWizardOpen.value = false

    await state.openWizardFromSidebar()

    expect(state.autoWizardNeeded.value).toBe(false)
    expect(state.manualWizardOpen.value).toBe(true)
    expect(state.onboardingWizardVisible.value).toBe(true)
  })

  it('increments the run id for each manual reopen', async () => {
    const state = createOnboardingWizardState()

    const initial = state.onboardingRunId.value
    await state.openWizardFromSidebar()
    const afterFirst = state.onboardingRunId.value

    state.manualWizardOpen.value = false
    await state.openWizardFromSidebar()

    expect(afterFirst).toBe(initial + 1)
    expect(state.onboardingRunId.value).toBe(afterFirst + 1)
  })

  it('stores a requested start step when opening manually', async () => {
    const state = createOnboardingWizardState()
    await state.openWizardFromSidebar('categories')
    expect(state.wizardStartStep.value).toBe('categories')
    expect(state.manualWizardOpen.value).toBe(true)
  })
})
