import { onMounted, watch, type Ref } from 'vue'

export function useDashboardBoot(options: {
  performLoad: () => Promise<void>
  refreshPresets: () => Promise<void>
  onboardingState: Ref<any>
  hasInitialLoad: Ref<boolean>
  evaluateOnboarding: (state?: any) => void
  dashboardMode: Ref<'quick' | 'standard' | 'pro'>
}) {
  const {
    performLoad,
    refreshPresets,
    onboardingState,
    hasInitialLoad,
    evaluateOnboarding,
    dashboardMode,
  } = options

  watch(onboardingState, (state) => {
    if (!hasInitialLoad.value) return
    evaluateOnboarding(state)
  })

  watch(onboardingState, (state) => {
    const mode = state?.dashboardMode
    if (mode === 'quick' || mode === 'standard' || mode === 'pro') {
      dashboardMode.value = mode
    }
  })

  onMounted(async () => {
    console.info('[opsdash] start')
    try {
      await performLoad()
    } catch (err) {
      console.error(err)
      alert('Initial load failed')
    }
    refreshPresets().catch((err) => console.warn('[opsdash] presets fetch failed', err))
  })
}
