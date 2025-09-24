<template>
  <!-- Heatmap canvas: renders a 24×7 matrix using a blue→purple gradient -->
  <canvas ref="cv" class="chart" />
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import { ctxFor, heatColor } from '../services/charts'

// Props: hod contains weekday labels (rows), hour labels (cols), and a matrix of hour sums
const props = defineProps<{ hod?: { dows:string[], hours:string[]|number[], matrix:number[][] } }>()
const cv = ref<HTMLCanvasElement|null>(null)
let ro: ResizeObserver | null = null

function draw(){
  const cvEl = cv.value, data = props.hod
  if (!cvEl) return
  if (!data) {
    // Helpful debug when nothing renders
    console.info('[aaacalstatsdashxyz] heatmap: no data provided')
    return
  }
  const ctx = ctxFor(cvEl); if(!ctx) { return }
  const W=cvEl.clientWidth,H=cvEl.clientHeight
  const rows=data.dows||[], cols=data.hours||[], m=data.matrix||[]
  ctx.clearRect(0,0,W,H)
  const pad=36, x0=pad, y0=pad, x1=W-pad, y1=H-pad
  const cw=(x1-x0)/Math.max(1,cols.length), rh=(y1-y0)/Math.max(1,rows.length)
  const vmax = Math.max(0, ...m.flat()) || 1
  if (rows.length && cols.length) {
    console.info('[aaacalstatsdashxyz] heatmap draw', { rows: rows.length, cols: cols.length, vmax })
  }
  for(let r=0;r<rows.length;r++){
    for(let c=0;c<cols.length;c++){
      const v = (m[r]?.[c]) || 0
      const ratio = v / vmax
      const x = x0 + c*cw, y = y0 + r*rh
      ctx.fillStyle = heatColor(ratio)
      ctx.fillRect(x,y,cw-1,rh-1)
    }
  }
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--fg').trim()||'#0f172a'
  ctx.font = '12px ui-sans-serif,system-ui'
  rows.forEach((d,i)=> ctx.fillText(d, 8, y0 + i*rh + 12))
  cols.forEach((h,i)=>{ if (i%2===0) ctx.fillText(String(h), x0 + i*cw + 2, y0 - 6) })
}

onMounted(async ()=>{
  await nextTick()
  // Initial attempt (may be 0-size if panel hidden)
  draw()
  // Observe element size so opening the Heat tab triggers a redraw when it gains size
  try {
    ro = new ResizeObserver(()=> draw())
    if (cv.value) ro.observe(cv.value)
  } catch(_) {}
  window.addEventListener('resize', draw)
})
onBeforeUnmount(()=>{ try{ window.removeEventListener('resize', draw) }catch(_){} try{ ro && cv.value && ro.unobserve(cv.value) }catch(_){} ro=null })
watch(()=>props.hod, ()=> draw(), { deep:true })
</script>
