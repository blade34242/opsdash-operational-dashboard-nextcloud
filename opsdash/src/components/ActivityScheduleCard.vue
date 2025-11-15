<template>
  <div class="card activity-card">
    <div class="activity-card__header">
      <span>Activity &amp; Schedule ({{ rangeLabel }})</span>
      <span v-if="summary.rangeLabel" class="pill">{{ summary.rangeLabel }}</span>
    </div>
    <div class="activity-card__hero" v-if="heroLine">
      <span>{{ heroLine }}</span>
    </div>
    <div class="activity-card__subline" v-if="secondLine">
      <span>{{ secondLine }}</span>
    </div>
    <div class="activity-card__meta" v-if="metaLine.length">
      <span v-for="item in metaLine" :key="item.label">
        <strong>{{ item.label }}</strong> {{ item.value }}
      </span>
    </div>
    <div class="activity-card__extra" v-if="extraLine.length">
      <span v-for="item in extraLine" :key="item.label">
        <strong>{{ item.label }}</strong> {{ item.value }}
      </span>
    </div>
    <div class="activity-card__trend" v-if="settings.showDayOffTrend && dayOffRows.length">
      <div class="dayoff-header">
        <span>Days off trend</span>
        <span class="dayoff-meta" v-if="lookbackLabel">
          Last {{ lookbackLabel }}
        </span>
      </div>
      <div class="dayoff-grid">
        <div
          v-for="entry in dayOffRows"
          :key="entry.offset"
          class="dayoff-row"
          :class="{ 'dayoff-row--current': entry.offset === 0 }"
        >
          <div class="dayoff-row__label">{{ entry.label }}</div>
          <div class="dayoff-row__bar">
            <div class="dayoff-row__fill" :style="barStyle(entry)" />
          </div>
          <div class="dayoff-row__value">{{ entry.daysOff }} / {{ entry.totalDays }}</div>
        </div>
      </div>
    </div>
    <div class="activity-card__hint" v-if="settings.showHint && categoryHint">
      {{ categoryHint }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { createDefaultActivityCardConfig, type ActivityCardConfig } from '../services/targets'

type ActivitySummary = {
  rangeLabel: string
  events: number
  activeDays: number | null
  typicalStart: string | null
  typicalEnd: string | null
  weekendShare: number | null
  eveningShare: number | null
  earliestStart: string | null
  latestEnd: string | null
  overlapEvents: number | null
  longestSession: number | null
  lastDayOff: string | null
  lastHalfDayOff: string | null
}

type DayOffTrendEntry = {
  offset: number
  label: string
  from: string
  to: string
  totalDays: number
  daysOff: number
  daysWorked: number
}

const defaultConfig: ActivityCardConfig = createDefaultActivityCardConfig()

const props = defineProps<{
  summary: ActivitySummary
  rangeLabel: string
  categoryHint?: string
  config?: Partial<ActivityCardConfig>
  dayOffTrend?: DayOffTrendEntry[]
  trendUnit?: string
}>()

const settings = computed<ActivityCardConfig>(() => Object.assign({}, defaultConfig, props.config ?? {}))

const heroLine = computed(() => {
  const parts: string[] = []
  parts.push(`Events ${props.summary.events}`)
  if (props.summary.activeDays != null) {
    parts.push(`Active Days ${props.summary.activeDays}`)
  }
  const typical = typicalRange(props.summary.typicalStart, props.summary.typicalEnd)
  if (typical) {
    parts.push(`Typical ${typical}`)
  }
  return parts.join(' • ')
})

const secondLine = computed(() => {
  const parts: string[] = []
  if (settings.value.showWeekendShare && props.summary.weekendShare != null) {
    parts.push(`Weekend ${pct(props.summary.weekendShare)}`)
  }
  if (settings.value.showEveningShare && props.summary.eveningShare != null) {
    parts.push(`Evening ${pct(props.summary.eveningShare)}`)
  }
  return parts.join(' • ')
})

const metaLine = computed(() => {
  const items: Array<{ label: string; value: string }> = []
  if (settings.value.showEarliestLatest) {
    const earliest = timeOf(props.summary.earliestStart)
    const latest = timeOf(props.summary.latestEnd)
    if (earliest || latest) {
      items.push({ label: 'Earliest/Late', value: `${earliest || '—'} / ${latest || '—'}` })
    }
  }
  if (settings.value.showOverlaps && props.summary.overlapEvents != null) {
    items.push({ label: 'Overlaps', value: props.summary.overlapEvents.toString() })
  }
  return items
})

const extraLine = computed(() => {
  const items: Array<{ label: string; value: string }> = []
  if (settings.value.showLongestSession && props.summary.longestSession != null && props.summary.longestSession > 0) {
    items.push({ label: 'Longest Session', value: `${Number(props.summary.longestSession).toFixed(1)} h` })
  }
  if (settings.value.showLastDayOff && props.summary.lastDayOff) {
    items.push({ label: 'Last day off', value: shortDate(props.summary.lastDayOff) })
  }
  if (settings.value.showLastDayOff && props.summary.lastHalfDayOff) {
    items.push({ label: 'Last half day', value: shortDate(props.summary.lastHalfDayOff) })
  }
  return items
})

const dayOffRows = computed<DayOffTrendEntry[]>(() => props.dayOffTrend ?? [])

const lookbackLabel = computed(() => {
  const history = dayOffRows.value.length - 1
  if (history <= 0) return ''
  if (props.trendUnit === 'mo') {
    return `${history} ${history === 1 ? 'month' : 'months'}`
  }
  return `${history} ${history === 1 ? 'week' : 'weeks'}`
})

function typicalRange(start: string | null, end: string | null): string {
  if (start && end) return `${start}–${end}`
  if (start) return `${start}→`
  if (end) return `→${end}`
  return ''
}

function pct(value: number): string {
  return `${Number(value || 0).toFixed(1)}%`
}

function timeOf(value: string | null): string | null {
  if (!value) return null
  if (value.length >= 16) {
    return value.slice(11, 16)
  }
  if (value.length >= 5) {
    return value.slice(0, 5)
  }
  return null
}

function shortDate(value: string): string {
  const str = value.trim()
  if (!str) return '—'
  const parts = str.split('-')
  if (parts.length >= 2) {
    const date = new Date(str.length === 10 ? `${str}T00:00:00` : str)
    if (!Number.isNaN(date.getTime())) {
      const fmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
      return fmt.format(date)
    }
  }
  return str
}

function barStyle(entry: DayOffTrendEntry) {
  const share = entry.totalDays > 0 ? entry.daysOff / entry.totalDays : 0
  const pct = Math.max(0, Math.min(1, share)) * 100
  return { width: `${pct}%` }
}
</script>

<style scoped>
.activity-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  font-size: 13px;
  color: var(--muted);
}
.activity-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: var(--fg);
  font-size: 12px;
}
.activity-card__hero {
  font-weight: 600;
  color: var(--fg);
}
.activity-card__subline {
  font-size: 12px;
}
.activity-card__meta,
.activity-card__extra {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  font-size: 12px;
}
.activity-card__meta strong,
.activity-card__extra strong {
  font-weight: 600;
  color: var(--fg);
}
.activity-card__hint {
  font-size: 11px;
  color: var(--muted);
  opacity: .8;
}
.activity-card__trend {
  border-top: 1px solid var(--color-border-maxcontrast, rgba(125, 125, 125, 0.2));
  padding-top: 8px;
}
.dayoff-header {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 4px;
}
.dayoff-meta {
  opacity: 0.9;
}
.dayoff-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dayoff-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--muted);
}
.dayoff-row--current .dayoff-row__label {
  font-weight: 600;
  color: var(--fg);
}
.dayoff-row__label {
  width: 80px;
}
.dayoff-row__bar {
  flex: 1;
  position: relative;
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand) 8%, transparent);
  overflow: hidden;
}
.dayoff-row__fill {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  background: color-mix(in srgb, var(--brand) 55%, transparent);
  border-radius: 999px;
}
.dayoff-row__value {
  width: 56px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--fg);
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 11px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand) 15%, white);
  color: var(--brand);
  text-transform: uppercase;
  letter-spacing: .05em;
}
</style>
