import { describe, it, expect } from 'vitest'

import { createDefaultTargetsConfig } from '../src/services/targets'
import { widgetsRegistry } from '../src/services/widgetsRegistry'

describe('time summary split widgets', () => {
  it('overview widget applies toggle overrides and respects active day mode from options', () => {
    const entry = widgetsRegistry.time_summary_overview
    const baseCfg = createDefaultTargetsConfig()
    const def: any = {
      options: {
        showTotal: false,
        showWeekend: false,
        showBalance: false,
        showToday: false,
        showActivity: false,
        showHistoryCoreMetrics: false,
        mode: 'all',
      },
    }
    const ctx: any = {
      summary: { rangeLabel: 'Week', totalHours: 10 },
      activeDayMode: 'active',
      groups: [{ id: 'work', label: 'Work', todayHours: 2, color: '#123456' }],
      targetsConfig: baseCfg,
    }

    const props = entry.buildProps(def, ctx) as any
    expect(props.mode).toBe('all')
    expect(props.config.showTotal).toBe(false)
    expect(props.config.showWeekend).toBe(false)
    expect(props.config.showBalance).toBe(true)
    expect(props.showOverview).toBe(true)
    expect(props.showLookback).toBe(false)
    expect(props.showToday).toBe(false)
    expect(props.showActivity).toBe(false)
    expect(props.showDelta).toBe(false)
    expect(props.showHistoryCoreMetrics).toBe(false)
    expect(props.summary.totalHours).toBe(10)
    expect(props.todayGroups?.[0]?.todayHours).toBe(2)
    expect(props.showHeader).toBe(true)
    expect(Array.isArray(props.history)).toBe(true)
    expect(props.history).toHaveLength(0)
  })

  it('lookback widget enables history and hides overview rows', () => {
    const entry = widgetsRegistry.time_summary_lookback
    const baseCfg = createDefaultTargetsConfig()
    const def: any = {
      options: {
        historyView: 'pills',
        showDelta: false,
      },
    }
    const ctx: any = {
      summary: { rangeLabel: 'Month', totalHours: 5, todayHours: 1 },
      activeDayMode: 'active',
      groups: [{ id: 'sport', label: 'Sport', todayHours: 0 }],
      targetsConfig: baseCfg,
      lookbackWeeks: 4,
      charts: {
        perDaySeriesByOffset: [
          { offset: 1, from: '2025-12-01', to: '2025-12-07', labels: ['2025-12-01'], series: [{ id: 'cal-1', name: 'A', data: [2] }] },
        ],
        hodByOffset: [{ offset: 1, dows: ['Mon'], matrix: [[2]] }],
        summaryByOffset: [{ offset: 1, events: 1 }],
      },
      calendarCategoryMap: { 'cal-1': 'work' },
      calendarGroups: [{ id: 'work', label: 'Work' }],
      categoryColorMap: { work: '#2563EB' },
    }

    const props = entry.buildProps(def, ctx) as any
    expect(props.mode).toBe('active')
    expect(props.showOverview).toBe(false)
    expect(props.showLookback).toBe(true)
    expect(props.showToday).toBe(false)
    expect(props.showActivity).toBe(false)
    expect(props.showDelta).toBe(false)
    expect(props.historyView).toBe('pills')
    expect(props.history.length).toBe(1)
    expect(baseCfg.timeSummary.showTotal).toBe(true)
    expect(baseCfg.timeSummary.showWeekend).toBe(true)
    expect(props.showHistoryCoreMetrics).toBe(true)
    expect(props.showHeader).toBe(true)
  })

  it('passes showHeader when explicitly disabled on lookback widget', () => {
    const entry = widgetsRegistry.time_summary_lookback
    const baseCfg = createDefaultTargetsConfig()
    const def: any = { options: { showHeader: false } }
    const ctx: any = {
      summary: { rangeLabel: 'Week', totalHours: 10 },
      activeDayMode: 'active',
      targetsConfig: baseCfg,
      lookbackWeeks: 1,
    }

    const props = entry.buildProps(def, ctx) as any
    expect(props.showHeader).toBe(false)
  })
})
