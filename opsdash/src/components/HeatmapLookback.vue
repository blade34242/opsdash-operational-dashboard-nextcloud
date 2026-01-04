<template>
  <div class="heatmap-lookback">
    <div v-show="mode === 'stacked'" class="heatmap-lookback__stacked">
      <div v-for="entry in entries" :key="entry.id" class="heatmap-lookback__panel">
        <div class="heatmap-lookback__label">
          <span class="dot" :style="{ background: entry.color }"></span>
          <span>{{ entry.label }}</span>
        </div>
        <HeatmapCanvas :hod="entry.hod" :base-color="entry.color" />
      </div>
    </div>
    <canvas v-show="mode === 'overlay'" ref="cv" class="chart heatmap-lookback__overlay" />
    <div v-if="showLegend && entries.length" class="heatmap-lookback__legend">
      <div class="heatmap-lookback__legend-scale">
        <span>Low</span>
        <span class="heatmap-lookback__legend-bar"></span>
        <span>High</span>
      </div>
      <ul class="heatmap-lookback__legend-weeks">
        <li v-for="entry in entries" :key="entry.id">
          <span class="dot" :style="{ background: entry.color }"></span>
          <span>{{ entry.label }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import HeatmapCanvas from './HeatmapCanvas.vue'
import { ctxFor, heatColor, hexToRgb, rgbToHex, themeVar } from '../services/charts'

type HodData = { dows: string[]; hours: string[] | number[]; matrix: number[][] }
type LookbackEntry = { id: string; label: string; color: string; hod: HodData }

const props = defineProps<{
  entries?: LookbackEntry[]
  mode?: string
  showLegend?: boolean
}>()

const cv = ref<HTMLCanvasElement | null>(null)
let ro: ResizeObserver | null = null

const entries = computed(() => (Array.isArray(props.entries) ? props.entries : []))
const mode = computed(() => (props.mode === 'overlay' ? 'overlay' : 'stacked'))
const showLegend = computed(() => props.showLegend !== false)

function drawOverlay() {
  if (mode.value !== 'overlay') return
  const list = entries.value
  if (!list.length) return
  const cvEl = cv.value
  if (!cvEl) return
  const ctx = ctxFor(cvEl)
  if (!ctx) return
  const styles = getComputedStyle(cvEl)
  const widgetScale = Math.max(0.5, Number.parseFloat(styles.getPropertyValue('--widget-scale')) || 1)
  const widgetSpace = Math.max(0.5, Number.parseFloat(styles.getPropertyValue('--widget-space')) || widgetScale)
  const widgetDensity = Math.max(0.5, Number.parseFloat(styles.getPropertyValue('--widget-density')) || 1)
  const textScale = widgetScale * widgetDensity
  const W = cvEl.clientWidth
  const H = cvEl.clientHeight
  const first = list[0]?.hod
  const rows = first?.dows || []
  const cols = first?.hours || []
  if (!rows.length || !cols.length) return

  let vmax = 0
  list.forEach((entry) => {
    entry.hod?.matrix?.forEach((row) => {
      row.forEach((val) => {
        vmax = Math.max(vmax, Math.max(0, Number(val) || 0))
      })
    })
  })
  if (vmax <= 0) vmax = 1

  const pad = 36 * widgetSpace
  const x0 = pad
  const y0 = pad
  const x1 = W - pad
  const y1 = H - pad
  const cw = (x1 - x0) / Math.max(1, cols.length)
  const rh = (y1 - y0) / Math.max(1, rows.length)
  const lowColor = themeVar(cvEl, '--heatmap-low', '#e0f2fe')
  const lowRgb = hexToRgb(lowColor)
  const entryRgbs = list.map((entry) => hexToRgb(entry.color))
  const clamp = (val: number) => Math.max(0, Math.min(1, val))
  const mix = (a: number, b: number, p: number) => Math.round(a + (b - a) * p)
  const stripeCount = Math.max(1, list.length)

  ctx.clearRect(0, 0, W, H)
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < cols.length; c++) {
      const x = x0 + c * cw
      const y = y0 + r * rh
      const stripeWidth = cw / stripeCount
      list.forEach((entry, idx) => {
        const val = Math.max(0, Number(entry?.hod?.matrix?.[r]?.[c] ?? 0))
        const ratio = clamp(val / vmax)
        const tone = Math.pow(ratio, 0.6)
        const baseRgb = entryRgbs[idx]
        const color = lowRgb && baseRgb
          ? rgbToHex(mix(lowRgb.r, baseRgb.r, tone), mix(lowRgb.g, baseRgb.g, tone), mix(lowRgb.b, baseRgb.b, tone))
          : heatColor(tone)
        ctx.fillStyle = color
        ctx.fillRect(x + idx * stripeWidth, y, stripeWidth, rh - 1)
      })
    }
  }
  ctx.fillStyle = themeVar(cvEl, '--fg', '#0f172a')
  ctx.font = `${12 * textScale}px ui-sans-serif,system-ui`
  rows.forEach((d, i) => ctx.fillText(d, 8, y0 + i * rh + 12 * textScale))
  cols.forEach((h, i) => { if (i % 2 === 0) ctx.fillText(String(h), x0 + i * cw + 2, y0 - 6 * textScale) })
}

function bindObservers() {
  try {
    ro = new ResizeObserver(() => drawOverlay())
    if (cv.value) ro.observe(cv.value)
  } catch (_) {}
  window.addEventListener('resize', drawOverlay)
}

onMounted(async () => {
  await nextTick()
  drawOverlay()
  bindObservers()
})

onBeforeUnmount(() => {
  try { window.removeEventListener('resize', drawOverlay) } catch (_) {}
  try { ro && cv.value && ro.unobserve(cv.value) } catch (_) {}
  ro = null
})

watch(() => [entries.value, mode.value], () => {
  if (mode.value === 'overlay') {
    nextTick().then(() => drawOverlay())
  }
}, { deep: true })
</script>

<style scoped>
.heatmap-lookback {
  display: flex;
  flex-direction: column;
  gap: calc(10px * var(--widget-space, 1));
}
.heatmap-lookback__stacked {
  display: grid;
  gap: calc(12px * var(--widget-space, 1));
}
.heatmap-lookback__panel {
  display: grid;
  gap: calc(6px * var(--widget-space, 1));
}
.heatmap-lookback__label {
  display: flex;
  align-items: center;
  gap: calc(6px * var(--widget-space, 1));
  font-size: calc(12px * var(--widget-scale, 1));
  color: var(--muted);
}
.heatmap-lookback__label .dot,
.heatmap-lookback__legend-weeks .dot {
  width: calc(10px * var(--widget-space, 1));
  height: calc(10px * var(--widget-space, 1));
  border-radius: 50%;
  flex: 0 0 auto;
}
.heatmap-lookback__legend {
  display: grid;
  gap: calc(8px * var(--widget-space, 1));
  font-size: calc(11px * var(--widget-scale, 1));
  color: var(--muted);
}
.heatmap-lookback__legend-scale {
  display: flex;
  align-items: center;
  gap: calc(6px * var(--widget-space, 1));
}
.heatmap-lookback__legend-bar {
  flex: 1;
  height: calc(8px * var(--widget-space, 1));
  border-radius: 999px;
  background: linear-gradient(90deg, var(--heatmap-low), var(--heatmap-high));
}
.heatmap-lookback__legend-weeks {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: calc(6px * var(--widget-space, 1));
}
.heatmap-lookback__legend-weeks li {
  display: flex;
  align-items: center;
  gap: calc(6px * var(--widget-space, 1));
}
</style>
