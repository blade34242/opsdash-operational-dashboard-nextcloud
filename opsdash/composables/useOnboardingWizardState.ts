import { computed, nextTick, ref } from 'vue'

export type StepId = 'intro' | 'strategy' | 'dashboard' | 'calendars' | 'categories' | 'preferences' | 'review'

export function createOnboardingWizardState() {
  const autoWizardNeeded = ref(false)
  const manualWizardOpen = ref(false)
  const onboardingRunId = ref(0)
  const wizardStartStep = ref<StepId | null>(null)

  const onboardingWizardVisible = computed(() => autoWizardNeeded.value || manualWizardOpen.value)

  async function openWizardFromSidebar(step?: StepId) {
    onboardingRunId.value += 1
    wizardStartStep.value = step ?? null
    autoWizardNeeded.value = false
    manualWizardOpen.value = true
    await nextTick()
  }

  return {
    autoWizardNeeded,
    manualWizardOpen,
    onboardingRunId,
    onboardingWizardVisible,
    openWizardFromSidebar,
    wizardStartStep,
  }
}

