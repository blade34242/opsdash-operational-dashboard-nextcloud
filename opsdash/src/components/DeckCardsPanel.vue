<template>
  <div class="deck-panel">
  <div class="deck-panel__header">
    <div class="deck-panel__heading">
      <div class="deck-panel__title">Deck cards</div>
      <div class="deck-panel__subtitle" v-if="lastFetchedLabel">
        Updated {{ lastFetchedLabel }}
      </div>
      <div class="deck-panel__subtitle" v-else>
        Showing {{ rangeLabel.toLowerCase() }} selection
      </div>
    </div>
    <div class="deck-panel__actions">
      <div v-if="showCount" class="deck-panel__count">{{ cards.length }} cards</div>
      <a
        v-if="deckUrl"
        class="deck-panel__link"
        :href="deckUrl"
        target="_blank"
        rel="noopener"
      >
        Open Deck ↗
      </a>
      <button
        type="button"
        class="deck-panel__refresh"
        @click="$emit('refresh')"
        :disabled="loading"
      >
        Refresh
      </button>
    </div>
  </div>

  <div
    v-if="filtersEnabledFlag"
    class="deck-panel__filters"
    role="group"
    aria-label="Deck card filters"
  >
    <button
      v-for="option in filterOptions"
      :key="option.value"
      type="button"
      class="deck-filter-btn"
      :class="{ active: activeFilter === option.value }"
      :aria-pressed="activeFilter === option.value"
      :disabled="option.mine && !allowMine"
      @click="$emit('update:filter', option.value)"
    >
      {{ option.label }}
    </button>
  </div>

  <div class="deck-panel__body">
    <div v-if="loading" class="deck-panel__loading">
      <NcLoadingIcon :size="20" />
      <span>Loading Deck cards…</span>
    </div>

    <template v-else>
      <div v-if="error" class="deck-panel__error">
        {{ error }}
      </div>
      <NcEmptyContent
        v-else-if="!cards.length"
        name="No Deck cards"
        :description="`No cards matched this ${rangeLabel.toLowerCase()}. Confirm Deck due dates or rerun seeding.`"
      />
      <ul v-else class="deck-card-list" ref="listEl">
        <li v-for="(card, idx) in cards" :key="card.id" class="deck-card" :data-idx="idx">
          <div class="deck-card__status-row">
            <span class="deck-card__status" :class="card.status">
              {{ statusLabel(card.status) }}
            </span>
            <span v-if="card.match === 'due' && card.due" class="deck-card__time">
              Due {{ formatDate(card.due) }}
            </span>
            <span v-else-if="card.done" class="deck-card__time">
              Completed {{ formatDate(card.done) }}
            </span>
          </div>
          <div class="deck-card__title">{{ card.title }}</div>
          <div class="deck-card__meta">
            <span class="deck-card__board" :style="{ borderColor: card.boardColor || 'var(--color-primary)' }">
              {{ card.boardTitle }}
            </span>
            <span class="deck-card__stack">{{ card.stackTitle }}</span>
          </div>
          <div class="deck-card__labels" v-if="card.labels.length">
            <span
              v-for="label in card.labels"
              :key="`deck-label-${card.id}-${label.id ?? label.title}`"
              class="deck-card__label"
              :style="{ background: label.color || 'var(--color-background-darker)' }"
            >
              {{ label.title }}
            </span>
          </div>
          <div class="deck-card__assignees" v-if="card.assignees.length">
            <span class="deck-card__assignees-label">Assigned:</span>
            <span
              v-for="assignee in card.assignees"
              :key="`deck-assignee-${card.id}-${assignee.uid ?? assignee.id}`"
              class="deck-card__assignee"
            >
              {{ assignee.displayName || assignee.uid }}
            </span>
          </div>
        </li>
      </ul>
    </template>
  </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import type { DeckCardSummary } from '../services/deck'
import type { DeckFilterMode } from '../services/reporting'

const props = defineProps<{
  cards: DeckCardSummary[]
  loading: boolean
  rangeLabel: string
  lastFetchedAt?: string | null
  deckUrl?: string
  error?: string
  filter?: DeckFilterMode
  canFilterMine?: boolean
  filtersEnabled?: boolean
  filterOptions?: Array<{ value: DeckFilterMode; label: string; mine?: boolean }>
  allowMineOverride?: boolean
  autoScroll?: boolean
  intervalSeconds?: number
  showCount?: boolean
}>()

defineEmits<{
  refresh: []
  'update:filter': [DeckFilterMode]
}>()

const activeFilter = computed(() => props.filter ?? 'all')
const filtersEnabledFlag = computed(() => props.filtersEnabled !== false && filterOptions.value.length > 1)
const allowMine = computed(() => filtersEnabledFlag.value && props.canFilterMine !== false && props.allowMineOverride !== false)
const filterOptions = computed<Array<{ value: DeckFilterMode; label: string; mine: boolean }>>(() => {
  if (props.filterOptions && props.filterOptions.length) {
    return props.filterOptions.map((opt) => ({ ...opt, mine: !!opt.mine }))
  }
  return [
    { value: 'all', label: 'All cards', mine: false },
    { value: 'open_all', label: 'Open · All', mine: false },
    { value: 'open_mine', label: 'Open · Mine', mine: true },
    { value: 'done_all', label: 'Done · All', mine: false },
    { value: 'done_mine', label: 'Done · Mine', mine: true },
    { value: 'archived_all', label: 'Archived · All', mine: false },
    { value: 'archived_mine', label: 'Archived · Mine', mine: true },
  ]
})

const listEl = ref<HTMLElement | null>(null)
const autoTimer = ref<number | null>(null)
const activeIndex = ref(0)

const intervalMs = computed(() => {
  const ms = Math.max(3, Math.min(10, Number(props.intervalSeconds ?? 5))) * 1000
  return Number.isFinite(ms) ? ms : 5000
})

watch(
  () => props.autoScroll,
  () => {
    resetAutoScroll()
    startAutoScroll()
  },
)

watch(
  () => props.cards,
  () => {
    activeIndex.value = 0
    resetAutoScroll()
    startAutoScroll()
  },
  { deep: true },
)

onMounted(() => {
  startAutoScroll()
})

onBeforeUnmount(() => {
  resetAutoScroll()
})

function resetAutoScroll() {
  if (autoTimer.value) {
    clearInterval(autoTimer.value)
    autoTimer.value = null
  }
}

function startAutoScroll() {
  if (!props.autoScroll || !listEl.value || (props.cards || []).length <= 1) {
    return
  }
  resetAutoScroll()
  autoTimer.value = window.setInterval(() => {
    const total = (props.cards || []).length
    activeIndex.value = (activeIndex.value + 1) % total
    scrollToIndex(activeIndex.value)
  }, intervalMs.value)
}

function scrollToIndex(idx: number) {
  if (!listEl.value) return
  const target = listEl.value.querySelector(`[data-idx="${idx}"]`) as HTMLElement | null
  target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

const formatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

const lastFetchedLabel = computed(() => {
  if (!props.lastFetchedAt) return ''
  try {
    return formatter.format(new Date(props.lastFetchedAt))
  } catch {
    return ''
  }
})

function formatDate(iso: string) {
  try {
    return formatter.format(new Date(iso))
  } catch {
    return iso
  }
}

function statusLabel(status: DeckCardSummary['status']) {
  if (status === 'done') return 'Done'
  if (status === 'archived') return 'Archived'
  return 'Active'
}
</script>

<style scoped>
.deck-panel {
  display: flex;
  flex-direction: column;
  gap: calc(16px * var(--widget-space, 1));
  height: 100%;
  min-height: 0;
  font-size: var(--widget-font, 14px);
}
.deck-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.deck-panel__title {
  font-size: calc(16px * var(--widget-scale, 1));
  font-weight: 600;
}
.deck-panel__subtitle {
  font-size: calc(14px * var(--widget-scale, 1));
  color: var(--color-text-maxcontrast);
}
.deck-panel__actions {
  display: flex;
  align-items: center;
  gap: calc(8px * var(--widget-space, 1));
}
.deck-panel__count{
  font-size:calc(14px * var(--widget-scale, 1));
  background:var(--color-background-darker);
  border:1px solid var(--color-border-dark);
  padding:calc(2px * var(--widget-space, 1)) calc(8px * var(--widget-space, 1));
  border-radius:calc(12px * var(--widget-space, 1));
}
.deck-panel__refresh {
  border: 1px solid var(--color-primary);
  background: transparent;
  color: var(--color-primary);
  border-radius: 999px;
  padding: calc(4px * var(--widget-space, 1)) calc(12px * var(--widget-space, 1));
  font-size: calc(14px * var(--widget-scale, 1));
  cursor: pointer;
}
.deck-panel__refresh:disabled {
  opacity: 0.6;
  cursor: default;
}
.deck-panel__link {
  font-size: calc(14px * var(--widget-scale, 1));
  text-decoration: none;
  color: var(--color-text-maxcontrast);
}
.deck-panel__loading {
  display: flex;
  align-items: center;
  gap: calc(8px * var(--widget-space, 1));
  color: var(--color-text-maxcontrast);
}
.deck-panel__filters {
  display: flex;
  gap: calc(8px * var(--widget-space, 1));
  flex-wrap: wrap;
}
.deck-panel__body{
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: calc(4px * var(--widget-space, 1));
}
.deck-filter-btn {
  border: 1px solid var(--color-border-maxcontrast);
  background: var(--color-main-background);
  border-radius: 999px;
  padding: calc(3px * var(--widget-space, 1)) calc(14px * var(--widget-space, 1));
  font-size: calc(13px * var(--widget-scale, 1));
  cursor: pointer;
}
.deck-filter-btn.active {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.deck-filter-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.deck-panel__error {
  padding: calc(12px * var(--widget-space, 1));
  border-radius: calc(8px * var(--widget-space, 1));
  background: var(--color-error-hover);
  color: var(--color-error-text);
}
.deck-card-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: calc(16px * var(--widget-space, 1));
}
.deck-card {
  border: 1px solid var(--color-border);
  border-radius: calc(12px * var(--widget-space, 1));
  padding: calc(14px * var(--widget-space, 1));
  background: var(--color-main-background);
  display: flex;
  flex-direction: column;
  gap: calc(6px * var(--widget-space, 1));
}
.deck-card__status-row {
  display: flex;
  align-items: center;
  gap: calc(8px * var(--widget-space, 1));
  font-size: calc(14px * var(--widget-scale, 1));
  color: var(--color-text-maxcontrast);
}
.deck-card__status {
  font-weight: 600;
  text-transform: uppercase;
  font-size: calc(12px * var(--widget-scale, 1));
  letter-spacing: 0.05em;
}
.deck-card__status.done {
  color: var(--color-success);
}
.deck-card__status.archived {
  color: var(--color-text-maxcontrast);
}
.deck-card__title {
  font-size: calc(16px * var(--widget-scale, 1));
  font-weight: 600;
  color: var(--color-text);
}
.deck-card__meta {
  display: flex;
  align-items: center;
  gap: calc(8px * var(--widget-space, 1));
  font-size: calc(13px * var(--widget-scale, 1));
}
.deck-card__board {
  border: 2px solid var(--color-border);
  padding: calc(2px * var(--widget-space, 1)) calc(8px * var(--widget-space, 1));
  border-radius: 999px;
  text-transform: uppercase;
  font-size: calc(11px * var(--widget-scale, 1));
}
.deck-card__stack {
  color: var(--color-text-maxcontrast);
}
.deck-card__labels {
  display: flex;
  gap: calc(6px * var(--widget-space, 1));
  flex-wrap: wrap;
}
.deck-card__label {
  color: #fff;
  font-size: calc(11px * var(--widget-scale, 1));
  padding: calc(2px * var(--widget-space, 1)) calc(7px * var(--widget-space, 1));
  border-radius: 999px;
}
.deck-card__assignees {
  display: flex;
  flex-wrap: wrap;
  gap: calc(6px * var(--widget-space, 1));
  font-size: calc(12px * var(--widget-scale, 1));
}
.deck-card__assignees-label {
  color: var(--color-text-maxcontrast);
}
.deck-card__assignee {
  font-weight: 500;
}
</style>
