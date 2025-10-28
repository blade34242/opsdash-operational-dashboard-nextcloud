import type { ComputedRef } from 'vue'

interface Options {
  root: ComputedRef<string>
  isDebug?: () => boolean
}

export function useCalendarLinks(options: Options) {
  function calendarDayLink(dateStr: string): string {
    const w: any = typeof window !== 'undefined' ? window : {}
    if (w.OC && typeof w.OC.generateUrl === 'function') {
      return w.OC.generateUrl(`/apps/calendar/timeGridDay/${dateStr}`)
    }
    return `${options.root.value}/index.php/apps/calendar/timeGridDay/${dateStr}`
  }

  async function fetchDavColors(uid: string, ids: string[]): Promise<Record<string, string>> {
    const out: Record<string, string> = {}
    if (!uid) return out
    const rt = (window as any).OC?.requestToken || (window as any).oc_requesttoken || ''
    const base = options.root.value
    for (const id of ids) {
      try {
        const url = `${base}/remote.php/dav/calendars/${encodeURIComponent(uid)}/${encodeURIComponent(id)}/`
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<d:propfind xmlns:d="DAV:" xmlns:ical="http://apple.com/ns/ical/">\n  <d:prop><ical:calendar-color/></d:prop>\n</d:propfind>`
        if (options.isDebug?.()) console.log('[opsdash] PROPFIND', { url, id })
        const res = await fetch(url, {
          method: 'PROPFIND',
          credentials: 'same-origin',
          headers: { Depth: '0', 'Content-Type': 'application/xml', requesttoken: rt },
          body,
        })
        if (!res.ok) continue
        const text = await res.text()
        if (options.isDebug?.()) console.log('[opsdash] PROPFIND response', { id, status: res.status, length: text.length, sample: text.slice(0, 400) })
        const match = text.match(/<[^>]*calendar-color[^>]*>(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|rgb\([^<]+\))<\/[^>]*calendar-color>/i)
        if (match) out[id] = match[1]
      } catch {
        /* ignore */
      }
    }
    return out
  }

  return {
    calendarDayLink,
    fetchDavColors,
  }
}
