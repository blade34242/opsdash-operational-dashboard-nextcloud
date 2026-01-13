import { defineAsyncComponent } from 'vue'
import type { RegistryEntry } from '../types'
import { buildTitle } from '../helpers'
import {
  aggregateStackedByCategory,
  buildStackedWithForecast,
  buildDowFromPerDay,
  buildPerDayFromStacked,
  filterStackedByIds,
  formatLookbackLabel,
  getLookbackColor,
  parseIdList,
  sortLookbackOffsets,
} from './chartHelpers'

const ChartDowWidget = defineAsyncComponent(() =>
  import('../../../components/widgets/charts/ChartDowWidget.vue').then((m) => m.default),
)

const baseTitle = 'Day-of-Week Chart'

export const chartDowEntry: RegistryEntry = {
  component: ChartDowWidget,
  defaultLayout: { width: 'half', height: 'm', order: 84 },
  label: 'Day-of-Week Chart',
  baseTitle,
  configurable: true,
  defaultOptions: {
    scope: 'calendar',
    calendarFilter: [],
    categoryFilter: [],
    showLabels: true,
    compact: false,
    forecastMode: 'total',
  },
  dynamicControls: (options, ctx) => {
    const calOptions = Array.isArray(ctx?.calendars)
      ? ctx.calendars.map((cal: any) => ({ value: cal.id, label: cal.displayname || cal.name || cal.id }))
      : []
    const catOptions = Array.isArray(ctx?.calendarGroups)
      ? ctx.calendarGroups.map((cat: any) => ({ value: cat.id, label: cat.label || cat.id }))
      : []
    return [
      { key: 'scope', label: 'Scope', type: 'select', options: [
        { value: 'calendar', label: 'Calendar' },
        { value: 'category', label: 'Category' },
      ] },
      { key: 'calendarFilter', label: 'Calendars', type: 'multiselect', options: calOptions },
      { key: 'categoryFilter', label: 'Categories', type: 'multiselect', options: catOptions },
      { key: 'forecastMode', label: 'Projection mode', type: 'select', options: [
        { value: 'off', label: 'No projection' },
        { value: 'total', label: 'Distribute remaining total target' },
        { value: 'calendar', label: 'Respect calendar targets' },
        { value: 'category', label: 'Respect category targets' },
      ] },
      { key: 'showLabels', label: 'Show labels', type: 'toggle' },
      { key: 'compact', label: 'Compact', type: 'toggle' },
    ]
  },
  buildProps: (def, ctx) => {
    const scope = def.options?.scope === 'category' ? 'category' : 'calendar'
    const calendarFilter = new Set(parseIdList(def.options?.calendarFilter))
    const categoryFilter = new Set(parseIdList(def.options?.categoryFilter))
    const categoryColorMap = ctx.categoryColorMap || {}
    const lookbackWeeks = Number.isFinite(ctx.lookbackWeeks) ? Math.max(1, Math.min(6, Number(ctx.lookbackWeeks))) : 1
    const lookbackInput =
      lookbackWeeks > 1 && Array.isArray(ctx.charts?.perDaySeriesByOffset)
        ? ctx.charts.perDaySeriesByOffset
        : null
    let chartData: { labels?: string[]; data?: number[] } | null = null
    let groupedData: { labels: string[]; series: Array<{ id: string; name?: string; label?: string; color?: string; data?: number[] }> } | null = null
    let legendItems: Array<{ id: string; label: string; color: string }> = []

    if (lookbackInput && lookbackInput.length) {
      const sorted = sortLookbackOffsets(lookbackInput)
      const labels: string[] = []
      const series: Array<{ id: string; name?: string; label?: string; color?: string; data?: number[] }> = []
      legendItems = []
      sorted.forEach((entry, idx) => {
        const perDaySeries = { labels: entry.labels || [], series: entry.series || [] }
        const baseStacked = buildStackedWithForecast({
          perDaySeries,
          forecastMode: def.options?.forecastMode,
          targetsConfig: ctx.targetsConfig,
          currentTargets: ctx.currentTargets,
          calendarCategoryMap: ctx.calendarCategoryMap,
        })
        const stacked =
          scope === 'category'
            ? aggregateStackedByCategory(baseStacked, ctx.calendarCategoryMap || {}, categoryFilter, categoryColorMap)
            : filterStackedByIds(baseStacked, calendarFilter)
        const perDay = buildPerDayFromStacked(stacked)
        const dow = buildDowFromPerDay(perDay)
        if (!dow) return
        if (!labels.length) labels.push(...(dow.labels || []))
        const color = getLookbackColor(idx)
        const label = formatLookbackLabel(entry, ctx.rangeMode)
        series.push({
          id: `offset-${entry.offset ?? idx}`,
          name: label,
          label,
          color,
          data: dow.data || [],
        })
        legendItems.push({ id: `offset-${entry.offset ?? idx}`, label, color })
      })
      groupedData = labels.length && series.length ? { labels, series } : null
    } else {
      const perDaySeriesInput = ctx.charts?.perDaySeries
      const baseStacked = buildStackedWithForecast({
        perDaySeries: perDaySeriesInput,
        forecastMode: def.options?.forecastMode,
        targetsConfig: ctx.targetsConfig,
        currentTargets: ctx.currentTargets,
        calendarCategoryMap: ctx.calendarCategoryMap,
      })
      const stacked =
        scope === 'category'
          ? aggregateStackedByCategory(baseStacked, ctx.calendarCategoryMap || {}, categoryFilter, categoryColorMap)
          : filterStackedByIds(baseStacked, calendarFilter)
      const perDay = buildPerDayFromStacked(stacked)
      chartData = buildDowFromPerDay(perDay)
    }
    return {
      title: buildTitle(baseTitle, def.options?.titlePrefix),
      subtitle: scope === 'category' ? 'By category' : 'By calendar',
      cardBg: def.options?.cardBg,
      showHeader: def.options?.showHeader !== false,
      showLabels: def.options?.showLabels !== false,
      compact: def.options?.compact === true,
      xLabel: 'Weekday',
      yLabel: 'Hours (h)',
      chartData,
      groupedData,
      legendItems,
    }
  },
}
