import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useDeckFiltering, sanitizeDeckFilter } from '../composables/useDeckFiltering'

describe('useDeckFiltering', () => {
  const baseSettings = {
    enabled: true,
    filtersEnabled: true,
    defaultFilter: 'open_all',
    solvedIncludesArchived: false,
    hiddenBoards: [],
    mineMode: 'assignee',
    ticker: { autoScroll: true, intervalSeconds: 5 },
  }

  it('sanitizes unsupported filters to all', () => {
    expect(sanitizeDeckFilter('unknown')).toBe('all')
    expect(sanitizeDeckFilter('due_all')).toBe('due_all')
    expect(sanitizeDeckFilter('due_today_all')).toBe('due_today_all')
  })

  it('computes filter counts for status and due filters', () => {
    const deckSettings = ref({ ...baseSettings })
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const deckCards = ref([
      { id: 1, status: 'active', dueTs: start + 3600 * 1000, match: 'due', boardId: 1 },
      { id: 2, status: 'done', boardId: 1 },
      { id: 3, status: 'archived', boardId: 2 },
      { id: 4, status: 'active', dueTs: start - 3600 * 1000, match: 'due', boardId: 2 },
    ])
    const uid = ref('admin')
    const root = ref('')

    const { deckFilterOptions, deckFilteredCards, deckFilter } = useDeckFiltering({
      deckSettings,
      deckCards,
      uid,
      root,
    })

    const counts = Object.fromEntries(
      deckFilterOptions.value.map((opt) => [opt.value, opt.count]),
    )
    expect(counts.open_all).toBe(2)
    expect(counts.done_all).toBe(1)
    expect(counts.archived_all).toBe(1)
    expect(counts.due_all).toBe(2)
    expect(counts.due_today_all).toBe(1)

    deckFilter.value = 'due_all'
    expect(deckFilteredCards.value.map((card) => card.id)).toEqual([1, 4])

    deckFilter.value = 'due_today_all'
    expect(deckFilteredCards.value.map((card) => card.id)).toEqual([1])
  })
})
