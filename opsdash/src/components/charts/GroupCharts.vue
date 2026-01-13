<template>
  <!-- Per-group charts: show only for groups with selected calendars (1–9) -->
  <div class="grid2 mt-12" v-if="groups && groups.length">
    <div class="card" v-for="g in groups" :key="'g-'+g">
      <div class="group-title">Group {{ g }}</div>
      <div class="grid2">
        <div class="card"><PieChart :data="pieSubset(g)" :colors-by-id="colorsById" /></div>
        <div class="card"><StackedBars :stacked="stackedSubset(g)" :colors-by-id="colorsById" /></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PieChart from './PieChart.vue'
import StackedBars from './StackedBars.vue'

const props = defineProps<{
  groups: number[]
  pieAll?: any
  perAll?: any
  selected: string[]
  groupsById: Record<string, number>
  colorsById: Record<string, string>
}>()

function pieSubset(g:number){
  const pieAll:any = props.pieAll || {}
  const idsAll:string[] = pieAll.ids || []
  const labelsAll:string[] = pieAll.labels || []
  const dataAll:number[] = (pieAll.data||[]).map((x:any)=>Number(x)||0)
  const colorsAll:string[] = pieAll.colors || []
  const sel = new Set(props.selected||[])
  const gmap = props.groupsById||{}
  const idx:number[] = []
  for (let i=0;i<idsAll.length;i++){ const id=String(idsAll[i]||''); if (sel.has(id) && (gmap[id]||0)===g && dataAll[i]>0) idx.push(i) }
  return { ids: idx.map(i=>idsAll[i]), labels: idx.map(i=>labelsAll[i]), data: idx.map(i=>dataAll[i]), colors: idx.map(i=>colorsAll[i]) }
}

function stackedSubset(g:number){
  const perAll:any = props.perAll
  if (!perAll || !Array.isArray(perAll.series)) return null
  const sel = new Set(props.selected||[])
  const gmap = props.groupsById||{}
  const labels:string[] = perAll.labels||[]
  const series:any[] = (perAll.series||[]).filter((s:any)=> sel.has(String(s.id)) && (gmap[String(s.id)]||0)===g )
  return { labels, series }
}
</script>
