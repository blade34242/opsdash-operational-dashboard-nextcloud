<template>
  <!-- Stacked bars: hours per day stacked by calendar; legacy single-series fallback supported -->
  <canvas ref="cv" class="chart" />
  </template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { ctxFor } from '../services/charts'

const props = defineProps<{ stacked?: any, legacy?: any, colorsById: Record<string,string> }>()
const cv = ref<HTMLCanvasElement|null>(null)

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

function draw(){
  const cvEl = cv.value; if (!cvEl) return
  const ctx = ctxFor(cvEl); if(!ctx) return
  const W=cvEl.clientWidth,H=cvEl.clientHeight,pad=28,x0=pad*1.4,y0=H-pad,x1=W-pad
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
    const totals = labels.map((_,i)=> series.reduce((a,s)=>a+Math.max(0, Number(s.data?.[i]||0)),0))
    const max = Math.max(1, ...totals)
    const n=labels.length||1, g=8, bw=Math.max(6,(x1-x0-g*(n+1))/n), scale=(y0-pad)/max
    labels.forEach((_,i)=>{
      let y=y0
      let colTotal = 0
      series.forEach(s=>{
        const v = Math.max(0, Number(s.data?.[i]||0))
        const h = v*scale
        const x = x0+g+i*(bw+g)
        y = y - h
        const col = props.colorsById[s.id] || s.color || '#93c5fd'
        ctx.fillStyle = col
        if (h>0.5) {
          ctx.fillRect(x, y, bw, h)
          if (h>14 && bw>22 && v>0.01) {
            const label = String((Math.round(v*100)/100).toFixed(1))
            ctx.fillStyle = textColorFor(col, fg)
            ctx.font = '11px ui-sans-serif,system-ui'
            const tw = ctx.measureText(label).width
            ctx.fillText(label, x + bw/2 - tw/2, y + h/2 + 4)
          }
        }
        colTotal += v
      })
      ctx.fillStyle=fg; ctx.font='12px ui-sans-serif,system-ui'
      const t=weekday(String(labels[i]||''))
      if (bw>26){ const tw=ctx.measureText(t).width; ctx.fillText(t, x0+g+i*(bw+g)+bw/2-tw/2, y0+14) }
      if (colTotal>0.01) {
        const x = x0+g+i*(bw+g)
        const labelT = `${(Math.round(colTotal*100)/100).toFixed(1)}h`
        drawOutlinedText(ctx, labelT, x + bw/2, Math.max(pad + 4, y - 2), {
          align: 'center',
          baseline: 'bottom',
          font: '11px ui-sans-serif,system-ui',
        })
      }
    })
    const overall = totals.reduce((sum, v)=> sum + v, 0)
    const totalLabel = `${(Math.round(overall*100)/100).toFixed(1)}h total`
    drawOutlinedText(ctx, totalLabel, x1 - 4, pad + 4, {
      align: 'right',
      baseline: 'top',
      font: '12px ui-sans-serif,system-ui',
    })
    return
  }
  const legacy:any = props.legacy
  if (!legacy) return
  let data=legacy.data||[], labelsL=legacy.labels||[]
  // Reorder to start with Monday if labels represent a 7-day week
  const r2 = reorderToMonday(labelsL, [{ id:'__legacy__', data }])
  labelsL = r2.labels
  data = (r2.series?.[0]?.data) || data
  const max=Math.max(1,...data.map((v:any)=>Math.max(0,v)))
  const n=(data.length||1), g=8, bw=Math.max(6,(x1-x0-g*(n+1))/n), scale=(y0-pad)/max
  ctx.fillStyle='#93c5fd'
  data.forEach((v:any,i:number)=>{
    const h=Math.max(0,v*scale), x=x0+g+i*(bw+g), y=y0-h; ctx.fillRect(x,y,bw,h)
    if (h>14 && bw>22 && v>0.01) {
      const label = String((Math.round(v*100)/100).toFixed(1))
      ctx.fillStyle = textColorFor('#93c5fd', fg)
      ctx.font = '11px ui-sans-serif,system-ui'
      const tw = ctx.measureText(label).width
      ctx.fillText(label, x + bw/2 - tw/2, y + h/2 + 4)
    }
    ctx.fillStyle=fg; ctx.font='12px ui-sans-serif,system-ui'
    const t=weekday(String(labelsL[i]||''))
    if (bw>26){ const tw=ctx.measureText(t).width; ctx.fillText(t, x+bw/2-tw/2, y0+14) }
    if (v>0.01) {
      const labelT = `${(Math.round(v*100)/100).toFixed(1)}h`
      drawOutlinedText(ctx, labelT, x + bw/2, Math.max(pad + 4, y - 2), {
        align: 'center',
        baseline: 'bottom',
        font: '11px ui-sans-serif,system-ui',
      })
    }
  })
  const legacyTotal = data.reduce((sum:number, v:any)=> sum + Math.max(0, Number(v)||0), 0)
  const legacyLabel = `${(Math.round(legacyTotal*100)/100).toFixed(1)}h total`
  drawOutlinedText(ctx, legacyLabel, x1 - 4, pad + 4, {
    align: 'right',
    baseline: 'top',
    font: '12px ui-sans-serif,system-ui',
  })
}

onMounted(()=>{ draw(); window.addEventListener('resize', draw) })
watch(()=>props.stacked, ()=> draw(), { deep:true })
watch(()=>props.legacy, ()=> draw(), { deep:true })
watch(()=>props.colorsById, ()=> draw(), { deep:true })

// Convert a YYYY-MM-DD label to German weekday short name; otherwise keep as-is
function weekday(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return s
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`)
  // German abbreviations: So, Mo, Di, Mi, Do, Fr, Sa
  const names = ['So','Mo','Di','Mi','Do','Fr','Sa']
  return names[d.getDay()] || s
}

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
  const seriesR = (series||[]).map(s=> ({ ...s, data: (s.data||[]).map((_:any, i:number)=> (s.data||[])[perm[i]] ) }))
  return { labels: labelsR, series: seriesR }
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
