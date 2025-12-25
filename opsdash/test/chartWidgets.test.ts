import { describe, it, expect } from 'vitest'
import { widgetsRegistry } from '../src/services/widgetsRegistry'

describe('chart widgets', () => {
  it('filters pie chart by calendar selection', () => {
    const entry = widgetsRegistry.chart_pie
    const def: any = { options: { scope: 'calendar', calendarFilter: ['cal-1'] } }
    const ctx: any = {
      calendarChartData: {
        pie: { ids: ['cal-1', 'cal-2'], labels: ['One', 'Two'], data: [10, 5], colors: ['#111111', '#222222'] },
      },
      colorsById: { 'cal-1': '#111111', 'cal-2': '#222222' },
      colorsByName: {},
      calendarGroups: [],
      categoryColorMap: {},
    }
    const props = entry.buildProps(def, ctx) as any
    expect(props.chartData.ids).toEqual(['cal-1'])
    expect(props.chartData.data).toEqual([10])
  })

  it('filters calendar table rows', () => {
    const entry = widgetsRegistry.calendar_table
    const def: any = { options: { calendarFilter: ['cal-2'] } }
    const ctx: any = {
      byCal: [{ id: 'cal-1', total_hours: 2 }, { id: 'cal-2', total_hours: 4 }],
      currentTargets: {},
      calendarGroups: [],
      calendarTodayHours: {},
    }
    const props = entry.buildProps(def, ctx) as any
    expect(props.rows).toHaveLength(1)
    expect(props.rows[0].id).toBe('cal-2')
  })

  it('applies projection mode per chart widget', () => {
    const entry = widgetsRegistry.chart_stacked
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const formatDateKey = (date: Date) => {
      const year = date.getFullYear()
      const month = `${date.getMonth() + 1}`.padStart(2, '0')
      const day = `${date.getDate()}`.padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    const def: any = {
      options: {
        scope: 'calendar',
        calendarFilter: ['cal-1'],
        forecastMode: 'total',
      },
    }
    const ctx: any = {
      charts: {
        perDaySeries: {
          labels: [formatDateKey(today), formatDateKey(tomorrow)],
          series: [{ id: 'cal-1', name: 'Cal 1', data: [1, 0] }],
        },
      },
      targetsConfig: { totalHours: 3, categories: [] },
      currentTargets: { 'cal-1': 3 },
      calendarCategoryMap: {},
      categoryColorMap: {},
      colorsById: { 'cal-1': '#111111' },
    }
    const props = entry.buildProps(def, ctx) as any
    expect(props.stacked.series[0].forecast?.[1]).toBe(2)
  })
})
