import { describe, it, expect } from 'vitest'
import { widgetsRegistry } from '../src/services/widgetsRegistry'
import { formatDateKey, getWeekdayOrder } from '../src/services/dateTime'

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
          labels: [formatDateKey(today, 'UTC'), formatDateKey(tomorrow, 'UTC')],
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

  it('uses lookback series for day-of-week when available', () => {
    const entry = widgetsRegistry.chart_dow
    const def: any = { options: { scope: 'calendar', forecastMode: 'off' } }
    const ctx: any = {
      lookbackWeeks: 2,
      charts: {
        perDaySeries: {
          labels: ['2025-10-21'],
          series: [{ id: 'cal-1', name: 'Cal 1', data: [5] }],
        },
        perDaySeriesByOffset: [
          { offset: 0, labels: ['2025-10-20'], series: [{ id: 'cal-1', name: 'Cal 1', data: [5] }] },
          { offset: 1, labels: ['2025-10-20'], series: [{ id: 'cal-1', name: 'Cal 1', data: [3] }] },
        ],
      },
      colorsById: { 'cal-1': '#111111' },
      calendarCategoryMap: {},
      categoryColorMap: {},
    }
    const props = entry.buildProps(def, ctx) as any
    const order = getWeekdayOrder()
    const monIdx = order.indexOf('Mon')
    expect(monIdx).toBeGreaterThanOrEqual(0)
    expect(props.groupedData.series[0].data[monIdx]).toBe(5)
    expect(props.groupedData.series[1].data[monIdx]).toBe(3)
  })

  it('uses lookback heatmap data when available', () => {
    const entry = widgetsRegistry.chart_hod
    const def: any = { options: {} }
    const ctx: any = {
      lookbackWeeks: 2,
      rangeMode: 'week',
      charts: {
        hod: { dows: ['Mon'], hours: [0], matrix: [[1]] },
        hodLookback: { dows: ['Mon'], hours: [0], matrix: [[4]] },
        hodByOffset: [
          { offset: 0, dows: ['Mon'], hours: [0], matrix: [[4]] },
          { offset: 1, dows: ['Mon'], hours: [0], matrix: [[2]] },
        ],
      },
    }
    const props = entry.buildProps(def, ctx) as any
    expect(props.hodData).toEqual(ctx.charts.hodLookback)
    expect(props.lookbackEntries).toHaveLength(2)
  })
})
