import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

import DeckSummaryCard from '../src/components/DeckSummaryCard.vue'

const buckets = [
  { key: 'open_all', label: 'Open · All', titles: ['Card A', 'Card B'], count: 2, board: { title: 'Opsdash Board', color: '#2563EB' } },
  { key: 'open_mine', label: 'Open · Mine', titles: ['Mine 1'], count: 1, board: { title: 'Opsdash Board', color: '#2563EB' } },
]

describe('DeckSummaryCard', () => {
  it('emits filter selection when rows are clicked', async () => {
    const onFilter = vi.fn()
    const wrapper = mount(DeckSummaryCard, {
      props: {
        buckets,
        rangeLabel: 'Week',
        loading: false,
        ticker: { autoScroll: false, intervalSeconds: 5 },
        activeFilter: 'open_all',
        onFilter,
      },
    })

    const rows = wrapper.findAll('.deck-summary-card__row')
    await rows[1].trigger('click')
    expect(onFilter).toHaveBeenCalledWith('open_mine')
  })

  it('highlights the active filter row', () => {
    const wrapper = mount(DeckSummaryCard, {
      props: {
        buckets,
        rangeLabel: 'Week',
        loading: false,
        ticker: { autoScroll: false, intervalSeconds: 5 },
        activeFilter: 'open_all',
      },
    })

    const activeRow = wrapper.find('.deck-summary-card__row--active')
    expect(activeRow.exists()).toBe(true)
    expect(activeRow.text()).toContain('Open · All')
  })

  it('hides the header when showHeader is false', () => {
    const wrapper = mount(DeckSummaryCard, {
      props: {
        buckets,
        rangeLabel: 'Week',
        loading: false,
        ticker: { autoScroll: false, intervalSeconds: 5 },
        showHeader: false,
      },
    })
    expect(wrapper.find('.deck-summary-card__header').exists()).toBe(false)
  })
})
