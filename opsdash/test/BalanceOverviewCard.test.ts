import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import BalanceOverviewCard from '../src/components/BalanceOverviewCard.vue'

function rowValues(wrapper: ReturnType<typeof mount>, rowIndex = 0) {
  const row = wrapper.findAll('.mix-row')[rowIndex]
  return row.findAll('.mix-cell__value').map((node) => node.text().trim())
}

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
    expect(rowValues(wrapper)).toEqual(['48%', '60%'])
  })

  it('gracefully handles missing history data', () => {
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
    expect(rowValues(wrapper)).toEqual(['0%', '40%'])
  })

  it('renders multiple lookback columns when history matches config', () => {
    const wrapper = mountCard({
      overview: {
        index: 0.81,
        categories: [
          { id: 'work', label: 'Work', hours: 15, share: 55, prevShare: 52, delta: 3 },
        ],
        relations: [{ label: 'Work:Hobby', value: '2:1' }],
        trend: {
          delta: [{ id: 'work', label: 'Work', delta: 3 }],
          badge: 'Shifting to Work',
          history: [
            {
              offset: 3,
              label: '-3 wk',
              categories: [{ id: 'work', label: 'Work', share: 30 }],
            },
            {
              offset: 2,
              label: '-2 wk',
              categories: [{ id: 'work', label: 'Work', share: 40 }],
            },
            {
              offset: 1,
              label: 'Prev week',
              categories: [{ id: 'work', label: 'Work', share: 52 }],
            },
          ],
        },
        daily: [],
        insights: [],
        warnings: [],
      },
      lookbackWeeks: 3,
    })
    expect(rowValues(wrapper)).toEqual(['30%', '40%', '52%', '55%'])
    const subtitle = wrapper.find('.mix-subtitle').text()
    expect(subtitle).toContain('last 3 weeks')
  })

  it('pads lookback slots with zeros when history is missing entries', () => {
    const wrapper = mountCard({
      lookbackWeeks: 3,
      overview: {
        index: 0.75,
        categories: [
          { id: 'work', label: 'Work', hours: 14, share: 55, prevShare: 52, delta: 3 },
        ],
        relations: [],
        trend: {
          delta: [{ id: 'work', label: 'Work', delta: 3 }],
          badge: 'Shifting to Work',
          history: [
            {
              offset: 1,
              label: 'Prev range',
              categories: [{ id: 'work', label: 'Work', share: 52 }],
            },
          ],
        },
        daily: [],
        insights: [],
        warnings: [],
      },
    })
    expect(rowValues(wrapper)).toEqual(['0%', '0%', '52%', '55%'])
  })

  it('uses month labels when range mode is month', () => {
    const wrapper = mountCard({
      rangeMode: 'month',
      lookbackWeeks: 2,
      overview: {
        index: 0.8,
        categories: [
          { id: 'work', label: 'Work', hours: 30, share: 60, prevShare: 50, delta: 10 },
        ],
        relations: [],
        trend: {
          delta: [{ id: 'work', label: 'Work', delta: 10 }],
          badge: 'Shifting to Work',
          history: [
            {
              offset: 2,
              label: '2 months ago',
              categories: [{ id: 'work', label: 'Work', share: 45 }],
            },
            {
              offset: 1,
              label: '',
              categories: [{ id: 'work', label: 'Work', share: 50 }],
            },
          ],
        },
        daily: [],
        insights: [],
        warnings: [],
      },
    })
    expect(wrapper.find('.mix-subtitle').text()).toContain('last 2 months')
    expect(rowValues(wrapper)).toEqual(['45%', '50%', '60%'])
  })

  it('sorts history columns by offset regardless of backend order', () => {
    const wrapper = mountCard({
      lookbackWeeks: 3,
      overview: {
        index: 0.8,
        categories: [
          { id: 'work', label: 'Work', hours: 12, share: 48, prevShare: 44, delta: 4 },
        ],
        relations: [],
        trend: {
          delta: [{ id: 'work', label: 'Work', delta: 4 }],
          badge: 'Balanced',
          history: [
            {
              offset: 1,
              label: 'Prev wk',
              categories: [{ id: 'work', label: 'Work', share: 44 }],
            },
            {
              offset: 3,
              label: '-3 wk',
              categories: [{ id: 'work', label: 'Work', share: 30 }],
            },
            {
              offset: 2,
              label: '-2 wk',
              categories: [{ id: 'work', label: 'Work', share: 40 }],
            },
          ],
        },
        daily: [],
        insights: [],
        warnings: [],
      },
    })
    expect(rowValues(wrapper)).toEqual(['30%', '40%', '44%', '48%'])
  })

  it('applies trend classes for heatmap cells', () => {
    const wrapper = mountCard()
    const cells = wrapper.findAll('.mix-row')[0].findAll('.mix-cell')
    expect(cells[cells.length - 1].classes()).toContain('mix-cell--trend-up')
    expect(cells[0].classes()).toContain('mix-cell--trend-flat')
  })
})
