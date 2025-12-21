import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import TimeSummaryCard from '../src/components/TimeSummaryCard.vue'

const baseSummary = {
  rangeLabel: 'Week 10',
  rangeStart: '2025-03-03',
  rangeEnd: '2025-03-09',
  offset: 0,
  totalHours: 12.5,
  avgDay: 2.5,
  avgEvent: 1.25,
  medianDay: 2,
  busiest: { date: '2025-03-04', hours: 5 },
  workdayAvg: 3,
  workdayMedian: 2.5,
  weekendAvg: 1,
  weekendMedian: 1.5,
  weekendShare: 40,
  activeCalendars: 3,
  calendarSummary: 'Cal A 60%, Cal B 40%',
  balanceIndex: 0.78,
  delta: null,
  topCategory: {
    label: 'Work',
    actualHours: 7.5,
    targetHours: 10,
    percent: 75,
    statusLabel: 'At risk',
    status: 'at_risk',
  },
}

describe('TimeSummaryCard', () => {
  it('renders today badge when provided', () => {
    const wrapper = mount(TimeSummaryCard, {
      props: {
        summary: {
          ...baseSummary,
          todayHours: 6.5,
        },
        mode: 'active',
      },
    })

    const text = wrapper.text().replace(/\s+/g, ' ')
    expect(text).toContain('Total today')
    expect(text).toContain('6.50 h')
  })

  it('renders key metrics, top category badge, and weekend share', () => {
    const wrapper = mount(TimeSummaryCard, {
      props: {
        summary: baseSummary,
        mode: 'active',
      },
    })

    const text = wrapper.text()
    expect(text).toContain('Time Summary · Week 10')
    expect(text).toContain('12.50 h total')
    expect(text).toContain('2.50 h/day (active days)')
    expect(text).toContain('Busiest 2025-03-04 — 5.00 h')
    expect(text).toContain('Weekend 1.00 h avg · 1.50 h median (40.0%)')

    const calendarRow = wrapper.find('.time-summary-row.calendars').text().replace(/\s+/g, ' ')
    expect(calendarRow).toContain('3 calendars')
    expect(calendarRow).toContain('Cal A 60%, Cal B 40%')

    const badge = wrapper.find('.summary-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('At risk')
    expect(badge.classes()).toContain('status-risk')
  })

  it('honours config toggles to hide optional rows', () => {
    const wrapper = mount(TimeSummaryCard, {
      props: {
        summary: {
          ...baseSummary,
          topCategory: null,
        },
        mode: 'all',
        config: {
          showWeekendShare: false,
          showTopCategory: false,
          showBalance: false,
          showBusiest: false,
        },
      },
    })

    const text = wrapper.text()
    expect(text).toContain('h/day (all days)')

    const weekendRow = wrapper.findAll('.time-summary-row').find((row) => row.text().includes('Weekend'))
    expect(weekendRow?.text().replace(/\s+/g, ' ')).toBe('Weekend 1.00 h avg · 1.50 h median')

    expect(wrapper.find('.summary-badge').exists()).toBe(false)
    expect(text).not.toContain('Balance')
    expect(text).not.toContain('Busiest')
  })
})
