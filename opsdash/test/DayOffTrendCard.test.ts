import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import DayOffTrendCard from '../src/components/widgets/cards/DayOffTrendCard.vue'

describe('DayOffTrendCard', () => {
  it('applies custom tone colors', () => {
    const wrapper = mount(DayOffTrendCard, {
      props: {
        trend: [
          { offset: 0, label: 'This week', from: '', to: '', totalDays: 7, daysOff: 1, daysWorked: 6 },
          { offset: 1, label: '-1 wk', from: '', to: '', totalDays: 7, daysOff: 4, daysWorked: 3 },
        ],
        toneLowColor: '#000000',
        toneHighColor: '#ffffff',
      },
    })
    const tiles = wrapper.findAll('.dayoff-tile')
    expect(tiles.length).toBeGreaterThan(0)
    expect((tiles[0].element as HTMLElement).style.background).toContain('rgb(0, 0, 0)')
    expect((tiles[0].element as HTMLElement).style.color).toContain('rgb(255, 255, 255)')
  })

  it('hides the header when showHeader is false', () => {
    const wrapper = mount(DayOffTrendCard, {
      props: {
        trend: [
          { offset: 0, label: 'This week', from: '', to: '', totalDays: 7, daysOff: 1, daysWorked: 6 },
        ],
        showHeader: false,
      },
    })
    expect(wrapper.find('.dayoff-card__header').exists()).toBe(false)
  })

  it('reverses tile order when reverseTrend is enabled', () => {
    const trend = [
      { offset: 0, label: 'This week', from: '', to: '', totalDays: 7, daysOff: 1, daysWorked: 6 },
      { offset: 1, label: '-1 wk', from: '', to: '', totalDays: 7, daysOff: 2, daysWorked: 5 },
      { offset: 2, label: '-2 wk', from: '', to: '', totalDays: 7, daysOff: 3, daysWorked: 4 },
    ]
    const normal = mount(DayOffTrendCard, {
      props: { trend, lookback: 2, labelMode: 'offset' },
    })
    expect(normal.findAll('.dayoff-tile__label').map((node) => node.text())).toEqual([
      'Current',
      '-1',
      '-2',
    ])

    const reversed = mount(DayOffTrendCard, {
      props: { trend, lookback: 2, labelMode: 'offset', reverseTrend: true },
    })
    expect(reversed.findAll('.dayoff-tile__label').map((node) => node.text())).toEqual([
      '-2',
      '-1',
      'Current',
    ])
  })
})
