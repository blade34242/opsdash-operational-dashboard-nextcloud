import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import BalanceIndexCard from '../src/components/BalanceIndexCard.vue'

const overview = {
  index: 0.72,
  trend: { badge: 'Balanced', history: [{ label: 'T-1', categories: [{ id: 'work', share: 0.6 }] }, { label: 'T-2', categories: [{ id: 'work', share: 0.5 }] }] },
  relations: [{ label: 'Work:Life', value: '0.9' }],
  categories: [{ id: 'work', label: 'Work', share: 60 }],
  warnings: ['Unassigned accounts for 100% of tracked hours.'],
}

describe('BalanceIndexCard', () => {
  it('renders trend, relations, categories, messages when enabled', () => {
    const wrapper = mount(BalanceIndexCard, {
      props: {
        overview,
        showTrend: true,
        showMessages: true,
        showConfig: true,
        indexBasis: 'category',
        thresholds: { noticeAbove: 0.15, noticeBelow: 0.1, warnAbove: 0.3, warnBelow: 0.25, warnIndex: 0.6 },
        title: 'My Balance',
        cardBg: '#eee',
      },
    })
    expect(wrapper.text()).toContain('My Balance')
    expect(wrapper.text()).toContain('Unassigned')
    expect(wrapper.find('.trend-block').exists()).toBe(true)
    const style = wrapper.find('.balance-card').attributes('style') || ''
    expect(style.includes('#eee') || style.toLowerCase().includes('rgb(238')).toBe(true)
    expect(wrapper.text()).toContain('Basis')
    expect(wrapper.text()).toContain('Warn index')
  })

  it('respects toggles to hide sections', () => {
    const wrapper = mount(BalanceIndexCard, {
      props: {
        overview,
        showTrend: false,
        showMessages: false,
      },
    })
    expect(wrapper.find('.trend').exists()).toBe(false)
    expect(wrapper.find('.messages').exists()).toBe(false)
  })

  it('renders trend index values using targets and lookback', () => {
    const wrapper = mount(BalanceIndexCard, {
      props: {
        overview: {
          index: 0.9,
          trend: {
            history: [
              { label: 'Now', categories: [{ id: 'work', share: 60 }, { id: 'hobby', share: 40 }] },
              { label: 'Prev', categories: [{ id: 'work', share: 50 }, { id: 'hobby', share: 50 }] },
            ],
            delta: [1, 2],
          },
        },
        targetsCategories: [
          { id: 'work', targetHours: 10 },
          { id: 'hobby', targetHours: 10 },
        ],
        showTrend: true,
        lookbackWeeks: 2,
      },
    })

    const trendValues = wrapper.findAll('.trend-block .trend-value').map((n) => n.text())
    expect(trendValues).toContain('0.90')
    expect(trendValues).toContain('1.00')
    expect(trendValues.length).toBe(2)
  })

  it('falls back to overview.trendHistory and handles extra buckets', () => {
    const wrapper = mount(BalanceIndexCard, {
      props: {
        overview: {
          index: 0.762,
          trendHistory: [
            { label: 'Last week', categories: [
              { id: 'work', share: 59.1 },
              { id: 'sport', share: 40.9 },
              { id: '__uncategorized__', share: 0 },
            ]},
            { label: '-2 wk', categories: [
              { id: 'work', share: 33.3 },
              { id: 'sport', share: 66.7 },
            ]},
          ],
        },
        targetsCategories: [
          { id: 'work', targetHours: 32 },
          { id: 'sport', targetHours: 4 },
        ],
        showTrend: true,
        lookbackWeeks: 2,
      },
    })

    const trendValues = wrapper.findAll('.trend-block .trend-value').map((n) => n.text())
    expect(trendValues[0]).not.toBe('—')
    expect(trendValues.length).toBe(2)

    const footer = wrapper.find('.trend-center')
    expect(footer.text()).toContain('Last week')
  })
})
