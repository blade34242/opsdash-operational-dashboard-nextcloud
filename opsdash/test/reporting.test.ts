import { describe, it, expect } from 'vitest'

import { createDefaultDeckSettings, normalizeDeckSettings } from '../src/services/reporting'

describe('Deck feature settings', () => {
  it('provides sane defaults', () => {
    const defaults = createDefaultDeckSettings()
    expect(defaults.enabled).toBe(true)
    expect(defaults.filtersEnabled).toBe(true)
    expect(defaults.defaultFilter).toBe('all')
    expect(defaults.hiddenBoards).toEqual([])
  })

  it('normalizes hidden boards and default filter', () => {
    const normalized = normalizeDeckSettings({
      enabled: false,
      filtersEnabled: false,
      defaultFilter: 'mine',
      hiddenBoards: [3, '5', 'foo', -4, 0, 3],
    })

    expect(normalized.enabled).toBe(false)
    expect(normalized.filtersEnabled).toBe(false)
    expect(normalized.defaultFilter).toBe('mine')
    expect(normalized.hiddenBoards).toEqual([3, 5])
  })
})
