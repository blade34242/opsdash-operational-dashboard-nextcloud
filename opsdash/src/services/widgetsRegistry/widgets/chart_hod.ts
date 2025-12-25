import { defineAsyncComponent } from 'vue'
import type { RegistryEntry } from '../types'
import { buildTitle } from '../helpers'
import { parseIdList } from './chartHelpers'

const ChartHodWidget = defineAsyncComponent(() =>
  import('../../../components/widgets/ChartHodWidget.vue').then((m) => m.default),
)

const baseTitle = 'Hours of day'

export const chartHodEntry: RegistryEntry = {
  component: ChartHodWidget,
  defaultLayout: { width: 'full', height: 'l', order: 86 },
  label: 'Chart · Hours of day',
  baseTitle,
  configurable: true,
  defaultOptions: {
    scope: 'calendar',
    calendarFilter: [],
    categoryFilter: [],
    showHint: false,
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
      { key: 'showHint', label: 'Show hint', type: 'toggle' },
      { key: 'compact', label: 'Compact', type: 'toggle' },
    ]
  },
  buildProps: (def, ctx) => {
    const calendarFilter = parseIdList(def.options?.calendarFilter)
    const categoryFilter = parseIdList(def.options?.categoryFilter)
    const hasFilters = calendarFilter.length > 0 || categoryFilter.length > 0
    return {
      title: buildTitle(baseTitle, def.options?.titlePrefix),
      subtitle: hasFilters ? 'Filters currently not applied' : undefined,
      cardBg: def.options?.cardBg,
      showHeader: def.options?.showHeader !== false,
      showHint: def.options?.showHint === true,
      hodData: ctx.charts?.hod || null,
    }
  },
}
