import { defineAsyncComponent } from 'vue'
import type { RegistryEntry } from '../types'
import { buildTitle } from '../helpers'
import {
  aggregateStackedByCategory,
  buildStackedWithForecast,
  filterStackedByIds,
  parseIdList,
} from './chartHelpers'

const ChartStackedWidget = defineAsyncComponent(() =>
  import('../../../components/widgets/ChartStackedWidget.vue').then((m) => m.default),
)

const baseTitle = 'Stacked Chart'

export const chartStackedEntry: RegistryEntry = {
  component: ChartStackedWidget,
  defaultLayout: { width: 'full', height: 'l', order: 80 },
  label: 'Stacked Chart',
  baseTitle,
  configurable: true,
  defaultOptions: {
    scope: 'calendar',
    calendarFilter: [],
    categoryFilter: [],
    showLegend: true,
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
      { key: 'showLegend', label: 'Show legend', type: 'toggle' },
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
    return {
      title: buildTitle(baseTitle, def.options?.titlePrefix),
      subtitle: scope === 'category' ? 'By category' : 'By calendar',
      cardBg: def.options?.cardBg,
      showHeader: def.options?.showHeader !== false,
      compact: def.options?.compact === true,
      showLegend: def.options?.showLegend !== false,
      showLabels: def.options?.showLabels === true,
      stacked,
      colorsById: ctx.colorsById || {},
    }
  },
}
