<template>
  <div class="card balance-card">
    <div class="balance-card__header">
      <span>Balance Overview ({{ rangeLabel }})</span>
    </div>
    <div class="balance-card__hero" v-if="heroLine">
      <span>{{ heroLine }}</span>
    </div>
    <div class="balance-card__relations" v-if="relationLine">
      {{ relationLine }}
    </div>
    <div class="balance-card__trend" v-if="trendLine">
      <strong>WoW-Δ:</strong> {{ trendLine }}
    </div>
    <div class="balance-card__heatmap" v-if="trendRows.length">
      <div class="heatmap-header">Trend vs last {{ lookbackLabel }}</div>
      <div class="heatmap-grid">
        <div class="heatmap-heading"></div>
        <div class="heatmap-head">Lookback</div>
        <div class="heatmap-head">Current</div>
        <template v-for="row in trendRows" :key="row.id">
          <div class="heatmap-label">{{ row.label }}</div>
          <div class="heatmap-cell" :style="heatStyle(row.lookbackShare)">
            {{ formatShare(row.lookbackShare) }}
          </div>
          <div class="heatmap-cell heatmap-cell--current" :style="heatStyle(row.currentShare)">
            {{ formatShare(row.currentShare) }}
            <span class="heatmap-delta">{{ formatDelta(row.delta) }}</span>
          </div>
        </template>
      </div>
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
type BalanceTrend = { delta: Array<{ id: string; label: string; delta: number }>; badge: string }
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

const heroLine = computed(() => {
  if (!props.overview) return ''
  const index = props.overview.index ?? 0
  const catParts = props.overview.categories
    .filter(cat => cat.share > 0.1)
    .slice(0, 4)
    .map(cat => `${cat.label} ${cat.share.toFixed(0)}%`)
  const suffix = catParts.length ? ` • ${catParts.join(' | ')}` : ''
  return `Balance Index ${index.toFixed(2)}${suffix}`
})

const relationLine = computed(() => {
  if (!props.overview || !props.overview.relations?.length) return ''
  return props.overview.relations.map(rel => `${rel.label} ${rel.value}`).join(' • ')
})

const trendLine = computed(() => {
  if (!props.overview) return ''
  const entries = props.overview.trend?.delta ?? []
  if (!entries.length) return ''
  return entries
    .map(item => {
      const sign = item.delta > 0 ? '+' : item.delta < 0 ? '−' : '±'
      return `${item.label} ${sign}${Math.abs(item.delta).toFixed(1)} pp`
    })
    .join(', ')
})

const insights = computed(() => {
  if (!settings.value.showInsights) return [] as string[]
  return props.overview?.insights ?? []
})
const warnings = computed(() => props.overview?.warnings ?? [])

const lookbackLabel = computed(() => {
  const weeks = Math.max(1, Math.min(12, props.lookbackWeeks || 1))
  if (props.rangeMode === 'month') {
    return `${weeks} mo`
  }
  return `${weeks} wk`
})

const trendRows = computed(() => {
  if (!props.overview) return []
  const deltas = props.overview.trend?.delta ?? []
  if (!deltas.length) return []
  const categories = props.overview.categories ?? []
  return deltas.map(entry => {
    const current = categories.find(cat => cat.id === entry.id)
    const currentShare = current ? current.share : 0
    const lookbackShare = currentShare - entry.delta
    return {
      id: entry.id,
      label: entry.label,
      currentShare,
      lookbackShare,
      delta: entry.delta,
    }
  })
})

const heatStyle = (value: number) => {
  const clamped = Math.max(0, Math.min(100, value))
  const intensity = Math.round((clamped / 100) * 80)
  return {
    background: `rgba(37, 99, 235, ${intensity / 100})`,
    color: intensity > 45 ? '#fff' : 'var(--fg)',
  }
}

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
.balance-card__hero {
  font-weight: 600;
  color: var(--fg);
}
.balance-card__relations,
.balance-card__trend {
  font-size: 12px;
}
.balance-card__trend strong {
  color: var(--fg);
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
.balance-card__heatmap {
  border-top: 1px solid var(--border, rgba(125, 125, 125, 0.2));
  padding-top: 8px;
}
.heatmap-header {
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 4px;
}
.heatmap-grid {
  display: grid;
  grid-template-columns: auto 1fr 1fr;
  gap: 4px;
  font-size: 11px;
}
.heatmap-head {
  font-weight: 600;
  color: var(--fg);
  text-align: center;
}
.heatmap-heading {
  /* placeholder */
}
.heatmap-label {
  display: flex;
  align-items: center;
  font-weight: 500;
}
.heatmap-cell {
  border-radius: 6px;
  padding: 4px;
  text-align: center;
  min-height: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.heatmap-cell--current {
  border: 1px solid rgba(37, 99, 235, 0.2);
}
.heatmap-delta {
  font-size: 10px;
  opacity: 0.8;
}
</style>
