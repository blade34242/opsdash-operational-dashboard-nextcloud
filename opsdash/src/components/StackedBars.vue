<template>
  <!-- Stacked bars: hours per day stacked by calendar -->
  <canvas ref="cv" class="chart" />
  </template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ctxFor } from '../services/charts'

const props = defineProps<{ stacked?: any, colorsById: Record<string,string>, showLabels?: boolean }>()
const cv = ref<HTMLCanvasElement|null>(null)
let ro: ResizeObserver | null = null
let mo: MutationObserver | null = null

function drawOutlinedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, options?: { align?: CanvasTextAlign; baseline?: CanvasTextBaseline; font?: string }) {
  ctx.save()
  if (options?.font) ctx.font = options.font
  if (options?.align) ctx.textAlign = options.align
  if (options?.baseline) ctx.textBaseline = options.baseline
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'
  ctx.strokeText(text, x, y)
  ctx.fillStyle = '#ffffff'
  ctx.fillText(text, x, y)
  ctx.restore()
}

function hexToRgb(hex:string){ const m=/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex||''); if(!m) return null; return {r:parseInt(m[1],16), g:parseInt(m[2],16), b:parseInt(m[3],16)} }
function textColorFor(bg:string, fallback:string): string {
  const rgb = hexToRgb(bg)
  if (!rgb) return fallback
  const lum = (0.2126*rgb.r + 0.7152*rgb.g + 0.0722*rgb.b)/255
  return lum < 0.55 ? '#ffffff' : fallback
}

function formatHours(value: number): string {
  const normalized = Math.max(0, Number(value) || 0)
  return (Math.round(normalized * 10) / 10).toFixed(1)
}

function lightenColor(hex: string, factor = 0.5): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const mix = Math.max(0, Math.min(1, factor))
  const r = Math.round(rgb.r + (255 - rgb.r) * mix)
  const g = Math.round(rgb.g + (255 - rgb.g) * mix)
  const b = Math.round(rgb.b + (255 - rgb.b) * mix)
  return `rgb(${r},${g},${b})`
}

function darkenColor(hex: string, factor = 0.5): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const mix = Math.max(0, Math.min(1, factor))
  const r = Math.round(rgb.r * (1 - mix))
  const g = Math.round(rgb.g * (1 - mix))
  const b = Math.round(rgb.b * (1 - mix))
  return `rgb(${r},${g},${b})`
}

type ForecastVariant = 'future' | 'mixed'

function drawForecastOverlay(
  ctx: CanvasRenderingContext2D,
  opts: { x: number; y: number; width: number; height: number; baseColor: string; variant: ForecastVariant },
) {
  const { x, y, width, height, baseColor, variant } = opts
  const isMixed = variant === 'mixed'

  const baseInset = Math.min(width * (isMixed ? 0.35 : 0.22), 6)
  const innerWidth = Math.max(2, isMixed ? width * 0.45 : width - baseInset * 2)
  const innerX = isMixed ? x + width - innerWidth - baseInset : x + (width - innerWidth) / 2
  const fillColor = lightenColor(baseColor, isMixed ? 0.6 : 0.45)
  const strokeColor = darkenColor(baseColor, isMixed ? 0.4 : 0.35)

  ctx.save()
  ctx.fillStyle = fillColor
  ctx.globalAlpha = isMixed ? 0.12 : 0.16
  ctx.fillRect(innerX, y, innerWidth, height)
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = isMixed ? 1.25 : 1.5
  ctx.globalAlpha = isMixed ? 0.6 : 0.75
  ctx.setLineDash([4, 4])
  ctx.strokeRect(innerX, y, innerWidth, height)
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = strokeColor
  ctx.globalAlpha = isMixed ? 0.35 : 0.45
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(innerX, y)
  ctx.lineTo(innerX + innerWidth, y)
  ctx.stroke()
  ctx.restore()
}

function draw(){
  const cvEl = cv.value; if (!cvEl) return
  const ctx = ctxFor(cvEl); if(!ctx) return
  const styles = getComputedStyle(cvEl)
  const widgetScale = Math.max(0.5, Number.parseFloat(styles.getPropertyValue('--widget-scale')) || 1)
  const widgetSpace = Math.max(0.5, Number.parseFloat(styles.getPropertyValue('--widget-space')) || widgetScale)
  const widgetDensity = Math.max(0.5, Number.parseFloat(styles.getPropertyValue('--widget-density')) || 1)
  const textScale = widgetScale * widgetDensity
  const W=cvEl.clientWidth,H=cvEl.clientHeight,pad=28*widgetSpace,x0=pad*1.4,y0=H-pad,x1=W-pad
  const line=getComputedStyle(document.documentElement).getPropertyValue('--line').trim()||'#e5e7eb'
  const fg=getComputedStyle(document.documentElement).getPropertyValue('--fg').trim()||'#0f172a'
  ctx.clearRect(0,0,W,H)
  ctx.strokeStyle=line; ctx.lineWidth=1
  ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y0); ctx.moveTo(x0,y0); ctx.lineTo(x0,pad); ctx.stroke()

  const stacked:any = props.stacked
  if (stacked && stacked.labels && stacked.series) {
    let labels:string[] = stacked.labels||[]
    let series:any[] = stacked.series||[]
    // Reorder to start with Monday if labels represent a 7-day week
    const reordered = reorderToMonday(labels, series)
    labels = reordered.labels
    series = reordered.series
    const actualTotals = labels.map((_,i)=> series.reduce((a,s)=>a+Math.max(0, Number(s.data?.[i]||0)),0))
    const forecastTotals = labels.map((_,i)=> series.reduce((a,s)=>a+Math.max(0, Number(s.forecast?.[i]||0)),0))
    const combinedTotals = actualTotals.map((val, idx)=> val + forecastTotals[idx])
    const max = Math.max(1, ...combinedTotals)
    const n=labels.length||1
    const g=8*widgetSpace
    const bw=Math.max(6*widgetSpace,(x1-x0-g*(n+1))/n)
    const chartScale=(y0-pad)/max
    let sumActual = 0
    let sumForecast = 0
    labels.forEach((_,i)=>{
      const x = x0+g+i*(bw+g)
      let y=y0
      let colActual = 0
      series.forEach((s)=>{
        const v = Math.max(0, Number(s.data?.[i]||0))
        const h = v*chartScale
        y -= h
        const col = props.colorsById[s.id] || s.color || '#93c5fd'
        if (h>0.5) {
          ctx.fillStyle = col
          ctx.fillRect(x, y, bw, h)
          if (props.showLabels !== false && h>14*textScale && bw>22*textScale && v>0.01) {
            const label = formatHours(v)
            ctx.fillStyle = textColorFor(col, fg)
            ctx.font = `${11 * textScale}px ui-sans-serif,system-ui`
            const tw = ctx.measureText(label).width
            ctx.fillText(label, x + bw/2 - tw/2, y + h/2 + 4)
          }
        }
        colActual += v
      })
      const yAfterActual = y
      let yForecast = yAfterActual
      let colForecast = 0
      series.forEach((s)=>{
        const vf = Math.max(0, Number(s.forecast?.[i] || 0))
        if (vf <= 0) return
        const hf = vf * chartScale
        yForecast -= hf
        colForecast += vf
        if (hf <= 0.5) {
          return
        }
        const baseCol = props.colorsById[s.id] || s.color || '#93c5fd'
        drawForecastOverlay(ctx, {
          x,
          y: yForecast,
          width: bw,
          height: hf,
          baseColor: baseCol,
          variant: colActual > 0.01 ? 'mixed' : 'future',
        })
      })
      sumActual += colActual
      sumForecast += colForecast
      ctx.fillStyle=fg; ctx.font=`${12 * textScale}px ui-sans-serif,system-ui`
      const t=weekday(String(labels[i]||''))
      if (bw>26*textScale){ const tw=ctx.measureText(t).width; ctx.fillText(t, x+bw/2-tw/2, y0+14*textScale) }
      const labelValue = colForecast>0.01
        ? `~${formatHours(colActual + colForecast)}h`
        : colActual>0.01
          ? `${formatHours(colActual)}h`
          : ''
      if (props.showLabels !== false && labelValue) {
        drawOutlinedText(ctx, labelValue, x + bw/2, Math.max(pad + 4 * textScale, yForecast - 2), {
          align: 'center',
          baseline: 'bottom',
          font: `${11 * textScale}px ui-sans-serif,system-ui`,
        })
      }
    })
    const totalLabel = sumForecast>0.01
      ? `~${formatHours(sumActual + sumForecast)}h expected`
      : `${formatHours(sumActual)}h total`
    if (props.showLabels !== false) {
      drawOutlinedText(ctx, totalLabel, x1 - 4, pad + 4 * textScale, {
        align: 'right',
        baseline: 'top',
        font: `${12 * textScale}px ui-sans-serif,system-ui`,
      })
    }
    return
  }
  return
}

function bindObservers() {
  try {
    ro = new ResizeObserver(() => draw())
    if (cv.value) ro.observe(cv.value)
  } catch(_) {}
  try {
    const target = cv.value?.closest('.layout-item') || cv.value?.parentElement
    if (target) {
      mo = new MutationObserver(() => draw())
      mo.observe(target, { attributes: true, attributeFilter: ['style', 'class'] })
    }
  } catch(_) {}
}

onMounted(()=>{ draw(); bindObservers(); window.addEventListener('resize', draw) })
onBeforeUnmount(() => {
  try { window.removeEventListener('resize', draw) } catch(_) {}
  try { ro && cv.value && ro.unobserve(cv.value) } catch(_) {}
  try { mo && mo.disconnect() } catch(_) {}
  ro = null
  mo = null
})
watch(()=>props.stacked, ()=> draw(), { deep:true })
watch(()=>props.colorsById, ()=> draw(), { deep:true })
watch(()=>props.showLabels, ()=> draw())

// Convert a YYYY-MM-DD label to German weekday short name; otherwise keep as-is
// If labels represent 7 dates, reorder so Monday comes first; reorder series.data accordingly
function reorderToMonday(labels: string[], series: any[]): { labels: string[]; series: any[] } {
  if (!Array.isArray(labels) || labels.length !== 7) return { labels, series }
  const dates = labels.map(s=> parseDate(s))
  if (dates.some(d=> !d)) return { labels, series }
  // Build mapping from original index to ISO day (Mon=1..Sun=7)
  const iso = dates.map(d=> isoDay(d!))
  // If already Monday-first sequence, keep as-is
  const want = [1,2,3,4,5,6,7]
  if (iso.join(',') === want.join(',')) return { labels, series }
  // Compute permutation indices for Monday-first
  // Find indices for each iso day 1..7
  const idxByIso: Record<number, number> = {}
  iso.forEach((v,i)=>{ idxByIso[v] = i })
  if (!want.every(v=> v in idxByIso)) return { labels, series }
  const perm = want.map(v=> idxByIso[v])
  const labelsR = perm.map(i=> labels[i])
  const seriesR = (series || []).map((s) => {
    const dataSrc = Array.isArray(s.data) ? s.data : []
    const forecastSrc = Array.isArray((s as any).forecast) ? (s as any).forecast : null
    const data = perm.map((idx) => dataSrc[idx] ?? 0)
    const forecast = forecastSrc ? perm.map((idx) => forecastSrc[idx] ?? 0) : undefined
    const next: any = { ...s, data }
    if (forecast) {
      next.forecast = forecast
    }
    return next
  })
  return { labels: labelsR, series: seriesR }
}

// Convert a YYYY-MM-DD label to German weekday short name; otherwise keep as-is
function weekday(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return s
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`)
  const names = ['So','Mo','Di','Mi','Do','Fr','Sa']
  return names[d.getDay()] || s
}

function parseDate(s:string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`)
  return isNaN(d.getTime()) ? null : d
}

function isoDay(d: Date): number {
  // JS: 0=Sun..6=Sat -> ISO: 1=Mon..7=Sun
  const n = d.getDay()
  return n === 0 ? 7 : n
}
</script>
