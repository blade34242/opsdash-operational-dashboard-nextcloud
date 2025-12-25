<template>
  <div class="card chart-widget" :style="cardStyle">
    <div v-if="showHeader" class="chart-widget__header">
      <div class="chart-widget__title">{{ titleText }}</div>
      <div v-if="subtitle" class="chart-widget__subtitle">{{ subtitle }}</div>
    </div>
    <HeatmapCanvas v-if="hodData" :hod="hodData" />
    <div v-else class="chart-widget__empty">No data</div>
    <div v-if="showHint && hodData" class="chart-widget__hint">24×7 Heatmap: hours by weekday and hour.</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HeatmapCanvas from '../HeatmapCanvas.vue'

const props = defineProps<{
  title?: string
  subtitle?: string
  cardBg?: string | null
  showHeader?: boolean
  showHint?: boolean
  hodData?: { dows: string[]; hours: string[] | number[]; matrix: number[][] } | null
}>()

const showHeader = computed(() => props.showHeader !== false)
const titleText = computed(() => props.title || 'Hours of day')
const cardStyle = computed(() => ({ background: props.cardBg || undefined }))
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
.chart-widget__hint {
  font-size: calc(11px * var(--widget-scale, 1));
  color: var(--muted);
}
</style>
