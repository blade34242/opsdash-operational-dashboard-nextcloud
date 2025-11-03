import { computed, type ComputedRef, type Ref } from 'vue'
import type { TargetsConfig, TargetsProgress, TargetsSummary } from '../src/services/targets'

export const UNCATEGORIZED_ID = '__uncategorized__'
export const UNCATEGORIZED_LABEL = 'Unassigned'

interface UseCategoriesInput {
  calendars: Ref<any[]>
  selected: Ref<string[]>
  groupsById: Ref<Record<string, number>>
  colorsById: Ref<Record<string, string>>
  targetsConfig: Ref<TargetsConfig>
  targetsSummary: ComputedRef<TargetsSummary>
  byCal: Ref<any[]>
  currentTargets: ComputedRef<Record<string, number>>
  isDebug?: () => boolean
}

export function useCategories(input: UseCategoriesInput) {
  const categoryConfigList = computed(() => {
    const raw = input.targetsConfig.value?.categories
    return Array.isArray(raw) ? raw : []
  })

  const categoryLabelById = computed<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    categoryConfigList.value.forEach((cat) => {
      map[String(cat.id)] = cat.label || String(cat.id)
    })
    return map
  })

  const categoryProgressById = computed(() => {
    const map = new Map<string, TargetsProgress>()
    const cats = input.targetsSummary.value?.categories || []
    cats.forEach((cat) => map.set(String(cat.id), cat))
    return map
  })

  const categoryIdByGroup = computed(() => {
    const map = new Map<number, string>()
    categoryConfigList.value.forEach((cat) => {
      const groups = Array.isArray(cat.groupIds) ? cat.groupIds : []
      groups.forEach((g) => {
        const num = Math.max(0, Math.min(9, Math.trunc(Number(g) || 0)))
        map.set(num, String(cat.id))
      })
    })
    return map
  })

  const calendarMetaById = computed(() => {
    const raw = input.calendars.value
    if (!Array.isArray(raw)) {
      if (input.isDebug?.()) console.warn('[opsdash] calendars not array', raw)
      return {}
    }
    const map: Record<string, { name: string; color?: string }> = {}
    raw.forEach((cal: any) => {
      const id = String(cal?.id ?? '')
      if (!id) return
      const color = input.colorsById.value?.[id] || String(cal?.color || '')
      map[id] = {
        name: String(cal?.displayname || cal?.name || cal?.calendar || id),
        color: color || undefined,
      }
    })
    return map
  })

  const calendarCategoryMap = computed<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    const categoryByGroup = categoryIdByGroup.value
    const groupMap = input.groupsById.value || {}

    const assignCategory = (calId: string) => {
      const rawGroup = groupMap?.[calId]
      const group = Math.max(0, Math.min(9, Math.trunc(Number(rawGroup) || 0)))
      const resolved = categoryByGroup.get(group)
      map[calId] = resolved || UNCATEGORIZED_ID
    }

    const raw = input.calendars.value
    if (!Array.isArray(raw)) {
      if (input.isDebug?.()) console.warn('[opsdash] calendarCategoryMap: calendars not array', raw)
      return map
    }
    raw.forEach((cal: any) => {
      const id = String(cal?.id ?? '')
      if (!id) return
      assignCategory(id)
    })

    ;(input.selected.value || []).forEach((id: any) => {
      const calId = String(id ?? '')
      if (!calId) return
      if (!map[calId]) assignCategory(calId)
    })

    return map
  })

  const categoryColorMap = computed<Record<string, string>>(() => {
    const palette = ['#60a5fa', '#f59e0b', '#ef4444', '#10b981', '#a78bfa', '#fb7185', '#22d3ee', '#f97316']
    const map: Record<string, string> = {}
    let paletteIdx = 0

    const ensureColor = (cat: any) => {
      const catId = String(cat?.id ?? '')
      if (!catId) return
      if (map[catId]) return map[catId]
      const directColor = typeof cat?.color === 'string' && cat.color ? cat.color : undefined
      if (directColor) {
        map[catId] = directColor
        return directColor
      }
      const calendarsForCat = Object.entries(calendarCategoryMap.value)
        .filter(([, cid]) => cid === catId)
        .map(([calId]) => calId)
      for (const calId of calendarsForCat) {
        const meta = calendarMetaById.value[calId]
        if (meta?.color) {
          map[catId] = meta.color
          return meta.color
        }
      }
      const color = palette[paletteIdx % palette.length]
      paletteIdx += 1
      map[catId] = color
      return color
    }

    categoryConfigList.value.forEach((cat) => ensureColor(cat))
    if (Object.values(calendarCategoryMap.value || {}).some((cid) => cid === UNCATEGORIZED_ID)) {
      ensureColor({ id: UNCATEGORIZED_ID })
    }

    return map
  })

  const calendarGroups = computed(() => {
    const result: Array<{
      id: string
      label: string
      rows: any[]
      summary: TargetsProgress
      color?: string
    }> = []

    const assignments = calendarCategoryMap.value
    const summaryMap = categoryProgressById.value
    const rowsSource = input.byCal.value

    if (!Array.isArray(rowsSource)) {
      if (input.isDebug?.()) console.warn('[opsdash] aggregateCategoryRows: byCal not array', rowsSource)
      return result
    }

    const byCat = new Map<string, any[]>()
    rowsSource.forEach((row: any) => {
      const rawId = String(row?.id ?? row?.calendar_id ?? row?.calendar ?? '')
      if (!rawId) return
      const catId = assignments[rawId] || UNCATEGORIZED_ID
      if (!byCat.has(catId)) byCat.set(catId, [])
      byCat.get(catId)!.push({ ...row, calendarId: rawId })
    })

    if (input.isDebug?.()) {
      console.log('[opsdash] aggregateCategoryRows', {
        rowsSourceIsArray: Array.isArray(rowsSource),
        rowsSourceLength: rowsSource.length,
        byCat,
        assignments,
      })
    }

    const totalDaysLeft = input.targetsSummary.value?.total?.daysLeft ?? 0
    const pacePercent = input.targetsSummary.value?.total?.calendarPercent ?? 0
    const paceMode =
      input.targetsSummary.value?.total?.paceMode ?? input.targetsConfig.value?.pace?.mode ?? 'days_only'

    const round = (value: number) => Math.round(value * 100) / 100
    const targetMap = input.currentTargets.value || {}

    const makeFallbackSummary = (catId: string, label: string, rows: any[]): TargetsProgress => {
      const targetHours = rows.reduce((sum, row) => {
        const tRaw = Number(targetMap[row.calendarId] ?? 0)
        return Number.isFinite(tRaw) ? sum + Math.max(0, tRaw) : sum
      }, 0)
      const actualHours = rows.reduce((sum, row) => {
        const val = Number(row?.total_hours ?? row?.hours ?? 0)
        return Number.isFinite(val) ? sum + Math.max(0, val) : sum
      }, 0)
      const percent = targetHours > 0 ? Math.max(0, Math.min(100, (actualHours / targetHours) * 100)) : 0
      const delta = actualHours - targetHours
      const remaining = Math.max(0, targetHours - actualHours)
      const status =
        targetHours <= 0
          ? 'none'
          : percent >= 100
            ? 'done'
            : delta >= 0
              ? 'on_track'
              : 'behind'
      const statusLabel =
        status === 'done' ? 'Done' : status === 'on_track' ? 'On Track' : status === 'behind' ? 'Behind' : '—'
      const needPerDay = totalDaysLeft > 0 ? remaining / totalDaysLeft : 0
      return {
        id: catId,
        label,
        actualHours: round(actualHours),
        targetHours: round(targetHours),
        percent,
        deltaHours: round(delta),
        remainingHours: round(remaining),
        needPerDay: round(needPerDay),
        daysLeft: totalDaysLeft,
        calendarPercent: Math.max(0, Math.min(100, pacePercent)),
        gap: round(percent - pacePercent),
        status: status as TargetsProgress['status'],
        statusLabel,
        includeWeekend: true,
        paceMode,
      }
    }

    const orderedIds = categoryConfigList.value.map((cat) => String(cat.id))
    orderedIds.forEach((catId) => {
      const label = categoryLabelById.value[catId] || catId
      const rows = byCat.get(catId) || []
      const summary = summaryMap.get(catId) || makeFallbackSummary(catId, label, rows)
      result.push({
        id: catId,
        label,
        rows,
        summary,
        color: categoryColorMap.value[catId],
      })
    })

    if (byCat.has(UNCATEGORIZED_ID)) {
      const rows = byCat.get(UNCATEGORIZED_ID) || []
      result.push({
        id: UNCATEGORIZED_ID,
        label: UNCATEGORIZED_LABEL,
        rows,
        summary: makeFallbackSummary(UNCATEGORIZED_ID, UNCATEGORIZED_LABEL, rows),
        color: categoryColorMap.value[UNCATEGORIZED_ID],
      })
    }

    return result
  })

  return {
    categoryConfigList,
    categoryLabelById,
    categoryColorMap,
    calendarCategoryMap,
    calendarGroups,
  }
}
