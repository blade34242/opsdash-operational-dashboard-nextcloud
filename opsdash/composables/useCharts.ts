import { computed, type ComputedRef, type Ref } from 'vue'

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
  const calendarChartData = computed<CalendarCharts>(() => ({
    pie: input.charts.value?.pie || null,
    stacked: (input.charts.value as any)?.perDaySeries || null,
  }))

  const categoryChartsById = computed<CategoryChartsById>(() => {
    const result: CategoryChartsById = {}
    const pieAll: any = input.charts.value?.pie
    const stackedAll: any = (input.charts.value as any)?.perDaySeries
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
