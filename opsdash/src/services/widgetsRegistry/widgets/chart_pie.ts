import { defineAsyncComponent } from 'vue'
import type { RegistryEntry } from '../types'
import { buildTitle } from '../helpers'
import { buildCategoryPie, filterPieByIds, parseIdList } from './chartHelpers'

const ChartPieWidget = defineAsyncComponent(() =>
  import('../../../components/widgets/ChartPieWidget.vue').then((m) => m.default),
)

const baseTitle = 'Pie chart'

export const chartPieEntry: RegistryEntry = {
  component: ChartPieWidget,
  defaultLayout: { width: 'half', height: 'm', order: 75 },
  label: 'Chart · Pie',
  baseTitle,
  configurable: true,
  defaultOptions: {
    scope: 'calendar',
    calendarFilter: [],
    categoryFilter: [],
    showLegend: true,
    showLabels: true,
    compact: false,
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
      { key: 'showLegend', label: 'Show legend', type: 'toggle' },
      { key: 'showLabels', label: 'Show labels', type: 'toggle' },
      { key: 'compact', label: 'Compact', type: 'toggle' },
    ]
  },
  buildProps: (def, ctx) => {
    const scope = def.options?.scope === 'category' ? 'category' : 'calendar'
    const calendarFilter = new Set(parseIdList(def.options?.calendarFilter))
    const categoryFilter = new Set(parseIdList(def.options?.categoryFilter))
    const colorsById = ctx.colorsById || {}
    const colorsByName = ctx.colorsByName || {}
    const categoryColorMap = ctx.categoryColorMap || {}
    const data =
      scope === 'category'
        ? buildCategoryPie(ctx.calendarGroups || [], categoryFilter, categoryColorMap)
        : filterPieByIds(ctx.calendarChartData?.pie || null, calendarFilter)
    return {
      title: buildTitle(baseTitle, def.options?.titlePrefix),
      subtitle: scope === 'category' ? 'By category' : 'By calendar',
      cardBg: def.options?.cardBg,
      showHeader: def.options?.showHeader !== false,
      compact: def.options?.compact === true,
      showLegend: def.options?.showLegend !== false,
      showLabels: def.options?.showLabels !== false,
      chartData: data,
      colorsById,
      colorsByName,
    }
  },
}
