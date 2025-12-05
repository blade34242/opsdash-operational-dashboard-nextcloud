<template>
  <div class="card mix-card" :style="cardStyle">
    <div class="mix-header">
      <div>
        <div class="mix-title">{{ titleText }}</div>
        <div class="mix-subtitle">{{ lookbackLabel }}</div>
      </div>
      <span v-if="trendBadge" class="mix-badge">{{ trendBadge }}</span>
    </div>
    <div class="mix-columns" :style="mixGridStyle" v-if="historyColumns.length || trendRows.length">
      <span class="mix-column-label mix-column-label--label">CAT</span>
      <span
        v-for="column in historyColumns"
        :key="`col-${column.offset}`"
        class="mix-column-label"
      >
        {{ column.label }}
      </span>
      <span class="mix-column-label mix-column-label--current">{{ currentColumnLabel }}</span>
    </div>
    <ul class="mix-list" v-if="trendRows.length">
      <li v-for="row in trendRows" :key="row.id" class="mix-row">
        <span class="mix-label">{{ row.label }}:</span>
        <div class="mix-cells" :style="mixGridStyle">
          <div
            v-for="(cell, idx) in row.cells"
            :key="`${row.id}-cell-${idx}`"
            class="mix-cell"
            :class="[
              `mix-cell--trend-${cell.trend}`,
              { 'mix-cell--current': cell.isCurrent },
            ]"
            :style="toneStyles[cell.trend]"
            :title="`${row.label} · ${cell.label} · ${formatShare(cell.share)}`"
          >
            <span class="mix-cell__value">{{ formatShare(cell.share) }}</span>
          </div>
        </div>
      </li>
    </ul>
    <div v-else class="hint">No category mix history.</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type TrendHistoryEntry = {
  offset: number
  label: string
  categories: Array<{ id: string; label: string; share: number }>
}

type TrendHistoryColumn = {
  offset: number
  label: string
  shares: Record<string, number>
}

type BalanceCategory = { id: string; label: string; share: number; prevShare?: number }

type BalanceTrend = {
  badge?: string
  history?: Array<{ offset: number; label: string; categories: Array<{ id: string; label: string; share: number }> }>
}

type BalanceOverview = {
  categories: BalanceCategory[]
  trend: BalanceTrend
}

const props = defineProps<{
  overview: BalanceOverview | null
  rangeMode: 'week' | 'month'
  lookbackWeeks: number
  showBadge?: boolean
  title?: string
  cardBg?: string | null
  toneLowColor?: string | null
  toneHighColor?: string | null
}>()

const trendBadge = computed(() => (props.showBadge === false ? '' : props.overview?.trend?.badge ?? ''))
const historyUnit = computed(() => (props.rangeMode === 'month' ? 'MO' : 'WE'))
const currentColumnLabel = computed(() => `CU. ${historyUnit.value}`)
const lookbackCount = computed(() => Math.max(1, Math.min(4, props.lookbackWeeks || 1)))
const titleText = computed(() => props.title || 'Category mix trend')
const cardStyle = computed(() => ({ background: props.cardBg || undefined }))

const rawHistoryEntries = computed<TrendHistoryEntry[]>(() => {
  const history = props.overview?.trend?.history ?? (props.overview as any)?.trendHistory ?? []
  if (!Array.isArray(history)) {
    return []
  }
  return history
    .map((entry: any) => ({
      offset: Number(entry?.offset ?? entry?.step ?? 0) || 0,
      label: String(entry?.label ?? ''),
      categories: Array.isArray(entry?.categories)
        ? entry.categories.map((cat: any) => ({
            id: String(cat?.id ?? ''),
            label: String(cat?.label ?? ''),
            share: Number(cat?.share ?? 0) || 0,
          }))
        : [],
    }))
    .filter((entry) => entry.offset > 0)
})

const fallbackHistoryLabel = (offset: number) => `-${offset} ${historyUnit.value}`

const historyColumns = computed<TrendHistoryColumn[]>(() => {
  if (!props.overview) {
    return []
  }
  const lookback = lookbackCount.value
  const byOffset = new Map<number, TrendHistoryColumn>()
  rawHistoryEntries.value.forEach((entry) => {
    const offset = Math.max(1, Math.min(12, Math.round(entry.offset)))
    if (!offset || offset > lookback) return
    const shares: Record<string, number> = {}
    entry.categories.forEach((cat) => {
      if (!cat.id) return
      shares[cat.id] = Number.isFinite(cat.share) ? cat.share : 0
    })
    byOffset.set(offset, {
      offset,
      label: fallbackHistoryLabel(offset),
      shares,
    })
  })
  return Array.from(byOffset.values()).sort((a, b) => b.offset - a.offset)
})

const columnCount = computed(() => historyColumns.value.length + 1)
const mixGridStyle = computed(() => ({
  gridTemplateColumns: `52px repeat(${Math.max(columnCount.value, 1)}, minmax(32px, 1fr))`,
}))

const toneStyles = computed(() => {
  const low = normalizeColor(props.toneLowColor) || '#e11d48'
  const high = normalizeColor(props.toneHighColor) || '#10b981'
  const mid = mixColor(low, high, 0.5)
  return {
    down: makeTone(low),
    flat: makeTone(mid),
    up: makeTone(high),
  }
})

const classifyTrend = (delta: number) => {
  const threshold = 1
  if (delta > threshold) return 'up'
  if (delta < -threshold) return 'down'
  return 'flat'
}

const trendRows = computed(() => {
  if (!props.overview) return []
  const categories = props.overview.categories ?? []
  return categories.map((cat) => {
    const historyEntries = historyColumns.value.map((column) => ({
      label: column.label,
      share: column.shares[cat.id] ?? 0,
      isCurrent: false,
    }))
    const currentShare = typeof cat.share === 'number' ? cat.share : 0
    const slots = [
      ...historyEntries,
      { label: currentColumnLabel.value, share: currentShare, isCurrent: true },
    ]
    const cells = slots.map((slot, idx) => {
      const prevShare = idx === 0 ? slot.share : slots[idx - 1].share
      const delta = slot.share - prevShare
      return {
        label: slot.label,
        share: slot.share,
        isCurrent: !!slot.isCurrent,
        trend: idx === 0 ? 'flat' : classifyTrend(delta),
      }
    })
    return {
      id: cat.id,
      label: cat.label,
      cells,
    }
  })
})

const lookbackLabel = computed(() => {
  const historyCount = lookbackCount.value
  if (historyCount > 1) {
    const unit = props.rangeMode === 'month' ? 'months' : 'weeks'
    return `History · last ${historyCount} ${unit}`
  }
  if (historyCount === 1 && historyColumns.value.length) {
    return historyColumns.value[historyColumns.value.length - 1]?.label || fallbackHistoryLabel(1)
  }
  return fallbackHistoryLabel(historyCount || 1)
})

const formatShare = (value: number) => `${Math.max(0, Math.round(value))}%`

function normalizeColor(value?: string | null): string | null {
  if (!value || typeof value !== 'string') return null
  const hex = value.trim()
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return hex
  return null
}

function mixColor(a: string, b: string, ratio = 0.5): string {
  const pa = parseHex(a)
  const pb = parseHex(b)
  if (!pa || !pb) return a
  const r = clamp(Math.round(pa.r + (pb.r - pa.r) * ratio), 0, 255)
  const g = clamp(Math.round(pa.g + (pb.g - pa.g) * ratio), 0, 255)
  const bl = clamp(Math.round(pa.b + (pb.b - pa.b) * ratio), 0, 255)
  return `rgb(${r}, ${g}, ${bl})`
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '')
  if (clean.length === 3) {
    const [r, g, b] = clean.split('').map((v) => parseInt(v.repeat(2), 16))
    return { r, g, b }
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16)
    const g = parseInt(clean.slice(2, 4), 16)
    const b = parseInt(clean.slice(4, 6), 16)
    return { r, g, b }
  }
  return null
}

function luminance(hex: string): number {
  const p = parseHex(hex)
  if (!p) return 0
  return (0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b) / 255
}

function makeTone(bg: string): { background: string; color: string } {
  const text = luminance(bg) > 0.6 ? '#0f172a' : '#fff'
  return { background: bg, color: text }
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}
</script>

<style scoped>
.mix-card{
  display:flex;
  flex-direction:column;
  gap:10px;
}
.mix-header{
  display:flex;
  justify-content:space-between;
  align-items:center;
}
.mix-title{
  font-weight:700;
  color:var(--fg);
}
.mix-subtitle{
  font-size:12px;
  color:var(--muted);
}
.mix-badge{
  padding:4px 8px;
  border-radius:8px;
  font-size:12px;
  font-weight:600;
  background: color-mix(in oklab, var(--brand), transparent 80%);
  border: 1px solid color-mix(in oklab, var(--brand), transparent 60%);
  color: var(--brand);
}
.mix-list{
  list-style:none;
  padding:0;
  margin:0;
  display:flex;
  flex-direction:column;
  gap:8px;
}
.mix-row{
  display:grid;
  grid-template-columns:52px 1fr;
  gap:6px;
  align-items:center;
}
.mix-label{
  font-weight:600;
  color:var(--fg);
  font-size:12px;
}
.mix-columns{
  display:grid;
  gap:6px;
  align-items:center;
  font-size:12px;
  color:var(--muted);
}
.mix-column-label{
  text-align:center;
}
.mix-column-label--label{
  text-align:left;
}
.mix-column-label--current{
  font-weight:700;
  color:var(--fg);
}
.mix-cells{
  display:grid;
  gap:6px;
}
.mix-cell{
  border-radius:8px;
  padding:6px;
  background: color-mix(in oklab, var(--muted), transparent 85%);
  color: var(--fg);
  text-align:center;
  font-size:12px;
}
.mix-cell--current{
  outline: 1px solid color-mix(in oklab, var(--brand), transparent 35%);
  outline-offset:1px;
}
.mix-cell--trend-up{
  background: color-mix(in oklab, #16a34a, white 65%);
}
.mix-cell--trend-down{
  background: color-mix(in oklab, #dc2626, white 65%);
}
.mix-cell--trend-flat{
  background: color-mix(in oklab, #f97316, white 70%);
}
.mix-cell__value{
  font-weight:700;
  font-variant-numeric: tabular-nums;
}
.pill{
  display:inline-flex;
  align-items:center;
  gap:4px;
  padding:2px 8px;
  font-size:11px;
  border-radius:999px;
  background: color-mix(in srgb, var(--brand) 15%, white);
  color: var(--brand);
  text-transform: uppercase;
  letter-spacing: .05em;
}
.hint{
  font-size:12px;
  color:var(--muted);
}
</style>
