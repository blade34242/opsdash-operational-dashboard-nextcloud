import { describe, it, expect } from 'vitest'

import { createDefaultTargetsConfig } from '../src/services/targets'
import { widgetsRegistry } from '../src/services/widgetsRegistry'

describe('widgetsRegistry text_block presets', () => {
  it('uses preset title/body when provided', () => {
    const entry = widgetsRegistry.text_block
    const def: any = { options: { preset: 'targets' } }
    const props = entry.buildProps(def, {}) as any
    expect(props.title).toBe('Targets')
    // first item only when include=false
    expect(props.items).toHaveLength(1)
    expect(props.items[0].key).toBeDefined()
  })

  it('includes all items when include flag is set', () => {
    const entry = widgetsRegistry.text_block
    const def: any = { options: { preset: 'deck', include: true } }
    const props = entry.buildProps(def, {}) as any
    expect(props.items.length).toBeGreaterThan(1)
    const keys = props.items.map((i: any) => i.key)
    expect(keys).toContain('buckets')
  })

  it('activity preset honors toggles and defaults to all on', () => {
    const entry = widgetsRegistry.text_block
    const defAllOn: any = { options: { preset: 'activity' } }
    const propsAllOn = entry.buildProps(defAllOn, {}) as any
    expect(propsAllOn.items.length).toBeGreaterThan(3)

    const defSomeOff: any = {
      options: {
        preset: 'activity',
        weekendShare: false,
        eveningShare: false,
        longest: false,
      },
    }
    const propsSomeOff = entry.buildProps(defSomeOff, {}) as any
    const keys = propsSomeOff.items.map((i: any) => i.key)
    expect(keys).not.toContain('weekend')
    expect(keys).not.toContain('evening')
    expect(keys).not.toContain('longest')
    expect(keys).toContain('overlaps')
  })
})

describe('widgetsRegistry targets_v2', () => {
  it('overrides UI flags without mutating base config', () => {
    const entry = widgetsRegistry.targets_v2
    const baseCfg = createDefaultTargetsConfig()
    baseCfg.ui.showTotalDelta = true
    baseCfg.includeZeroDaysInStats = false
    const def: any = {
      options: {
        showTotalDelta: false,
        showNeedPerDay: false,
        badges: false,
        includeWeekendToggle: false,
        includeZeroDaysInStats: true,
      },
    }
    const ctx: any = { targetsConfig: baseCfg }
    const props = entry.buildProps(def, ctx) as any

    expect(props.config.ui.showTotalDelta).toBe(false)
    expect(props.config.ui.showNeedPerDay).toBe(false)
    expect(props.config.ui.badges).toBe(false)
    expect(props.config.ui.includeWeekendToggle).toBe(false)
    expect(props.config.includeZeroDaysInStats).toBe(true)
    expect(baseCfg.ui.showTotalDelta).toBe(true)
    expect(baseCfg.includeZeroDaysInStats).toBe(false)
  })

  it('time summary v2 applies overrides to config', () => {
    const entry = widgetsRegistry.time_summary_v2
    const baseCfg = createDefaultTargetsConfig()
    const def: any = {
      options: {
        showTotal: false,
        showWeekendShare: false,
        showBalance: false,
        mode: 'all',
      },
    }
    const ctx: any = { targetsConfig: baseCfg, summary: { rangeLabel: 'Week' }, activeDayMode: 'active' }
    const props = entry.buildProps(def, ctx) as any
    expect(props.config.showTotal).toBe(false)
    expect(props.config.showWeekendShare).toBe(false)
    expect(props.config.showBalance).toBe(false)
    expect(props.mode).toBe('all')
  })

  it('time summary v2 exposes defaults for options', () => {
    const entry = widgetsRegistry.time_summary_v2
    expect(entry.defaultOptions?.showTotal).toBe(true)
    expect(entry.defaultOptions?.mode).toBe('active')
  })
})
