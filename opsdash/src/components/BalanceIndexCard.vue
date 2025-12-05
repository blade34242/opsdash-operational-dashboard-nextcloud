<template>
  <div class="balance-card" :style="cardStyle">
    <div class="header">
      <div class="title-row">
        <span class="title">{{ titleText }}</span>
      </div>
      <div class="index" v-if="overview">
        <div class="index-value">{{ overview.index ?? '—' }}</div>
        <div class="index-label">Balance index</div>
      </div>
    </div>

    <div class="trend" v-if="showTrend && hasTrend">
      <div class="trend-line">
        <div
          v-for="(pt, idx) in filteredPoints"
          :key="idx"
          :class="[
            'trend-block',
            {
              current: idx === (filteredPoints.length - 1),
              'no-range': !hasRangeLabel(idx),
              'no-offset': !offsetEnabled,
            },
          ]"
          :title="pt.label || ''"
          :style="trendBlockStyle(idx)"
        >
          <div class="trend-line-row">
            <span class="trend-value">{{ formatIndex(pt.index) }}</span>
            <span class="trend-range">{{ displayRange(idx) }}</span>
            <span class="trend-offset">{{ displayOffset(idx) }}</span>
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
  showRangeLabels?: boolean
  showOffsetLabels?: boolean
  thresholds?: {
    noticeAbove?: number
    noticeBelow?: number
    warnAbove?: number
    warnBelow?: number
    warnIndex?: number
  }
  title?: string
  cardBg?: string | null
  targetsCategories?: Array<{ id: string; targetHours: number }>
  trendColor?: string
}>()

const titleText = computed(() => props.title || 'Balance Index')
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
  })
  return points.slice().reverse()
})
const filteredPoints = computed(() => {
  if (props.showCurrent === false && trendPoints.value.length > 1) {
    return trendPoints.value.slice(0, -1)
  }
  return trendPoints.value
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

const formatIndex = (val?: number) => {
  return Number.isFinite(val) ? (val as number).toFixed(2) : '—'
}
const baseTrendColor = computed(() => props.trendColor || '#2563EB')

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

const offsetEnabled = computed(() => props.showOffsetLabels !== false)
const resolvedRangeLabel = (idx: number) => {
  if (props.showRangeLabels === false) return ''
  const pt = filteredPoints.value[idx]
  const isCurrent = idx === filteredPoints.value.length - 1
  return pt?.label || (isCurrent ? props.rangeLabel || '' : '')
}
const hasRangeLabel = (idx: number) => !!resolvedRangeLabel(idx)

const displayOffset = (idx: number) => {
  if (!offsetEnabled.value) return ''
  const offsetFromCurrent = filteredPoints.value.length - 1 - idx
  const offsetLabel = offsetFromCurrent === 0 ? 'Current' : `-${offsetFromCurrent} wk`
  const rangeLabel = resolvedRangeLabel(idx).trim().toLowerCase()
  if (rangeLabel && rangeLabel === offsetLabel.trim().toLowerCase()) return ''
  return offsetLabel
}
const displayRange = (idx: number) => {
  const label = resolvedRangeLabel(idx)
  return label || ''
}
</script>

<style scoped>
.balance-card{
  background:var(--card,#fff);
  border:1px solid var(--color-border,#e5e7eb);
  border-radius:12px;
  padding:12px;
  color:var(--fg,#0f172a);
  display:flex;
  flex-direction:column;
  gap:10px;
  font-size:calc(14px * var(--widget-text-scale, 1));
}
.header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
}
.title-row{
  display:flex;
  align-items:center;
  gap:8px;
}
.title{
  font-weight:600;
  font-size:calc(1em * 1.02);
}
.range{
  font-size:12px;
  color:var(--muted);
}
.badge{
  background:var(--color-primary,#2563eb);
  color:#fff;
  border-radius:999px;
  padding:4px 8px;
  font-size:12px;
}
.index{
  text-align:right;
}
.index-value{
  font-size:calc(22px * var(--widget-text-scale, 1));
  font-weight:700;
}
.index-label{
  font-size:calc(12px * var(--widget-text-scale, 1));
  color:var(--muted);
}
.trend{
  display:flex;
  align-items:center;
  gap:10px;
}
.trend-line{
  flex:1;
  display:grid;
  grid-template-columns:repeat(auto-fit, minmax(90px, 1fr));
  gap:6px;
  justify-content:flex-start;
}
.trend-block{
  min-width:0;
  background:color-mix(in oklab, var(--color-primary,#2563eb), #e5e7eb 50%);
  border-radius:8px;
  padding:4px 5px;
  display:flex;
  align-items:center;
  justify-content:center;
  position:relative;
  color:#fff;
  font-size:11px;
  border:none;
  cursor:default;
}
.trend-block.no-range{
  grid-column: span 1;
}
.trend-block.no-range.no-offset{
  grid-column: span 1;
}
.trend-block.no-offset{
  grid-column: span 1;
}
.trend-block.current{
  background:var(--color-primary,#2563eb);
  box-shadow:0 0 0 2px color-mix(in oklab, var(--color-primary,#2563eb), #ffffff 60%);
}
.trend-line-row{
  display:grid;
  grid-template-columns: 1fr 1.1fr 0.8fr;
  align-items:center;
  gap:4px;
  width:100%;
}
.trend-block.no-range .trend-line-row{
  grid-template-columns: 1fr 0.9fr;
}
.trend-block.no-offset .trend-line-row{
  grid-template-columns: 1fr 1.1fr;
}
.trend-block.no-range.no-offset .trend-line-row{
  grid-template-columns: 1fr;
}
.trend-value{
  font-weight:700;
  font-size:calc(13px * var(--widget-text-scale, 1));
  text-align:left;
}
.trend-range{
  flex:1;
  text-align:center;
  font-size:calc(10px * var(--widget-text-scale, 1));
  color:#e5e7eb;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.trend-offset{
  min-width:46px;
  text-align:right;
  font-size:calc(10px * var(--widget-text-scale, 1));
  color:#cbd5f5;
}
.trend-delta{
  font-size:calc(12px * var(--widget-text-scale, 1));
  color:var(--muted);
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
}
.trend-left{
  font-weight:700;
  color:var(--fg,#0f172a);
}
.trend-center{
  flex:1;
  text-align:center;
  font-size:calc(11px * var(--widget-text-scale, 1));
}
.trend-right{
  min-width:56px;
  text-align:right;
  font-size:calc(11px * var(--widget-text-scale, 1));
}
.section-title{
  font-weight:600;
  font-size:calc(13px * var(--widget-text-scale, 1));
  margin-bottom:4px;
}
.messages ul{
  margin:0;
  padding-left:18px;
  color:var(--muted);
  font-size:calc(13px * var(--widget-text-scale, 1));
}
.messages li{
  margin-bottom:2px;
}
.messages li:last-child{ margin-bottom:0; }
.config{
  font-size:calc(12px * var(--widget-text-scale, 1));
  color:var(--muted);
  display:grid;
  grid-template-columns: repeat(auto-fit, minmax(140px,1fr));
  gap:6px;
}
.empty{
  text-align:center;
  color:var(--muted);
  font-size:calc(13px * var(--widget-text-scale, 1));
}
</style>
