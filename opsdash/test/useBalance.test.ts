import { describe, it, expect } from 'vitest'
import { computed, nextTick } from 'vue'

import { useBalance } from '../composables/useBalance'

describe('useBalance', () => {
  it('falls back to legacy trendHistory array when trend.history is missing', async () => {
    const stats: any = {
      balance_overview: {
        index: 0.5,
        categories: [],
        relations: [],
        trendHistory: [
          { offset: 2, label: '-2 wk', categories: [{ id: 'work', label: 'Work', share: 40 }] },
        ],
        warnings: [],
      },
    }

    const { balanceOverview } = useBalance({
      stats,
      categoryColorMap: computed(() => ({})),
      balanceCardConfig: computed(() => ({ showNotes: true })),
    })

    await nextTick()
    expect(balanceOverview.value?.trend.history).toHaveLength(1)
    expect(balanceOverview.value?.trend.history[0].offset).toBe(2)
  })

  it('returns null when stats payload is missing', () => {
    const stats: any = {}
    const { balanceOverview } = useBalance({
      stats,
      categoryColorMap: computed(() => ({})),
      balanceCardConfig: computed(() => ({ showNotes: true })),
    })

    expect(balanceOverview.value).toBeNull()
  })

  it('normalizes categories, trend history, daily, and colors', async () => {
    const stats: any = {
      balance_overview: {
        index: 0.75,
        categories: [
          { id: 'work', label: 'Work', hours: 10, share: 55, prev_share: 45, delta: 10 },
          { id: 'hobby', label: 'Hobby', hours: 4, share: 22, prev_share: 30, delta: -8 },
        ],
        relations: [{ label: 'Work:Hobby', value: '2:1' }],
        trend: {
          delta: [{ id: 'work', label: 'Work', delta: 10 }],
          badge: 'Shifting',
          history: [
            { offset: 1, label: '-1 wk', categories: [{ id: 'work', label: 'Work', share: 45 }] },
          ],
        },
        daily: [
          {
            date: '2025-03-03',
            weekday: 'Mon',
            total_hours: 3,
            categories: [{ id: 'work', label: 'Work', hours: 3, share: 100 }],
          },
        ],
        warnings: ['Over target'],
      },
    }

    const { balanceOverview } = useBalance({
      stats,
      categoryColorMap: computed(() => ({ work: '#2563EB' })),
      balanceCardConfig: computed(() => ({ showNotes: true })),
    })

    await nextTick()

    expect(balanceOverview.value).not.toBeNull()
    expect(balanceOverview.value?.index).toBe(0.75)
    expect(balanceOverview.value?.categories[0].color).toBe('#2563EB')
    expect(balanceOverview.value?.trend.history).toHaveLength(1)
    expect(balanceOverview.value?.daily[0].total_hours).toBe(3)
    expect(balanceOverview.value?.warnings).toEqual(['Over target'])
  })
})
