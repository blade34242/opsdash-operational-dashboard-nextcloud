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

  it('fetches DAV colours', async () => {
    const xml = `<?xml version="1.0"?>\n<d:multistatus xmlns:d="DAV:" xmlns:ical="http://apple.com/ns/ical/">\n  <d:response>\n    <d:propstat>\n      <d:prop><ical:calendar-color>#ff00aa</ical:calendar-color></d:prop>\n    </d:propstat>\n  </d:response>\n</d:multistatus>`
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(xml) })
    const originalFetch = global.fetch
    ;(global as any).fetch = fetchMock

    const { fetchDavColors } = useCalendarLinks({ root: computed(() => root.value) })
    const colors = await fetchDavColors('user', ['cal-1'])

    expect(fetchMock).toHaveBeenCalled()
    expect(colors['cal-1']).toBe('#ff00aa')

    global.fetch = originalFetch
  })
})
