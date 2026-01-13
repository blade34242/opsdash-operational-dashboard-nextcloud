import { defineAsyncComponent } from 'vue'
import type { RegistryEntry } from '../types'
import { buildTitle } from '../helpers'
import { parseIdList } from './chartHelpers'

const CalendarTableWidget = defineAsyncComponent(() =>
  import('../../../components/widgets/tables/CalendarTableWidget.vue').then((m) => m.default),
)

const baseTitle = 'Calendar Table'

export const calendarTableEntry: RegistryEntry = {
  component: CalendarTableWidget,
  defaultLayout: { width: 'full', height: 'l', order: 70 },
  label: 'Calendar Table',
  baseTitle,
  configurable: true,
  defaultOptions: {
    calendarFilter: [],
    compact: false,
  },
  dynamicControls: (options, ctx) => {
    const calOptions = Array.isArray(ctx?.calendars)
      ? ctx.calendars.map((cal: any) => ({ value: cal.id, label: cal.displayname || cal.name || cal.id }))
      : []
    return [
      { key: 'calendarFilter', label: 'Calendars', type: 'multiselect', options: calOptions },
      { key: 'compact', label: 'Compact', type: 'toggle' },
    ]
  },
  buildProps: (def, ctx) => {
    const calendarFilter = new Set(parseIdList(def.options?.calendarFilter))
    const rows = Array.isArray(ctx.byCal) ? ctx.byCal : []
    const filteredRows = calendarFilter.size
      ? rows.filter((row: any) => calendarFilter.has(String(row?.id ?? row?.calendar_id ?? row?.calendar ?? '')))
      : rows
    return {
      title: buildTitle(baseTitle, def.options?.titlePrefix),
      subtitle: calendarFilter.size ? 'Filtered calendars' : undefined,
      cardBg: def.options?.cardBg,
      showHeader: def.options?.showHeader !== false,
      rows: filteredRows,
      targets: ctx.currentTargets || {},
      groups: ctx.calendarGroups || [],
      todayHours: ctx.calendarTodayHours || {},
    }
  },
}
