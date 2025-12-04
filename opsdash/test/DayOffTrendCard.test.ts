import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import DayOffTrendCard from '../src/components/DayOffTrendCard.vue'

const trend = [
  { offset: 0, label: 'This week', from: '', to: '', totalDays: 7, daysOff: 2, daysWorked: 5 },
  { offset: 1, label: '-1 wk', from: '', to: '', totalDays: 7, daysOff: 1, daysWorked: 6 },
]

describe('DayOffTrendCard', () => {
  it('renders tiles and uses provided title/background', () => {
    const wrapper = mount(DayOffTrendCard, {
      props: {
        trend,
        unit: 'wk',
        lookback: 1,
        title: 'My Days Off',
        cardBg: '#ffeeee',
      },
    })

    expect(wrapper.text()).toContain('My Days Off')
    expect(wrapper.find('.dayoff-tile').exists()).toBe(true)
    expect(wrapper.find('.card.dayoff-card').attributes('style')).toContain('background')
  })
})
