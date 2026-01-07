<template>
    <div class="card time-summary compact" :style="cardStyle">
      <div class="time-summary-firstline" v-if="showHeader">
      <span>{{ headerText }}</span>
      </div>
    <div class="today-highlight" v-if="todayTotal !== null">
      <div class="today-label">Total today</div>
      <div class="today-value">{{ n2(todayTotal) }} h</div>
    </div>
    <div class="today-cats" v-if="todayItems.length">
      <div class="today-cat" v-for="cat in todayItems" :key="cat.id">
        <span class="dot" :style="{ background: cat.color || 'var(--brand)' }"></span>
        <span class="name">{{ cat.label }}</span>
        <span class="value">{{ n2(cat.todayHours) }} h</span>
      </div>
    </div>

    <div class="time-summary-inline" v-if="summaryConfig.showTotal">
      <strong>{{ n2(summary.totalHours) }} h</strong> total
    </div>
    <div class="time-summary-inline" v-if="inlineStats">
      {{ inlineStats }}
    </div>
    <div class="time-summary-inline" v-if="summaryConfig.showBusiest && busiestText">
      {{ busiestText }}
    </div>
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
    <div class="time-summary-activity" v-if="activity">
      <div class="time-summary-activity__title">Activity &amp; Schedule</div>
      <div class="time-summary-activity__line">
        Events {{ activity.events }} • Active Days {{ activity.activeDays ?? 0 }} • Typical {{ typicalWindow }}{{ activityOffsetSuffix }}
      </div>
      <div class="time-summary-activity__line" v-if="showActivityDetails">
        Weekend {{ pct(activity.weekendShare) }}
        <span v-if="weekendDeltaLabel" class="time-summary-activity__delta">({{ weekendDeltaLabel }})</span>
        • Evening {{ pct(activity.eveningShare) }}
        <span v-if="eveningDeltaLabel" class="time-summary-activity__delta">({{ eveningDeltaLabel }})</span>
      </div>
      <div class="time-summary-activity__line" v-if="showActivityDetails">
        Earliest/Late {{ earliestLatestLabel }}
      </div>
      <div class="time-summary-activity__line" v-if="showActivityDetails">
        Overlaps {{ activity.overlapEvents ?? 0 }} • Longest {{ longestSessionLabel }}
      </div>
      <div class="time-summary-activity__line" v-if="showActivityDetails">
        Last day off {{ lastDayOffLabel }}
      </div>
    </div>
    <div class="time-summary-history" v-if="showHistory && historyItems.length">
      <div class="time-summary-history__header">
        <div class="time-summary-history__title">Lookback</div>
        <div class="time-summary-history__mode">{{ historyViewLabel }}</div>
      </div>
      <div v-if="historyView === 'pills'" class="time-summary-history__pills">
        <div class="history-pill" v-for="item in historyItems" :key="item.offset">
          <div class="history-pill__title">{{ item.label }}</div>
          <div class="history-pill__metrics">
            <span class="history-pill__metric" v-for="metric in item.metrics" :key="metric.key">
              <span class="history-pill__metric-label">{{ metric.label }}</span>
              <span class="history-pill__metric-value">{{ metric.value }}</span>
            </span>
          </div>
        </div>
      </div>
      <div v-else class="time-summary-history__list">
        <div class="history-entry" v-for="item in historyItems" :key="item.offset">
          <div class="history-entry__header">
            <span class="history-entry__title">{{ item.label }}</span>
            <span v-if="item.range" class="history-entry__range">{{ item.range }}</span>
          </div>
          <div class="history-entry__metrics">
            <div class="history-entry__metric" v-for="metric in item.metrics" :key="metric.key">
              <span class="history-entry__metric-label">{{ metric.label }}</span>
              <span class="history-entry__metric-value">{{ metric.value }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="time-summary-delta" v-if="deltaLine">
      {{ deltaLine }}
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

type HistoryEntry = {
  offset: number
  label: string
  rangeStart: string
  rangeEnd: string
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
  topCategory: { label: string; actualHours: number; targetHours: number; percent: number; color?: string } | null
  balanceIndex: number | null
  activity: {
    events: number
    activeDays: number
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
}

type HistoryMetric = {
  key: string
  label: string
  value: string
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
    rangeStart: string
    rangeEnd: string
    offset: number
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
    delta: {
      totalHours: number
      avgPerDay: number
      avgPerEvent: number
      events: number
    } | null
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
  activitySummary?: {
    events: number
    activeDays: number | null
    typicalStart: string | null
    typicalEnd: string | null
    weekendShare: number | null
    eveningShare: number | null
    delta: {
      weekendShare: number | null
      eveningShare: number | null
    } | null
    earliestStart: string | null
    latestEnd: string | null
    overlapEvents: number | null
    longestSession: number | null
    lastDayOff: string | null
    lastHalfDayOff: string | null
  } | null
  mode: Mode
  config?: SummaryConfig
  todayGroups?: Array<{ id: string; label: string; todayHours: number; color?: string | null }>
  title?: string
  cardBg?: string | null
  rangeMode?: 'week' | 'month' | string
  rangeStart?: string
  rangeEnd?: string
  offset?: number
  showHeader?: boolean
  history?: HistoryEntry[]
  showHistory?: boolean
  historyView?: 'list' | 'pills'
  showActivityDetails?: boolean
}>()

const summaryConfig = computed<SummaryConfig>(() => Object.assign({}, defaultConfig, props.config ?? {}))

const modeLabel = computed(() => (props.mode === 'active' ? 'active days' : 'all days'))

const todayItems = computed(() =>
  (props.todayGroups || [])
    .filter((g) => Number(g.todayHours) > 0)
    .map((g) => ({
      ...g,
      todayHours: Number(g.todayHours) || 0,
      color: g.color || 'var(--brand)',
    })),
)

const todayTotal = computed(() => {
  if (todayItems.value.length) {
    return todayItems.value.reduce((sum, g) => sum + g.todayHours, 0)
  }
  const v = (props.summary as any)?.todayHours
  return typeof v === 'number' && Number.isFinite(v) ? v : null
})

const titleText = computed(() => props.title || 'Time Summary')
const headerText = computed(() => {
  const base = titleText.value
  const range = props.summary?.rangeLabel || ''
  return range ? `${base} · ${range}` : base
})
const cardStyle = computed(() => ({ background: props.cardBg || undefined }))
const showHeader = computed(() => props.showHeader !== false)
const showHistory = computed(() => props.showHistory !== false)
const historyView = computed(() => (props.historyView === 'pills' ? 'pills' : 'list'))
const historyViewLabel = computed(() => (historyView.value === 'pills' ? 'Compact' : 'Detailed'))
const showActivityDetails = computed(() => props.showActivityDetails !== false)
const offsetBase = computed(() =>
  Number.isFinite(props.summary.offset) ? props.summary.offset : (props.offset ?? 0),
)
const comparisonOffset = computed(() => offsetBase.value - 1)
const comparisonShift = computed(() => comparisonOffset.value - offsetBase.value)
const comparisonOffsetLabel = computed(() => formatOffset(comparisonOffset.value))
const comparisonSpanLabel = computed(() => comparisonRangeLabel(comparisonShift.value))
const activityOffsetSuffix = computed(() => {
  if (offsetBase.value === 0) return ''
  return ` (offset ${formatOffset(offsetBase.value)})`
})

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

const inlineStats = computed(() => {
  const parts: string[] = []
  if (summaryConfig.value.showAverage) {
    parts.push(`${n2(props.summary.avgDay)} h/day (${modeLabel.value})`)
    parts.push(`${n2(props.summary.avgEvent)} h/event`)
  }
  if (summaryConfig.value.showMedian) {
    parts.push(`${n2(props.summary.medianDay)} h median/day`)
  }
  return parts.filter(Boolean).join(' · ')
})

const activity = computed(() => props.activitySummary ?? null)
const lastDayOffLabel = computed(() => activity.value?.lastDayOff || '—')
const typicalWindow = computed(() => {
  const start = timeOf(activity.value?.typicalStart ?? null)
  const end = timeOf(activity.value?.typicalEnd ?? null)
  if (start && end) return `${start}–${end}`
  if (start) return `${start}→`
  if (end) return `→${end}`
  return '—'
})
const earliestLatestLabel = computed(() => {
  const earliest = timeOf(activity.value?.earliestStart ?? null)
  const latest = timeOf(activity.value?.latestEnd ?? null)
  if (!earliest && !latest) return '—'
  return `${earliest || '—'} / ${latest || '—'}`
})
const longestSessionLabel = computed(() => {
  const longest = activity.value?.longestSession
  if (longest == null) return '—'
  return `${Number(longest).toFixed(1)} h`
})
const weekendDeltaLabel = computed(() => {
  if (!activity.value?.delta) return ''
  return shareDeltaLabel(activity.value.weekendShare, activity.value.delta.weekendShare)
})
const eveningDeltaLabel = computed(() => {
  if (!activity.value?.delta) return ''
  return shareDeltaLabel(activity.value.eveningShare, activity.value.delta.eveningShare)
})

const historyItems = computed(() => {
  if (!showHistory.value) return []
  const history = Array.isArray(props.history) ? props.history : []
  return history.map((entry) => {
    const metrics: HistoryMetric[] = []
    if (summaryConfig.value.showTotal) {
      metrics.push({ key: 'total', label: 'Total', value: `${n2(entry.totalHours)} h` })
    }
    if (summaryConfig.value.showAverage) {
      metrics.push({ key: 'avg-day', label: `Avg/day (${modeLabel.value})`, value: `${n2(entry.avgDay)} h` })
      metrics.push({ key: 'avg-event', label: 'Avg/event', value: `${n2(entry.avgEvent)} h` })
    }
    if (summaryConfig.value.showMedian) {
      metrics.push({ key: 'median', label: 'Median/day', value: `${n2(entry.medianDay)} h` })
    }
    if (summaryConfig.value.showBusiest) {
      metrics.push({ key: 'busiest', label: 'Busiest', value: formatBusiest(entry.busiest) })
    }
    if (summaryConfig.value.showWorkday) {
      metrics.push({
        key: 'workday',
        label: 'Workdays',
        value: `${n2(entry.workdayAvg)} h avg · ${n2(entry.workdayMedian)} h median`,
      })
    }
    if (summaryConfig.value.showWeekend) {
      const share = summaryConfig.value.showWeekendShare && entry.weekendShare != null
        ? ` (${n1(entry.weekendShare)}%)`
        : ''
      metrics.push({
        key: 'weekend',
        label: 'Weekend',
        value: `${n2(entry.weekendAvg)} h avg · ${n2(entry.weekendMedian)} h median${share}`,
      })
    }
    if (summaryConfig.value.showCalendarSummary) {
      metrics.push({
        key: 'calendars',
        label: `${entry.activeCalendars} calendars`,
        value: entry.calendarSummary || '—',
      })
    }
    if (summaryConfig.value.showTopCategory) {
      metrics.push({
        key: 'top-category',
        label: 'Top category',
        value: formatTopCategory(entry.topCategory),
      })
    }
    if (summaryConfig.value.showBalance) {
      metrics.push({
        key: 'balance',
        label: 'Balance index',
        value: entry.balanceIndex == null ? '—' : entry.balanceIndex.toFixed(2),
      })
    }
    metrics.push({ key: 'events', label: 'Events', value: String(entry.activity?.events ?? 0) })
    metrics.push({ key: 'active-days', label: 'Active days', value: String(entry.activity?.activeDays ?? 0) })
    metrics.push({ key: 'typical', label: 'Typical', value: formatTypical(entry.activity?.typicalStart, entry.activity?.typicalEnd) })
    if (showActivityDetails.value) {
      metrics.push({
        key: 'weekend-share',
        label: 'Weekend share',
        value: entry.activity?.weekendShare == null ? '—' : `${n1(entry.activity.weekendShare)}%`,
      })
      metrics.push({
        key: 'evening-share',
        label: 'Evening share',
        value: entry.activity?.eveningShare == null ? '—' : `${n1(entry.activity.eveningShare)}%`,
      })
      metrics.push({
        key: 'earliest-latest',
        label: 'Earliest/Late',
        value: formatEarliestLatest(entry.activity?.earliestStart, entry.activity?.latestEnd),
      })
      metrics.push({
        key: 'overlaps',
        label: 'Overlaps',
        value: String(entry.activity?.overlapEvents ?? 0),
      })
      metrics.push({
        key: 'longest',
        label: 'Longest',
        value: formatLongest(entry.activity?.longestSession),
      })
      metrics.push({
        key: 'last-day-off',
        label: 'Last day off',
        value: entry.activity?.lastDayOff || '—',
      })
      metrics.push({
        key: 'last-half-day',
        label: 'Last half day',
        value: entry.activity?.lastHalfDayOff || '—',
      })
    }

    return {
      offset: entry.offset,
      label: entry.label || `Offset ${formatOffset(entry.offset)}`,
      range: formatRangeSpan(entry.rangeStart, entry.rangeEnd),
      metrics,
    }
  })
})

const rangeSpanLabel = computed(() => {
  const from = props.summary.rangeStart || props.rangeStart
  const to = props.summary.rangeEnd || props.rangeEnd
  if (!from || !to) return ''
  const start = parseDate(from)
  const end = parseDate(to)
  if (!start || !end) return ''
  const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
  const startLabel = fmt.format(start)
  const endLabel = fmt.format(end)
  return startLabel === endLabel ? startLabel : `${startLabel}–${endLabel}`
})

const deltaLine = computed(() => {
  const delta = props.summary.delta
  if (!delta) return ''
  const current = props.summary.totalHours
  const prev = current - delta.totalHours
  const pct = prev !== 0 ? (delta.totalHours / prev) * 100 : 0
  const comparisonSpan = comparisonSpanLabel.value
  const sign = delta.totalHours >= 0 ? '+' : '−'
  const hoursLabel = `${sign}${n2(Math.abs(delta.totalHours))} h`
  const pctLabel = `${sign}${Math.abs(pct).toFixed(1)}%`
  const offsetLabel = comparisonOffsetLabel.value
  const rangeLabel = comparisonSpan ? ` (${comparisonSpan})` : ''
  return `Δ vs. offset ${offsetLabel}${rangeLabel}: ${hoursLabel} / ${pctLabel}`
})

function n1(v: unknown) {
  return Number(v ?? 0).toFixed(1)
}
function n2(v: unknown) {
  return Number(v ?? 0).toFixed(2)
}

function timeOf(value: string | null | undefined) {
  if (!value) return ''
  if (/^\d{2}:\d{2}$/.test(value)) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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

function pct(value: number | null | undefined) {
  if (value == null) return '0.0%'
  const num = Math.max(0, Math.min(100, Number(value)))
  return `${num.toFixed(1)}%`
}

function parseDate(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const date = new Date(trimmed.length === 10 ? `${trimmed}T00:00:00` : trimmed)
  return Number.isNaN(date.getTime()) ? null : date
}

function shiftRange(date: Date, mode: string, offset: number) {
  const next = new Date(date)
  if (mode === 'month') {
    next.setMonth(next.getMonth() + offset)
  } else {
    next.setDate(next.getDate() + offset * 7)
  }
  return next
}

function comparisonRangeLabel(shift: number) {
  const mode = (props.rangeMode || 'week').toString().toLowerCase()
  const from = parseDate(props.summary.rangeStart || props.rangeStart || '')
  const to = parseDate(props.summary.rangeEnd || props.rangeEnd || '')
  if (!from || !to) return ''
  const start = shiftRange(from, mode, shift)
  const end = shiftRange(to, mode, shift)
  const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
  const startLabel = fmt.format(start)
  const endLabel = fmt.format(end)
  return startLabel === endLabel ? startLabel : `${startLabel}–${endLabel}`
}

function formatOffset(offset: number) {
  if (offset === 0) return '0'
  return offset > 0 ? `+${offset}` : `${offset}`
}

function formatRangeSpan(startValue?: string, endValue?: string) {
  const start = startValue ? parseDate(startValue) : null
  const end = endValue ? parseDate(endValue) : null
  if (!start || !end) return ''
  const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
  const startLabel = fmt.format(start)
  const endLabel = fmt.format(end)
  return startLabel === endLabel ? startLabel : `${startLabel}–${endLabel}`
}

function formatBusiest(busiest: { date?: string; hours?: number } | null) {
  if (!busiest?.date) return '—'
  const hours = Number(busiest?.hours ?? 0)
  return `${busiest.date} · ${n2(hours)} h`
}

function formatTopCategory(cat: HistoryEntry['topCategory']) {
  if (!cat) return '—'
  const targetPart = cat.targetHours > 0 ? ` (${Math.round(cat.percent)}% of ${n2(cat.targetHours)} h)` : ''
  return `${cat.label} — ${n2(cat.actualHours)} h${targetPart}`
}

function formatTypical(start?: string | null, end?: string | null) {
  const s = timeOf(start || null)
  const e = timeOf(end || null)
  if (s && e) return `${s}–${e}`
  if (s) return `${s}→`
  if (e) return `→${e}`
  return '—'
}

function formatEarliestLatest(earliest?: string | null, latest?: string | null) {
  const s = timeOf(earliest || null)
  const e = timeOf(latest || null)
  if (!s && !e) return '—'
  return `${s || '—'} / ${e || '—'}`
}

function formatLongest(value?: number | null) {
  if (value == null) return '—'
  return `${Number(value).toFixed(1)} h`
}

function shareDeltaLabel(current: number | null | undefined, delta: number | null | undefined) {
  if (delta == null || current == null) return ''
  const prev = current - delta
  return `Δ vs. offset ${comparisonOffsetLabel.value} → ${pct(prev)}`
}
</script>

<style scoped>
.card.time-summary {
  display: flex;
  flex-direction: column;
  gap: var(--widget-gap, 6px);
  font-size: var(--widget-font, 13px);
  color: var(--muted);
  --widget-pad: calc(14px * var(--widget-space, 1));
  padding: var(--widget-pad, 14px);
}
.today-highlight{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:calc(10px * var(--widget-space, 1)) calc(12px * var(--widget-space, 1));
  border-radius:calc(10px * var(--widget-space, 1));
  background: color-mix(in oklab, var(--brand, #2563eb) 14%, transparent);
  border:1px solid color-mix(in oklab, var(--brand, #2563eb), transparent 70%);
  color: var(--fg);
}
.today-label{
  font-size:calc(12px * var(--widget-scale, 1));
  text-transform:uppercase;
  letter-spacing:0.04em;
  color: color-mix(in oklab, var(--fg), transparent 35%);
}
.today-value{
  font-size:calc(18px * var(--widget-scale, 1));
  font-weight:700;
  letter-spacing:-0.02em;
}
.today-cats{
  display:flex;
  flex-wrap:wrap;
  gap:calc(8px * var(--widget-space, 1)) calc(12px * var(--widget-space, 1));
  font-size:calc(12px * var(--widget-scale, 1));
  color: var(--fg);
}
.today-cat{
  display:inline-flex;
  align-items:center;
  gap:calc(6px * var(--widget-space, 1));
  padding:calc(4px * var(--widget-space, 1)) calc(8px * var(--widget-space, 1));
  border-radius:calc(8px * var(--widget-space, 1));
  background: color-mix(in oklab, var(--card, #fff), transparent 6%);
  border:1px solid color-mix(in oklab, var(--line, #e5e7eb), transparent 30%);
}
.today-cat .dot{
  width:calc(9px * var(--widget-space, 1));
  height:calc(9px * var(--widget-space, 1));
  border-radius:50%;
  box-shadow:0 0 0 1px color-mix(in oklab, var(--fg) 10%, transparent);
}
.today-cat .name{
  font-weight:600;
}
.today-cat .value{
  color: var(--muted);
}
.time-summary-firstline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--widget-gap, 8px);
  font-size: var(--widget-title-size, calc(14px * var(--widget-scale, 1)));
  color: var(--fg);
  font-weight: 600;
}
.mode-pill {
  display: inline-flex;
  align-items: center;
  padding: calc(2px * var(--widget-space, 1)) calc(8px * var(--widget-space, 1));
  font-size: calc(11px * var(--widget-scale, 1));
  font-weight: 600;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand) 18%, white);
  color: var(--brand);
  text-transform: uppercase;
  letter-spacing: .05em;
}
.time-summary-metrics {
  display: grid;
  gap: calc(4px * var(--widget-space, 1));
  margin: 0;
  padding: 0;
  list-style: none;
}
.time-summary-metrics li {
  display: flex;
  flex-wrap: wrap;
  gap: calc(4px * var(--widget-space, 1));
  color: var(--muted);
}
.time-summary-metrics strong {
  color: var(--fg);
  font-size: calc(14px * var(--widget-scale, 1));
}
.time-summary-inline {
  font-size: calc(13px * var(--widget-scale, 1));
  color: var(--fg);
}
.time-summary-row {
  display: flex;
  flex-wrap: wrap;
  gap: calc(4px * var(--widget-space, 1));
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
  gap: calc(6px * var(--widget-space, 1));
}
.time-summary-activity {
  margin-top: calc(6px * var(--widget-space, 1));
  padding-top: calc(6px * var(--widget-space, 1));
  border-top: 1px solid var(--line);
  display: grid;
  gap: calc(2px * var(--widget-space, 1));
  font-size: calc(12px * var(--widget-scale, 1));
  color: var(--muted);
}
.time-summary-activity__title {
  font-weight: 600;
  color: var(--fg);
}
.time-summary-activity__line {
  display: flex;
  flex-wrap: wrap;
  gap: calc(6px * var(--widget-space, 1));
}
.time-summary-activity__delta {
  color: var(--muted);
}
.time-summary-delta {
  margin-top: calc(6px * var(--widget-space, 1));
  padding-top: calc(6px * var(--widget-space, 1));
  border-top: 1px dashed color-mix(in oklab, var(--muted), transparent 70%);
  font-size: calc(12px * var(--widget-scale, 1));
  color: var(--muted);
}
.time-summary-history {
  margin-top: calc(8px * var(--widget-space, 1));
  padding-top: calc(8px * var(--widget-space, 1));
  border-top: 1px solid var(--line);
  display: grid;
  gap: calc(8px * var(--widget-space, 1));
}
.time-summary-history__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(8px * var(--widget-space, 1));
}
.time-summary-history__title {
  font-weight: 600;
  color: var(--fg);
}
.time-summary-history__mode {
  font-size: calc(11px * var(--widget-scale, 1));
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}
.time-summary-history__list {
  display: grid;
  gap: calc(10px * var(--widget-space, 1));
}
.history-entry {
  border: 1px solid color-mix(in oklab, var(--line, #e5e7eb), transparent 20%);
  border-radius: calc(12px * var(--widget-space, 1));
  padding: calc(10px * var(--widget-space, 1));
  background: color-mix(in oklab, var(--card, #fff), transparent 6%);
}
.history-entry__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: calc(6px * var(--widget-space, 1)) calc(10px * var(--widget-space, 1));
  margin-bottom: calc(8px * var(--widget-space, 1));
}
.history-entry__title {
  font-weight: 600;
  color: var(--fg);
}
.history-entry__range {
  font-size: calc(11px * var(--widget-scale, 1));
  color: var(--muted);
}
.history-entry__metrics {
  display: grid;
  gap: calc(6px * var(--widget-space, 1));
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}
.history-entry__metric {
  display: flex;
  flex-direction: column;
  gap: calc(2px * var(--widget-space, 1));
}
.history-entry__metric-label {
  font-size: calc(11px * var(--widget-scale, 1));
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.history-entry__metric-value {
  font-size: calc(12px * var(--widget-scale, 1));
  color: var(--fg);
}
.time-summary-history__pills {
  display: grid;
  gap: calc(10px * var(--widget-space, 1));
}
.history-pill {
  border: 1px solid color-mix(in oklab, var(--line, #e5e7eb), transparent 20%);
  border-radius: calc(999px * var(--widget-space, 1));
  padding: calc(8px * var(--widget-space, 1)) calc(12px * var(--widget-space, 1));
  background: color-mix(in oklab, var(--card, #fff), transparent 6%);
  display: grid;
  gap: calc(6px * var(--widget-space, 1));
}
.history-pill__title {
  font-weight: 600;
  color: var(--fg);
  font-size: calc(12px * var(--widget-scale, 1));
}
.history-pill__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: calc(6px * var(--widget-space, 1));
}
.history-pill__metric {
  display: inline-flex;
  align-items: center;
  gap: calc(4px * var(--widget-space, 1));
  padding: calc(2px * var(--widget-space, 1)) calc(8px * var(--widget-space, 1));
  border-radius: 999px;
  background: color-mix(in oklab, var(--card, #fff), transparent 12%);
  border: 1px solid color-mix(in oklab, var(--line, #e5e7eb), transparent 35%);
}
.history-pill__metric-label {
  font-size: calc(10px * var(--widget-scale, 1));
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
}
.history-pill__metric-value {
  font-size: calc(11px * var(--widget-scale, 1));
  color: var(--fg);
  font-weight: 600;
}
.summary-badge {
  display: inline-flex;
  align-items: center;
  gap: calc(4px * var(--widget-space, 1));
  padding: calc(2px * var(--widget-space, 1)) calc(8px * var(--widget-space, 1));
  border-radius: 999px;
  font-size: calc(11px * var(--widget-scale, 1));
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
