import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import BalanceOverviewCard from '../src/components/BalanceOverviewCard.vue'

function mountCard(overrides: Record<string, any> = {}) {
  const overview = {
    index: 0.82,
    categories: [
      { id: 'work', label: 'Work', hours: 18, share: 60, prevShare: 48, delta: 12, color: '#2563EB' },
      { id: 'hobby', label: 'Hobby', hours: 6, share: 20, prevShare: 32, delta: -12, color: '#F97316' },
    ],
    relations: [],
    trend: {
      delta: [
        { id: 'work', label: 'Work', delta: 12 },
        { id: 'hobby', label: 'Hobby', delta: -12 },
      ],
      badge: 'Shifting to Work',
      history: [
        {
          offset: 1,
          label: 'Last week',
          categories: [
            { id: 'work', label: 'Work', share: 48 },
            { id: 'hobby', label: 'Hobby', share: 32 },
          ],
        },
      ],
    },
    daily: [],
    insights: [],
    warnings: [],
  }
  return mount(BalanceOverviewCard, {
    props: {
      overview,
      rangeLabel: 'Week 45',
      rangeMode: 'week',
      lookbackWeeks: 1,
      ...overrides,
    },
  })
}

describe('BalanceOverviewCard', () => {
  it('uses prevShare when rendering lookback column', () => {
    const wrapper = mountCard()
    const cells = wrapper.findAll('.heatmap-cell')
    expect(cells[0].text()).toContain('48%')
    expect(cells[1].text()).toContain('60%')
  })

  it('falls back to delta math when prevShare missing', () => {
    const wrapper = mountCard({
      overview: {
        index: 0.5,
        categories: [
          { id: 'sport', label: 'Sport', hours: 12, share: 40, prevShare: undefined, delta: 8 },
        ],
        relations: [],
        trend: {
          delta: [{ id: 'sport', label: 'Sport', delta: 8 }],
          badge: 'Shifting to Sport',
          history: [],
        },
        daily: [],
        insights: [],
        warnings: [],
      },
    })
    const cells = wrapper.findAll('.heatmap-cell')
    expect(cells[0].text()).toContain('32%')
    expect(cells[1].text()).toContain('40%')
  })
})
