<template>
  <div class="card time-summary compact">
    <div class="time-summary-firstline">
      <em>Time Summary · {{ summary.rangeLabel }}</em>
      <div class="time-summary-toggle" role="group" aria-label="Average mode">
        <button type="button" :class="{ active: mode === 'active' }" @click="setMode('active')">Active</button>
        <button type="button" :class="{ active: mode === 'all' }" @click="setMode('all')">All</button>
      </div>
    </div>
    <ul class="time-summary-metrics">
      <li><strong>{{ n2(summary.totalHours) }} h</strong> total</li>
      <li>{{ n2(summary.avgDay) }} h/day ({{ modeLabel }})</li>
      <li>{{ n2(summary.avgEvent) }} h/event</li>
      <li>{{ n2(summary.medianDay) }} h median/day</li>
      <li v-if="busiestText">{{ busiestText }}</li>
    </ul>
    <div class="time-summary-row">
      <span class="label">Workdays</span> {{ n2(summary.workdayAvg) }} h avg · {{ n2(summary.workdayMedian) }} h median
    </div>
    <div class="time-summary-row">
      <span class="label">Weekend</span> {{ n2(summary.weekendAvg) }} h avg · {{ n2(summary.weekendMedian) }} h median
      <span v-if="weekendShareText" class="share">({{ weekendShareText }})</span>
    </div>
    <div class="time-summary-row calendars">
      <span class="label">{{ summary.activeCalendars }} calendars</span>
      <template v-if="summary.calendarSummary">
        <span class="sep">—</span>
        <span class="text">{{ summary.calendarSummary }}</span>
      </template>
    </div>
    <div class="time-summary-row" v-if="summary.balanceIndex != null">
      <span class="label">Balance</span> {{ n2(summary.balanceIndex) }} <span class="hint">(1 = perfekt)</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type Mode = 'active' | 'all'

const props = defineProps<{
  summary: {
    rangeLabel: string
    totalHours: number
    avgDay: number
    avgEvent: number
    medianDay: number
    busiest: { date?: string; hours?: number } | null
    workdayAvg: number
    workdayMedian: number
    weekendAvg: number
    weekendMedian: number
    weekendShare: number | null
    activeCalendars: number
    calendarSummary: string
    balanceIndex: number | null
  }
  mode: Mode
}>()

const emit = defineEmits<{ (event: 'update:mode', mode: Mode): void }>()

function setMode(mode: Mode) {
  if (mode !== props.mode) {
    emit('update:mode', mode)
  }
}

const modeLabel = computed(() => (props.mode === 'active' ? 'active days' : 'all days'))

const weekendShareText = computed(() => {
  const v = props.summary.weekendShare
  return v == null ? '' : `${n1(v)}%`
})

const busiestText = computed(() => {
  const b = props.summary.busiest
  if (!b || !b.date) {
    return ''
  }
  const hours = Number(b.hours ?? 0)
  return `Busiest ${b.date} — ${n2(hours)} h`
})

function n1(v: unknown) {
  return Number(v ?? 0).toFixed(1)
}
function n2(v: unknown) {
  return Number(v ?? 0).toFixed(2)
}
</script>

<style scoped>
.card.time-summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--muted);
  padding: 14px;
  max-width: 260px;
}
.time-summary-firstline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--fg);
  font-weight: 600;
}
.time-summary-firstline em {
  font-style: italic;
  color: var(--fg);
}
.time-summary-toggle {
  display: inline-flex;
  gap: 4px;
}
.time-summary-toggle button {
  border: 1px solid color-mix(in srgb, var(--brand) 60%, transparent);
  background: transparent;
  color: var(--brand);
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 11px;
  cursor: pointer;
}
.time-summary-toggle button.active {
  background: color-mix(in srgb, var(--brand) 18%, white);
  color: var(--brand);
  font-weight: 600;
}
.time-summary-toggle button:focus-visible {
  outline: 1px solid var(--brand);
  outline-offset: 1px;
}
.time-summary-metrics {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.time-summary-metrics li {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  color: var(--muted);
}
.time-summary-metrics strong {
  color: var(--fg);
  font-size: 14px;
}
.time-summary-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  line-height: 1.4;
  color: var(--muted);
}
.time-summary-row .label {
  color: var(--fg);
  font-weight: 600;
}
.time-summary-row.calendars {
  word-break: break-word;
}
.time-summary-row .sep {
  color: var(--muted);
}
.time-summary-row .hint {
  color: var(--muted);
}
.time-summary-row .share {
  color: var(--muted);
}
</style>
