import { nextTick, reactive, ref, type Ref } from 'vue'
import {
  createDefaultTargetsConfig,
  normalizeTargetsConfig,
  type TargetsConfig,
} from '../src/services/targets'
import {
  createDefaultReportingConfig,
  createDefaultDeckSettings,
  normalizeReportingConfig,
  normalizeDeckSettings,
  type ReportingConfig,
  type DeckFeatureSettings,
} from '../src/services/reporting'
import { readBootstrapThemePreference } from '../src/services/theme'

export interface OnboardingState {
  completed: boolean
  version: number
  strategy: string
  completed_at: string
  version_required?: number
  needsOnboarding?: boolean
  resetRequested?: boolean
}

interface DashboardDeps {
  range: Ref<'week' | 'month'>
  offset: Ref<number>
  userChangedSelection: Ref<boolean>
  route: (name: 'load') => string
  getJson: (url: string, params: Record<string, unknown>) => Promise<any>
  notifyError: (message: string) => void
  scheduleDraw: () => void
  fetchNotes: () => Promise<void>
  isDebug?: () => boolean
  fetchDavColors?: (uid: string, ids: string[]) => Promise<Record<string, string>>
}

export function useDashboard(deps: DashboardDeps) {
  const calendars = ref<any[]>([])
  const colorsByName = ref<Record<string, string>>({})
  const colorsById = ref<Record<string, string>>({})
  const groupsById = ref<Record<string, number>>({})
  const selected = ref<string[]>([])

  const isLoading = ref(false)
  const isTruncated = ref(false)
  const truncLimits = ref<any>(null)
  const uid = ref('')
  const from = ref('')
  const to = ref('')

  const stats = reactive<any>({})
  const byCal = ref<any[]>([])
  const byDay = ref<any[]>([])
  const longest = ref<any[]>([])
  const charts = ref<any>({})

  const targetsWeek = ref<Record<string, number>>({})
  const targetsMonth = ref<Record<string, number>>({})
  const targetsConfig = ref<TargetsConfig>(normalizeTargetsConfig(createDefaultTargetsConfig()))
  const onboarding = ref<OnboardingState | null>(null)
  const bootstrapThemePreference = readBootstrapThemePreference() ?? 'auto'
  const themePreference = ref<'auto' | 'light' | 'dark'>(bootstrapThemePreference)
  const reportingConfig = ref<ReportingConfig>(createDefaultReportingConfig())
  const deckSettings = ref<DeckFeatureSettings>(createDefaultDeckSettings())

  let loadSeq = 0
  async function load() {
    const currentSeq = ++loadSeq
    isLoading.value = true
    const prevColorsById: Record<string, string> = { ...colorsById.value }
    const prevColorsByName: Record<string, string> = { ...colorsByName.value }
    let colorsAdjusted = false
    try {
      const params = {
        range: deps.range.value,
        offset: deps.offset.value | 0,
        save: false,
      }
      const json: any = await deps.getJson(deps.route('load'), params)
      if (currentSeq !== loadSeq) {
        if (deps.isDebug?.()) console.warn('discarding stale load response', { currentSeq, loadSeq })
        return
      }

      uid.value = String(json.meta?.uid ?? '')
      from.value = String(json.meta?.from ?? '')
      to.value = String(json.meta?.to ?? '')
      isTruncated.value = Boolean(json.meta?.truncated)
      truncLimits.value = json.meta?.limits ?? null

      const cloneColorMap = (input: any): Record<string, string> => {
        const result: Record<string, string> = {}
        if (input && typeof input === 'object') {
          Object.entries(input).forEach(([key, value]) => {
            if (typeof value === 'string' && value.trim() !== '') {
              result[String(key)] = value
            }
          })
        }
        return result
      }

      const rawCalendars = Array.isArray(json.calendars) ? json.calendars : []
      const nextColorsById = cloneColorMap(json.colors?.byId)
      const nextColorsByName = cloneColorMap(json.colors?.byName)
      const normalizedCalendars = rawCalendars.map((raw: any) => {
        if (!raw || typeof raw !== 'object') {
          return raw
        }

        const cal: Record<string, any> = { ...raw }
        const id = String(cal.id ?? '')
        const name = String(cal.displayname ?? cal.name ?? cal.calendar ?? id)
        const originalColor = typeof cal.color === 'string' ? cal.color : ''
        const originalSrc = typeof cal.color_src === 'string' ? cal.color_src : ''
        const serverColor = id ? nextColorsById[id] : ''
        const nameColor = name ? nextColorsByName[name] : ''
        const previousColorById = id ? prevColorsById[id] : ''
        const previousColorByName = name ? prevColorsByName[name] : ''
        const previousColor = previousColorById || previousColorByName

        let resolvedColor = originalColor
        if (!resolvedColor && serverColor) {
          resolvedColor = serverColor
        }
        if (!resolvedColor && nameColor) {
          resolvedColor = nameColor
        }
        if ((!resolvedColor || originalSrc === 'fallback') && previousColor) {
          resolvedColor = previousColor
        }
        if (!resolvedColor && previousColor) {
          resolvedColor = previousColor
        }

        if (resolvedColor) {
          if (resolvedColor !== originalColor) {
            colorsAdjusted = true
          }
          cal.color = resolvedColor
          if (id) nextColorsById[id] = resolvedColor
          if (name) nextColorsByName[name] = resolvedColor
        }

        return cal
      })

      calendars.value = normalizedCalendars
      colorsByName.value = nextColorsByName
      colorsById.value = nextColorsById
      onboarding.value = json.onboarding ? { ...json.onboarding } : null
      reportingConfig.value = normalizeReportingConfig(json.reportingConfig, reportingConfig.value)
      deckSettings.value = normalizeDeckSettings(json.deckSettings, deckSettings.value)

      const applyPaletteToCharts = () => {
        let changed = false
        try {
          const pieData: any = charts.value?.pie || {}
          const ids: string[] = Array.isArray(pieData.ids)
            ? pieData.ids.map((id: any) => String(id ?? ''))
            : []
          if (ids.length) {
            const srvCols: string[] = Array.isArray(pieData.colors) ? pieData.colors : []
            const newCols = ids.map(
              (id, idx) => colorsById.value[id] || srvCols[idx] || '#60a5fa',
            )
            charts.value = { ...(charts.value || {}), pie: { ...pieData, colors: newCols } }
            changed = true
          }
        } catch (error) {
          if (deps.isDebug?.()) console.warn('recompute pie colors failed', error)
        }
        try {
          const perDaySeries: any = charts.value?.perDaySeries
          if (perDaySeries && Array.isArray(perDaySeries.series)) {
            const updatedSeries = perDaySeries.series.map((series: any) => {
              const id = String(series?.id ?? '')
              const color = colorsById.value[id] || series.color || '#60a5fa'
              return { ...series, color }
            })
            charts.value = {
              ...(charts.value || {}),
              perDaySeries: { labels: perDaySeries.labels, series: updatedSeries },
            }
            changed = true
          }
        } catch (error) {
          if (deps.isDebug?.()) console.warn('recompute stacked colors failed', error)
        }
        return changed
      }

      const groupSource = json.groups?.byId ?? json.groups?.byID ?? json.groups?.ids ?? {}
      const mappedGroups: Record<string, number> = {}
      calendars.value.forEach((cal: any) => {
        const id = String(cal?.id ?? '')
        const raw = Number(groupSource?.[id] ?? 0)
        mappedGroups[id] = Number.isFinite(raw) ? Math.max(0, Math.min(9, Math.trunc(raw))) : 0
      })
      groupsById.value = mappedGroups

      const tw = json.targets?.week ?? {}
      const tm = json.targets?.month ?? {}
      targetsWeek.value = tw && typeof tw === 'object' ? tw : {}
      targetsMonth.value = tm && typeof tm === 'object' ? tm : {}
      targetsConfig.value = normalizeTargetsConfig(json.targetsConfig ?? createDefaultTargetsConfig())
      const themeRaw = typeof json.themePreference === 'string' ? json.themePreference : ''
      themePreference.value = themeRaw === 'light' || themeRaw === 'dark' ? (themeRaw as 'light' | 'dark') : 'auto'

      if (deps.isDebug?.()) {
        console.group('[opsdash] calendars/colors')
        console.table((calendars.value || []).map((c: any) => ({
          id: c.id,
          name: c.displayname,
          color: c.color,
          raw: (c as any).color_raw,
          src: (c as any).color_src,
        })))
        console.log('colors.byId', colorsById.value)
        console.log('colors.byName', colorsByName.value)
        if ((json as any).calDebug) console.log('server calDebug', (json as any).calDebug)
        if ((json as any).debug) {
          console.group('[opsdash] server query debug')
          console.log((json as any).debug)
          console.groupEnd()
        }
        console.groupEnd()
      }

      if (calendars.value.length && deps.fetchDavColors) {
        const missing = calendars.value.filter((c: any) => !c.color || (c as any).color_src === 'fallback')
        if (missing.length) {
          try {
            const dav = await deps.fetchDavColors(uid.value, calendars.value.map((c: any) => String(c.id)))
            let updated = false
            calendars.value = calendars.value.map((c: any) => {
              const col = dav[c.id]
              if (col && col !== c.color) {
                (c as any).color_src = 'dav'
                (c as any).color_raw = col
                c.color = col
                updated = true
              }
              return c
            })
            Object.entries(dav).forEach(([id, col]) => {
              if (col) {
                const stringColor = String(col)
                colorsById.value[id] = stringColor
                const cal = calendars.value.find((c: any) => String(c?.id ?? '') === id)
                if (cal) cal.color = stringColor
                const calName = cal ? String(cal.displayname ?? cal.name ?? '') : ''
                if (calName) colorsByName.value[calName] = stringColor
              }
            })
            if (updated) {
              if (deps.isDebug?.()) console.log('[opsdash] dav colors applied', dav)
              colorsAdjusted = true
            }
          } catch (error) {
            if (deps.isDebug?.()) console.warn('dav colors failed', error)
          }
        }
      }

      // Normalize to string IDs to keep UI selection reactive and consistent
      selected.value = Array.isArray(json.selected)
        ? (json.selected as any[]).map((id) => String(id))
        : Array.isArray(json.saved)
          ? (json.saved as any[]).map((id) => String(id))
          : []
      deps.userChangedSelection.value = false

      Object.assign(stats, json.stats ?? {})
      byCal.value = Array.isArray(json.byCal) ? json.byCal : []
      byDay.value = Array.isArray(json.byDay) ? json.byDay : []
      longest.value = Array.isArray(json.longest) ? json.longest : []
      charts.value = json.charts ?? {}
      if (colorsAdjusted) {
        applyPaletteToCharts()
      }

      await nextTick()
      deps.scheduleDraw()

      await deps.fetchNotes().catch(() => {})
    } catch (error) {
      console.error(error)
      deps.notifyError('Failed to load data')
    } finally {
      isLoading.value = false
    }
  }

  return {
    calendars,
    colorsByName,
    colorsById,
    groupsById,
    selected,
    isLoading,
    isTruncated,
    truncLimits,
    uid,
    from,
    to,
    stats,
    byCal,
    byDay,
    longest,
    charts,
    targetsWeek,
    targetsMonth,
    targetsConfig,
    onboarding,
    load,
    themePreference,
    reportingConfig,
    deckSettings,
  }
}
