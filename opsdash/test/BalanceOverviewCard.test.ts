import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import BalanceOverviewCard from '../src/components/BalanceOverviewCard.vue'

function rowValues(wrapper: ReturnType<typeof mount>, rowIndex = 0) {
  const row = wrapper.findAll('.mix-row')[rowIndex]
  return row.findAll('.mix-cell__value').map((node) => node.text().trim())
}

function mountCard(overrides: Record<string, any> = {}) {
  const overview = {
    index: 0.82,
    categories: [
      { id: 'work', label: 'Work', hours: 18, share: 60, prevShare: 48, delta: 12, color: '#2563EB' },
      { id: 'hobby', label: 'Hobby', hours: 6, share: 20, prevShare: 32, delta: -12, color: '#F97316' },
    ],
    relations: [],
    trend: {
      delta: [
        { id: 'work', label: 'Work', delta: 12 },
        { id: 'hobby', label: 'Hobby', delta: -12 },
      ],
      badge: 'Shifting to Work',
      history: [
        {
          offset: 1,
          label: 'Last week',
          categories: [
            { id: 'work', label: 'Work', share: 48 },
            { id: 'hobby', label: 'Hobby', share: 32 },
          ],
        },
      ],
    },
    daily: [],
    warnings: [],
  }
  return mount(BalanceOverviewCard, {
    props: {
      overview,
      rangeLabel: 'Week 45',
      rangeMode: 'week',
      lookbackWeeks: 1,
      ...overrides,
    },
  })
}

describe('BalanceOverviewCard', () => {
  it('uses prevShare when rendering lookback column', () => {
    const wrapper = mountCard()
    expect(rowValues(wrapper)).toEqual(['48%', '60%'])
  })

  it('gracefully handles missing history data', () => {
    const wrapper = mountCard({
      overview: {
        index: 0.5,
        categories: [
          { id: 'sport', label: 'Sport', hours: 12, share: 40, prevShare: undefined, delta: 8 },
        ],
        relations: [],
        trend: {
          delta: [{ id: 'sport', label: 'Sport', delta: 8 }],
          badge: 'Shifting to Sport',
          history: [],
        },
        daily: [],
        warnings: [],
      },
    })
    expect(rowValues(wrapper)).toEqual(['40%'])
  })

  it('renders multiple lookback columns when history matches config', () => {
    const wrapper = mountCard({
      overview: {
        index: 0.81,
        categories: [
          { id: 'work', label: 'Work', hours: 15, share: 55, prevShare: 52, delta: 3 },
        ],
        relations: [{ label: 'Work:Hobby', value: '2:1' }],
        trend: {
          delta: [{ id: 'work', label: 'Work', delta: 3 }],
          badge: 'Shifting to Work',
          history: [
            {
              offset: 3,
              label: '-3 wk',
              categories: [{ id: 'work', label: 'Work', share: 30 }],
            },
            {
              offset: 2,
              label: '-2 wk',
              categories: [{ id: 'work', label: 'Work', share: 40 }],
            },
            {
              offset: 1,
              label: 'Prev week',
              categories: [{ id: 'work', label: 'Work', share: 52 }],
            },
          ],
        },
        daily: [],
        warnings: [],
      },
      lookbackWeeks: 3,
    })
    expect(rowValues(wrapper)).toEqual(['30%', '40%', '52%', '55%'])
    const subtitle = wrapper.find('.mix-subtitle').text()
    expect(subtitle).toContain('last 3 weeks')
  })

  it('renders only provided history slots when entries are missing', () => {
    const wrapper = mountCard({
      lookbackWeeks: 3,
      overview: {
        index: 0.75,
        categories: [
          { id: 'work', label: 'Work', hours: 14, share: 55, prevShare: 52, delta: 3 },
        ],
        relations: [],
        trend: {
          delta: [{ id: 'work', label: 'Work', delta: 3 }],
          badge: 'Shifting to Work',
          history: [
            {
              offset: 1,
              label: 'Prev range',
              categories: [{ id: 'work', label: 'Work', share: 52 }],
            },
          ],
        },
        daily: [],
        warnings: [],
      },
    })
    expect(rowValues(wrapper)).toEqual(['52%', '55%'])
  })

  it('caps lookback to 4 columns even when configured higher', () => {
    const wrapper = mountCard({
      lookbackWeeks: 6,
      overview: {
        index: 0.7,
        categories: [
          { id: 'work', label: 'Work', hours: 10, share: 50, prevShare: 45, delta: 5 },
        ],
        relations: [],
        trend: {
          delta: [{ id: 'work', label: 'Work', delta: 5 }],
          badge: 'Balanced',
          history: [
            { offset: 1, label: '-1 wk', categories: [{ id: 'work', label: 'Work', share: 45 }] },
            { offset: 2, label: '-2 wk', categories: [{ id: 'work', label: 'Work', share: 40 }] },
            { offset: 3, label: '-3 wk', categories: [{ id: 'work', label: 'Work', share: 35 }] },
            { offset: 4, label: '-4 wk', categories: [{ id: 'work', label: 'Work', share: 30 }] },
            { offset: 5, label: '-5 wk', categories: [{ id: 'work', label: 'Work', share: 25 }] },
          ],
        },
        daily: [],
        warnings: [],
      },
    })
    // Expect 4 lookback slots (offsets 1→4) plus current
    expect(rowValues(wrapper)).toEqual(['30%', '35%', '40%', '45%', '50%'])
  })

  it('hides the header when showHeader is false', () => {
    const wrapper = mountCard({ showHeader: false })
    expect(wrapper.find('.balance-card__header').exists()).toBe(false)
  })

  it('uses month labels when range mode is month', () => {
    const wrapper = mountCard({
      rangeMode: 'month',
      lookbackWeeks: 2,
      overview: {
        index: 0.8,
        categories: [
          { id: 'work', label: 'Work', hours: 30, share: 60, prevShare: 50, delta: 10 },
        ],
        relations: [],
        trend: {
          delta: [{ id: 'work', label: 'Work', delta: 10 }],
          badge: 'Shifting to Work',
          history: [
            {
              offset: 2,
              label: '2 months ago',
              categories: [{ id: 'work', label: 'Work', share: 45 }],
            },
            {
              offset: 1,
              label: '',
              categories: [{ id: 'work', label: 'Work', share: 50 }],
            },
          ],
        },
        daily: [],
        warnings: [],
      },
    })
    expect(wrapper.find('.mix-subtitle').text()).toContain('last 2 months')
    expect(rowValues(wrapper)).toEqual(['45%', '50%', '60%'])
  })

  it('renders non-consecutive history offsets up to lookback', () => {
    const wrapper = mountCard({
      lookbackWeeks: 4,
      overview: {
        index: 0.7,
        categories: [
          { id: 'work', label: 'Work', hours: 20, share: 60, prevShare: 40, delta: 20 },
        ],
        relations: [],
        trend: {
          delta: [{ id: 'work', label: 'Work', delta: 20 }],
          badge: 'Shifting to Work',
          history: [
            { offset: 4, label: '-4 wk', categories: [{ id: 'work', label: 'Work', share: 20 }] },
            { offset: 2, label: '-2 wk', categories: [{ id: 'work', label: 'Work', share: 40 }] },
          ],
        },
        daily: [],
        warnings: [],
      },
    })
    // Expect offsets 4 and 2 plus current (lookback 4, missing 1/3 offsets are skipped gracefully)
    expect(rowValues(wrapper)).toEqual(['20%', '40%', '60%'])
  })

  it('renders activity summary when provided', () => {
    const wrapper = mountCard({
      activitySummary: {
        rangeLabel: 'Week 12',
        events: 5,
        activeDays: 3,
        typicalStart: '2025-03-10T09:00:00Z',
        typicalEnd: '2025-03-10T17:00:00Z',
        weekendShare: 20,
        eveningShare: 10,
        earliestStart: '2025-03-10T09:00:00Z',
        latestEnd: '2025-03-10T18:00:00Z',
        overlapEvents: 1,
        longestSession: 2.5,
        lastDayOff: '2025-03-08',
        lastHalfDayOff: null,
      },
      activityDayOffTrend: [
        { offset: 0, label: 'This week', from: '', to: '', totalDays: 7, daysOff: 1, daysWorked: 6 },
        { offset: 1, label: '-1 wk', from: '', to: '', totalDays: 7, daysOff: 2, daysWorked: 5 },
      ],
    })
    const text = wrapper.text()
    expect(text).toContain('Activity & Schedule')
    expect(text).toContain('Events 5')
    expect(text).toContain('Weekend 20.0%')
    const tiles = wrapper.findAll('.dayoff-tile')
    expect(tiles).toHaveLength(1)
    expect(tiles[0].text()).toContain('29% off')
  })

  it('sorts day-off tiles descending and normalizes labels', () => {
    const wrapper = mountCard({
      activitySummary: {
        rangeLabel: 'Week X',
        events: 0,
        activeDays: 0,
        typicalStart: null,
        typicalEnd: null,
        weekendShare: 0,
        eveningShare: 0,
        earliestStart: null,
        latestEnd: null,
        overlapEvents: 0,
        longestSession: 0,
        lastDayOff: null,
        lastHalfDayOff: null,
      },
      activityDayOffTrend: [
        { offset: 2, label: 'old', from: '', to: '', totalDays: 7, daysOff: 1, daysWorked: 6 },
        { offset: 4, label: '', from: '', to: '', totalDays: 7, daysOff: 7, daysWorked: 0 },
        { offset: 3, label: '', from: '', to: '', totalDays: 7, daysOff: 2, daysWorked: 5 },
      ],
      activityDayOffLookback: 4,
    })
    const labels = wrapper.findAll('.dayoff-tile__label').map((n) => n.text().trim())
    expect(labels).toEqual(['-4 wk', '-3 wk', '-2 wk'])
  })

  it('renders four lookback columns with provided shares (no zero fallback)', () => {
    const wrapper = mountCard({
      lookbackWeeks: 4,
      overview: {
        index: 0.8,
        categories: [
          { id: 'work', label: 'Work', hours: 12, share: 55, prevShare: 52, delta: 3 },
        ],
        relations: [],
        trend: {
          delta: [{ id: 'work', label: 'Work', delta: 3 }],
          badge: 'Shifting',
          history: [
            { offset: 1, label: '-1 wk', categories: [{ id: 'work', label: 'Work', share: 50 }] },
            { offset: 2, label: '-2 wk', categories: [{ id: 'work', label: 'Work', share: 45 }] },
            { offset: 3, label: '-3 wk', categories: [{ id: 'work', label: 'Work', share: 40 }] },
            { offset: 4, label: '-4 wk', categories: [{ id: 'work', label: 'Work', share: 35 }] },
          ],
        },
        daily: [],
        warnings: [],
      },
    })
    expect(rowValues(wrapper)).toEqual(['35%', '40%', '45%', '50%', '55%'])
  })

  it('sorts history columns by offset regardless of backend order', () => {
    const wrapper = mountCard({
      lookbackWeeks: 3,
      overview: {
        index: 0.8,
        categories: [
          { id: 'work', label: 'Work', hours: 12, share: 48, prevShare: 44, delta: 4 },
        ],
        relations: [],
        trend: {
          delta: [{ id: 'work', label: 'Work', delta: 4 }],
          badge: 'Balanced',
          history: [
            {
              offset: 1,
              label: 'Prev wk',
              categories: [{ id: 'work', label: 'Work', share: 44 }],
            },
            {
              offset: 3,
              label: '-3 wk',
              categories: [{ id: 'work', label: 'Work', share: 30 }],
            },
            {
              offset: 2,
              label: '-2 wk',
              categories: [{ id: 'work', label: 'Work', share: 40 }],
            },
          ],
        },
        daily: [],
        warnings: [],
      },
    })
    expect(rowValues(wrapper)).toEqual(['30%', '40%', '44%', '48%'])
  })

  it('applies trend classes for heatmap cells', () => {
    const wrapper = mountCard()
    const cells = wrapper.findAll('.mix-row')[0].findAll('.mix-cell')
    expect(cells[cells.length - 1].classes()).toContain('mix-cell--trend-up')
    expect(cells[0].classes()).toContain('mix-cell--trend-flat')
  })
})
