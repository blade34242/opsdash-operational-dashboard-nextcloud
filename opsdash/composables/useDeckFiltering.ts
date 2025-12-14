import { computed, ref, watch, type Ref } from 'vue'

import type { DeckFeatureSettings, DeckFilterMode } from '../src/services/reporting'

type DeckCard = {
  id?: number | string
  title?: string
  status?: 'active' | 'done' | 'archived' | string
  boardId?: number
  boardTitle?: string
  boardColor?: string
  assignees?: Array<{ uid?: string }>
  createdBy?: string
  doneBy?: string
}

export function sanitizeDeckFilter(value: DeckFilterMode | string | undefined): DeckFilterMode {
  const allowed: DeckFilterMode[] = [
    'all',
    'mine',
    'open_all',
    'open_mine',
    'done_all',
    'done_mine',
    'archived_all',
    'archived_mine',
  ]
  return allowed.includes(value as DeckFilterMode) ? (value as DeckFilterMode) : 'all'
}

function deckStatusMatches(card: DeckCard, status: 'open' | 'done' | 'archived', includeArchivedInDone: boolean) {
  const cardStatus = card.status
  if (status === 'open') return cardStatus === 'active'
  if (status === 'archived') return cardStatus === 'archived'
  if (status === 'done') {
    if (cardStatus === 'done') return true
    return includeArchivedInDone && cardStatus === 'archived'
  }
  return false
}

export function useDeckFiltering(options: {
  deckSettings: Ref<DeckFeatureSettings>
  deckCards: Ref<DeckCard[]>
  uid: Ref<string>
  root: Ref<string>
}) {
  const { deckSettings, deckCards, uid, root } = options

  const deckFilter = ref<DeckFilterMode>(sanitizeDeckFilter(deckSettings.value.defaultFilter))

  watch(
    () => deckSettings.value.defaultFilter,
    (next) => {
      const sanitized = sanitizeDeckFilter(next)
      if (sanitized !== deckFilter.value) {
        deckFilter.value = sanitized
      }
    },
  )

  const deckVisibleCards = computed(() => {
    const hidden = new Set(
      (deckSettings.value.hiddenBoards || []).map((id) => Number(id)).filter((id) => Number.isFinite(id)),
    )
    return (deckCards.value || []).filter((card) => !hidden.has(Number(card.boardId)))
  })

  const deckMineMatcher = computed(() => {
    const mineMode = deckSettings.value.mineMode ?? 'assignee'
    const userId = (uid.value || '').trim().toLowerCase()
    return (card: DeckCard) => {
      if (!userId) return false
      const assigneeMatch = (card.assignees || []).some(
        (assignee) => typeof assignee.uid === 'string' && assignee.uid.toLowerCase() === userId,
      )
      const creatorId = typeof card.createdBy === 'string' ? card.createdBy.trim().toLowerCase() : ''
      const creatorMatch = creatorId && creatorId === userId
      const doneById = typeof card.doneBy === 'string' ? card.doneBy.trim().toLowerCase() : ''
      const doneMatch = doneById && doneById === userId
      if (mineMode === 'creator') return creatorMatch || doneMatch
      if (mineMode === 'assignee') return assigneeMatch || doneMatch
      return assigneeMatch || creatorMatch || doneMatch
    }
  })

  const deckFilteredCards = computed(() => {
    const mineMatch = deckMineMatcher.value
    const includeArchivedInDone = deckSettings.value.solvedIncludesArchived !== false
    const filter = deckFilter.value
    const cards = deckVisibleCards.value
    if (filter === 'all') return cards
    if (filter === 'mine') {
      return cards.filter((card) => mineMatch(card))
    }
    const [statusKey, scope] = filter.split('_') as ['open' | 'done' | 'archived', 'all' | 'mine']
    return cards.filter((card) => {
      const statusOk = deckStatusMatches(card, statusKey, includeArchivedInDone)
      const mineOk = scope === 'all' ? true : mineMatch(card)
      return statusOk && mineOk
    })
  })

  const deckSummaryBuckets = computed(() => {
    const mineMatch = deckMineMatcher.value
    const includeArchivedInDone = deckSettings.value.solvedIncludesArchived !== false
    const cards = deckVisibleCards.value
    const rows: Array<{
      key: DeckFilterMode
      label: string
      titles: string[]
      count: number
      board?: { title: string; color?: string }
    }> = []
    const defs: Array<{ key: DeckFilterMode; label: string; status: 'open' | 'done' | 'archived'; mine: boolean }> = [
      { key: 'open_all', label: 'Open · All', status: 'open', mine: false },
      { key: 'open_mine', label: 'Open · Mine', status: 'open', mine: true },
      { key: 'done_all', label: 'Done · All', status: 'done', mine: false },
      { key: 'done_mine', label: 'Done · Mine', status: 'done', mine: true },
      { key: 'archived_all', label: 'Archived · All', status: 'archived', mine: false },
      { key: 'archived_mine', label: 'Archived · Mine', status: 'archived', mine: true },
    ]

    defs.forEach((def) => {
      const filtered = cards.filter((card) => {
        const statusOk = deckStatusMatches(card, def.status, includeArchivedInDone)
        const mineOk = def.mine ? mineMatch(card) : true
        return statusOk && mineOk
      })
      const boardCounts = new Map<number, { count: number; title: string; color?: string }>()
      filtered.forEach((card) => {
        if (card.boardId == null) return
        const boardId = Number(card.boardId)
        const entry = boardCounts.get(boardId) || { count: 0, title: card.boardTitle || '', color: card.boardColor }
        entry.count += 1
        entry.title = card.boardTitle || entry.title
        entry.color = card.boardColor ?? entry.color
        boardCounts.set(boardId, entry)
      })
      let board: { title: string; color?: string } | undefined
      if (boardCounts.size) {
        const sorted = Array.from(boardCounts.entries()).sort((a, b) => b[1].count - a[1].count)
        board = { title: sorted[0][1].title, color: sorted[0][1].color }
      }
      rows.push({
        key: def.key,
        label: def.label,
        titles: filtered.map((card) => card.title || `Card ${card.id}`),
        count: filtered.length,
        board,
      })
    })

    return rows
  })

  const deckTickerConfig = computed(() => {
    const ticker = deckSettings.value.ticker || { autoScroll: true, intervalSeconds: 5, showBoardBadges: true }
    const interval = Math.min(10, Math.max(3, Number(ticker.intervalSeconds ?? 5) || 5))
    return {
      autoScroll: ticker.autoScroll !== false,
      intervalSeconds: interval,
    }
  })

  const deckCanFilterMine = computed(
    () => deckSettings.value.filtersEnabled && deckSettings.value.enabled && Boolean((uid.value || '').trim()),
  )

  const deckUrl = computed(() => {
    const base = root.value || ''
    return `${base}/apps/deck/`
  })

  return {
    deckFilter,
    deckVisibleCards,
    deckMineMatcher,
    deckFilteredCards,
    deckSummaryBuckets,
    deckTickerConfig,
    deckCanFilterMine,
    deckUrl,
  }
}

