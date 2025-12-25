<template>
  <div class="card targets-card" :style="cardStyle">
    <div class="targets-header" v-if="showHeader">
      <strong>{{ title || 'Targets' }}</strong>
      <span class="hint" v-if="total.targetHours > 0">{{ total.percent.toFixed(0) }}%</span>
    </div>
    <div class="targets-main">
      <div class="line total-line">
        <span class="value"><strong>{{ formatHours(total.actualHours) }}</strong> / {{ formatHours(total.targetHours) }} h</span>
        <span v-if="config.ui.showTotalDelta && total.targetHours > 0" :class="['delta', total.deltaHours >= 0 ? 'pos' : 'neg']">
          Δ {{ formatSigned(total.deltaHours) }}h
        </span>
      </div>
      <div class="line" v-if="config.ui.showNeedPerDay && total.targetHours > 0">
        Days left {{ total.daysLeft }} • Need {{ formatHours(total.needPerDay) }} h/day
      </div>
      <div class="line" v-if="showPace && total.targetHours > 0">
        Pace: {{ total.percent.toFixed(0) }}% vs {{ total.calendarPercent.toFixed(0) }}% →
        <span :class="['status-label', statusClass(total.status)]">{{ total.statusLabel }}</span>
      </div>
      <div class="line forecast" v-if="showForecast">
        Forecast: {{ summary.forecast.text }}
        <span class="hint">
          Linear {{ formatHours(summary.forecast.linear) }}h · Momentum {{ formatHours(summary.forecast.momentum) }}h · Primary: {{ methodLabel(summary.forecast.primaryMethod) }}
        </span>
      </div>
    </div>
    <div class="targets-badges" v-if="config.ui.badges && total.targetHours > 0">
      <span class="badge" :class="statusClass(total.status)">{{ total.statusLabel }}</span>
    </div>
    <div class="targets-categories" v-if="config.ui.showCategoryBlocks && categoryItems.length">
      <div class="category" v-for="cat in categoryItems" :key="cat.id">
        <div class="cat-top">
          <div class="cat-label">
            <span class="dot" :style="{ background: cat.color || 'var(--brand)' }"></span>
            <span class="name">{{ cat.label }}</span>
          </div>
          <div class="cat-meta">
            <span class="percent">{{ cat.percent.toFixed(0) }}%</span>
            <span v-if="config.ui.badges && cat.targetHours > 0" class="badge" :class="statusClass(cat.status)">{{ cat.statusLabel }}</span>
          </div>
        </div>
        <div class="cat-progress">
          <div class="bar">
            <div class="fill" :style="{ width: cat.progress + '%', background: cat.color || 'var(--brand)' }"></div>
            <div
              v-if="cat.todayWidth > 0"
              class="today-overlay"
              :style="{
                width: cat.todayWidth + '%',
                right: cat.todayRight + '%',
                background: cat.todayColor,
                borderColor: cat.todayBorder,
              }"
            ></div>
            <div
              v-if="cat.todayWidth > 0"
              class="today-chip"
              :style="{ left: cat.chipLeft + '%' , background: cat.todayColor, borderColor: cat.todayBorder }"
            >
              <span class="today-label">{{ cat.chipText }}</span>
            </div>
          </div>
        </div>
        <div class="cat-metrics">
          <strong>{{ formatHours(cat.actualHours) }}h</strong>
          <span class="hint">/ {{ formatHours(cat.targetHours) }}h</span>
          <span v-if="cat.targetHours > 0" :class="['delta', cat.deltaHours >= 0 ? 'pos' : 'neg']">
            Δ {{ formatSigned(cat.deltaHours) }}h
          </span>
          <span v-if="config.ui.showNeedPerDay && cat.targetHours > 0" class="hint">
            Need {{ formatHours(cat.needPerDay) }}h/day · {{ cat.daysLeft }} days left
          </span>
        </div>
        <div class="cat-footer" v-if="cat.calendarCount > 0">
          <span class="hint">{{ cat.calendarCount }} {{ cat.calendarLabel }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TargetsConfig, TargetsSummary, TargetsProgress } from '../services/targets'

type CategoryGroup = {
  id: string
  label: string
  summary: TargetsProgress
  color?: string
  rows?: any[]
  todayHours?: number
}

const props = withDefaults(defineProps<{
  summary: TargetsSummary
  config: TargetsConfig
  groups?: CategoryGroup[]
  showPace?: boolean
  showForecast?: boolean
  showHeader?: boolean
  title?: string
  cardBg?: string | null
}>(), {
  showPace: true,
  showForecast: true,
  title: 'Targets',
  cardBg: null,
})

const total = computed<TargetsProgress>(() => props.summary?.total ?? fallbackProgress('total', 'Total'))
const showHeader = computed(() => props.showHeader !== false)
const categoryGroups = computed<CategoryGroup[]>(() => {
  if (Array.isArray(props.groups) && props.groups.length) {
    return props.groups.map(group => ({
      id: group.id,
      label: group.label,
      summary: group.summary ?? fallbackProgress(group.id, group.label),
      color: group.color,
      rows: group.rows,
    }))
  }
  const cats = props.summary?.categories ?? []
  return cats.map(cat => ({
    id: cat.id,
    label: cat.label,
    summary: cat,
    color: undefined,
    rows: [],
  }))
})

const cardStyle = computed(() => ({
  background: props.cardBg || undefined,
}))

const categoryItems = computed(() => categoryGroups.value.map(group => {
  const summary = group.summary ?? fallbackProgress(group.id, group.label)
  const todayHours = Number((group as any).todayHours ?? 0)
  const targetHours = summary.targetHours
  const totalOver = Math.max(0, summary.actualHours - targetHours)
  const overToday = Math.min(totalOver, todayHours)
  const todayPct = targetHours > 0 ? (todayHours / targetHours) * 100 : 0
  const progressPct = clamp(summary.percent, 0, 200)
  return {
    id: group.id,
    label: group.label || summary.label,
    actualHours: summary.actualHours,
    targetHours,
    percent: summary.percent,
    deltaHours: summary.deltaHours,
    needPerDay: summary.needPerDay,
    daysLeft: summary.daysLeft,
    calendarPercent: summary.calendarPercent,
    gap: summary.gap,
    status: summary.status,
    statusLabel: summary.statusLabel,
    color: group.color,
    calendarCount: Array.isArray(group.rows) ? group.rows.length : 0,
    progress: progressPct,
    todayHours,
    overToday,
    todayWidth: targetHours > 0 ? clamp(todayPct, 2, 200) : 0,
    todayRight: Math.max(0, 100 - progressPct),
    chipLeft: Math.min(100, progressPct),
    chipText: overToday > 0
      ? `Today ${formatHours(todayHours)} (+${formatHours(overToday)})`
      : `Today ${formatHours(todayHours)}`,
    todayColor: group.color ? colorMix(group.color, 0.65) : 'var(--brand)',
    todayBorder: group.color ? colorMix(group.color, 0.35, true) : 'var(--brand)',
    calendarLabel: Array.isArray(group.rows) && group.rows.length === 1 ? 'calendar' : 'calendars',
  }
}).filter(item => item.targetHours > 0 || item.actualHours > 0 || item.calendarCount > 0))

function formatHours(value: number): string {
  if (!isFinite(value)) return '0'
  const rounded = Math.round(value * 10) / 10
  if (Math.abs(rounded - Math.round(rounded)) < 0.05) return String(Math.round(rounded))
  return rounded.toFixed(1)
}

function formatSigned(value: number): string {
  if (!isFinite(value) || Math.abs(value) < 0.005) return '0.0'
  const sign = value >= 0 ? '+' : '−'
  return sign + formatHours(Math.abs(value))
}

function statusClass(status: TargetsProgress['status']): string {
  switch (status) {
    case 'on_track': return 'status-on'
    case 'at_risk': return 'status-risk'
    case 'behind': return 'status-behind'
    case 'done': return 'status-done'
    default: return 'status-none'
  }
}

function fallbackProgress(id: string, label: string): TargetsProgress {
  return {
    id,
    label,
    actualHours: 0,
    targetHours: 0,
    percent: 0,
    deltaHours: 0,
    remainingHours: 0,
    needPerDay: 0,
    daysLeft: 0,
    calendarPercent: 0,
    gap: 0,
    status: 'none',
    statusLabel: '—',
    includeWeekend: true,
    paceMode: 'days_only',
  }
}

function clamp(value: number, min: number, max: number): number {
  if (!isFinite(value)) return min
  if (value < min) return min
  if (value > max) return max
  return value
}

function methodLabel(method: 'linear' | 'momentum'): string {
  return method === 'momentum' ? 'Momentum' : 'Linear'
}

function colorMix(hex: string, factor = 0.5, darker = false): string {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '')
  if (!m) return hex
  const r = parseInt(m[1], 16)
  const g = parseInt(m[2], 16)
  const b = parseInt(m[3], 16)
  const mix = Math.max(0, Math.min(1, factor))
  if (darker) {
    return `rgb(${Math.round(r * (1 - mix))},${Math.round(g * (1 - mix))},${Math.round(
      b * (1 - mix),
    )})`
  }
  return `rgb(${Math.round(r + (255 - r) * mix)},${Math.round(g + (255 - g) * mix)},${Math.round(
    b + (255 - b) * mix,
  )})`
}
</script>

<style scoped>
.targets-card{ display:flex; flex-direction:column; gap:var(--widget-gap, 8px); font-size:var(--widget-font, 14px) }
.targets-header{ display:flex; justify-content:space-between; align-items:center }
.targets-header strong{ font-size:calc(14px * var(--widget-scale, 1)) }
.targets-main{ display:flex; flex-direction:column; gap:calc(4px * var(--widget-space, 1)); font-size:calc(13px * var(--widget-scale, 1)) }
.targets-main .line{ display:flex; flex-wrap:wrap; gap:calc(6px * var(--widget-space, 1)) }
.targets-main .line.forecast{ flex-direction:column; gap:calc(2px * var(--widget-space, 1)) }
.targets-main .line .value{ display:flex; gap:calc(6px * var(--widget-space, 1)); align-items:center }
.targets-badges{ display:flex; flex-wrap:wrap; gap:calc(6px * var(--widget-space, 1)) }
.targets-categories{ display:flex; flex-direction:column; gap:calc(10px * var(--widget-space, 1)); padding-top:calc(6px * var(--widget-space, 1)); border-top:1px solid var(--line) }
.category{ display:flex; flex-direction:column; gap:calc(6px * var(--widget-space, 1)); font-size:calc(12px * var(--widget-scale, 1)); padding:calc(4px * var(--widget-space, 1)) 0 }
.category .cat-top{ display:flex; align-items:center; justify-content:space-between; gap:calc(8px * var(--widget-space, 1)) }
.category .cat-label{ display:flex; align-items:center; gap:calc(6px * var(--widget-space, 1)); font-weight:600; color:var(--fg) }
.category .cat-label .dot{ width:calc(10px * var(--widget-space, 1)); height:calc(10px * var(--widget-space, 1)); border-radius:50%; background:var(--brand); box-shadow:0 0 0 1px color-mix(in srgb, var(--fg) 10%, transparent) }
.category .cat-label .name{ color:var(--fg) }
.category .cat-meta{ display:flex; align-items:center; gap:calc(6px * var(--widget-space, 1)); font-weight:600; color:var(--muted) }
.category .cat-meta .percent{ font-variant-numeric:tabular-nums; color:var(--fg) }
.cat-progress .bar{ position:relative; width:100%; height:calc(8px * var(--widget-space, 1)); border-radius:999px; background:color-mix(in srgb, var(--muted) 20%, transparent); overflow:hidden }
.cat-progress .bar .fill{ height:100%; border-radius:999px; transition:width .2s ease; max-width:100% }
.cat-progress .bar .today-overlay{ position:absolute; top:calc(-2px * var(--widget-space, 1)); height:calc(12px * var(--widget-space, 1)); border-radius:calc(8px * var(--widget-space, 1)); opacity:0.85; border:1px solid transparent; pointer-events:none }
.today-chip{ position:absolute; top:calc(-22px * var(--widget-space, 1)); transform:translateX(-50%); padding:calc(2px * var(--widget-space, 1)) calc(8px * var(--widget-space, 1)); border-radius:999px; font-size:calc(10px * var(--widget-scale, 1)); font-weight:700; color:#fff; border:1px solid transparent; white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,0.12) }
.today-label{ font-size:calc(10px * var(--widget-scale, 1)); line-height:1.2 }
.category .cat-metrics{ display:flex; flex-wrap:wrap; gap:calc(6px * var(--widget-space, 1)); align-items:center; color:var(--fg) }
.cat-footer{ display:flex; justify-content:space-between; align-items:center }
.hint{ color:var(--muted); font-size:calc(12px * var(--widget-scale, 1)) }
.badge{ display:inline-flex; align-items:center; gap:calc(4px * var(--widget-space, 1)); padding:calc(2px * var(--widget-space, 1)) calc(8px * var(--widget-space, 1)); border-radius:999px; font-size:calc(11px * var(--widget-scale, 1)); font-weight:600; text-transform:uppercase; letter-spacing:.05em }
.status-label{ font-weight:600 }
.status-on{ background:color-mix(in srgb, var(--brand) 20%, white); color:var(--brand) }
.status-risk{ background:color-mix(in srgb, #f97316 20%, white); color:#f97316 }
.status-behind{ background:color-mix(in srgb, #ef4444 20%, white); color:#ef4444 }
.status-done{ background:color-mix(in srgb, var(--pos) 25%, white); color:var(--pos) }
.status-none{ background:color-mix(in srgb, var(--muted) 12%, white); color:var(--muted) }
.delta{ font-weight:600 }
.delta.pos{ color:var(--pos) }
.delta.neg{ color:var(--neg) }
.cat-metrics .hint{ font-size:calc(11px * var(--widget-scale, 1)) }
.cat-footer .hint{ font-size:calc(11px * var(--widget-scale, 1)) }
.cat-progress{ padding:calc(2px * var(--widget-space, 1)) 0 }
.cat-meta .badge{ font-size:calc(10px * var(--widget-scale, 1)) }
</style>
