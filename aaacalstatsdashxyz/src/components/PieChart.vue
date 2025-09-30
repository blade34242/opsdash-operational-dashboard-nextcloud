<template>
  <!-- Pie chart: hours by calendar; uses server colors (byId/byName) when available -->
  <canvas ref="cv" class="chart" />
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { ctxFor, tint, invert } from '../services/charts'

const props = defineProps<{ data?: any, colorsById: Record<string,string>, colorsByName?: Record<string,string> }>()
const cv = ref<HTMLCanvasElement|null>(null)

function draw(){
  const cdata:any = props.data
  const cvEl = cv.value
  if (!cvEl || !cdata) return
  const ctx = ctxFor(cvEl); if(!ctx) return
  const W=cvEl.clientWidth,H=cvEl.clientHeight,cx=W/2,cy=H/2,r=Math.min(W,H)*0.35
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
    const mid=(ang+a2)/2,lx=cx+Math.cos(mid)*(r+12),ly=cy+Math.sin(mid)*(r+12); ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--fg').trim()||'#0f172a'; ctx.font='12px ui-sans-serif,system-ui'
    const perc = Math.max(0, Number(v)||0) / total * 100;
    const txt=`${labels?.[i]?labels[i]+' ':''}(${Number(v).toFixed(2)}h, ${perc.toFixed(1)}%)`; const tw=ctx.measureText(txt).width; ctx.fillText(txt,lx-tw/2,ly)
    ang=a2
  })
}

onMounted(()=>{ draw(); window.addEventListener('resize', draw) })
watch(()=>props.data, ()=> draw(), { deep:true })
watch(()=>props.colorsById, ()=> draw(), { deep:true })
</script>
