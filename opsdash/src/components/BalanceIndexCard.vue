<template>
  <div class="balance-card" :style="cardStyle">
    <div class="header" :class="{ compact: isCompact }">
      <div class="title-row" v-if="showHeader">
        <span class="title">{{ titleText }}</span>
      </div>
      <div class="index" :class="{ centered: isCompact }" v-if="overview">
        <div class="index-value">{{ formatIndex(overview.index) }}</div>
        <div class="index-label">Balance index</div>
      </div>
    </div>

    <div class="trend" v-if="showTrend && hasTrend">
      <div class="trend-line" :style="trendLineStyle">
        <div
          v-for="(pt, idx) in filteredPoints"
          :key="idx"
          :class="[
            'trend-block',
            {
              current: idx === (filteredPoints.length - 1),
              'no-range': !hasRangeLabel(idx),
            },
          ]"
          :title="pt.label || ''"
          :style="trendBlockStyle(idx)"
        >
          <div class="trend-line-row">
            <span class="trend-value">{{ formatIndex(pt.index) }}</span>
            <span class="trend-range">{{ labelMode === 'date' ? (computedRange(idx) || displayRange(idx)) : '' }}</span>
            <span class="trend-offset">
              <template v-if="labelMode === 'period'">{{ computedPeriodTag(idx) }}</template>
              <template v-else-if="labelMode === 'offset'">{{ displayOffset(idx) }}</template>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="messages" v-if="showMessages && limitedMessages.length">
      <div class="section-title">Messages</div>
      <ul>
        <li v-for="(msg, idx) in limitedMessages" :key="idx">{{ msg }}</li>
      </ul>
    </div>

    <div class="config" v-if="showConfig">
      <div>Basis: {{ configSummary.basis }}</div>
      <div>Notice ±: +{{ configSummary.noticeAbove ?? '—' }} / -{{ configSummary.noticeBelow ?? '—' }}</div>
      <div>Warn ±: +{{ configSummary.warnAbove ?? '—' }} / -{{ configSummary.warnBelow ?? '—' }}</div>
      <div>Warn index: {{ configSummary.warnIndex ?? '—' }}</div>
    </div>

    <div v-if="!overview" class="empty">No balance data.</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { createDefaultBalanceConfig } from '../services/targets/config'
import { buildIndexTrend } from '../services/balanceIndex'

const props = defineProps<{
  overview?: any
  rangeLabel?: string
  showBadge?: boolean
  showTrend?: boolean
  showMessages?: boolean
  showConfig?: boolean
  messageLimit?: number
  lookbackWeeks?: number
  loopbackCount?: number
  indexBasis?: string
  showCurrent?: boolean
  labelMode?: 'date' | 'period' | 'offset'
  reverseTrend?: boolean
  from?: string
  to?: string
  rangeMode?: 'week' | 'month' | string
  thresholds?: {
    noticeAbove?: number
    noticeBelow?: number
    warnAbove?: number
    warnBelow?: number
    warnIndex?: number
  }
  title?: string
  cardBg?: string | null
  showHeader?: boolean
  targetsCategories?: Array<{ id: string; targetHours: number }>
  trendColor?: string
}>()

const titleText = computed(() => props.title || 'Balance Index')
const showHeader = computed(() => props.showHeader !== false)
const trendPoints = computed(() => {
  const listRaw = Array.isArray(props.overview?.trend?.history)
    ? props.overview.trend.history
    : Array.isArray((props.overview as any)?.trendHistory)
      ? (props.overview as any).trendHistory
      : []
  const list = [...listRaw]
  const lookback = Math.max(
    1,
    Number.isFinite(props.loopbackCount) && props.loopbackCount
      ? Number(props.loopbackCount)
      : Number.isFinite(props.lookbackWeeks) && props.lookbackWeeks
        ? Number(props.lookbackWeeks)
        : 5,
  )
  const categories = props.targetsCategories || []
  const points = buildIndexTrend({
    history: list,
    targetsConfig: { categories },
    basis: props.indexBasis,
    lookback,
    currentIndex: typeof props.overview?.index === 'number' ? props.overview.index : undefined,
  })
  return points.slice()
})
const filteredPoints = computed(() => {
  let pts = trendPoints.value.slice()
  if (props.showCurrent === false) {
    pts = pts.filter((pt: any) => (pt?.offset ?? 0) !== 0)
  }
  if (props.reverseTrend) {
    return pts.slice().reverse()
  }
  return pts
})
const hasTrend = computed(() => filteredPoints.value.length > 0)
const messages = computed(() => props.overview?.warnings || [])
const limitedMessages = computed(() => {
  const list = messages.value
  const limit = Number.isFinite(props.messageLimit) ? Number(props.messageLimit) : Infinity
  if (!Number.isFinite(limit) || limit <= 0) return list
  return list.slice(0, limit)
})
const cardStyle = computed(() => ({ background: props.cardBg || undefined }))
const configSummary = computed(() => {
  const defaults = createDefaultBalanceConfig()
  const t = {
    noticeAbove: props.thresholds?.noticeAbove ?? defaults.thresholds.noticeAbove,
    noticeBelow: props.thresholds?.noticeBelow ?? defaults.thresholds.noticeBelow,
    warnAbove: props.thresholds?.warnAbove ?? defaults.thresholds.warnAbove,
    warnBelow: props.thresholds?.warnBelow ?? defaults.thresholds.warnBelow,
    warnIndex: props.thresholds?.warnIndex ?? defaults.thresholds.warnIndex,
  }
  return {
    basis: props.indexBasis || defaults.index.basis,
    ...t,
  }
})
const isCompact = computed(() => {
  const noTrend = props.showTrend === false || !hasTrend.value
  const noMessages = props.showMessages === false || limitedMessages.value.length === 0
  const noConfig = props.showConfig === false
  return noTrend && noMessages && noConfig
})

const formatIndex = (val?: number) => {
  return Number.isFinite(val) ? (val as number).toFixed(2) : '—'
}
const baseTrendColor = computed(() => props.trendColor || '#2563EB')
const labelMode = computed<'date' | 'period' | 'offset'>(() => {
  const mode = (props.labelMode || 'period').toString().toLowerCase()
  if (mode === 'date' || mode === 'offset') return mode as any
  return 'period'
})
const trendLineStyle = computed(() => {
  const mode = labelMode.value
  const min = mode === 'date' ? 108 : 88
  return { gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))` }
})

function shadeColor(hex: string, factor: number) {
  // factor: 0..1, 0 = original, 1 = darkest mix
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  const mix = (c: number) => Math.max(0, Math.min(255, Math.round(c * (1 - factor))))
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

const trendBlockStyle = (idx: number) => {
  const base = baseTrendColor.value
  const pt = filteredPoints.value[idx]
  const idxVal = Number(pt?.index ?? 0)
  const deviation = Math.min(1, Math.max(0, 1 - idxVal)) // 0 when perfect, 1 when worst
  const color = shadeColor(base, deviation * 0.6)
  return {
    background: color,
    boxShadow: idx === 0 ? `0 0 0 2px color-mix(in oklab, ${color}, #ffffff 60%)` : undefined,
  }
}

const resolvedRangeLabel = (idx: number) => {
  if (labelMode.value !== 'date') return ''
  const pt = filteredPoints.value[idx]
  const isCurrent = (pt?.offset ?? 0) === 0
  return pt?.label || (isCurrent ? props.rangeLabel || '' : '')
}
const hasRangeLabel = (idx: number) => !!resolvedRangeLabel(idx)

const displayOffset = (idx: number) => {
  if (labelMode.value !== 'offset') return ''
  const offsetFromCurrent = filteredPoints.value[idx]?.offset ?? idx
  if (offsetFromCurrent === 0) return 'Current'
  return `-${offsetFromCurrent}`
}
const displayRange = (idx: number) => {
  if (labelMode.value !== 'date') return ''
  const label = resolvedRangeLabel(idx)
  if (label) return label
  const offsetFromCurrent = filteredPoints.value[idx]?.offset ?? idx
  if (offsetFromCurrent === 0 && props.rangeLabel) return props.rangeLabel
  return ''
}

function isoWeek(date: Date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return weekNo
}
const dateFormatter = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: '2-digit' })
function addDays(base: Date, days: number) {
  const next = new Date(base)
  next.setDate(next.getDate() + days)
  return next
}
function addMonths(base: Date, months: number) {
  const next = new Date(base)
  next.setMonth(next.getMonth() + months)
  return next
}
function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}
function isDefaultOffsetLabel(label: string | undefined) {
  return !label ? true : /^-\d+\s*wk$/i.test(label.trim())
}
function formatRange(from?: Date, to?: Date) {
  if (!from || !to) return ''
  const fromLabel = dateFormatter.format(from)
  const toLabel = dateFormatter.format(to)
  return fromLabel === toLabel ? fromLabel : `${fromLabel}–${toLabel}`
}
function computedRange(idx: number) {
  const offsetFromCurrent = filteredPoints.value[idx]?.offset ?? idx
  if (!props.from || !props.to) {
    const label = filteredPoints.value[idx]?.label
    return isDefaultOffsetLabel(label) ? '' : (label || '')
  }
  const mode = (props.rangeMode || '').toLowerCase()
  const currentFrom = new Date(props.from)
  const currentTo = new Date(props.to)
  if (Number.isNaN(currentFrom.getTime()) || Number.isNaN(currentTo.getTime())) return ''
  if (mode === 'month') {
    const start = addMonths(currentFrom, -offsetFromCurrent)
    const end = endOfMonth(start)
    return formatRange(start, end)
  }
  // default week
  const start = addDays(currentFrom, -7 * offsetFromCurrent)
  const end = addDays(currentTo, -7 * offsetFromCurrent)
  return formatRange(start, end)
}
function computedPeriodTag(idx: number) {
  const offsetFromCurrent = filteredPoints.value[idx]?.offset ?? idx
  const mode = (props.rangeMode || '').toLowerCase()
  if (!props.from) {
    return offsetFromCurrent === 0 ? 'Current' : `- ${offsetFromCurrent} wk`
  }
  const start = mode === 'month'
    ? addMonths(new Date(props.from), -offsetFromCurrent)
    : addDays(new Date(props.from), -7 * offsetFromCurrent)
  if (Number.isNaN(start.getTime())) {
    return offsetFromCurrent === 0 ? 'Current' : `- ${offsetFromCurrent} wk`
  }
  if (mode === 'month') {
    const m = start.getMonth() + 1
    const targetMonth = new Date(start)
    const currentMonth = new Date(props.from).getMonth() + 1
    const displayMonth = offsetFromCurrent === 0 ? currentMonth : targetMonth.getMonth() + 1
    return `MONTH ${displayMonth}`
  }
  const w = isoWeek(start)
  const currentWeek = isoWeek(new Date(props.from))
  const displayWeek = offsetFromCurrent === 0 ? currentWeek : w
  return `WEEK ${displayWeek}`
}
</script>

<style scoped>
.balance-card{
  background:var(--card,#fff);
  border:1px solid var(--color-border,#e5e7eb);
  border-radius:calc(12px * var(--widget-space, 1));
  padding:var(--widget-pad, 12px);
  color:var(--fg,#0f172a);
  display:flex;
  flex-direction:column;
  gap:var(--widget-gap, 10px);
  font-size:calc(14px * var(--widget-scale, 1));
}
.header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:var(--widget-gap, 10px);
}
.header.compact{
  justify-content:center;
}
.title-row{
  display:flex;
  align-items:center;
  gap:calc(8px * var(--widget-space, 1));
}
.title{
  font-weight:600;
  font-size: var(--widget-title-size, calc(14px * var(--widget-scale, 1)));
}
.index{
  text-align:right;
}
.index.centered{
  text-align:center;
  width:100%;
}
.trend{
  display:flex;
  align-items:center;
  gap:var(--widget-gap, 10px);
}
.trend-line{
  flex:1;
  display:grid;
  grid-template-columns:repeat(auto-fit, minmax(calc(92px * var(--widget-scale, 1)), 1fr));
  gap:calc(6px * var(--widget-space, 1));
  justify-content:flex-start;
}
.trend-block{
  min-width:0;
  background:color-mix(in oklab, var(--color-primary,#2563eb), #e5e7eb 50%);
  border-radius:calc(8px * var(--widget-space, 1));
  padding:calc(4px * var(--widget-space, 1)) calc(5px * var(--widget-space, 1));
  display:flex;
  align-items:center;
  justify-content:center;
  position:relative;
  color:#fff;
  font-size:calc(11px * var(--widget-scale, 1));
  border:none;
  cursor:default;
}
.trend-block.no-range{
  grid-column: span 1;
  padding:calc(4px * var(--widget-space, 1)) calc(5px * var(--widget-space, 1));
}
.trend-block.no-range.no-offset{
  grid-column: span 1;
  padding:calc(4px * var(--widget-space, 1));
}
.trend-block.no-offset{
  grid-column: span 1;
  padding:calc(4px * var(--widget-space, 1)) calc(6px * var(--widget-space, 1));
}
.trend-block.current{
  background:var(--color-primary,#2563eb);
  box-shadow:0 0 0 2px color-mix(in oklab, var(--color-primary,#2563eb), #ffffff 60%);
}
.trend-line-row{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:calc(4px * var(--widget-space, 1));
  width:100%;
}
.trend-value{
  font-weight:700;
  font-size:calc(13px * var(--widget-scale, 1));
  text-align:left;
  white-space:nowrap;
}
.trend-range{
  flex:1;
  text-align:center;
  font-size:calc(10px * var(--widget-scale, 1));
  color:#e5e7eb;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.trend-offset{
  min-width:calc(52px * var(--widget-scale, 1));
  text-align:right;
  font-size:calc(10px * var(--widget-scale, 1));
  color:#cbd5f5;
  white-space:nowrap;
}
.trend-delta{
  font-size:calc(12px * var(--widget-scale, 1));
  color:var(--muted);
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:calc(8px * var(--widget-space, 1));
}
.trend-left{
  font-weight:700;
  color:var(--fg,#0f172a);
}
.trend-center{
  flex:1;
  text-align:center;
  font-size:calc(11px * var(--widget-scale, 1));
}
.trend-right{
  min-width:calc(56px * var(--widget-scale, 1));
  text-align:right;
  font-size:calc(11px * var(--widget-scale, 1));
}
.section-title{
  font-weight:600;
  font-size:calc(13px * var(--widget-scale, 1));
  margin-bottom:calc(4px * var(--widget-space, 1));
}
.messages ul{
  margin:0;
  padding-left:calc(18px * var(--widget-space, 1));
  color:var(--muted);
  font-size:calc(13px * var(--widget-scale, 1));
}
.messages li{
  margin-bottom:calc(2px * var(--widget-space, 1));
}
.messages li:last-child{ margin-bottom:0; }
.config{
  font-size:calc(12px * var(--widget-scale, 1));
  color:var(--muted);
  display:grid;
  grid-template-columns: repeat(auto-fit, minmax(calc(140px * var(--widget-scale, 1)),1fr));
  gap:calc(6px * var(--widget-space, 1));
}
.empty{
  text-align:center;
  color:var(--muted);
  font-size:calc(13px * var(--widget-scale, 1));
}
</style>
