import { nextTick, reactive, ref, type Ref } from 'vue'
import {
  createDefaultTargetsConfig,
  normalizeTargetsConfig,
  type TargetsConfig,
} from '../src/services/targets'

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

  let loadSeq = 0
  async function load() {
    const currentSeq = ++loadSeq
    isLoading.value = true
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

      calendars.value = Array.isArray(json.calendars) ? json.calendars : []
      colorsByName.value = json.colors?.byName ?? {}
      colorsById.value = json.colors?.byId ?? {}

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
              if (col) colorsById.value[id] = String(col)
            })
            if (updated) {
              if (deps.isDebug?.()) console.log('[opsdash] dav colors applied', dav)
              try {
                const pieData: any = charts.value?.pie || {}
                const ids: string[] = pieData.ids || []
                const srvCols: string[] = pieData.colors || []
                const newCols = ids.map((id, idx) => colorsById.value[id] || srvCols[idx] || '#60a5fa')
                charts.value = { ...(charts.value || {}), pie: { ...pieData, colors: newCols } }
                if (deps.isDebug?.()) console.log('[opsdash] recomputed pie colors', newCols)
              } catch (error) {
                if (deps.isDebug?.()) console.warn('recompute pie colors failed', error)
              }
              try {
                const pds: any = charts.value?.perDaySeries
                if (pds && Array.isArray(pds.series)) {
                  const updSeries = pds.series.map((s: any) => ({
                    ...s,
                    color: colorsById.value[s.id] || s.color || '#60a5fa',
                  }))
                  charts.value = { ...(charts.value || {}), perDaySeries: { labels: pds.labels, series: updSeries } }
                }
              } catch {
                /* ignore */
              }
              deps.scheduleDraw()
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
    load,
  }
}
