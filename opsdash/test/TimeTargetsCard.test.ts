import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TimeTargetsCard from '../src/components/widgets/cards/TimeTargetsCard.vue'
import { createDefaultTargetsConfig } from '../src/services/targets'

describe('TimeTargetsCard', () => {
  it('hides pace/forecast lines when toggled off', () => {
    const baseSummary = {
      id: 'total',
      label: 'Total',
      actualHours: 10,
      targetHours: 20,
      percent: 50,
      deltaHours: -10,
      remainingHours: 10,
      needPerDay: 1,
      daysLeft: 5,
      calendarPercent: 0,
      gap: 0,
      status: 'behind' as const,
      statusLabel: 'Behind',
      includeWeekend: true,
      paceMode: 'days_only' as const,
    }
    const summary = {
      total: baseSummary,
      categories: [],
      forecast: { text: 'Forecast text', linear: 1, momentum: 2, primaryMethod: 'linear' as const },
    }
    const wrapper = mount(TimeTargetsCard, {
      props: {
        summary,
        config: createDefaultTargetsConfig(),
        showPace: false,
        showForecast: false,
      },
    })

    expect(wrapper.text()).not.toContain('Pace:')
    expect(wrapper.text()).not.toContain('Forecast:')
  })

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
    expect(wrapper.find('.bar-track').exists()).toBe(true)
    expect(wrapper.find('.bar-track .today-chip').exists()).toBe(true)
  })

  it('clamps today chip position for extreme progress values', () => {
    const catSummary = {
      id: 'work',
      label: 'Work',
      actualHours: 45,
      targetHours: 20,
      percent: 225,
      deltaHours: 25,
      remainingHours: 0,
      needPerDay: 0,
      daysLeft: 0,
      calendarPercent: 0,
      gap: 0,
      status: 'done',
      statusLabel: 'Done',
      includeWeekend: true,
      paceMode: 'days_only',
    }

    const summary = {
      total: catSummary,
      categories: [catSummary],
      forecast: { text: '', linear: 0, momentum: 0, primaryMethod: 'linear' as const },
    }

    const wrapper = mount(TimeTargetsCard, {
      props: {
        summary,
        config: createDefaultTargetsConfig(),
        groups: [
          {
            id: 'work',
            label: 'Work',
            summary: catSummary,
            color: '#00679e',
            rows: [],
            todayHours: 3,
          },
        ],
      },
    })

    const chip = wrapper.find('.today-chip')
    expect(chip.exists()).toBe(true)
    expect(chip.attributes('style')).toContain('left: 88%')
  })

  it('hides today overlay and chip when todayHours is zero', () => {
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

    const wrapper = mount(TimeTargetsCard, {
      props: {
        summary,
        config: createDefaultTargetsConfig(),
        groups: [
          {
            id: 'work',
            label: 'Work',
            summary: catSummary,
            color: '#00679e',
            rows: [],
            todayHours: 0,
          },
        ],
      },
    })

    expect(wrapper.find('.today-chip').exists()).toBe(false)
    expect(wrapper.find('.today-overlay').exists()).toBe(false)
  })

  it('omits categories when summary has none and no groups provided', () => {
    const summary = {
      total: {
        id: 'total',
        label: 'Total',
        actualHours: 0,
        targetHours: 10,
        percent: 0,
        deltaHours: -10,
        remainingHours: 10,
        needPerDay: 1,
        daysLeft: 5,
        calendarPercent: 0,
        gap: 0,
        status: 'behind',
        statusLabel: 'Behind',
        includeWeekend: true,
        paceMode: 'days_only',
      },
      categories: [],
      forecast: { text: '', linear: 0, momentum: 0, primaryMethod: 'linear' as const },
    }

    const wrapper = mount(TimeTargetsCard, {
      props: {
        summary,
        config: createDefaultTargetsConfig(),
      },
    })

    expect(wrapper.findAll('.targets-categories .category')).toHaveLength(0)
  })

  it('hides the header when showHeader is false', () => {
    const summary = {
      total: {
        id: 'total',
        label: 'Total',
        actualHours: 0,
        targetHours: 10,
        percent: 0,
        deltaHours: -10,
        remainingHours: 10,
        needPerDay: 1,
        daysLeft: 5,
        calendarPercent: 0,
        gap: 0,
        status: 'behind',
        statusLabel: 'Behind',
        includeWeekend: true,
        paceMode: 'days_only',
      },
      categories: [],
      forecast: { text: '', linear: 0, momentum: 0, primaryMethod: 'linear' as const },
    }

    const wrapper = mount(TimeTargetsCard, {
      props: {
        summary,
        config: createDefaultTargetsConfig(),
        showHeader: false,
      },
    })

    expect(wrapper.find('.targets-header').exists()).toBe(false)
  })
})
