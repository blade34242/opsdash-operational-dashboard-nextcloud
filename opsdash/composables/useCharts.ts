import { computed, type ComputedRef, type Ref } from 'vue'
import {
  createDefaultTargetsConfig,
  type ActivityCardConfig,
  type ActivityForecastMode,
  type TargetsConfig,
} from '../src/services/targets'
import { formatDateKey } from '../src/services/dateTime'

interface UseChartsInput {
  charts: Ref<any>
  colorsById: Ref<Record<string, string>>
  colorsByName: Ref<Record<string, string>>
  calendarGroups: Ref<Array<{
    id: string
    label: string
    rows: any[]
    summary: any
    color?: string
  }>>
  calendarCategoryMap: Ref<Record<string, string>>
  targetsConfig: Ref<TargetsConfig | null | undefined>
  currentTargets: Ref<Record<string, number>>
  activityCardConfig: Ref<ActivityCardConfig>
}

interface CalendarCharts {
  pie: any | null
  stacked: any | null
}

type CategoryChartsById = Record<string, { pie: any | null; stacked: any | null }>

export function useCharts(input: UseChartsInput): {
  calendarChartData: ComputedRef<CalendarCharts>
  categoryChartsById: ComputedRef<CategoryChartsById>
} {
  const stackedPerDay = computed(() =>
    buildStackedWithForecast({
      perDaySeries: (input.charts.value as any)?.perDaySeries,
      forecastMode: input.activityCardConfig.value?.forecastMode ?? 'total',
      targetsConfig: input.targetsConfig.value,
      currentTargets: input.currentTargets.value,
      calendarCategoryMap: input.calendarCategoryMap.value,
    }),
  )

  const calendarChartData = computed<CalendarCharts>(() => ({
    pie: input.charts.value?.pie || null,
    stacked: stackedPerDay.value,
  }))

  const categoryChartsById = computed<CategoryChartsById>(() => {
    const result: CategoryChartsById = {}
    const pieAll: any = input.charts.value?.pie
    const stackedRaw: any = (input.charts.value as any)?.perDaySeries
    const stackedAll: any = stackedPerDay.value || stackedRaw
    const hasPie = pieAll && Array.isArray(pieAll.data) && Array.isArray(pieAll.ids)
    const hasStacked = stackedAll && Array.isArray(stackedAll.series) && Array.isArray(stackedAll.labels)
    const assignments = input.calendarCategoryMap.value

    const ids: string[] = hasPie ? (pieAll.ids || []).map((id: any) => String(id ?? '')) : []
    const labels: string[] = hasPie ? (pieAll.labels || []).map((label: any) => String(label ?? '')) : []
    const data: number[] = hasPie ? (pieAll.data || []).map((val: any) => Number(val) || 0) : []
    const colorsAll: string[] = hasPie ? (pieAll.colors || []) : []

    const stackedSeries: any[] = hasStacked ? stackedAll.series : []

    input.calendarGroups.value.forEach((group) => {
      const pieIndices: number[] = []
      if (hasPie) {
        ids.forEach((id, idx) => {
          if (assignments[id] === group.id) {
            pieIndices.push(idx)
          }
        })
      }

      const pieData = pieIndices.length
        ? {
            ids: pieIndices.map((idx) => ids[idx]),
            labels: pieIndices.map((idx) => labels[idx]),
            data: pieIndices.map((idx) => data[idx]),
            colors: pieIndices.map(
              (idx) => colorsAll[idx] || input.colorsById.value?.[ids[idx]] || '#60a5fa',
            ),
          }
        : null

      const stackedSeriesForCat = hasStacked
        ? stackedSeries.filter((series: any) => assignments[String(series?.id ?? '')] === group.id)
        : []
      const stackedData = stackedSeriesForCat.length
        ? {
            labels: stackedAll.labels,
            series: stackedSeriesForCat,
          }
        : null

      result[group.id] = { pie: pieData, stacked: stackedData }
    })

    return result
  })

  return {
    calendarChartData,
    categoryChartsById,
  }
}

const DATE_KEY_RX = /^\d{4}-\d{2}-\d{2}$/
const UNCATEGORIZED_ID = '__uncategorized__'

interface BuildStackedInput {
  perDaySeries: any
  forecastMode: ActivityForecastMode | undefined
  targetsConfig: TargetsConfig | null | undefined
  currentTargets: Record<string, number> | null | undefined
  calendarCategoryMap: Record<string, string> | null | undefined
}

function buildStackedWithForecast(input: BuildStackedInput): any | null {
  const raw = input.perDaySeries
  if (!raw || !Array.isArray(raw.labels) || !Array.isArray(raw.series)) {
    return null
  }

  const labels: string[] = raw.labels.map((label: any) => String(label ?? ''))
  const series = raw.series.map((entry: any) => {
    const id = String(entry?.id ?? '')
    return {
      ...entry,
      id,
      name: String(entry?.name ?? entry?.label ?? id),
      color: String(entry?.color ?? ''),
      data: labels.map((_, idx) => {
        const rawVal = Number(entry?.data?.[idx] ?? 0)
        return Number.isFinite(rawVal) ? Math.max(0, rawVal) : 0
      }),
    }
  })

  const mode = normalizeMode(input.forecastMode)
  const todayKey = formatDateKey(new Date())
  const isFuture = labels.map((label) => DATE_KEY_RX.test(label) && label > todayKey)
  const futureIndices: number[] = []
  isFuture.forEach((flag, idx) => {
    if (flag) futureIndices.push(idx)
  })

  if (!futureIndices.length || mode === 'off') {
    return { labels, series }
  }

  const cfg = input.targetsConfig ?? createDefaultTargetsConfig()
  const targetsMap = sanitizeTargetsMap(input.currentTargets)
  const categoryAssignments = input.calendarCategoryMap ?? {}
  const futureDays = futureIndices.length

  const actualByCalendar = new Map<string, number>()
  series.forEach((row) => {
    let sum = 0
    row.data.forEach((value: number, idx: number) => {
      if (!isFuture[idx]) {
        sum += Math.max(0, value)
      }
    })
    actualByCalendar.set(row.id, sum)
  })
  const actualTotal = Array.from(actualByCalendar.values()).reduce((sum, value) => sum + value, 0)

  const forecastByCalendar = new Map<string, number[]>()
  series.forEach((row) => {
    forecastByCalendar.set(row.id, makeZeroArray(labels.length))
  })

  if (mode === 'total') {
    const targetTotal = Math.max(0, Number(cfg.totalHours ?? 0))
    const remaining = Math.max(0, targetTotal - actualTotal)
    if (remaining > 0.0001) {
      const perDay = remaining / futureDays
      const ids = series.map((row) => row.id)
      const weights = computeWeights(ids, actualByCalendar, targetsMap)
      ids.forEach((id) => {
        const weight = weights[id] ?? 0
        if (weight <= 0) return
        const arr = forecastByCalendar.get(id)
        if (!arr) return
        futureIndices.forEach((idx) => {
          arr[idx] = roundHours(perDay * weight)
        })
      })
    }
  } else if (mode === 'calendar') {
    series.forEach((row) => {
      const target = targetsMap[row.id] ?? 0
      if (target <= 0) return
      const actual = Math.max(0, actualByCalendar.get(row.id) ?? 0)
      const remaining = Math.max(0, target - actual)
      if (remaining <= 0.0001) return
      const perDay = remaining / futureDays
      const arr = forecastByCalendar.get(row.id)
      if (!arr) return
      futureIndices.forEach((idx) => {
        arr[idx] = roundHours(perDay)
      })
    })
  } else if (mode === 'category') {
    const processed = new Set<string>()
    const categories = Array.isArray(cfg.categories) ? cfg.categories : []
    const categoryTargets = new Map<string, number>()
    categories.forEach((cat) => {
      categoryTargets.set(String(cat.id), Math.max(0, Number(cat.targetHours ?? 0)))
    })
    const calendarsByCategory = new Map<string, string[]>()
    series.forEach((row) => {
      const catIdRaw = categoryAssignments?.[row.id]
      const catId = catIdRaw ? String(catIdRaw) : UNCATEGORIZED_ID
      if (!calendarsByCategory.has(catId)) {
        calendarsByCategory.set(catId, [])
      }
      calendarsByCategory.get(catId)!.push(row.id)
    })
    calendarsByCategory.forEach((calIds, catId) => {
      if (!calIds.length) return
      const target = categoryTargets.get(catId) ?? 0
      if (target <= 0) return
      const actual = calIds.reduce((sum, id) => sum + Math.max(0, actualByCalendar.get(id) ?? 0), 0)
      const remaining = Math.max(0, target - actual)
      if (remaining <= 0.0001) return
      const perDay = remaining / futureDays
      const targetSubset: Record<string, number> = {}
      calIds.forEach((id) => {
        targetSubset[id] = targetsMap[id] ?? 0
      })
      const weights = computeWeights(calIds, actualByCalendar, targetSubset)
      calIds.forEach((id) => {
        const weight = weights[id] ?? 0
        if (weight <= 0) return
        const arr = forecastByCalendar.get(id)
        if (!arr) return
        futureIndices.forEach((idx) => {
          arr[idx] = roundHours(perDay * weight)
        })
        processed.add(id)
      })
    })
    series.forEach((row) => {
      if (processed.has(row.id)) return
      const target = targetsMap[row.id] ?? 0
      if (target <= 0) return
      const actual = Math.max(0, actualByCalendar.get(row.id) ?? 0)
      const remaining = Math.max(0, target - actual)
      if (remaining <= 0.0001) return
      const perDay = remaining / futureDays
      const arr = forecastByCalendar.get(row.id)
      if (!arr) return
      futureIndices.forEach((idx) => {
        arr[idx] = roundHours(perDay)
      })
    })
  }

  series.forEach((row) => {
    const arr = forecastByCalendar.get(row.id)
    if (!arr) return
    if (arr.some((value) => value > 0.0001)) {
      row.forecast = arr
    }
  })

  return { labels, series }
}

function normalizeMode(mode: ActivityForecastMode | undefined): ActivityForecastMode {
  if (mode === 'off' || mode === 'calendar' || mode === 'category') {
    return mode
  }
  return 'total'
}

function makeZeroArray(length: number): number[] {
  return Array.from({ length }, () => 0)
}

function roundHours(value: number): number {
  const rounded = Math.round(value * 100) / 100
  return Number.isFinite(rounded) ? rounded : 0
}

function sanitizeTargetsMap(map: Record<string, number> | null | undefined): Record<string, number> {
  const result: Record<string, number> = {}
  if (!map) return result
  Object.entries(map).forEach(([key, val]) => {
    const num = Number(val)
    if (Number.isFinite(num) && num > 0) {
      result[String(key)] = num
    }
  })
  return result
}

function computeWeights(
  ids: string[],
  actualByCalendar: Map<string, number>,
  targetMap: Record<string, number>,
): Record<string, number> {
  const weights: Record<string, number> = {}
  const actualSum = ids.reduce((sum, id) => sum + Math.max(0, actualByCalendar.get(id) ?? 0), 0)
  if (actualSum > 0.0001) {
    ids.forEach((id) => {
      const value = Math.max(0, actualByCalendar.get(id) ?? 0)
      weights[id] = value / actualSum
    })
    return weights
  }
  const targetSum = ids.reduce((sum, id) => sum + Math.max(0, targetMap?.[id] ?? 0), 0)
  if (targetSum > 0.0001) {
    ids.forEach((id) => {
      const value = Math.max(0, targetMap?.[id] ?? 0)
      weights[id] = value / targetSum
    })
    return weights
  }
  const equalShare = ids.length ? 1 / ids.length : 0
  ids.forEach((id) => {
    weights[id] = equalShare
  })
  return weights
}
