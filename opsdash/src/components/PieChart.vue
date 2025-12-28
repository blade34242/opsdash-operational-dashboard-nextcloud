<template>
  <!-- Pie chart: hours by calendar; uses server colors (byId/byName) when available -->
  <canvas ref="cv" class="chart" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ctxFor, tint, invert } from '../services/charts'

const props = defineProps<{ data?: any, colorsById: Record<string,string>, colorsByName?: Record<string,string>, showLabels?: boolean }>()
const cv = ref<HTMLCanvasElement|null>(null)
let ro: ResizeObserver | null = null
let mo: MutationObserver | null = null

function draw(){
  const cdata:any = props.data
  const cvEl = cv.value
  if (!cvEl || !cdata) return
  const ctx = ctxFor(cvEl); if(!ctx) return
  const styles = getComputedStyle(cvEl)
  const widgetScale = Math.max(0.5, Number.parseFloat(styles.getPropertyValue('--widget-scale')) || 1)
  const widgetSpace = Math.max(0.5, Number.parseFloat(styles.getPropertyValue('--widget-space')) || widgetScale)
  const widgetDensity = Math.max(0.5, Number.parseFloat(styles.getPropertyValue('--widget-density')) || 1)
  const textScale = widgetScale * widgetDensity
  const W=cvEl.clientWidth,H=cvEl.clientHeight,cx=W/2,cy=H/2,r=Math.min(W,H)*(0.35*widgetSpace)
  const dataAll=cdata.data||[], labelsAll=cdata.labels||[], idsAll=(cdata.ids||[]), baseColorsAll=(cdata.colors||[])
  const idx:number[]=[]; for (let i=0;i<dataAll.length;i++){ if ((Number(dataAll[i])||0) > 0) idx.push(i) }
  ctx.clearRect(0,0,W,H)
  if (idx.length===0) return
  const data = idx.map(i=>Number(dataAll[i])||0)
  const labels = idx.map(i=>String(labelsAll[i]||''))
  const ids = idx.map(i=>String(idsAll[i]||''))
  const baseColors = idx.map(i=>baseColorsAll[i])
  const total=data.reduce((a,b)=>a+Math.max(0,b),0)||1; let ang=-Math.PI/2
  ctx.lineWidth=1; ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--line').trim()||'#e5e7eb'
  const pal=['#60a5fa','#f59e0b','#ef4444','#10b981','#a78bfa','#fb7185','#22d3ee','#f97316']
  data.forEach((v,i)=>{
    const f=Math.max(0,v)/total,a2=ang+f*2*Math.PI; const name=String(labels?.[i]||''); const id=String(ids?.[i]||'');
    const srvCol = baseColors[i]
    const idCol = props.colorsById?.[id]
    const nameCol = props.colorsByName?.[name]
    let chosen = (idCol || nameCol || srvCol || pal[i%pal.length]) as string
    if (false) chosen = invert(chosen)
    if (false) chosen = tint(chosen)
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,ang,a2);ctx.closePath();ctx.fillStyle=chosen;ctx.fill();ctx.stroke();
    if (props.showLabels !== false) {
      const mid=(ang+a2)/2,lx=cx+Math.cos(mid)*(r+12*widgetSpace),ly=cy+Math.sin(mid)*(r+12*widgetSpace);
      ctx.save()
      ctx.font=`${12 * textScale}px ui-sans-serif,system-ui`
      ctx.fillStyle='#ffffff'
      ctx.strokeStyle='rgba(0,0,0,0.55)'
      ctx.lineWidth=3
      ctx.textAlign='center'
      ctx.textBaseline='middle'
      const perc = Math.max(0, Number(v)||0) / total * 100;
      const txt=`${labels?.[i]?labels[i]+' ':''}${Number(v).toFixed(2)}h · ${perc.toFixed(1)}%`
      ctx.strokeText(txt,lx,ly)
      ctx.fillText(txt,lx,ly)
      ctx.restore()
    }
    ang=a2
  })
}

function bindObservers() {
  try {
    ro = new ResizeObserver(() => draw())
    if (cv.value) ro.observe(cv.value)
  } catch (_) {}
  try {
    const target = cv.value?.closest('.layout-item') || cv.value?.parentElement
    if (target) {
      mo = new MutationObserver(() => draw())
      mo.observe(target, { attributes: true, attributeFilter: ['style', 'class'] })
    }
  } catch (_) {}
}

onMounted(()=>{ draw(); bindObservers(); window.addEventListener('resize', draw) })
onBeforeUnmount(() => {
  try { window.removeEventListener('resize', draw) } catch (_) {}
  try { ro && cv.value && ro.unobserve(cv.value) } catch (_) {}
  try { mo && mo.disconnect() } catch (_) {}
  ro = null
  mo = null
})
watch(()=>props.data, ()=> draw(), { deep:true })
watch(()=>props.colorsById, ()=> draw(), { deep:true })
watch(()=>props.showLabels, ()=> draw())
</script>
