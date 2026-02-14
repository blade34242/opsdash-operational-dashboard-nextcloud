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
    :compact="props.compactList === true"
    :title="props.title"
    :card-bg="props.cardBg"
    :show-header="props.showHeader !== false"
    :editable="props.editable === true"
    :orderable-values="filterOrder"
    @refresh="$emit('refresh')"
    @update:filter="onFilter"
    @reorder:filters="onReorderFilters"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DeckCardsPanel from '../../panels/DeckCardsPanel.vue'
import type { DeckCardSummary } from '../../../services/deck'
import { buildDeckTagOptions, cardHasTag } from '../../../services/deckTags'
import type { DeckFilterMode, DeckMineMode } from '../../../services/reporting'
import { formatDateKey, parseDateTime } from '../../../services/dateTime'

const props = withDefaults(defineProps<{
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
  showHeader?: boolean
  title?: string
  cardBg?: string | null
  customFilters?: Array<{
    id: string
    label: string
    labelIds?: string[]
    labels?: string[]
    assignees?: string[]
  }>
  autoTagsEnabled?: boolean
  autoTagSelection?: string[]
  compactList?: boolean
  editable?: boolean
  onUpdateFilters?: (filters: DeckFilterMode[]) => void
}>(), {
  autoTagsEnabled: true,
})

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
  'due_all',
  'due_mine',
  'due_today_all',
  'due_today_mine',
  'created_today_all',
  'created_today_mine',
]

const boardsSet = computed<Set<number>>(() => {
  const ids = (props.boardIds || []).map((id) => Number(id)).filter((id) => Number.isInteger(id))
  return new Set(ids)
})

const baseCards = computed(() => {
  const base = (props.cards || []).filter((card) => {
    if (!boardsSet.value.size) return true
    return card.boardId != null && boardsSet.value.has(Number(card.boardId))
  })
  return base
})

const cleanedCards = computed(() => {
  const allowArchived = props.includeArchived !== false
  return baseCards.value.filter(
    (card) =>
      (allowArchived || card.status !== 'archived') &&
      (props.includeCompleted !== false || card.status !== 'done'),
  )
})

const tagOptions = computed(() => {
  if (props.autoTagsEnabled === false) return []
  return buildDeckTagOptions(cleanedCards.value)
})

const tagSelection = computed(() => {
  if (!Array.isArray(props.autoTagSelection)) return null
  return new Set(props.autoTagSelection.map((value) => String(value)))
})

const tagFilterOptions = computed(() => {
  if (props.autoTagsEnabled === false) return []
  const options = tagOptions.value
  if (!options.length) return []
  const selection = tagSelection.value
  if (!selection) return options
  return options.filter((opt) => selection.has(opt.value))
})

const customFilterValues = computed(() =>
  (props.customFilters || []).map((f) => `custom_${f.id}` as DeckFilterMode),
)

const filterModes = computed(() => {
  const base = (props.filters && props.filters.length ? props.filters : defaultFilters) as DeckFilterMode[]
  const tags = tagFilterOptions.value.map((opt) => opt.value as DeckFilterMode)
  return [...base, ...customFilterValues.value, ...tags]
})

const filterCounts = computed(() => {
  const allowArchived = props.includeArchived !== false
  const cleaned = cleanedCards.value
  const counts = new Map<DeckFilterMode, number>()
  filterModes.value.forEach((mode) => {
    counts.set(mode, filterCardsForMode(mode, cleaned, allowArchived).length)
  })
  return counts
})

const localFilters = ref<DeckFilterMode[] | null>(null)

const filterOrder = computed(() => {
  if (localFilters.value) return localFilters.value
  return (props.filters && props.filters.length ? props.filters : defaultFilters).filter(Boolean) as DeckFilterMode[]
})

const filterOptionDefs = computed(() => {
  const opts = filterOrder.value
  const labels: Record<DeckFilterMode, string> = {
    all: 'All cards',
    mine: 'Mine (any status)',
    open_all: 'Open · All',
    open_mine: 'Open · Mine',
    done_all: 'Done · All',
    done_mine: 'Done · Mine',
    archived_all: 'Archived · All',
    archived_mine: 'Archived · Mine',
    due_all: 'Due · All',
    due_mine: 'Due · Mine',
    due_today_all: 'Due today · All',
    due_today_mine: 'Due today · Mine',
    created_today_all: 'Created today · All',
    created_today_mine: 'Created today · Mine',
    created_range_all: 'Created this range · All',
    created_range_mine: 'Created this range · Mine',
  }
  const counts = filterCounts.value
  const built = opts.map((value) => ({
    value,
    label: labels[value] || value,
    mine: value.endsWith('_mine') || value === 'mine',
    count: counts.get(value) ?? 0,
  }))
  const custom = (props.customFilters || [])
    .filter((f) => f && f.id && f.label)
    .map((f) => ({
      value: (`custom_${f.id}` as DeckFilterMode),
      label: f.label,
      mine: false,
      count: counts.get(`custom_${f.id}` as DeckFilterMode) ?? 0,
    }))
  const tags = tagFilterOptions.value.map((opt) => ({
    value: opt.value as DeckFilterMode,
    label: opt.label,
    mine: false,
    count: counts.get(opt.value as DeckFilterMode) ?? opt.count ?? 0,
    contextLabel: opt.contextLabel,
    contextColor: opt.contextColor,
  }))
  return [...built, ...custom, ...tags]
})

const activeFilter = ref<DeckFilterMode>(sanitizeDefaultFilter())

watch(
  () => props.defaultFilter,
  () => {
    activeFilter.value = sanitizeDefaultFilter()
  },
)

watch(
  () => filterOptionDefs.value.map((opt) => opt.value).join('|'),
  () => {
    const options = filterOptionDefs.value
    if (!options.length) return
    if (!options.some((opt) => opt.value === activeFilter.value)) {
      activeFilter.value = options[0].value
    }
  },
)

const filtersEnabled = computed(() => filterOptionDefs.value.length > 1)
const allowMine = computed(() => props.allowMine !== false && !!(props.uid || '').trim())

const filteredCards = computed(() => {
  const allowArchived = props.includeArchived !== false || activeFilter.value.startsWith('archived')
  const cleaned = baseCards.value.filter(
    (card) =>
      (allowArchived || card.status !== 'archived') &&
      (props.includeCompleted !== false || card.status !== 'done'),
  )
  return filterCardsForMode(activeFilter.value, cleaned, allowArchived)
})

function sanitizeDefaultFilter(): DeckFilterMode {
  const opts = filterOptionDefs.value.map((opt) => opt.value)
  const candidate = (props.defaultFilter || opts[0] || 'all') as DeckFilterMode
  return opts.includes(candidate) ? candidate : opts[0] || 'all'
}

function onFilter(value: DeckFilterMode) {
  activeFilter.value = value
}

function onReorderFilters(nextOrder: DeckFilterMode[]) {
  if (!nextOrder.length) return
  localFilters.value = [...nextOrder]
  props.onUpdateFilters?.(nextOrder)
  if (!nextOrder.includes(activeFilter.value)) {
    activeFilter.value = nextOrder[0]
  }
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
  status: 'open' | 'done' | 'archived' | 'due',
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
  if (status === 'due') return card.match === 'due'
  return false
}

function normalizeDateKey(value?: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const parsed = parseDateTime(trimmed)
  return parsed ? formatDateKey(parsed) : null
}

function dateKeyForTs(ts?: number | null): string | null {
  if (ts == null) return null
  return formatDateKey(new Date(ts))
}

function isCreatedToday(card: DeckCardSummary) {
  const key = dateKeyForTs(card.createdTs)
  if (!key) return false
  return key === formatDateKey(new Date())
}

function isCreatedInRange(card: DeckCardSummary, from?: string, to?: string) {
  const cardKey = dateKeyForTs(card.createdTs)
  const fromKey = normalizeDateKey(from || null)
  const toKey = normalizeDateKey(to || null)
  if (!cardKey || !fromKey || !toKey) return false
  return cardKey >= fromKey && cardKey <= toKey
}

function isDueInRange(card: DeckCardSummary, from?: string, to?: string) {
  const dueKey = dateKeyForTs(card.dueTs ?? null)
  const fromKey = normalizeDateKey(from || null)
  const toKey = normalizeDateKey(to || null)
  if (!dueKey || !fromKey || !toKey) return false
  return dueKey >= fromKey && dueKey <= toKey
}

function isDueToday(card: DeckCardSummary) {
  const dueKey = dateKeyForTs(card.dueTs ?? null)
  if (!dueKey) return false
  return dueKey === formatDateKey(new Date())
}

function filterCardsForMode(mode: DeckFilterMode, cleaned: DeckCardSummary[], allowArchived: boolean) {
  const mineMatch = buildMineMatcher(props.uid || '', props.mineMode || 'assignee')
  const includeArchivedInDone = allowArchived
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
  if (mode.startsWith('due_today')) {
    return cleaned.filter((card) => {
      const mineOk = mode.endsWith('_mine') ? mineMatch(card) : true
      return mineOk && isDueToday(card)
    })
  }
  if (mode.startsWith('due_')) {
    return cleaned.filter((card) => {
      const mineOk = mode.endsWith('_mine') ? mineMatch(card) : true
      return mineOk && isDueInRange(card, props.from, props.to)
    })
  }
  if (mode.startsWith('custom_')) {
    const key = mode.slice('custom_'.length)
    const custom = (props.customFilters || []).find((f) => f.id === key)
    if (!custom) return []
    return cleaned.filter((card) => {
      return matchesCustomFilter(card, custom, mineMatch)
    })
  }
  if (mode.startsWith('tag_')) {
    return cleaned.filter((card) => cardHasTag(card, mode))
  }
  if (mode.includes('_')) {
    const [statusKey, scope] = mode.split('_') as ['open' | 'done' | 'archived' | 'due', 'all' | 'mine']
    return cleaned.filter((card) => {
      const statusOk = deckStatusMatches(card, statusKey, includeArchivedInDone, includeCompleted)
      const mineOk = scope === 'all' ? true : mineMatch(card)
      return statusOk && mineOk
    })
  }
  return cleaned
}

function matchesCustomFilter(
  card: DeckCardSummary,
  filter: { labelIds?: string[]; labels?: string[]; assignees?: string[] },
  mineMatch: (card: DeckCardSummary) => boolean,
): boolean {
  const labelIds = (filter.labelIds || []).map((id) => id.trim().toLowerCase()).filter(Boolean)
  const labels = (filter.labels || []).map((l) => l.trim().toLowerCase()).filter(Boolean)
  const assignees = (filter.assignees || []).map((a) => a.trim().toLowerCase()).filter(Boolean)
  const hasLabelIds = labelIds.length > 0
  const hasLabels = labels.length > 0
  const hasAssignees = assignees.length > 0
  if (!hasLabelIds && !hasLabels && !hasAssignees) return false

  let labelOk = true
  if (hasLabelIds || hasLabels) {
    const cardLabelIds = (card.labels || [])
      .map((label) => (label.id != null ? String(label.id).trim().toLowerCase() : ''))
      .filter(Boolean)
    const cardLabels = (card.labels || [])
      .map((label) => String(label.title || '').trim().toLowerCase())
      .filter(Boolean)
    labelOk =
      (!hasLabelIds || labelIds.some((id) => cardLabelIds.includes(id))) &&
      (!hasLabels || labels.some((label) => cardLabels.includes(label)))
  }

  let assigneeOk = true
  if (hasAssignees) {
    const cardAssignees = (card.assignees || [])
      .map((assignee) => String(assignee.uid || '').trim().toLowerCase())
      .filter(Boolean)
    assigneeOk = assignees.some((uid) => cardAssignees.includes(uid))
    if (!assigneeOk && assignees.includes('me')) {
      assigneeOk = mineMatch(card)
    }
    if (!assigneeOk && assignees.includes('unassigned')) {
      assigneeOk = cardAssignees.length === 0
    }
  }

  return labelOk && assigneeOk
}
</script>
