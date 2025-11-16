<template>
  <div class="card balance-card">
    <div class="balance-card__header">
      <span>Balance Overview ({{ rangeLabel }})</span>
    </div>
    <div class="balance-card__mix" v-if="trendRows.length">
      <div class="mix-header">
        <div>
          <div class="mix-title">Category mix trend</div>
          <div class="mix-subtitle">{{ lookbackLabel }}</div>
        </div>
        <span v-if="trendBadge" class="mix-badge">{{ trendBadge }}</span>
      </div>
      <div class="mix-columns" :style="mixGridStyle">
        <span
          v-for="column in historyColumns"
          :key="`col-${column.offset}`"
          class="mix-column-label"
        >
          {{ column.label }}
        </span>
        <span class="mix-column-label mix-column-label--current">{{ currentColumnLabel }}</span>
      </div>
      <ul class="mix-list">
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
              :title="`${row.label} · ${cell.label} · ${formatShare(cell.share)}`"
            >
              <span class="mix-cell__value">{{ formatShare(cell.share) }}</span>
            </div>
          </div>
        </li>
      </ul>
    </div>
    <ul class="balance-card__insights" v-if="insights.length">
      <li v-for="ins in insights" :key="ins">💡 {{ ins }}</li>
    </ul>
    <ul class="balance-card__warnings" v-if="warnings.length">
      <li v-for="warn in warnings" :key="warn">⚠️ {{ warn }}</li>
    </ul>
    <div class="balance-card__note" v-if="noteText">
      📝 {{ noteText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type BalanceCategory = {
  id: string
  label: string
  hours: number
  share: number
  prevShare: number
  delta: number
  color?: string
}

type BalanceRelation = { label: string; value: string }
type BalanceTrend = {
  delta: Array<{ id: string; label: string; delta: number }>
  badge: string
  history?: Array<{
    offset: number
    label: string
    categories: Array<{ id: string; label: string; share: number }>
  }>
}
type BalanceDailyEntry = {
  date: string
  weekday: string
  total_hours: number
  categories: Array<{ id: string; label: string; hours: number; share: number }>
}

type BalanceOverview = {
  index: number
  categories: BalanceCategory[]
  relations: BalanceRelation[]
  trend: BalanceTrend
  daily: BalanceDailyEntry[]
  insights: string[]
  warnings: string[]
}

type BalanceCardConfig = {
  showInsights: boolean
  showDailyStacks: boolean
  showNotes?: boolean
}

const defaultConfig: BalanceCardConfig = {
  showInsights: true,
  showDailyStacks: false,
}

const props = defineProps<{
  overview: BalanceOverview | null
  rangeLabel: string
  rangeMode: 'week' | 'month'
  lookbackWeeks: number
  config?: Partial<BalanceCardConfig>
  note?: string
}>()

const settings = computed<BalanceCardConfig>(() => Object.assign({}, defaultConfig, props.config ?? {}))
const noteText = computed(() => (props.note ?? '').trim())

const insights = computed(() => {
  if (!settings.value.showInsights) return [] as string[]
  return props.overview?.insights ?? []
})
const warnings = computed(() => props.overview?.warnings ?? [])
const trendBadge = computed(() => props.overview?.trend?.badge ?? '')

const currentColumnLabel = computed(() =>
  props.rangeMode === 'month' ? 'This month' : 'This week',
)

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

const lookbackCount = computed(() => Math.max(1, Math.min(12, props.lookbackWeeks || 1)))

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

const fallbackHistoryLabel = (offset: number) => {
  const unit = props.rangeMode === 'month' ? 'mo' : 'wk'
  return `-${offset} ${unit}`
}

const historyColumns = computed<TrendHistoryColumn[]>(() => {
  if (!props.overview) {
    return []
  }
  const lookback = lookbackCount.value
  const byOffset = new Map<number, TrendHistoryColumn>()
  rawHistoryEntries.value.forEach((entry) => {
    const offset = Math.max(1, Math.min(12, Math.round(entry.offset)))
    if (!offset) return
    const shares: Record<string, number> = {}
    entry.categories.forEach((cat) => {
      if (!cat.id) return
      shares[cat.id] = Number.isFinite(cat.share) ? cat.share : 0
    })
    byOffset.set(offset, {
      offset,
      label: entry.label,
      shares,
    })
  })
  const columns: TrendHistoryColumn[] = []
  for (let offset = lookback; offset >= 1; offset -= 1) {
    const existing = byOffset.get(offset)
    columns.push({
      offset,
      label: existing && existing.label ? existing.label : fallbackHistoryLabel(offset),
      shares: existing?.shares ?? {},
    })
  }
  return columns
})
const columnCount = computed(() => historyColumns.value.length + 1)
const mixGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(columnCount.value, 1)}, minmax(52px, 1fr))`,
}))

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
</script>

<style scoped>
.balance-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  font-size: 13px;
  color: var(--muted);
}
.balance-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  color: var(--fg);
  font-size: 12px;
}
.balance-card__insights,
.balance-card__warnings {
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.balance-card__warnings {
  color: var(--danger, #b91c1c);
}
.balance-card__note {
  font-size: 12px;
  color: var(--fg);
  background: color-mix(in oklab, var(--brand), transparent 88%);
  border-radius: 6px;
  padding: 6px 8px;
  white-space: pre-line;
}
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  background: color-mix(in srgb, var(--brand) 12%, white);
  color: var(--brand);
  text-transform: uppercase;
  letter-spacing: .05em;
}
.balance-card__mix {
  border-top: 1px solid var(--border, rgba(125, 125, 125, 0.2));
  padding-top: 8px;
}
.mix-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}
.mix-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--fg);
}
.mix-subtitle {
  font-size: 11px;
  color: var(--muted);
}
.mix-badge {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--brand), transparent 80%);
  color: var(--brand);
  border: 1px solid color-mix(in oklab, var(--brand), transparent 60%);
}
.mix-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
}
.mix-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.mix-label {
  flex: 0 0 96px;
  font-weight: 600;
  color: var(--fg);
}
.mix-columns {
  display: grid;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
}
.mix-column-label {
  text-align: center;
}
.mix-column-label--current {
  color: var(--brand);
}
.mix-cells {
  display: grid;
  gap: 6px;
  flex: 1 1 auto;
}
.mix-cell {
  border-radius: 6px;
  padding: 6px 4px;
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--fg);
  background: color-mix(in oklab, var(--muted), transparent 85%);
  transition: background .2s ease;
}
.mix-cell--current {
  outline: 1px solid color-mix(in oklab, var(--brand), transparent 35%);
  outline-offset: 1px;
}
.mix-cell--trend-up {
  background: color-mix(in oklab, #16a34a, white 65%);
  color: #14532d;
}
.mix-cell--trend-down {
  background: color-mix(in oklab, #dc2626, white 65%);
  color: #7f1d1d;
}
.mix-cell--trend-flat {
  background: color-mix(in oklab, #f97316, white 70%);
  color: #7c2d12;
}
.mix-cell__value {
  font-variant-numeric: tabular-nums;
}
</style>
