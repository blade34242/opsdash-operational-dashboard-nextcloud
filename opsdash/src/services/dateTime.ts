import { reactive } from 'vue'

type DateTimeConfig = {
  locale?: string
  timeZone?: string
  firstDayOfWeek?: number
}

export const dateTimeConfig = reactive<DateTimeConfig>({
  locale: '',
  timeZone: '',
  firstDayOfWeek: undefined,
})

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function resetFormatterCache() {
  formatterCache.clear()
}

export function setUserDateTimeConfig(next: DateTimeConfig | null | undefined): void {
  if (!next || typeof next !== 'object') return
  if (typeof next.locale === 'string') {
    dateTimeConfig.locale = next.locale
  }
  if (typeof next.timeZone === 'string') {
    dateTimeConfig.timeZone = next.timeZone
  }
  if (typeof next.firstDayOfWeek === 'number' && Number.isFinite(next.firstDayOfWeek)) {
    const normalized = ((Math.trunc(next.firstDayOfWeek) % 7) + 7) % 7
    dateTimeConfig.firstDayOfWeek = normalized
  }
  resetFormatterCache()
}

export function getUserLocale(): string {
  if (dateTimeConfig.locale) {
    return dateTimeConfig.locale
  }
  if (typeof window !== 'undefined') {
    const w: any = window as any
    const oc = w?.OC
    try {
      const canonical = typeof oc?.getCanonicalLocale === 'function' ? oc.getCanonicalLocale() : ''
      if (typeof canonical === 'string' && canonical) return canonical
    } catch (_) {}
    try {
      const locale = typeof oc?.getLocale === 'function' ? oc.getLocale() : ''
      if (typeof locale === 'string' && locale) return locale
    } catch (_) {}
    try {
      const lang = typeof oc?.getLanguage === 'function' ? oc.getLanguage() : ''
      if (typeof lang === 'string' && lang) return lang
    } catch (_) {}
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language
  }
  return 'en'
}

export function getUserTimeZone(): string {
  if (dateTimeConfig.timeZone) {
    return dateTimeConfig.timeZone
  }
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (resolved) return resolved
  } catch (_) {}
  return 'UTC'
}

export function getFirstDayOfWeek(): number {
  if (typeof dateTimeConfig.firstDayOfWeek === 'number') {
    return dateTimeConfig.firstDayOfWeek
  }
  if (typeof window !== 'undefined') {
    const w: any = window as any
    const oc = w?.OC
    try {
      const raw = typeof oc?.getFirstDayOfWeek === 'function' ? oc.getFirstDayOfWeek() : undefined
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        return ((Math.trunc(raw) % 7) + 7) % 7
      }
    } catch (_) {}
    try {
      const raw = oc?.config?.firstDay
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        return ((Math.trunc(raw) % 7) + 7) % 7
      }
    } catch (_) {}
  }
  try {
    if (typeof Intl.Locale === 'function') {
      const info = new (Intl as any).Locale(getUserLocale())?.weekInfo
      if (info && typeof info.firstDay === 'number') {
        const normalized = ((Math.trunc(info.firstDay) % 7) + 7) % 7
        return normalized === 7 ? 0 : normalized
      }
    }
  } catch (_) {}
  return 1
}

export function getWeekdayOrder(): string[] {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const start = getFirstDayOfWeek()
  return names.slice(start).concat(names.slice(0, start))
}

export function getWeekNumber(date: Date): number {
  const locale = getUserLocale()
  let minimalDays = 4
  try {
    if (typeof Intl.Locale === 'function') {
      const info = new (Intl as any).Locale(locale)?.weekInfo
      if (info && typeof info.minimalDays === 'number') {
        minimalDays = info.minimalDays
      }
    }
  } catch (_) {}
  minimalDays = Math.max(1, Math.min(7, Math.trunc(minimalDays)))

  const firstDay = getFirstDayOfWeek()
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const weekMs = 7 * 86400000

  const weekStartForYear = (year: number): Date => {
    const jan1 = new Date(Date.UTC(year, 0, 1))
    const jan1Dow = jan1.getUTCDay()
    const diff = (jan1Dow - firstDay + 7) % 7
    const start = new Date(jan1)
    start.setUTCDate(jan1.getUTCDate() - diff)

    const daysInFirstWeek = 7 - diff
    if (daysInFirstWeek < minimalDays) {
      start.setUTCDate(start.getUTCDate() + 7)
    }
    return start
  }

  const year = target.getUTCFullYear()
  const weekStart = weekStartForYear(year)
  if (target.getTime() < weekStart.getTime()) {
    const previousYearStart = weekStartForYear(year - 1)
    return Math.floor((target.getTime() - previousYearStart.getTime()) / weekMs) + 1
  }

  const nextYearStart = weekStartForYear(year + 1)
  if (target.getTime() >= nextYearStart.getTime()) {
    return Math.floor((target.getTime() - nextYearStart.getTime()) / weekMs) + 1
  }

  return Math.floor((target.getTime() - weekStart.getTime()) / weekMs) + 1
}

function getFormatter(
  options: Intl.DateTimeFormatOptions,
  overrides?: { locale?: string; timeZone?: string },
): Intl.DateTimeFormat {
  const locale = overrides?.locale ?? getUserLocale()
  const timeZone = overrides?.timeZone ?? options.timeZone ?? getUserTimeZone()
  const normalized: Intl.DateTimeFormatOptions = { ...options, timeZone }
  const key = JSON.stringify({ locale, options: normalized })
  const cached = formatterCache.get(key)
  if (cached) return cached
  const fmt = new Intl.DateTimeFormat(locale, normalized)
  formatterCache.set(key, fmt)
  return fmt
}

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const DATE_TIME_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:?\d{2})?$/
const TIME_ONLY_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/

export function parseDateKey(value: string | null | undefined): Date | null {
  if (!value) return null
  const match = DATE_KEY_RE.exec(String(value).trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  return Number.isNaN(date.getTime()) ? null : date
}

export function parseDateTime(value: string | number | Date | null | undefined): Date | null {
  if (value == null) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const raw = String(value).trim()
  if (!raw) return null
  const timeOnly = TIME_ONLY_RE.exec(raw)
  if (timeOnly) {
    const now = new Date()
    now.setHours(Number(timeOnly[1]), Number(timeOnly[2]), Number(timeOnly[3] || 0), 0)
    return Number.isNaN(now.getTime()) ? null : now
  }
  const dateOnly = DATE_KEY_RE.exec(raw)
  if (dateOnly) {
    return parseDateKey(raw)
  }
  const match = DATE_TIME_RE.exec(raw)
  if (match) {
    const year = match[1]
    const month = match[2]
    const day = match[3]
    const hour = match[4]
    const minute = match[5]
    const second = match[6] || '00'
    const tz = match[7]
    if (tz) {
      const tzNorm = tz.length === 5 && tz[3] !== ':' ? `${tz.slice(0, 3)}:${tz.slice(3)}` : tz
      const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}${tzNorm}`)
      return Number.isNaN(date.getTime()) ? null : date
    }
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      0,
    )
    return Number.isNaN(date.getTime()) ? null : date
  }
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function formatDateOnly(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' },
): string {
  const date = parseDateKey(value ?? '')
  if (!date) return value ? String(value) : ''
  try {
    return getFormatter(options, { timeZone: 'UTC' }).format(date)
  } catch (_) {
    return value ? String(value) : ''
  }
}

export function formatDateTime(
  value: string | number | Date | null | undefined,
  options: Intl.DateTimeFormatOptions,
  overrides?: { locale?: string; timeZone?: string },
): string {
  const date = parseDateTime(value)
  if (!date) return value ? String(value) : ''
  try {
    return getFormatter(options, overrides).format(date)
  } catch (_) {
    return value ? String(value) : ''
  }
}

export function formatTime(value: string | number | Date | null | undefined): string {
  return formatDateTime(value, { hour: '2-digit', minute: '2-digit' })
}

export function formatDateRange(
  from?: string | null,
  to?: string | null,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' },
): string {
  const startLabel = formatDateOnly(from ?? '', options)
  const endLabel = formatDateOnly(to ?? '', options)
  if (!startLabel || !endLabel) return ''
  return startLabel === endLabel ? startLabel : `${startLabel}–${endLabel}`
}

export function formatDateKey(date: Date, timeZone?: string): string {
  const tz = timeZone || getUserTimeZone()
  const formatter = getFormatter(
    { year: 'numeric', month: '2-digit', day: '2-digit' },
    { locale: 'en-CA', timeZone: tz },
  )
  const parts = formatter.formatToParts(date)
  const map: Record<string, string> = {}
  parts.forEach((part) => {
    if (part.type !== 'literal') {
      map[part.type] = part.value
    }
  })
  if (map.year && map.month && map.day) {
    return `${map.year}-${map.month}-${map.day}`
  }
  return date.toISOString().slice(0, 10)
}

export function startOfDayUtc(date: Date): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export function listDaysUtc(start: Date, end: Date): Date[] {
  const out: Date[] = []
  let cur = startOfDayUtc(start)
  const endTime = startOfDayUtc(end).getTime()
  while (cur.getTime() <= endTime) {
    out.push(new Date(cur))
    cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000)
  }
  return out
}

export function isWeekendUtc(date: Date): boolean {
  const day = date.getUTCDay()
  return day === 0 || day === 6
}

export function addDaysUtc(date: Date, days: number): Date {
  const next = new Date(date.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

export function addMonthsUtc(date: Date, months: number): Date {
  const next = new Date(date.getTime())
  next.setUTCMonth(next.getUTCMonth() + months)
  return next
}

export function endOfMonthUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
}

export function isoWeekUtc(date: Date): number {
  const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  return Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
