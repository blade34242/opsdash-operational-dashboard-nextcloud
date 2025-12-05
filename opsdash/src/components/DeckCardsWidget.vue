<template>
  <DeckCardsPanel
    :cards="filteredCards"
    :loading="loading"
    :range-label="rangeLabel"
    :last-fetched-at="lastFetchedAt"
    :deck-url="deckUrl"
    :error="error"
    :filter="activeFilter"
    :filters-enabled="filtersEnabled"
    :can-filter-mine="allowMine"
    :allow-mine-override="allowMine"
    :filter-options="filterOptionDefs"
    :auto-scroll="props.autoScroll !== false"
    :interval-seconds="props.intervalSeconds"
    :show-count="props.showCount !== false"
    @refresh="$emit('refresh')"
    @update:filter="onFilter"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DeckCardsPanel from './DeckCardsPanel.vue'
import type { DeckCardSummary } from '../services/deck'
import type { DeckFilterMode, DeckMineMode } from '../services/reporting'

const props = defineProps<{
  cards: DeckCardSummary[]
  rangeLabel: string
  from?: string
  to?: string
  uid?: string
  deckUrl?: string
  lastFetchedAt?: string | null
  loading?: boolean
  error?: string | null
  boardIds?: Array<number | string>
  filters?: DeckFilterMode[]
  defaultFilter?: DeckFilterMode
  allowMine?: boolean
  mineMode?: DeckMineMode
  includeArchived?: boolean
  includeCompleted?: boolean
  autoScroll?: boolean
  intervalSeconds?: number
  showCount?: boolean
}>()

defineEmits<{
  refresh: []
}>()

const defaultFilters: DeckFilterMode[] = [
  'all',
  'open_all',
  'open_mine',
  'done_all',
  'done_mine',
  'archived_all',
  'archived_mine',
  'created_today_all',
  'created_today_mine',
]

const filterOptionDefs = computed(() => {
  const opts = (props.filters && props.filters.length ? props.filters : defaultFilters).filter(Boolean) as DeckFilterMode[]
  const labels: Record<DeckFilterMode, string> = {
    all: 'All cards',
    mine: 'Mine (any status)',
    open_all: 'Open · All',
    open_mine: 'Open · Mine',
    done_all: 'Done · All',
    done_mine: 'Done · Mine',
    archived_all: 'Archived · All',
    archived_mine: 'Archived · Mine',
    created_today_all: 'Created today · All',
    created_today_mine: 'Created today · Mine',
    created_range_all: 'Created this range · All',
    created_range_mine: 'Created this range · Mine',
  }
  return opts.map((value) => ({
    value,
    label: labels[value] || value,
    mine: value.endsWith('_mine') || value === 'mine',
  }))
})

const activeFilter = ref<DeckFilterMode>(sanitizeDefaultFilter())

watch(
  () => props.defaultFilter,
  () => {
    activeFilter.value = sanitizeDefaultFilter()
  },
)

const boardsSet = computed<Set<number>>(() => {
  const ids = (props.boardIds || []).map((id) => Number(id)).filter((id) => Number.isInteger(id))
  return new Set(ids)
})

const filtersEnabled = computed(() => filterOptionDefs.value.length > 1)
const allowMine = computed(() => props.allowMine !== false && !!(props.uid || '').trim())

const filteredCards = computed(() => {
  const base = (props.cards || []).filter((card) => {
    if (!boardsSet.value.size) return true
    return card.boardId != null && boardsSet.value.has(Number(card.boardId))
  })
  const cleaned = base.filter(
    (card) =>
      (props.includeArchived !== false || card.status !== 'archived') &&
      (props.includeCompleted !== false || card.status !== 'done'),
  )
  const mode = activeFilter.value
  const mineMatch = buildMineMatcher(props.uid || '', props.mineMode || 'assignee')
  const includeArchivedInDone = props.includeArchived !== false
  const includeCompleted = props.includeCompleted !== false
  if (mode === 'all') return cleaned
  if (mode === 'mine') return cleaned.filter((card) => mineMatch(card))
  if (mode.startsWith('created_today')) {
    return cleaned.filter((card) => {
      const mineOk = mode.endsWith('_mine') ? mineMatch(card) : true
      return mineOk && isCreatedToday(card)
    })
  }
  if (mode.startsWith('created_range')) {
    return cleaned.filter((card) => {
      const mineOk = mode.endsWith('_mine') ? mineMatch(card) : true
      return mineOk && isCreatedInRange(card, props.from, props.to)
    })
  }
  if (mode.includes('_')) {
    const [statusKey, scope] = mode.split('_') as ['open' | 'done' | 'archived', 'all' | 'mine']
    return cleaned.filter((card) => {
      const statusOk = deckStatusMatches(card, statusKey, includeArchivedInDone, includeCompleted)
      const mineOk = scope === 'all' ? true : mineMatch(card)
      return statusOk && mineOk
    })
  }
  return cleaned
})

function sanitizeDefaultFilter(): DeckFilterMode {
  const opts = filterOptionDefs.value.map((opt) => opt.value)
  const candidate = (props.defaultFilter || opts[0] || 'all') as DeckFilterMode
  return opts.includes(candidate) ? candidate : opts[0] || 'all'
}

function onFilter(value: DeckFilterMode) {
  activeFilter.value = value
}

function buildMineMatcher(uid: string, mode: DeckMineMode) {
  const userId = uid.trim().toLowerCase()
  return (card: DeckCardSummary) => {
    if (!userId) return false
    const assigneeMatch = (card.assignees || []).some(
      (assignee: any) => typeof assignee.uid === 'string' && assignee.uid.toLowerCase() === userId,
    )
    const creatorMatch = typeof card.createdBy === 'string' && card.createdBy.trim().toLowerCase() === userId
    const doneMatch = typeof card.doneBy === 'string' && card.doneBy.trim().toLowerCase() === userId
    if (mode === 'creator') return creatorMatch || doneMatch
    if (mode === 'assignee') return assigneeMatch || doneMatch
    return assigneeMatch || creatorMatch || doneMatch
  }
}

function deckStatusMatches(
  card: DeckCardSummary,
  status: 'open' | 'done' | 'archived',
  includeArchivedInDone: boolean,
  includeCompleted: boolean,
) {
  if (status === 'open') return card.status === 'active'
  if (status === 'archived') return card.status === 'archived'
  if (status === 'done') {
    if (!includeCompleted) return false
    if (card.status === 'done') return true
    return includeArchivedInDone && card.status === 'archived' && includeCompleted
  }
  return false
}

function isCreatedToday(card: DeckCardSummary) {
  if (!card.createdTs) return false
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const end = start + 24 * 60 * 60 * 1000
  return card.createdTs >= start && card.createdTs < end
}

function isCreatedInRange(card: DeckCardSummary, from?: string, to?: string) {
  if (!card.createdTs || !from || !to) return false
  const fromTs = Date.parse(from)
  const toTs = Date.parse(to)
  if (!Number.isFinite(fromTs) || !Number.isFinite(toTs)) return false
  return card.createdTs >= fromTs && card.createdTs <= toTs
}
</script>
