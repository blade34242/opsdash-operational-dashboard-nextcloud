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
        <span class="hint">linear {{ formatHours(summary.forecast.linear) }}h · momentum {{ formatHours(summary.forecast.momentum) }}h</span>
      </div>
    </div>
    <div class="targets-badges" v-if="config.ui.badges && total.targetHours > 0">
      <span class="badge" :class="statusClass(total.status)">{{ total.statusLabel }}</span>
    </div>
    <div class="targets-categories" v-if="config.ui.showCategoryBlocks && categories.length">
      <div class="category" v-for="cat in categories" :key="cat.id">
        <div class="cat-header">
          <span>{{ cat.label }}</span>
          <span v-if="config.ui.badges && cat.targetHours > 0" class="badge" :class="statusClass(cat.status)">{{ cat.statusLabel }}</span>
        </div>
        <div class="cat-line">
          <strong>{{ formatHours(cat.actualHours) }}/{{ formatHours(cat.targetHours) }} h</strong>
          <span class="hint">({{ cat.percent.toFixed(0) }}%)</span>
        </div>
        <div class="cat-line" v-if="config.ui.showNeedPerDay && cat.targetHours > 0">
          Δ {{ formatSigned(cat.deltaHours) }}h · Need {{ formatHours(cat.needPerDay) }} h/day · Days left {{ cat.daysLeft }}
        </div>
        <div class="cat-line hint">
          Pace {{ cat.calendarPercent.toFixed(0) }}% · Gap {{ formatSigned(cat.gap) }}%
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TargetsConfig, TargetsSummary, TargetsProgress } from '../services/targets'

const props = defineProps<{
  summary: TargetsSummary
  config: TargetsConfig
}>()

const total = computed<TargetsProgress>(() => props.summary?.total ?? fallbackProgress('total', 'Total'))
const categories = computed<TargetsProgress[]>(() => props.summary?.categories ?? [])

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
.targets-categories{ display:flex; flex-direction:column; gap:8px; padding-top:4px; border-top:1px solid var(--line) }
.category{ display:flex; flex-direction:column; gap:2px; font-size:12px }
.category .cat-header{ display:flex; justify-content:space-between; align-items:center; font-weight:600 }
.category .cat-line{ display:flex; flex-wrap:wrap; gap:6px }
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
</style>
