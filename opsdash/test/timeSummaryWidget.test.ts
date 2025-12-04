import { describe, it, expect } from 'vitest'

import { createDefaultTargetsConfig } from '../src/services/targets'
import { widgetsRegistry } from '../src/services/widgetsRegistry'

describe('time_summary_v2 widget', () => {
  it('applies toggle overrides and respects active day mode from options', () => {
    const entry = widgetsRegistry.time_summary_v2
    const baseCfg = createDefaultTargetsConfig()
    const def: any = {
      options: {
        showTotal: false,
        showWeekend: false,
        showBalance: false,
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
    expect(props.config.showBalance).toBe(false)
    expect(props.summary.totalHours).toBe(10)
    expect(props.todayGroups?.[0]?.todayHours).toBe(2)
  })

  it('falls back to activeDayMode from context and does not mutate base config', () => {
    const entry = widgetsRegistry.time_summary_v2
    const baseCfg = createDefaultTargetsConfig()
    const def: any = { options: {} }
    const ctx: any = {
      summary: { rangeLabel: 'Month', totalHours: 5, todayHours: 1 },
      activeDayMode: 'active',
      groups: [{ id: 'sport', label: 'Sport', todayHours: 0 }],
      targetsConfig: baseCfg,
    }

    const props = entry.buildProps(def, ctx) as any
    expect(props.mode).toBe('active')
    expect(props.todayGroups?.length).toBe(1)
    expect(baseCfg.timeSummary.showTotal).toBe(true)
    expect(baseCfg.timeSummary.showWeekend).toBe(true)
  })
})
