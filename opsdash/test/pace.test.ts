import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { computePaceInfo, type PaceInfo } from '../src/services/targets'

function buildDailyHours(entries: Array<[string, number]>): Map<string, number> {
  return new Map(entries)
}

describe('computePaceInfo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns zeroed pace when range missing', () => {
    const result = computePaceInfo({
      includeWeekend: false,
      mode: 'days_only',
      includeZeroDays: false,
      start: null,
      end: null,
      dailyHours: new Map(),
    })

    expect(result).toEqual<PaceInfo>({
      totalEligible: 0,
      elapsedEligible: 0,
      daysLeft: 0,
      calendarPercent: 0,
    })
  })

  it('counts only weekdays when weekend excluded', () => {
    vi.setSystemTime(new Date('2025-03-05T12:00:00Z')) // Wednesday
    const result = computePaceInfo({
      includeWeekend: false,
      mode: 'days_only',
      includeZeroDays: false,
      start: new Date(Date.UTC(2025, 2, 3)), // Monday
      end: new Date(Date.UTC(2025, 2, 9)),   // Sunday (week range)
      dailyHours: buildDailyHours([
        ['2025-03-03', 4], // Monday
        ['2025-03-04', 0], // Tuesday (ignored because zero + includeZeroDays=false)
        ['2025-03-05', 2], // Wednesday (today)
      ]),
    })

    expect(result.totalEligible).toBe(5) // Mon-Fri
    expect(result.elapsedEligible).toBeCloseTo(2)
    expect(result.daysLeft).toBeCloseTo(3)
    expect(result.calendarPercent).toBeCloseTo(40)
  })

  it('honours time-aware pacing with weekend included', () => {
    vi.setSystemTime(new Date('2025-03-02T12:00:00Z')) // Sunday noon
    const result = computePaceInfo({
      includeWeekend: true,
      mode: 'time_aware',
      includeZeroDays: false,
      start: new Date(Date.UTC(2025, 1, 28)), // Friday
      end: new Date(Date.UTC(2025, 2, 3)),    // Monday
      dailyHours: buildDailyHours([
        ['2025-02-28', 3], // Friday
        ['2025-03-01', 0], // Saturday (ignored — zero hours, not today)
        ['2025-03-02', 0], // Sunday (today, gets fractional credit)
      ]),
    })

    expect(result.totalEligible).toBe(4)
    // Friday contributes 1, Sunday contributes 0.5 (noon)
    expect(result.elapsedEligible).toBeCloseTo(1.5)
    expect(result.calendarPercent).toBeCloseTo(37.5)
    expect(result.daysLeft).toBeCloseTo(2.5)
  })
})
