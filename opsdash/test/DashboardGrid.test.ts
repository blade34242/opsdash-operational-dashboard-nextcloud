import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { markRaw } from 'vue'

import DashboardGrid from '../src/components/layout/DashboardGrid.vue'

function parseStyle(style: string) {
  return style
    .split(';')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, pair) => {
      const [key, value] = pair.split(':').map((s) => s.trim())
      if (key && value) acc[key] = value
      return acc
    }, {})
}

describe('DashboardGrid widget scale vars', () => {
  it('applies larger scale for xl while keeping small unchanged', () => {
    const stub = markRaw({ template: '<div />' })
    const wrapper = mount(DashboardGrid, {
      props: {
        ordered: [
          { id: 'xl', component: stub, props: {}, layout: { width: 'half', height: 'm' }, type: 'x', options: { scale: 'xl' } },
          { id: 'sm', component: stub, props: {}, layout: { width: 'half', height: 'm' }, type: 'y', options: { scale: 'sm' } },
        ],
        editable: false,
      },
    })

    const items = wrapper.findAll('.layout-item')
    const xlStyle = parseStyle(items[0].attributes('style') || '')
    const smStyle = parseStyle(items[1].attributes('style') || '')

    expect(xlStyle['--widget-scale']).toBe('1.6')
    expect(parseFloat(xlStyle['--widget-title-size'])).toBeCloseTo(22.4, 3)
    expect(smStyle['--widget-scale']).toBe('0.85')
    expect(parseFloat(smStyle['--widget-title-size'])).toBeCloseTo(11.9, 3)
  })
})
