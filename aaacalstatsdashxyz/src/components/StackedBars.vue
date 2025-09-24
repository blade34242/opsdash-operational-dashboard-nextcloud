<template>
  <!-- Stacked bars: hours per day stacked by calendar; legacy single-series fallback supported -->
  <canvas ref="cv" class="chart" />
  </template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { ctxFor } from '../services/charts'

const props = defineProps<{ stacked?: any, legacy?: any, colorsById: Record<string,string> }>()
const cv = ref<HTMLCanvasElement|null>(null)

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
      series.forEach(s=>{
        const v = Math.max(0, Number(s.data?.[i]||0))
        const h = v*scale
        const x = x0+g+i*(bw+g)
        y = y - h
        const col = props.colorsById[s.id] || s.color || '#93c5fd'
        ctx.fillStyle = col
        if (h>0.5) ctx.fillRect(x, y, bw, h)
      })
      ctx.fillStyle=fg; ctx.font='12px ui-sans-serif,system-ui'
      const t=weekday(String(labels[i]||''))
      if (bw>26){ const tw=ctx.measureText(t).width; ctx.fillText(t, x0+g+i*(bw+g)+bw/2-tw/2, y0+14) }
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
    ctx.fillStyle=fg; ctx.font='12px ui-sans-serif,system-ui'
    const t=weekday(String(labelsL[i]||''))
    if (bw>26){ const tw=ctx.measureText(t).width; ctx.fillText(t, x+bw/2-tw/2, y0+14) }
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
