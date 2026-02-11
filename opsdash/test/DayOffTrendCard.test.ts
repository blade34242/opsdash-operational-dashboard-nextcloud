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
    const tiles = wrapper.findAll('.dayoff-tile').map((node) => node.element as HTMLElement)
    expect(tiles.length).toBeGreaterThan(0)
    expect(tiles.some((tile) => tile.style.background.includes('rgb(0, 0, 0)'))).toBe(true)
    expect(tiles.some((tile) => tile.style.color.includes('rgb(255, 255, 255)'))).toBe(true)
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

  it('shows oldest-first by default and supports reverse-order toggle', () => {
    const trend = [
      { offset: 0, label: 'This week', from: '', to: '', totalDays: 7, daysOff: 1, daysWorked: 6 },
      { offset: 1, label: '-1 wk', from: '', to: '', totalDays: 7, daysOff: 2, daysWorked: 5 },
      { offset: 2, label: '-2 wk', from: '', to: '', totalDays: 7, daysOff: 3, daysWorked: 4 },
    ]
    const normal = mount(DayOffTrendCard, {
      props: { trend, lookback: 2, labelMode: 'offset' },
    })
    expect(normal.findAll('.dayoff-tile__label').map((node) => node.text())).toEqual([
      '-2',
      '-1',
      'Current',
    ])

    const reversed = mount(DayOffTrendCard, {
      props: { trend, lookback: 2, labelMode: 'offset', reverseOrder: true },
    })
    expect(reversed.findAll('.dayoff-tile__label').map((node) => node.text())).toEqual([
      'Current',
      '-1',
      '-2',
    ])
  })
})
