import { describe, it, expect } from 'vitest'
import { reactive } from 'vue'

interface DeckSettings {
  enabled: boolean
  filtersEnabled: boolean
  defaultFilter: string
  hiddenBoards: number[]
  mineMode: 'assignee' | 'creator' | 'both'
  solvedIncludesArchived: boolean
  ticker: {
    autoScroll: boolean
    intervalSeconds: number
    showBoardBadges: boolean
  }
}

function sanitizeDeckClient(value: Partial<DeckSettings>): DeckSettings {
  const defaults: DeckSettings = {
    enabled: true,
    filtersEnabled: true,
    defaultFilter: 'all',
    hiddenBoards: [],
    mineMode: 'assignee',
    solvedIncludesArchived: true,
    ticker: { autoScroll: true, intervalSeconds: 5, showBoardBadges: true },
  }
  const allowedFilters = ['all','mine','open_all','open_mine','done_all','done_mine','archived_all','archived_mine']
  const normalizeBool = (v: any, d: boolean) => v === true || v === false ? v : d
  const clampId = (id: any) => {
    const n = Number(id)
    return Number.isInteger(n) && n > 0 && n <= 100000 ? n : null
  }
  const hidden = Array.isArray(value.hiddenBoards) ? Array.from(new Set(value.hiddenBoards.map(clampId).filter((n): n is number => n !== null))) : []
  const interval = value.ticker?.intervalSeconds ?? defaults.ticker.intervalSeconds
  return {
    enabled: normalizeBool(value.enabled, defaults.enabled),
    filtersEnabled: normalizeBool(value.filtersEnabled, defaults.filtersEnabled),
    defaultFilter: allowedFilters.includes(value.defaultFilter ?? '') ? value.defaultFilter! : 'all',
    hiddenBoards: hidden,
    mineMode: ['assignee','creator','both'].includes(value.mineMode as any) ? value.mineMode as any : 'assignee',
    solvedIncludesArchived: normalizeBool(value.solvedIncludesArchived, defaults.solvedIncludesArchived),
    ticker: {
      autoScroll: normalizeBool(value.ticker?.autoScroll, defaults.ticker.autoScroll),
      intervalSeconds: Math.min(10, Math.max(3, interval)),
      showBoardBadges: normalizeBool(value.ticker?.showBoardBadges, defaults.ticker.showBoardBadges),
    },
  }
}

describe('deck settings client sanitization', () => {
  it('clamps ids/booleans and defaults invalid enums', () => {
    const result = sanitizeDeckClient({
      enabled: false,
      filtersEnabled: 'false' as any,
      defaultFilter: 'evil' as any,
      hiddenBoards: [1, -2, 'abc', 50000, 2000000] as any,
      mineMode: 'owner' as any,
      solvedIncludesArchived: 0 as any,
      ticker: { autoScroll: 'false' as any, intervalSeconds: 0 as any, showBoardBadges: '0' as any },
    })

    expect(result.enabled).toBe(false)
    expect(result.filtersEnabled).toBe(true)
    expect(result.defaultFilter).toBe('all')
    expect(result.hiddenBoards).toEqual([1, 50000])
    expect(result.mineMode).toBe('assignee')
    expect(result.solvedIncludesArchived).toBe(true)
    expect(result.ticker.intervalSeconds).toBe(3)
    expect(result.ticker.autoScroll).toBe(true)
    expect(result.ticker.showBoardBadges).toBe(true)
  })
})
