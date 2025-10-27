import { ref } from 'vue'
import { describe, it, expect, vi } from 'vitest'

import { useDashboard } from '../composables/useDashboard'
import { createDefaultTargetsConfig } from '../src/services/targets'

function createDashboard(overrides: Partial<Parameters<typeof useDashboard>[0]> = {}) {
  const range = ref<'week' | 'month'>('week')
  const offset = ref(0)
  const userChangedSelection = ref(false)

  const route = vi.fn<(name: 'load') => string>().mockImplementation(() => '/load')
  const getJson = vi.fn()
  const notifyError = vi.fn()
  const scheduleDraw = vi.fn()
  const fetchNotes = vi.fn().mockResolvedValue(undefined)

  const dashboard = useDashboard({
    range,
    offset,
    userChangedSelection,
    route,
    getJson,
    notifyError,
    scheduleDraw,
    fetchNotes,
    isDebug: () => false,
    ...overrides,
  })

  return {
    range,
    offset,
    userChangedSelection,
    route,
    getJson,
    notifyError,
    scheduleDraw,
    fetchNotes,
    ...dashboard,
  }
}

describe('useDashboard load', () => {
  it('populates reactive state from the load response', async () => {
    const config = createDefaultTargetsConfig()
    config.totalHours = 123

    const response = {
      meta: {
        uid: 'user-123',
        from: '2024-01-01',
        to: '2024-01-07',
        truncated: true,
        limits: {
          maxPerCal: 10,
          maxTotal: 100,
          totalProcessed: 42,
        },
      },
      calendars: [
        { id: 'cal-1', displayname: 'Calendar 1', color: '#ff0000' },
        { id: 'cal-2', displayname: 'Calendar 2', color: '#00ff00' },
      ],
      colors: {
        byName: { 'Calendar 1': '#ff0000' },
        byId: { 'cal-1': '#ff0000', 'cal-2': '#00ff00' },
      },
      groups: {
        byId: {
          'cal-1': 2,
          'cal-2': 7,
        },
      },
      targets: {
        week: { 'cal-1': 12 },
        month: { 'cal-1': 48 },
      },
      targetsConfig: config,
      selected: ['cal-1'],
      stats: { totalHours: 12 },
      byCal: [{ id: 'cal-1', total_hours: 12 }],
      byDay: [{ date: '2024-01-02', total_hours: 6 }],
      longest: [],
      charts: { pie: { ids: ['cal-1'], colors: ['#ff0000'] } },
    }

    const getJson = vi.fn().mockResolvedValue(response)
    const fetchNotes = vi.fn().mockResolvedValue(undefined)
    const notifyError = vi.fn()
    const scheduleDraw = vi.fn()

    const dashboard = createDashboard({
      getJson,
      fetchNotes,
      notifyError,
      scheduleDraw,
    })

    expect(dashboard.isLoading.value).toBe(false)
    await dashboard.load()

    expect(dashboard.route).toHaveBeenCalledWith('load')
    expect(getJson).toHaveBeenCalledWith('/load', {
      range: 'week',
      offset: 0,
      save: false,
    })

    expect(dashboard.isLoading.value).toBe(false)
    expect(dashboard.uid.value).toBe('user-123')
    expect(dashboard.from.value).toBe('2024-01-01')
    expect(dashboard.to.value).toBe('2024-01-07')
    expect(dashboard.isTruncated.value).toBe(true)
    expect(dashboard.truncLimits.value).toEqual(response.meta.limits)

    expect(dashboard.calendars.value).toHaveLength(2)
    expect(dashboard.groupsById.value).toEqual({ 'cal-1': 2, 'cal-2': 7 })
    expect(dashboard.selected.value).toEqual(['cal-1'])

    expect(dashboard.targetsWeek.value).toEqual({ 'cal-1': 12 })
    expect(dashboard.targetsMonth.value).toEqual({ 'cal-1': 48 })
    expect(dashboard.targetsConfig.value.totalHours).toBe(123)

    expect(dashboard.stats.totalHours).toBe(12)
    expect(dashboard.byCal.value).toEqual(response.byCal)
    expect(dashboard.byDay.value).toEqual(response.byDay)
    expect(dashboard.charts.value).toEqual(response.charts)

    expect(scheduleDraw).toHaveBeenCalledTimes(1)
    expect(fetchNotes).toHaveBeenCalledTimes(1)
    expect(notifyError).not.toHaveBeenCalled()
    expect(dashboard.userChangedSelection.value).toBe(false)
  })
})
