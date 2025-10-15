<template>
  <div class="card targets-card">
    <div class="targets-header">
      <strong>Targets</strong>
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
      <div class="line" v-if="total.targetHours > 0">
        Pace: {{ total.percent.toFixed(0) }}% vs {{ total.calendarPercent.toFixed(0) }}% →
        <span :class="['status-label', statusClass(total.status)]">{{ total.statusLabel }}</span>
      </div>
      <div class="line forecast">
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
}

const props = defineProps<{
  summary: TargetsSummary
  config: TargetsConfig
  groups?: CategoryGroup[]
}>()

const total = computed<TargetsProgress>(() => props.summary?.total ?? fallbackProgress('total', 'Total'))
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

const categoryItems = computed(() => categoryGroups.value.map(group => {
  const summary = group.summary ?? fallbackProgress(group.id, group.label)
  return {
    id: group.id,
    label: group.label || summary.label,
    actualHours: summary.actualHours,
    targetHours: summary.targetHours,
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
    progress: clamp(summary.percent, 0, 140),
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
</script>

<style scoped>
.targets-card{ display:flex; flex-direction:column; gap:8px }
.targets-header{ display:flex; justify-content:space-between; align-items:center }
.targets-header strong{ font-size:14px }
.targets-main{ display:flex; flex-direction:column; gap:4px; font-size:13px }
.targets-main .line{ display:flex; flex-wrap:wrap; gap:6px }
.targets-main .line.forecast{ flex-direction:column; gap:2px }
.targets-main .line .value{ display:flex; gap:6px; align-items:center }
.targets-badges{ display:flex; flex-wrap:wrap; gap:6px }
.targets-categories{ display:flex; flex-direction:column; gap:10px; padding-top:6px; border-top:1px solid var(--line) }
.category{ display:flex; flex-direction:column; gap:6px; font-size:12px; padding:4px 0 }
.category .cat-top{ display:flex; align-items:center; justify-content:space-between; gap:8px }
.category .cat-label{ display:flex; align-items:center; gap:6px; font-weight:600; color:var(--fg) }
.category .cat-label .dot{ width:10px; height:10px; border-radius:50%; background:var(--brand); box-shadow:0 0 0 1px color-mix(in srgb, var(--fg) 10%, transparent) }
.category .cat-label .name{ color:var(--fg) }
.category .cat-meta{ display:flex; align-items:center; gap:6px; font-weight:600; color:var(--muted) }
.category .cat-meta .percent{ font-variant-numeric:tabular-nums; color:var(--fg) }
.cat-progress .bar{ position:relative; width:100%; height:8px; border-radius:999px; background:color-mix(in srgb, var(--muted) 20%, transparent) }
.cat-progress .bar .fill{ height:100%; border-radius:999px; transition:width .2s ease }
.category .cat-metrics{ display:flex; flex-wrap:wrap; gap:6px; align-items:center; color:var(--fg) }
.cat-footer{ display:flex; justify-content:space-between; align-items:center }
.hint{ color:var(--muted); font-size:12px }
.badge{ display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.05em }
.status-label{ font-weight:600 }
.status-on{ background:color-mix(in srgb, var(--brand) 20%, white); color:var(--brand) }
.status-risk{ background:color-mix(in srgb, #f97316 20%, white); color:#f97316 }
.status-behind{ background:color-mix(in srgb, #ef4444 20%, white); color:#ef4444 }
.status-done{ background:color-mix(in srgb, var(--pos) 25%, white); color:var(--pos) }
.status-none{ background:color-mix(in srgb, var(--muted) 12%, white); color:var(--muted) }
.delta{ font-weight:600 }
.delta.pos{ color:var(--pos) }
.delta.neg{ color:var(--neg) }
.cat-metrics .hint{ font-size:11px }
.cat-footer .hint{ font-size:11px }
.cat-progress{ padding:2px 0 }
.cat-meta .badge{ font-size:10px }
</style>
