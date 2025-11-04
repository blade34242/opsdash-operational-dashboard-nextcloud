import { ref, computed, nextTick } from 'vue'

export function createOnboardingWizardState() {
  const autoWizardNeeded = ref(false)
  const manualWizardOpen = ref(false)
  const onboardingRunId = ref(0)

  const onboardingWizardVisible = computed(() => autoWizardNeeded.value || manualWizardOpen.value)

  function openWizardFromSidebar() {
    autoWizardNeeded.value = false
    manualWizardOpen.value = false
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
  }
}
