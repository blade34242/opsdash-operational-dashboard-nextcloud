import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { buildTargetsSummary, createDefaultTargetsConfig } from '../src/services/targets'

describe('buildTargetsSummary', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-03-05T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('aggregates total and category progress with pace data', () => {
    const config = createDefaultTargetsConfig()
    config.totalHours = 40
    config.categories = [
      { id: 'work', label: 'Work', targetHours: 24, includeWeekend: false, paceMode: 'days_only', groupIds: [1] },
      { id: 'lab', label: 'Lab', targetHours: 8, includeWeekend: true, paceMode: 'days_only', groupIds: [2] },
    ]

    const byCal = [
      { id: 'cal-work', total_hours: 18, group_id: 1 },
      { id: 'cal-lab', total_hours: 7, group_id: 2 },
    ]

    const summary = buildTargetsSummary({
      config,
      stats: {},
      byDay: [
        { date: '2025-03-03', total_hours: 8 },
        { date: '2025-03-04', total_hours: 7 },
        { date: '2025-03-05', total_hours: 6 },
      ],
      byCal,
      groupsById: { 'cal-work': 1, 'cal-lab': 2 },
      range: 'week',
      from: '2025-03-03',
      to: '2025-03-09',
    })

    expect(summary.total.actualHours).toBe(25)
    expect(summary.total.targetHours).toBe(40)
    expect(summary.total.percent).toBeGreaterThan(0)

    const work = summary.categories.find((cat) => cat.id === 'work')
    expect(work?.actualHours).toBe(18)
    expect(work?.targetHours).toBe(24)

    const lab = summary.categories.find((cat) => cat.id === 'lab')
    expect(lab?.actualHours).toBe(7)
    expect(lab?.targetHours).toBe(8)
  })
})

