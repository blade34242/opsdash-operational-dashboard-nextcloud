import { defineAsyncComponent } from 'vue'
import type { RegistryEntry } from '../types'
import { buildTitle } from '../helpers'
import {
  aggregateStackedByCategory,
  buildStackedWithForecast,
  buildPerDayFromStacked,
  filterStackedByIds,
  parseIdList,
} from './chartHelpers'

const ChartPerDayWidget = defineAsyncComponent(() =>
  import('../../../components/widgets/ChartPerDayWidget.vue').then((m) => m.default),
)

const baseTitle = 'Per-day'

export const chartPerDayEntry: RegistryEntry = {
  component: ChartPerDayWidget,
  defaultLayout: { width: 'half', height: 'm', order: 82 },
  label: 'Chart · Per-day',
  baseTitle,
  configurable: true,
  defaultOptions: {
    scope: 'calendar',
    calendarFilter: [],
    categoryFilter: [],
    showLabels: false,
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
    const baseStacked = buildStackedWithForecast({
      perDaySeries: ctx.charts?.perDaySeries,
      forecastMode: def.options?.forecastMode,
      targetsConfig: ctx.targetsConfig,
      currentTargets: ctx.currentTargets,
      calendarCategoryMap: ctx.calendarCategoryMap,
    })
    const stacked =
      scope === 'category'
        ? aggregateStackedByCategory(baseStacked, ctx.calendarCategoryMap || {}, categoryFilter, categoryColorMap)
        : filterStackedByIds(baseStacked, calendarFilter)
    const chartData = buildPerDayFromStacked(stacked)
    return {
      title: buildTitle(baseTitle, def.options?.titlePrefix),
      subtitle: scope === 'category' ? 'Totals by category' : 'Totals by calendar',
      cardBg: def.options?.cardBg,
      showHeader: def.options?.showHeader !== false,
      showLabels: def.options?.showLabels === true,
      compact: def.options?.compact === true,
      chartData,
    }
  },
}
