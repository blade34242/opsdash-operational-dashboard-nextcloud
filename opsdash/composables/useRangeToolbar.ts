import { computed, type Ref } from 'vue'

type RangeMode = 'week' | 'month'

interface RangeToolbarDeps {
  navOpen: Ref<boolean>
  range: Ref<RangeMode>
  offset: Ref<number>
  from: Ref<string>
  to: Ref<string>
  isLoading: Ref<boolean>
  performLoad: () => Promise<void> | void
}

export function useRangeToolbar(deps: RangeToolbarDeps) {
  const showCollapsedRangeControls = computed(() => !deps.navOpen.value)
  const rangeToggleLabel = computed(() =>
    deps.range.value === 'week' ? 'Switch to month' : 'Switch to week',
  )
  const rangeDateLabel = computed(() => {
    if (!deps.from.value || !deps.to.value) return ''
    return `${deps.from.value} – ${deps.to.value}`
  })

  function safeLoad() {
    try {
      const result = deps.performLoad()
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        return (result as Promise<unknown>).catch((error) => {
          console.error('[opsdash] range load failed', error)
        })
      }
    } catch (error) {
      console.error('[opsdash] range load failed', error)
    }
    return undefined
  }

  function loadCurrent() {
    safeLoad()
  }

  function toggleRangeCollapsed() {
    deps.range.value = deps.range.value === 'week' ? 'month' : 'week'
    deps.offset.value = 0
    safeLoad()
  }

  function goPrevious() {
    deps.offset.value = (deps.offset.value || 0) - 1
    safeLoad()
  }

  function goNext() {
    deps.offset.value = (deps.offset.value || 0) + 1
    safeLoad()
  }

  return {
    showCollapsedRangeControls,
    rangeToggleLabel,
    rangeDateLabel,
    loadCurrent,
    toggleRangeCollapsed,
    goPrevious,
    goNext,
  }
}
