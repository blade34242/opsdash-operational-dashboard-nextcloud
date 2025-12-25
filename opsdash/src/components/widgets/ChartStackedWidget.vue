<template>
  <div class="card chart-widget" :style="cardStyle">
    <div v-if="showHeader" class="chart-widget__header">
      <div class="chart-widget__title">{{ titleText }}</div>
      <div v-if="subtitle" class="chart-widget__subtitle">{{ subtitle }}</div>
    </div>
    <StackedBars v-if="stacked" :stacked="stacked" :colors-by-id="colorsById" :show-labels="showLabels" />
    <div v-else class="chart-widget__empty">No data</div>
    <ul v-if="showLegend && legendItems.length" class="chart-widget__legend">
      <li v-for="item in legendItems" :key="item.id">
        <span class="dot" :style="{ background: item.color }"></span>
        <span>{{ item.label }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import StackedBars from '../StackedBars.vue'

const props = defineProps<{
  title?: string
  subtitle?: string
  cardBg?: string | null
  showHeader?: boolean
  compact?: boolean
  showLegend?: boolean
  showLabels?: boolean
  stacked?: { labels?: string[]; series?: Array<{ id: string; name?: string; label?: string; color?: string }> } | null
  colorsById?: Record<string, string>
}>()

const showHeader = computed(() => props.showHeader !== false)
const titleText = computed(() => props.title || 'Stacked bars')
const cardStyle = computed(() => ({ background: props.cardBg || undefined }))
const colorsById = computed(() => props.colorsById || {})

const legendItems = computed(() => {
  const series = props.stacked?.series || []
  return series.map((entry: any) => {
    const id = String(entry?.id ?? '')
    const label = String(entry?.name ?? entry?.label ?? id)
    const color = entry?.color || colorsById.value[id] || '#60a5fa'
    return { id, label, color }
  })
})
</script>

<style scoped>
.chart-widget {
  display: flex;
  flex-direction: column;
  gap: var(--widget-gap, 8px);
}
.chart-widget__header {
  display: flex;
  flex-direction: column;
  gap: calc(2px * var(--widget-space, 1));
}
.chart-widget__title {
  font-weight: 600;
  font-size: var(--widget-title-size, calc(14px * var(--widget-scale, 1)));
}
.chart-widget__subtitle {
  font-size: calc(12px * var(--widget-scale, 1));
  color: var(--muted);
}
.chart-widget__empty {
  padding: calc(12px * var(--widget-space, 1));
  border: 1px dashed var(--line);
  border-radius: calc(10px * var(--widget-space, 1));
  color: var(--muted);
  text-align: center;
}
.chart-widget__legend {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: calc(6px * var(--widget-space, 1));
  font-size: calc(12px * var(--widget-scale, 1));
}
.chart-widget__legend li {
  display: flex;
  align-items: center;
  gap: calc(6px * var(--widget-space, 1));
}
.chart-widget__legend .dot {
  width: calc(10px * var(--widget-space, 1));
  height: calc(10px * var(--widget-space, 1));
  border-radius: 50%;
}
</style>
