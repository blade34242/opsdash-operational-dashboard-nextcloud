import { describe, it, expect } from 'vitest'
import { resolveWidgetColors } from '../src/services/widgetColors'

describe('widgetColors', () => {
  it('merges palette and mappings with overrides', () => {
    const out = resolveWidgetColors({
      options: {
        palette: ['#111', '#222'],
        byId: { a: '#f00' },
        bySeries: { s1: '#0f0' },
        background: '#fff',
      },
      defaults: {
        palette: ['#aaa', '#bbb'],
        byId: { b: '#00f' },
        bySeries: {},
        background: null,
      },
    })

    expect(out.palette).toEqual(['#111', '#222'])
    expect(out.byId).toMatchObject({ a: '#f00', b: '#00f' })
    expect(out.bySeries).toMatchObject({ s1: '#0f0' })
    expect(out.background).toBe('#fff')
  })

  it('falls back to defaults when no options provided', () => {
    const out = resolveWidgetColors({
      options: null,
      defaults: { palette: ['#1', '#2'], background: '#ccc' },
    })
    expect(out.palette).toEqual(['#1', '#2'])
    expect(out.background).toBe('#ccc')
  })
})
