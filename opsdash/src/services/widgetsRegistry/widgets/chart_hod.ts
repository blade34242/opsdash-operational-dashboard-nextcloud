import { defineAsyncComponent } from 'vue'
import type { RegistryEntry } from '../types'
import { buildTitle } from '../helpers'
import { formatLookbackLabel, getLookbackColor, parseIdList, sortLookbackOffsets } from './chartHelpers'

const ChartHodWidget = defineAsyncComponent(() =>
  import('../../../components/widgets/charts/ChartHodWidget.vue').then((m) => m.default),
)

const baseTitle = 'Time-of-Day Chart'

export const chartHodEntry: RegistryEntry = {
  component: ChartHodWidget,
  defaultLayout: { width: 'full', height: 'l', order: 86 },
  label: 'Time-of-Day Chart',
  baseTitle,
  configurable: true,
  defaultOptions: {
    scope: 'calendar',
    calendarFilter: [],
    categoryFilter: [],
    showHint: false,
    showLegend: true,
    lookbackMode: 'stacked',
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
      { key: 'lookbackMode', label: 'Lookback view', type: 'select', options: [
        { value: 'stacked', label: 'Stacked weeks' },
        { value: 'overlay', label: 'Overlay stripes' },
      ] },
      { key: 'showLegend', label: 'Show legend', type: 'toggle' },
      { key: 'showHint', label: 'Show hint', type: 'toggle' },
      { key: 'compact', label: 'Compact', type: 'toggle' },
    ]
  },
  buildProps: (def, ctx) => {
    const calendarFilter = parseIdList(def.options?.calendarFilter)
    const categoryFilter = parseIdList(def.options?.categoryFilter)
    const hasFilters = calendarFilter.length > 0 || categoryFilter.length > 0
    const lookbackWeeks = Number.isFinite(ctx.lookbackWeeks) ? Math.max(1, Math.min(6, Number(ctx.lookbackWeeks))) : 1
    const lookbackInput =
      lookbackWeeks > 1 && Array.isArray(ctx.charts?.hodByOffset)
        ? ctx.charts.hodByOffset
        : null
    const sortedLookback = lookbackInput ? sortLookbackOffsets(lookbackInput) : []
    const lookbackEntries = sortedLookback.map((entry, idx) => {
      const color = getLookbackColor(idx)
      return {
        id: `offset-${entry.offset ?? idx}`,
        label: formatLookbackLabel(entry, ctx.rangeMode),
        color,
        hod: {
          dows: entry.dows || [],
          hours: entry.hours || [],
          matrix: entry.matrix || [],
        },
      }
    })
    const hodData =
      lookbackWeeks > 1 && ctx.charts?.hodLookback
        ? ctx.charts.hodLookback
        : ctx.charts?.hod || null
    return {
      title: buildTitle(baseTitle, def.options?.titlePrefix),
      subtitle: hasFilters ? 'Filters currently not applied' : undefined,
      cardBg: def.options?.cardBg,
      showHeader: def.options?.showHeader !== false,
      showHint: def.options?.showHint === true,
      showLegend: def.options?.showLegend !== false,
      lookbackMode: def.options?.lookbackMode,
      lookbackWeeks: ctx.lookbackWeeks,
      rangeMode: ctx.rangeMode,
      hodData,
      lookbackEntries,
    }
  },
}
