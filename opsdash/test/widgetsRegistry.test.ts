import { describe, it, expect } from 'vitest'

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
