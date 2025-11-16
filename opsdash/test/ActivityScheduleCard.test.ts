import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import ActivityScheduleCard from '../src/components/ActivityScheduleCard.vue'

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
})
