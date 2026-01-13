import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import ActivityScheduleCard from '../src/components/widgets/cards/ActivityScheduleCard.vue'

const baseSummary = {
  rangeLabel: 'Week 45',
  events: 0,
  activeDays: null,
  typicalStart: null,
  typicalEnd: null,
  weekendShare: null,
  eveningShare: null,
  earliestStart: null,
  latestEnd: null,
  overlapEvents: null,
  longestSession: null,
  lastDayOff: null,
  lastHalfDayOff: null,
}

describe('ActivityScheduleCard', () => {
  it('fills missing day off history slots up to lookback and shows fallback labels', () => {
    const wrapper = mount(ActivityScheduleCard, {
      props: {
        summary: baseSummary,
        rangeLabel: 'Week 45',
        config: { showDayOffTrend: true },
        trendUnit: 'wk',
        dayOffLookback: 3,
        dayOffTrend: [
          { offset: 0, label: 'This week', from: '', to: '', totalDays: 7, daysOff: 2, daysWorked: 5 },
          { offset: 2, label: '-2 wk', from: '', to: '', totalDays: 7, daysOff: 4, daysWorked: 3 },
        ],
      },
    })
    const cells = wrapper.findAll('.dayoff-tile')
    expect(cells).toHaveLength(4)
    expect(cells[0].find('.dayoff-tile__label').text()).toContain('This week')
    expect(cells[1].find('.dayoff-tile__label').text()).toBe('-1 wk')
    expect(cells[3].find('.dayoff-tile__value').text()).toBe('0% off')
  })

  it('uses month unit in meta label when trendUnit is months', () => {
    const wrapper = mount(ActivityScheduleCard, {
      props: {
        summary: baseSummary,
        rangeLabel: 'October',
        config: { showDayOffTrend: true },
        trendUnit: 'mo',
        dayOffLookback: 2,
        dayOffTrend: [
          { offset: 0, label: 'This month', from: '', to: '', totalDays: 30, daysOff: 18, daysWorked: 12 },
          { offset: 1, label: '-1 mo', from: '', to: '', totalDays: 30, daysOff: 8, daysWorked: 22 },
        ],
      },
    })
    expect(wrapper.find('.dayoff-meta').text()).toContain('2 months')
    const tiles = wrapper.findAll('.dayoff-tile')
    expect(tiles[0].classes()).toContain('dayoff-tile--high')
  })

  it('derives lookback length from history and applies tone classes', () => {
    const wrapper = mount(ActivityScheduleCard, {
      props: {
        summary: baseSummary,
        rangeLabel: 'Week 12',
        config: { showDayOffTrend: true },
        trendUnit: 'wk',
        dayOffTrend: [
          { offset: 0, label: 'This week', from: '', to: '', totalDays: 7, daysOff: 0, daysWorked: 7 },
          { offset: 1, label: '-1 wk', from: '', to: '', totalDays: 7, daysOff: 3, daysWorked: 4 },
          { offset: 2, label: '-2 wk', from: '', to: '', totalDays: 4, daysOff: 3, daysWorked: 1 },
        ],
      },
    })
    const tiles = wrapper.findAll('.dayoff-tile')
    expect(tiles).toHaveLength(3) // current + offsets inferred from history
    expect(tiles[0].classes()).toContain('dayoff-tile--low') // 0/7
    expect(tiles[1].classes()).toContain('dayoff-tile--mid') // 3/7 ≈ 0.42
    expect(tiles[2].classes()).toContain('dayoff-tile--high') // 3/4 = 0.75
  })

  it('hides the header when showHeader is false', () => {
    const wrapper = mount(ActivityScheduleCard, {
      props: {
        summary: baseSummary,
        rangeLabel: 'Week 45',
        showHeader: false,
      },
    })
    expect(wrapper.find('.activity-card__header').exists()).toBe(false)
  })
})
