import type { ComputedRef } from 'vue'

interface Options {
  root: ComputedRef<string>
}

export function useCalendarLinks(options: Options) {
  function calendarDayLink(dateStr: string): string {
    const w: any = typeof window !== 'undefined' ? window : {}
    if (w.OC && typeof w.OC.generateUrl === 'function') {
      return w.OC.generateUrl(`/apps/calendar/timeGridDay/${dateStr}`)
    }
    return `${options.root.value}/index.php/apps/calendar/timeGridDay/${dateStr}`
  }

  return {
    calendarDayLink,
  }
}
