import { defineAsyncComponent } from 'vue'

const DeckCardsWidget = defineAsyncComponent(() =>
  import('../../../components/DeckCardsWidget.vue').then((m) => m.default),
)

import { buildDeckTagOptions } from '../../deckTags'
import { buildTitle, parseBoardIds, parseFilters, prettyFilterLabel } from '../helpers'
import type { RegistryEntry } from '../types'

const baseTitle = 'Deck cards'

export const deckCardsEntry: RegistryEntry = {
  component: DeckCardsWidget,
  defaultLayout: { width: 'half', height: 'm', order: 52 },
  label: 'Deck cards',
  baseTitle,
  configurable: true,
  defaultOptions: {
    allowMine: true,
    includeArchived: true,
    includeCompleted: true,
    autoScroll: true,
    intervalSeconds: 5,
    showCount: true,
    autoTagsEnabled: true,
    compactList: false,
    customFilters: [],
    filters: [
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
    ],
    defaultFilter: 'open_all',
    mineMode: 'assignee',
  },
  controls: [
    { key: 'boardIds', label: 'Boards to include', type: 'multiselect', options: [] },
    { key: 'filters', label: 'Filters to show', type: 'multiselect', options: [] },
    { key: 'autoTagsEnabled', label: 'Auto tag filters', type: 'toggle' },
    { key: 'allowMine', label: 'Allow mine filters', type: 'toggle' },
    { key: 'mineMode', label: 'Mine mode', type: 'select', options: [
      { value: 'assignee', label: 'Assignee' },
      { value: 'creator', label: 'Creator' },
      { value: 'both', label: 'Assignee + Creator' },
    ] },
    { key: 'includeArchived', label: 'Include archived cards', type: 'toggle' },
    { key: 'includeCompleted', label: 'Include completed cards', type: 'toggle' },
    { key: 'autoScroll', label: 'Auto-scroll list', type: 'toggle' },
    { key: 'intervalSeconds', label: 'Scroll every (s)', type: 'number', min: 3, max: 10, step: 1 },
    { key: 'showCount', label: 'Show count pill', type: 'toggle' },
    { key: 'compactList', label: 'Compact list', type: 'toggle' },
    { key: 'customFilters', label: 'Custom filters', type: 'filterbuilder' },
  ],
  dynamicControls: (options, ctx) => {
    const filters = parseFilters(options.filters ?? options.defaultOptions?.filters)
    const filterSelect = {
      key: 'defaultFilter',
      label: 'Default filter',
      type: 'select',
      options: filters.map((f: any) => ({ value: f, label: prettyFilterLabel(f) })),
    }
    const filterChoices = [
      { value: 'all', label: prettyFilterLabel('all') },
      { value: 'open_all', label: prettyFilterLabel('open_all') },
      { value: 'open_mine', label: prettyFilterLabel('open_mine') },
      { value: 'done_all', label: prettyFilterLabel('done_all') },
      { value: 'done_mine', label: prettyFilterLabel('done_mine') },
      { value: 'archived_all', label: prettyFilterLabel('archived_all') },
      { value: 'archived_mine', label: prettyFilterLabel('archived_mine') },
      { value: 'due_all', label: prettyFilterLabel('due_all') },
      { value: 'due_mine', label: prettyFilterLabel('due_mine') },
      { value: 'due_today_all', label: prettyFilterLabel('due_today_all') },
      { value: 'due_today_mine', label: prettyFilterLabel('due_today_mine') },
      { value: 'created_today_all', label: prettyFilterLabel('created_today_all') },
      { value: 'created_today_mine', label: prettyFilterLabel('created_today_mine') },
    ]
    const boardOptions = Array.isArray(ctx.deckBoards)
      ? ctx.deckBoards.map((b: any) => ({ value: b.id, label: b.title || `Board ${b.id}` }))
      : []
    const boardIds = Array.isArray(options.boardIds)
      ? options.boardIds
      : parseBoardIds(options.boardIds)
    const allowArchived = options.includeArchived !== false
    const includeCompleted = options.includeCompleted !== false
    const boardSet = new Set(boardIds.map((id: any) => Number(id)).filter((id: number) => Number.isInteger(id)))
    const cards = Array.isArray(ctx.deckCards) ? ctx.deckCards : []
    const cleaned = cards.filter((card: any) => {
      if (boardSet.size && !(card?.boardId != null && boardSet.has(Number(card.boardId)))) return false
      if (!allowArchived && card?.status === 'archived') return false
      if (!includeCompleted && card?.status === 'done') return false
      return true
    })
    const tagOptions = buildDeckTagOptions(cleaned)
    const tagControls = []
    if (options.autoTagsEnabled !== false && tagOptions.length) {
      tagControls.push({
        key: 'autoTagSelection',
        label: 'Tag filters',
        type: 'taglist',
        options: tagOptions,
        hint: 'Uncheck tags to hide their filters. Counts reflect the current cards.',
      })
    }
    return [
      { key: 'filters', label: 'Filters', type: 'multiselect', options: filterChoices },
      filterSelect,
      { key: 'boardIds', label: 'Boards', type: 'multiselect', options: boardOptions },
      ...tagControls,
    ]
  },
  buildProps: (def, ctx) => {
    const filters = parseFilters(def.options?.filters ?? def.options?.defaultOptions?.filters) as any[]
    const boardIds = Array.isArray(def.options?.boardIds)
      ? def.options.boardIds
      : parseBoardIds(def.options?.boardIds)
    const defaultFilter = filters.includes(def.options?.defaultFilter) ? def.options?.defaultFilter : (filters[0] || 'all')
    const customFilters = normalizeCustomFilters(def.options?.customFilters)
    return {
      title: buildTitle(baseTitle, def.options?.titlePrefix),
      cardBg: def.options?.cardBg,
      cards: ctx.deckCards || [],
      rangeLabel: ctx.deckRangeLabel || ctx.rangeLabel || '',
      from: ctx.from,
      to: ctx.to,
      uid: ctx.uid,
      deckUrl: ctx.deckUrl,
      lastFetchedAt: ctx.deckRangeLabel,
      loading: ctx.deckLoading,
      error: ctx.deckError,
      boardIds,
      filters,
      defaultFilter,
      allowMine: def.options?.allowMine !== false,
      mineMode: def.options?.mineMode || 'assignee',
      includeArchived: def.options?.includeArchived !== false,
      includeCompleted: def.options?.includeCompleted !== false,
      autoScroll: def.options?.autoScroll !== false,
      intervalSeconds: def.options?.intervalSeconds ?? 5,
      showCount: def.options?.showCount !== false,
      compactList: def.options?.compactList === true,
      autoTagsEnabled: def.options?.autoTagsEnabled !== false,
      autoTagSelection: Array.isArray(def.options?.autoTagSelection)
        ? def.options?.autoTagSelection
        : undefined,
      showHeader: def.options?.showHeader !== false,
      customFilters,
      editable: ctx.isLayoutEditing === true,
      onUpdateFilters: (values: any) => ctx.onUpdateWidgetOptions?.(def.id, 'filters', values),
    }
  },
}

type CustomDeckFilter = {
  id: string
  label: string
  labelIds?: string[]
  labels?: string[]
  assignees?: string[]
}

function normalizeCustomFilters(input: any): CustomDeckFilter[] {
  let raw: any[] = []
  if (Array.isArray(input)) {
    raw = input
  } else if (typeof input === 'string' && input.trim() !== '') {
    try {
      const parsed = JSON.parse(input)
      if (Array.isArray(parsed)) raw = parsed
    } catch {
      raw = []
    }
  }
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const label = String(item.label || item.name || '').trim()
      if (!label) return null
      const id = slugify(String(item.id || label))
      const labelIds = Array.isArray(item.labelIds)
        ? item.labelIds.map((v) => String(v).trim()).filter(Boolean)
        : []
      const labels = Array.isArray(item.labels)
        ? item.labels.map((v) => String(v).trim()).filter(Boolean)
        : []
      const assignees = Array.isArray(item.assignees)
        ? item.assignees.map((v) => String(v).trim()).filter(Boolean)
        : []
      return { id, label, labelIds, labels, assignees }
    })
    .filter(Boolean) as CustomDeckFilter[]
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
