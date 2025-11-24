import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import DeckSummaryCard from '../src/components/DeckSummaryCard.vue'

const buckets = [
  {
    key: 'open_all' as const,
    label: 'Open · All',
    titles: ['Card A', 'Card B', 'Card C', 'Card D', 'Card E'],
    count: 5,
    board: { title: 'Opsdash Deck QA', color: '#2563EB' },
  },
  {
    key: 'done_mine' as const,
    label: 'Done · Mine',
    titles: [],
    count: 0,
  },
]

const mountCard = (props: Record<string, unknown> = {}) =>
  mount(DeckSummaryCard, {
    props: {
      buckets,
      rangeLabel: 'Week',
      loading: false,
      error: '',
      ticker: { autoScroll: true, intervalSeconds: 5 },
      showBoardBadges: true,
      ...props,
    },
    global: {
      stubs: {
        NcLoadingIcon: { template: '<div class="stub-loading"></div>' },
      },
    },
  })

describe('DeckSummaryCard', () => {
  it('renders bucket rows with counts, board badge, and ticker titles', async () => {
    const wrapper = mountCard()
    expect(wrapper.text()).toContain('Deck summary')
    expect(wrapper.text()).toContain('Open · All')
    expect(wrapper.text()).toContain('5')
    expect(wrapper.find('.bucket-board').text()).toContain('Opsdash Deck QA')

    // Shows up to 4 titles at a time
    const titles = wrapper.findAll('.bucket-title')
    expect(titles.length).toBeGreaterThan(0)
  })

  it('shows empty message when no data', () => {
    const wrapper = mountCard({ buckets: buckets.map((b) => ({ ...b, count: 0, titles: [] })) })
    expect(wrapper.text()).toContain('No Deck data')
  })

  it('shows loading and error states', () => {
    const loading = mountCard({ loading: true })
    expect(loading.find('.deck-summary-card__loading').exists()).toBe(true)

    const error = mountCard({ loading: false, error: 'Deck failed' })
    expect(error.find('.deck-summary-card__error').text()).toContain('Deck failed')
  })
})
