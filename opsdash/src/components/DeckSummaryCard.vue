<template>
  <div class="card deck-summary-card">
    <div class="deck-summary-card__header">
      <div>
        <div class="deck-summary-card__title">Deck summary</div>
        <div class="deck-summary-card__subtitle">Showing {{ rangeLabel.toLowerCase() }} selection</div>
      </div>
      <div class="deck-summary-card__meta">
        <span v-if="ticker.autoScroll">Auto-scroll · {{ ticker.intervalSeconds }}s</span>
        <span v-else>Auto-scroll off</span>
      </div>
    </div>

    <div v-if="loading" class="deck-summary-card__loading">
      <NcLoadingIcon :size="18" />
      <span>Loading Deck cards…</span>
    </div>
    <div v-else-if="error" class="deck-summary-card__error">
      {{ error }}
    </div>
    <div v-else-if="!hasAnyData" class="deck-summary-card__empty">
      No Deck data
    </div>
    <ul v-else class="deck-summary-card__rows" @mouseenter="pause" @mouseleave="resume">
      <li v-for="bucket in buckets" :key="bucket.key" class="deck-summary-card__row">
        <div class="deck-summary-card__row-head">
          <span class="bucket-label">{{ bucket.label }}</span>
          <span class="bucket-count">{{ bucket.count }}</span>
        </div>
        <div class="deck-summary-card__row-body">
          <span
            v-if="showBoardBadges && bucket.board"
            class="bucket-board"
            :style="{ borderColor: bucket.board.color || 'var(--brand)' }"
          >
            {{ bucket.board.title }}
          </span>
          <div class="bucket-titles">
            <span v-if="bucket.titles.length === 0" class="bucket-title bucket-title--muted">No cards</span>
            <span
              v-else
              v-for="(title, idx) in visibleTitles(bucket)"
              :key="`${bucket.key}-${idx}-${title}`"
              class="bucket-title"
            >
              {{ title }}
            </span>
          </div>
        </div>
      </li>
    </ul>
  </div>
  </template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { NcLoadingIcon } from '@nextcloud/vue'
import type { DeckFilterMode } from '../services/reporting'

const props = defineProps<{
  buckets: Array<{
    key: DeckFilterMode
    label: string
    titles: string[]
    count: number
    board?: { title: string; color?: string }
  }>
  rangeLabel: string
  loading: boolean
  error?: string
  ticker: { autoScroll: boolean; intervalSeconds: number }
  showBoardBadges?: boolean
}>()

const tick = ref(0)
const paused = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const hasAnyData = computed(() => props.buckets.some((bucket) => bucket.count > 0))

function visibleTitles(bucket: (typeof props.buckets)[number]) {
  if (!bucket.titles.length) return []
  const start = props.ticker.autoScroll ? tick.value % bucket.titles.length : 0
  const max = Math.min(4, bucket.titles.length)
  const out: string[] = []
  for (let i = 0; i < max; i += 1) {
    const idx = (start + i) % bucket.titles.length
    out.push(bucket.titles[idx])
  }
  return out
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function startTimer() {
  stopTimer()
  if (!props.ticker.autoScroll) return
  const intervalMs = Math.max(3000, Math.min(10000, (props.ticker.intervalSeconds || 5) * 1000))
  timer = setInterval(() => {
    if (!paused.value) {
      tick.value += 1
    }
  }, intervalMs)
}

function pause() {
  paused.value = true
}
function resume() {
  paused.value = false
}

watch(
  () => [props.ticker.autoScroll, props.ticker.intervalSeconds],
  () => {
    startTimer()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopTimer()
})
</script>

<style scoped>
.deck-summary-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.deck-summary-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.deck-summary-card__title {
  font-weight: 700;
  font-size: 1rem;
}
.deck-summary-card__subtitle {
  color: var(--color-text-maxcontrast);
  font-size: 0.85rem;
}
.deck-summary-card__meta {
  color: var(--color-text-maxcontrast);
  font-size: 0.85rem;
}
.deck-summary-card__loading,
.deck-summary-card__error,
.deck-summary-card__empty {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-maxcontrast);
}
.deck-summary-card__error {
  background: var(--color-error-hover);
  color: var(--color-error-text);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
}
.deck-summary-card__rows {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.deck-summary-card__row {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 0.6rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  background: var(--color-main-background);
}
.deck-summary-card__row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}
.bucket-label {
  font-size: 0.9rem;
}
.bucket-count {
  font-size: 0.85rem;
  border-radius: 999px;
  padding: 0.1rem 0.55rem;
  background: var(--color-background-darker);
}
.deck-summary-card__row-body {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
.bucket-board {
  border: 2px solid var(--color-border);
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  text-transform: uppercase;
}
.bucket-titles {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.bucket-title {
  padding: 0.15rem 0.5rem;
  background: var(--color-background-darker);
  border-radius: 999px;
  font-size: 0.8rem;
}
.bucket-title--muted {
  color: var(--color-text-maxcontrast);
}
</style>
