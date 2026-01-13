import { describe, it, expect, vi, afterEach } from 'vitest'
import { computed, ref } from 'vue'

import { useCalendarLinks } from '../composables/useCalendarLinks'

describe('useCalendarLinks', () => {
  const root = ref('https://example.com')

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses OC generateUrl when present', () => {
    const generateUrl = vi.fn().mockReturnValue('generated-url')
    const originalOc = (global as any).OC
    ;(global as any).OC = { generateUrl }

    const { calendarDayLink } = useCalendarLinks({ root: computed(() => root.value) })
    expect(calendarDayLink('2024-01-02')).toBe('generated-url')
    expect(generateUrl).toHaveBeenCalledWith('/apps/calendar/timeGridDay/2024-01-02')

    ;(global as any).OC = originalOc
  })

  it('falls back to root path when OC generateUrl missing', () => {
    const originalOc = (global as any).OC
    delete (global as any).OC

    const { calendarDayLink } = useCalendarLinks({ root: computed(() => root.value) })
    expect(calendarDayLink('2024-01-02')).toBe('https://example.com/index.php/apps/calendar/timeGridDay/2024-01-02')

    ;(global as any).OC = originalOc
  })

 
})
