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
      type="button"
      class="deck-filter-btn"
      :class="{ active: activeFilter === 'all' }"
      :aria-pressed="activeFilter === 'all'"
      @click="$emit('update:filter', 'all')"
    >
      All cards
    </button>
    <button
      type="button"
      class="deck-filter-btn"
      :class="{ active: activeFilter === 'mine' }"
      :aria-pressed="activeFilter === 'mine'"
      :disabled="!allowMine"
      @click="$emit('update:filter', 'mine')"
    >
      My cards
    </button>
  </div>

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
      <ul v-else class="deck-card-list">
        <li v-for="card in cards" :key="card.id" class="deck-card">
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
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import type { DeckCardSummary } from '../services/deck'

const props = defineProps<{
  cards: DeckCardSummary[]
  loading: boolean
  rangeLabel: string
  lastFetchedAt?: string | null
  deckUrl?: string
  error?: string
  filter?: 'all' | 'mine'
  canFilterMine?: boolean
  filtersEnabled?: boolean
}>()

defineEmits<{
  refresh: []
  'update:filter': ['all' | 'mine']
}>()

const activeFilter = computed(() => props.filter ?? 'all')
const allowMine = computed(() => props.canFilterMine !== false)
const filtersEnabledFlag = computed(() => props.filtersEnabled !== false)

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
  gap: 1rem;
}
.deck-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.deck-panel__title {
  font-size: 1rem;
  font-weight: 600;
}
.deck-panel__subtitle {
  font-size: 0.85rem;
  color: var(--color-text-maxcontrast);
}
.deck-panel__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.deck-panel__refresh {
  border: 1px solid var(--color-primary);
  background: transparent;
  color: var(--color-primary);
  border-radius: 999px;
  padding: 0.25rem 0.75rem;
  font-size: 0.85rem;
  cursor: pointer;
}
.deck-panel__refresh:disabled {
  opacity: 0.6;
  cursor: default;
}
.deck-panel__link {
  font-size: 0.85rem;
  text-decoration: none;
  color: var(--color-text-maxcontrast);
}
.deck-panel__loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-maxcontrast);
}
.deck-panel__filters {
  display: flex;
  gap: 0.5rem;
}
.deck-filter-btn {
  border: 1px solid var(--color-border-maxcontrast);
  background: var(--color-main-background);
  border-radius: 999px;
  padding: 0.2rem 0.9rem;
  font-size: 0.8rem;
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
  padding: 0.75rem;
  border-radius: 8px;
  background: var(--color-error-hover);
  color: var(--color-error-text);
}
.deck-card-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.deck-card {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 0.85rem;
  background: var(--color-main-background);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.deck-card__status-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text-maxcontrast);
}
.deck-card__status {
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}
.deck-card__status.done {
  color: var(--color-success);
}
.deck-card__status.archived {
  color: var(--color-text-maxcontrast);
}
.deck-card__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}
.deck-card__meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}
.deck-card__board {
  border: 2px solid var(--color-border);
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  text-transform: uppercase;
  font-size: 0.7rem;
}
.deck-card__stack {
  color: var(--color-text-maxcontrast);
}
.deck-card__labels {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}
.deck-card__label {
  color: #fff;
  font-size: 0.7rem;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
}
.deck-card__assignees {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  font-size: 0.75rem;
}
.deck-card__assignees-label {
  color: var(--color-text-maxcontrast);
}
.deck-card__assignee {
  font-weight: 500;
}
</style>
