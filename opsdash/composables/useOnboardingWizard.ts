import { ref, computed, nextTick } from 'vue'

export function createOnboardingWizardState() {
  const autoWizardNeeded = ref(false)
  const manualWizardOpen = ref(false)
  const onboardingRunId = ref(0)
  const wizardStartStep = ref<'intro' | 'strategy' | 'calendars' | 'categories' | 'preferences' | 'review' | null>(null)

  const onboardingWizardVisible = computed(() => autoWizardNeeded.value || manualWizardOpen.value)

  function openWizardFromSidebar(startStep?: 'intro' | 'strategy' | 'calendars' | 'categories' | 'preferences' | 'review' | null) {
    autoWizardNeeded.value = false
    manualWizardOpen.value = false
    wizardStartStep.value = startStep ?? null
    onboardingRunId.value += 1
    return nextTick(() => {
      manualWizardOpen.value = true
    })
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
