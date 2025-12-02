import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TimeTargetsCard from '../src/components/TimeTargetsCard.vue'
import { createDefaultTargetsConfig } from '../src/services/targets'

describe('TimeTargetsCard', () => {
  it('shows today overlay and chip on category bars', () => {
    const catSummary = {
      id: 'work',
      label: 'Work',
      actualHours: 9,
      targetHours: 32,
      percent: 28,
      deltaHours: -23,
      remainingHours: 23,
      needPerDay: 7.7,
      daysLeft: 3,
      calendarPercent: 0,
      gap: 0,
      status: 'behind',
      statusLabel: 'Behind',
      includeWeekend: true,
      paceMode: 'days_only',
    }

    const summary = {
      total: catSummary,
      categories: [catSummary],
      forecast: { text: '', linear: 0, momentum: 0, primaryMethod: 'linear' as const },
    }

    const config = createDefaultTargetsConfig()

    const wrapper = mount(TimeTargetsCard, {
      props: {
        summary,
        config,
        groups: [
          {
            id: 'work',
            label: 'Work',
            summary: catSummary,
            color: '#00679e',
            rows: [],
            todayHours: 2,
          },
        ],
      },
    })

    const chip = wrapper.find('.today-chip')
    expect(chip.exists()).toBe(true)
    expect(chip.text()).toContain('Today')
  })
})
