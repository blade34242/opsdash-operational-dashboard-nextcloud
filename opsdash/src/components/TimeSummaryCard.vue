<template>
  <div class="card time-summary compact">
    <div class="time-summary-firstline">
      <em>Time Summary · {{ summary.rangeLabel }}</em>
    </div>
    <ul class="time-summary-metrics">
      <li v-if="summaryConfig.showTotal"><strong>{{ n2(summary.totalHours) }} h</strong> total</li>
      <li v-if="summaryConfig.showAverage">{{ n2(summary.avgDay) }} h/day ({{ modeLabel }})</li>
      <li v-if="summaryConfig.showAverage">{{ n2(summary.avgEvent) }} h/event</li>
      <li v-if="summaryConfig.showMedian">{{ n2(summary.medianDay) }} h median/day</li>
      <li v-if="summaryConfig.showBusiest && busiestText">{{ busiestText }}</li>
    </ul>
    <div class="time-summary-row" v-if="summaryConfig.showWorkday">
      <span class="label">Workdays</span> {{ n2(summary.workdayAvg) }} h avg · {{ n2(summary.workdayMedian) }} h median
    </div>
    <div class="time-summary-row" v-if="summaryConfig.showWeekend">
      <span class="label">Weekend</span> {{ n2(summary.weekendAvg) }} h avg · {{ n2(summary.weekendMedian) }} h median
      <span v-if="summaryConfig.showWeekendShare && weekendShareText" class="share">({{ weekendShareText }})</span>
    </div>
    <div class="time-summary-row calendars" v-if="summaryConfig.showCalendarSummary">
      <span class="label">{{ summary.activeCalendars }} calendars</span>
      <template v-if="summary.calendarSummary">
        <span class="sep">·</span>
        <span class="text">{{ summary.calendarSummary }}</span>
      </template>
    </div>
    <div class="time-summary-row top-category" v-if="summaryConfig.showTopCategory && topCategoryInfo">
      <span class="label">Top category</span>
      <span class="text">{{ topCategoryInfo.text }}</span>
      <span v-if="topCategoryInfo.badge" class="summary-badge" :class="topCategoryInfo.badgeClass">{{ topCategoryInfo.badge }}</span>
    </div>
    <div class="time-summary-row" v-if="summaryConfig.showBalance && summary.balanceIndex != null">
      <span class="label">Balance</span> {{ n2(summary.balanceIndex) }} <span class="hint">(1 = perfekt)</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type Mode = 'active' | 'all'

type SummaryConfig = {
  showTotal: boolean
  showAverage: boolean
  showMedian: boolean
  showBusiest: boolean
  showWorkday: boolean
  showWeekend: boolean
  showWeekendShare: boolean
  showCalendarSummary: boolean
  showTopCategory: boolean
  showBalance: boolean
}

const defaultConfig: SummaryConfig = {
  showTotal: true,
  showAverage: true,
  showMedian: true,
  showBusiest: true,
  showWorkday: true,
  showWeekend: true,
  showWeekendShare: true,
  showCalendarSummary: true,
  showTopCategory: true,
  showBalance: true,
}

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
    topCategory: {
      label: string
      actualHours: number
      targetHours: number
      percent: number
      statusLabel: string
      status: string
      color?: string
    } | null
  }
  mode: Mode
  config?: SummaryConfig
}>()

const summaryConfig = computed<SummaryConfig>(() => Object.assign({}, defaultConfig, props.config ?? {}))

const modeLabel = computed(() => (props.mode === 'active' ? 'active days' : 'all days'))

const weekendShareText = computed(() => {
  if (!summaryConfig.value.showWeekendShare) return ''
  const v = props.summary.weekendShare
  return v == null ? '' : `${n1(v)}%`
})

const topCategoryInfo = computed(() => {
  if (!summaryConfig.value.showTopCategory) return null
  const cat = props.summary.topCategory
  if (!cat) return null
  const actual = n2(cat.actualHours)
  const percent = Number(cat.percent ?? 0).toFixed(0)
  const targetPart = cat.targetHours > 0 ? ` (${percent}% of ${n2(cat.targetHours)} h)` : ''
  return {
    text: `${cat.label} — ${actual} h${targetPart}`,
    badge: cat.statusLabel || '',
    badgeClass: statusClass(cat.status as any),
  }
})

const busiestText = computed(() => {
  if (!summaryConfig.value.showBusiest) return ''
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

function statusClass(status: 'on_track' | 'at_risk' | 'behind' | 'done' | 'none' | string | undefined): string {
  switch (status) {
    case 'on_track': return 'status-on'
    case 'at_risk': return 'status-risk'
    case 'behind': return 'status-behind'
    case 'done': return 'status-done'
    default: return 'status-none'
  }
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
.mode-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand) 18%, white);
  color: var(--brand);
  text-transform: uppercase;
  letter-spacing: .05em;
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
.time-summary-row.top-category {
  align-items: center;
  gap: 6px;
}
.summary-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .05em;
}
.status-on {
  background: color-mix(in srgb, var(--brand) 20%, white);
  color: var(--brand);
}
.status-risk {
  background: color-mix(in srgb, #f97316 20%, white);
  color: #f97316;
}
.status-behind {
  background: color-mix(in srgb, #ef4444 20%, white);
  color: #ef4444;
}
.status-done {
  background: color-mix(in srgb, var(--pos) 25%, white);
  color: var(--pos);
}
.status-none {
  background: color-mix(in srgb, var(--muted) 12%, white);
  color: var(--muted);
}
</style>
