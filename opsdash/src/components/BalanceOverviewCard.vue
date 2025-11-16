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
      <ul class="mix-list">
        <li v-for="row in trendRows" :key="row.id" class="mix-row">
          <span class="mix-label">{{ row.label }}:</span>
          <span class="mix-values">
            <template v-if="row.historyEntries.length">
              <template v-for="(entry, idx) in row.historyEntries" :key="`${row.id}-hist-${idx}`">
                <span class="mix-value">{{ formatShare(entry.share) }}</span>
                <span v-if="idx < row.historyEntries.length - 1" class="mix-sep">|</span>
              </template>
              <span class="mix-sep">|</span>
            </template>
            <span class="mix-value mix-value--current">{{ formatShare(row.currentShare) }}</span>
            <span class="mix-delta">{{ formatDelta(row.delta) }}</span>
          </span>
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

const historyColumns = computed(() => {
  const history = props.overview?.trend?.history ?? []
  if (history.length) {
    return history
  }
  const deltas = props.overview?.trend?.delta ?? []
  if (!deltas.length) {
    return []
  }
  const fallbackCategories = (props.overview?.categories ?? []).map((cat) => {
    const currentShare = typeof cat.share === 'number' ? cat.share : 0
    const fallback =
      typeof cat.prevShare === 'number'
        ? cat.prevShare
        : typeof cat.delta === 'number'
          ? currentShare - cat.delta
          : currentShare
    return {
      id: cat.id,
      label: cat.label,
      share: Math.max(0, fallback),
    }
  })
  return [
    { offset: 1, label: props.rangeMode === 'month' ? 'Prev month' : 'Prev week', categories: fallbackCategories },
  ]
})
const trendRows = computed(() => {
  if (!props.overview) return []
  const categories = props.overview.categories ?? []
  return categories.map((cat) => {
    const historyEntries = historyColumns.value.map((column) => {
      const entry = column.categories?.find((c) => c.id === cat.id)
      return {
        label: column.label,
        share: entry ? entry.share : 0,
      }
    })
    const currentShare = typeof cat.share === 'number' ? cat.share : 0
    const previousShare = historyEntries.length
      ? historyEntries[historyEntries.length - 1].share
      : typeof cat.prevShare === 'number'
        ? cat.prevShare
        : typeof cat.delta === 'number'
          ? currentShare - cat.delta
          : 0
    return {
      id: cat.id,
      label: cat.label,
      currentShare,
      previousShare,
      historyEntries,
      delta: currentShare - previousShare,
    }
  })
})

const lookbackLabel = computed(() => {
  const historyCount = historyColumns.value.length
  if (historyCount > 1) {
    const unit = props.rangeMode === 'month' ? 'months' : 'weeks'
    return `History · last ${historyCount} ${unit}`
  }
  if (historyCount === 1) {
    return `${historyColumns.value[0]?.label || 'Previous range'}`
  }
  const weeks = Math.max(1, Math.min(12, props.lookbackWeeks || 1))
  return props.rangeMode === 'month' ? `Avg of last ${weeks} mo` : `Avg of last ${weeks} wk`
})

const formatShare = (value: number) => `${Math.max(0, Math.round(value))}%`
const formatDelta = (value: number) =>
  `${value > 0 ? '+' : value < 0 ? '−' : '±'}${Math.abs(value).toFixed(1)}pp`
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
  gap: 6px;
  font-size: 12px;
}
.mix-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: baseline;
}
.mix-label {
  font-weight: 600;
  color: var(--fg);
}
.mix-values {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.mix-value {
  color: var(--muted);
}
.mix-value--current {
  color: var(--fg);
  font-weight: 600;
}
.mix-sep {
  color: var(--border, rgba(125, 125, 125, 0.7));
}
.mix-delta {
  font-weight: 600;
  color: var(--muted);
}
</style>
