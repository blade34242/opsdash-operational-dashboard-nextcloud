import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import CategoryMixTrendCard from '../src/components/CategoryMixTrendCard.vue'

const overview = {
  categories: [
    { id: 'work', label: 'Work', share: 0.6 },
    { id: 'life', label: 'Life', share: 0.4 },
  ],
  trend: {
    badge: 'Stable',
    history: [
      { offset: 1, label: '-1', categories: [{ id: 'work', label: 'Work', share: 0.5 }] },
    ],
  },
}

describe('CategoryMixTrendCard', () => {
  it('renders trend rows and applies title/background', () => {
    const wrapper = mount(CategoryMixTrendCard, {
      props: {
        overview,
        rangeMode: 'week',
        lookbackWeeks: 2,
        showBadge: true,
        title: 'My Mix',
        cardBg: '#eef',
      },
    })

    expect(wrapper.text()).toContain('My Mix')
    expect(wrapper.findAll('.mix-row').length).toBeGreaterThan(0)
    expect(wrapper.find('.mix-card').attributes('style')).toContain('background')
  })
})
