import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

import { useRangeToolbar } from '../composables/useRangeToolbar'
import { formatDateRange } from '../src/services/dateTime'

describe('useRangeToolbar', () => {
  it('computes labels and toggles range', async () => {
    const navOpen = ref(false)
    const range = ref<'week' | 'month'>('week')
    const offset = ref(0)
    const from = ref('2025-11-01')
    const to = ref('2025-11-07')
    const isLoading = ref(false)
    const performLoad = vi.fn()

    const toolbar = useRangeToolbar({
      navOpen,
      range,
      offset,
      from,
      to,
      isLoading,
      performLoad,
    })

    expect(toolbar.showCollapsedRangeControls.value).toBe(true)
    expect(toolbar.rangeToggleLabel.value).toBe('Switch to month')
    const expectedLabel = formatDateRange('2025-11-01', '2025-11-07', { year: 'numeric', month: '2-digit', day: '2-digit' })
    expect(toolbar.rangeDateLabel.value).toBe(expectedLabel)

    toolbar.toggleRangeCollapsed()
    expect(range.value).toBe('month')
    expect(offset.value).toBe(0)
    expect(performLoad).toHaveBeenCalledTimes(1)
  })

  it('navigates previous/next periods', () => {
    const navOpen = ref(true)
    const range = ref<'week' | 'month'>('month')
    const offset = ref(2)
    const from = ref('')
    const to = ref('')
    const isLoading = ref(false)
    const performLoad = vi.fn()

    const toolbar = useRangeToolbar({
      navOpen,
      range,
      offset,
      from,
      to,
      isLoading,
      performLoad,
    })

    toolbar.goPrevious()
    expect(offset.value).toBe(1)

    toolbar.goNext()
    expect(offset.value).toBe(2)
    expect(performLoad).toHaveBeenCalledTimes(2)
  })

  it('shows collapsed controls when nav is closed', () => {
    const navOpen = ref(false)
    const range = ref<'week' | 'month'>('week')
    const offset = ref(0)
    const from = ref('')
    const to = ref('')
    const isLoading = ref(false)
    const performLoad = vi.fn()

    const toolbar = useRangeToolbar({
      navOpen,
      range,
      offset,
      from,
      to,
      isLoading,
      performLoad,
    })

    expect(toolbar.showCollapsedRangeControls.value).toBe(true)
  })
})
