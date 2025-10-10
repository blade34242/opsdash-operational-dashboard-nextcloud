<template>
  <div id="opsdash" class="opsdash" :class="{ 'is-nav-collapsed': !navOpen }">
    <NcAppContent app-name="Operational Dashboard" :show-navigation="navOpen">
      <template #navigation>
        <Sidebar
          id="opsdash-sidebar"
          :calendars="calendars"
          :selected="selected"
          :groups-by-id="groupsById"
          :is-loading="isLoading"
          :range="range"
          :offset="offset"
          :from="from"
          :to="to"
          :targets-week="targetsWeek"
          :targets-month="targetsMonth"
          :targets-config="targetsConfig"
          :notes-prev="notesPrev"
          :notes-curr-draft="notesCurrDraft"
          :notes-label-prev="notesLabelPrev"
          :notes-label-curr="notesLabelCurr"
          :notes-label-prev-title="notesLabelPrevTitle"
          :notes-label-curr-title="notesLabelCurrTitle"
          :is-saving-note="isSavingNote"
          @load="load"
          @update:range="(v)=>{ range=v as any; offset=0; load() }"
          @update:offset="(v)=>{ offset=v as number; load() }"
          @select-all="(v:boolean)=> selectAll(v)"
          @toggle-calendar="(id:string)=> toggleCalendar(id)"
          @set-group="(p:{id:string;n:any})=> setGroup(p.id, p.n)"
          @set-target="(p:{id:string;h:any})=> setTarget(p.id, p.h)"
          @update:notes="(v:string)=> notesCurrDraft = v"
          @save-notes="saveNotes"
          @update:targets-config="updateTargetsConfig"
        />
      </template>

      <div class="app-shell">
        <button
          class="nav-toggle"
          type="button"
          @click="toggleNav"
          :aria-expanded="navOpen"
          aria-controls="opsdash-sidebar"
          :aria-label="navToggleLabel"
        >
          <span v-if="navOpen">⟨</span>
          <span v-else>⟩</span>
        </button>

        <div class="app-main">
          <div class="app-container">
            <div class="appbar">
              <div class="title">
                <img :src="iconSrc" @error="onIconError" class="app-icon" alt="" aria-hidden="true" />
                <span>Operational Dashboard</span>
                <span class="chip" v-text="range.toUpperCase()" />
              </div>
              <div class="hint appbar-meta">
                <NcLoadingIcon v-if="isLoading" :size="16" />
                <span v-text="uid" />
                <span v-if="isTruncated" title="Results truncated for performance">· Partial data</span>
              </div>
            </div>

            <div class="banner warn" v-if="isTruncated" :title="truncTooltip">
              Showing partial data to keep things fast.
              <template v-if="truncLimits && truncLimits.totalProcessed != null">
                Processed {{ truncLimits.totalProcessed }} items.
              </template>
            </div>

            <div class="cards">
              <TimeSummaryCard
                :summary="timeSummary"
                :mode="activeDayMode"
                @update:mode="setActiveDayMode"
              />
              <TimeTargetsCard
                :summary="targetsSummary"
                :config="targetsConfig"
              />
              <div class="card">
                <div>Events</div>
                <div class="value">{{ stats.events ?? 0 }}</div>
                <div class="sub">
                  <div v-if="stats.active_days != null">Active Days: {{ stats.active_days }}</div>
                  <div v-if="stats.typical_start && stats.typical_end">Typical: {{ stats.typical_start }}–{{ stats.typical_end }}</div>
                  <div v-if="stats.weekend_share != null">Weekend: {{ n1(stats.weekend_share) }}%</div>
                  <div v-if="stats.evening_share != null">Evening: {{ n1(stats.evening_share) }}%</div>
                </div>
              </div>
            </div>

            <div class="tabs">
              <a href="#" :class="{active: pane==='cal'}" @click.prevent="pane='cal'">By Calendar</a>
              <a href="#" :class="{active: pane==='day'}" @click.prevent="pane='day'">By Day</a>
              <a href="#" :class="{active: pane==='top'}" @click.prevent="pane='top'">Longest Tasks</a>
              <a href="#" :class="{active: pane==='heat'}" @click.prevent="pane='heat'">Heatmap</a>
            </div>

            <div class="card full tab-panel" v-show="pane==='cal'">
              <NcEmptyContent v-if="byCal.length===0" name="No data" description="Try changing the range or calendars" />
              <template v-else>
                <ByCalendarTable :rows="byCal" :n2="n2" :targets="currentTargets" />
                <div class="grid2 mt-12">
                  <div class="card"><PieChart :data="charts.pie" :colors-by-id="colorsById" :colors-by-name="colorsByName" /></div>
                  <div class="card"><StackedBars :stacked="(charts as any).perDaySeries" :legacy="charts.perDay" :colors-by-id="colorsById" /></div>
                </div>
                <!-- Grouped charts: one card per used group (0-9), only if data exists -->
                <GroupCharts :groups="groupList" :pie-all="charts.pie" :per-all="(charts as any).perDaySeries" :selected="selected" :groups-by-id="groupsById" :colors-by-id="colorsById" />
              </template>
            </div>

            <div class="card full tab-panel" v-show="pane==='day'">
              <NcEmptyContent v-if="byDay.length===0" name="No data" description="Try changing the range or calendars" />
              <template v-else>
                <ByDayTable :rows="byDay" :n2="n2" :link="calendarDayLink" />
              </template>
            </div>

            <div class="card full tab-panel" v-show="pane==='top'">
              <NcEmptyContent v-if="longest.length===0" name="No data" description="Try changing the range or calendars" />
              <template v-else>
                <TopEventsTable :rows="longest" :n2="n2" :details-index="detailsIndex" @toggle="toggleDetails" />
              </template>
            </div>

            <div class="card full tab-panel" v-show="pane==='heat'">
              <NcEmptyContent v-if="!charts.hod || !charts.hod.matrix || charts.hod.matrix.length===0" name="No data" description="Try changing the range or calendars" />
              <template v-else>
                <HeatmapCanvas :hod="charts.hod" />
                <div class="hint">24×7 Heatmap: cumulated hours by weekday (rows) and hour (columns).</div>
              </template>
            </div>

            <div class="hint footer">
              Powered by <strong>Gellert Innovation</strong> • Built with <span class="mono">opsdash</span>
              <template v-if="appVersion"> v{{ appVersion }}</template>
              <template v-if="changelogUrl"> • <a :href="changelogUrl" target="_blank" rel="noreferrer noopener">Changelog</a></template>
            </div>
          </div>
        </div>
      </div>
    </NcAppContent>
  </div>
</template>

<script setup lang="ts">
import { NcAppContent, NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import PieChart from './components/PieChart.vue'
import StackedBars from './components/StackedBars.vue'
import GroupCharts from './components/GroupCharts.vue'
import HeatmapCanvas from './components/HeatmapCanvas.vue'
import ByCalendarTable from './components/ByCalendarTable.vue'
import ByDayTable from './components/ByDayTable.vue'
import TopEventsTable from './components/TopEventsTable.vue'
import TimeSummaryCard from './components/TimeSummaryCard.vue'
import TimeTargetsCard from './components/TimeTargetsCard.vue'
import Sidebar from './components/Sidebar.vue'
import { createDefaultTargetsConfig, buildTargetsSummary, normalizeTargetsConfig, createEmptyTargetsSummary, type TargetsConfig } from './services/targets'
// Lightweight notifications without @nextcloud/dialogs
function notifySuccess(msg: string){
  const w:any = window as any
  if (w.OC?.Notification?.showTemporary) { w.OC.Notification.showTemporary(msg) }
  else { console.log('SUCCESS:', msg) }
}
function notifyError(msg: string){
  const w:any = window as any
  if (w.OC?.Notification?.showTemporary) { w.OC.Notification.showTemporary(msg) }
  else { console.error('ERROR:', msg); alert(msg) }
}

import { onMounted, reactive, ref, watch, nextTick, computed, onBeforeUnmount } from 'vue'
// Ensure a visible version even if backend attrs are empty: use package.json as fallback
// @ts-ignore
import pkg from '../package.json'

type Charts = {
  pie?: { labels: string[]; data: number[] }
  perDay?: { labels: string[]; data: number[] }
  dow?: { labels: string[]; data: number[] }
  hod?: { dows: string[]; hours: number[]; matrix: number[][] }
}

const SIDEBAR_STORAGE_KEY = 'opsdash.sidebarOpen'
const navOpen = ref((() => {
  if (typeof window === 'undefined') return true
  const raw = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)
  return raw == null ? true : raw === '1'
})())

const toggleNav = () => {
  navOpen.value = !navOpen.value
}

const navToggleLabel = computed(() => navOpen.value ? 'Hide sidebar' : 'Show sidebar')

watch(navOpen, (open) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, open ? '1' : '0')
  }
})

const pane = ref<'cal'|'day'|'top'|'heat'>('cal')
const range = ref<'week'|'month'>('week')
const offset = ref<number>(0)
const uid = ref('')
const from = ref('')
const to = ref('')
const isLoading = ref(false)
const isTruncated = ref(false)
const truncLimits = ref<any>(null)
const truncTooltip = computed(()=>{
  const l:any = truncLimits.value
  if (!l) return 'Partial data due to caps'
  const parts = [] as string[]
  if (l.maxPerCal != null) parts.push(`cap per calendar: ${l.maxPerCal}`)
  if (l.maxTotal != null) parts.push(`cap total: ${l.maxTotal}`)
  if (l.totalProcessed != null) parts.push(`processed: ${l.totalProcessed}`)
  return parts.join(' · ')
})

// Top 3 calendars by share from pie chart
const topThree = computed(() => {
  const pie:any = (charts.value as any)?.pie
  if (!pie || !Array.isArray(pie.data) || !Array.isArray(pie.labels)) return [] as {name:string;share:number}[]
  const data = pie.data.map((v:any)=> Number(v)||0)
  const labels = pie.labels.map((s:any)=> String(s||''))
  const total = data.reduce((a:number,b:number)=> a + Math.max(0,b), 0)
  if (total <= 0) return []
  const items = data.map((v:number,i:number)=> ({ name: labels[i]||'', value: Math.max(0,v) }))
  items.sort((a,b)=> b.value - a.value)
  return items.slice(0,3).map(it => ({ name: it.name, share: (it.value/total)*100 }))
})

const calendars = ref<{id:string;displayname:string;color?:string;checked:boolean}[]>([])
const colorsByName = ref<Record<string,string>>({})
const colorsById = ref<Record<string,string>>({})
const groupsById = ref<Record<string, number>>({})
const selected = ref<string[]>([])
const isSaving = ref(false)
const userChangedSelection = ref(false)

function isSelected(id: string) {
  return selected.value.includes(id)
}
function setSelected(id: string, checked: boolean) {
  const set = new Set(selected.value)
  if (checked) {
    set.add(id)
  } else {
    set.delete(id)
  }
  selected.value = Array.from(set)
}
function toggleCalendar(id: string) {
  setSelected(id, !isSelected(id))
  userChangedSelection.value = true
  queueSave()
}

function getGroup(id: string){ const n = groupsById.value?.[id]; return (typeof n==='number' && isFinite(n)) ? Math.max(0, Math.min(9, Math.trunc(n))) : 0 }
function setGroup(id: string, n: number){
  const v = Math.max(0, Math.min(9, Math.trunc(Number(n)||0)))
  if (!groupsById.value) groupsById.value = {}
  groupsById.value = { ...groupsById.value, [id]: v }
  // Persist groups without forcing a data reload to avoid loops
  queueSave(false)
}

function setTarget(id: string, h: any){
  const num = Number(h)
  if (!isFinite(num) || num < 0) return
  const v = Math.min(10000, Math.round(num*100)/100)
  if (range.value === 'month') {
    // Set monthly and convert weekly = month/4
    const weekConv = Math.min(10000, Math.round((v/4)*100)/100)
    targetsMonth.value = { ...(targetsMonth.value||{}), [id]: v }
    targetsWeek.value  = { ...(targetsWeek.value||{}),  [id]: weekConv }
  } else {
    // Set weekly and convert monthly = week*4
    const monthConv = Math.min(10000, Math.round((v*4)*100)/100)
    targetsWeek.value  = { ...(targetsWeek.value||{}),  [id]: v }
    targetsMonth.value = { ...(targetsMonth.value||{}), [id]: monthConv }
  }
  // Persist silently without reload
  queueSave(false)
}

function updateTargetsConfig(next: TargetsConfig){
  targetsConfig.value = normalizeTargetsConfig(next)
  queueSave(false)
}

function serializeTargetsConfig(cfg: TargetsConfig){
  return JSON.parse(JSON.stringify(normalizeTargetsConfig(cfg))) as TargetsConfig
}

const stats = reactive<any>({})
const byCal = ref<any[]>([])
const byDay = ref<any[]>([])
const longest = ref<any[]>([])
const charts = ref<Charts>({})
const activeDayMode = ref<'active'|'all'>('active')
const rangeLabel = computed(()=> range.value === 'month' ? 'Month' : 'Week')
const dailyTotals = computed(()=> (byDay.value||[]).map(d=> Number((d as any).total_hours || 0)))
function filteredValues(values: number[]): number[]{
  const normalized = values.map(v => (Number(v) || 0))
  if (activeDayMode.value === 'active') {
    return normalized.filter(v => v > 0)
  }
  return normalized
}
const avgDayValue = computed(()=> avg(filteredValues(dailyTotals.value)))
const medianDayValue = computed(()=> median(filteredValues(dailyTotals.value)))

const workdayTotals = computed(()=> (byDay.value||[])
  .filter(d=>{ const dow=dayOfWeek(String((d as any).date)); return dow>=1 && dow<=5 })
  .map(d=> Number((d as any).total_hours || 0)))
const weekendTotals = computed(()=> (byDay.value||[])
  .filter(d=>{ const dow=dayOfWeek(String((d as any).date)); return dow===0 || dow===6 })
  .map(d=> Number((d as any).total_hours || 0)))
const workdayAvg = computed(()=> avg(filteredValues(workdayTotals.value)))
const workdayMedian = computed(()=> median(filteredValues(workdayTotals.value)))
const weekendAvg = computed(()=> avg(filteredValues(weekendTotals.value)))
const weekendMedian = computed(()=> median(filteredValues(weekendTotals.value)))

const activeCalendarsCount = computed(()=> selected.value.length || (calendars.value?.length ?? 0))
const topCalendarsSummary = computed(()=>{
  if (topThree.value.length) {
    return topThree.value.map(t => `${t.name} ${n1(t.share)}%`).join(', ')
  }
  const top = (stats as any)?.top_calendar
  if (top && top.calendar) {
    const share = Number(top.share ?? 0)
    return `${top.calendar} ${n1(share)}%`
  }
  return ''
})
const balanceIndex = computed(()=>{
  const raw = (stats as any)?.balance_index ?? (stats as any)?.balanceIndex
  const num = Number(raw)
  return Number.isFinite(num) ? num : null
})
const timeSummary = computed(() => ({
  rangeLabel: rangeLabel.value,
  totalHours: Number((stats as any).total_hours ?? 0),
  avgDay: avgDayValue.value,
  avgEvent: Number((stats as any).avg_per_event ?? 0),
  medianDay: medianDayValue.value,
  busiest: (stats as any)?.busiest_day ?? null,
  workdayAvg: workdayAvg.value,
  workdayMedian: workdayMedian.value,
  weekendAvg: weekendAvg.value,
  weekendMedian: weekendMedian.value,
  weekendShare: (stats as any)?.weekend_share ?? null,
  activeCalendars: activeCalendarsCount.value,
  calendarSummary: topCalendarsSummary.value,
  balanceIndex: balanceIndex.value
}))

const targetsConfig = ref<TargetsConfig>(normalizeTargetsConfig(createDefaultTargetsConfig()))
const targetsSummary = computed(() => {
  try {
    return buildTargetsSummary({
      config: targetsConfig.value,
      stats,
      byDay: byDay.value || [],
      byCal: byCal.value || [],
      groupsById: groupsById.value || {},
      range: range.value,
      from: from.value,
      to: to.value,
    })
  } catch (e) {
    console.error('[opsdash] targets summary failed', e)
    return createEmptyTargetsSummary(targetsConfig.value)
  }
})

// Targets per calendar (hours)
const targetsWeek = ref<Record<string, number>>({})
const targetsMonth = ref<Record<string, number>>({})
const currentTargets = computed(()=> range.value==='month' ? targetsMonth.value : targetsWeek.value)
const detailsIndex = ref<number|null>(null)
function toggleDetails(i:number){ detailsIndex.value = detailsIndex.value===i ? null : i }
function calendarDayLink(dateStr: string){
  const w:any = window as any
  if (w.OC && typeof w.OC.generateUrl === 'function'){
    return w.OC.generateUrl('/apps/calendar/timeGridDay/' + dateStr)
  }
  return getRoot() + '/index.php/apps/calendar/timeGridDay/' + dateStr
}
function isDbg(){ return false }
function useTint(){ return false }
function useInvert(){ return false }

// App icon resolution (works across apps/apps-extra/apps-writable)
const iconIdx = ref(0)
const iconCandidates = computed(() => {
  const w:any = window as any
  const out:string[] = []
  try { if (w.OC?.imagePath) { const p = w.OC.imagePath('opsdash','app.svg'); if (p) out.push(p) } } catch {}
  const root = getRoot()
  out.push(root + '/apps/opsdash/img/app.svg')
  out.push(root + '/apps-extra/opsdash/img/app.svg')
  out.push(root + '/apps-writable/opsdash/img/app.svg')
  return out
})
const iconSrc = computed(() => iconCandidates.value[Math.min(iconIdx.value, iconCandidates.value.length-1)] || '')
function onIconError(){ if (iconIdx.value + 1 < iconCandidates.value.length) iconIdx.value++ }

// Version + changelog from template data attributes
function readDataAttr(name:string){ const el=document.getElementById('app'); return (el && (el as any).dataset ? ((el as any).dataset as any)[name] : '') || '' }
const appVersion = ref<string>(readDataAttr('opsdashVersion') || (pkg?.version ? String(pkg.version) : ''))
const changelogUrl = ref<string>(readDataAttr('opsdashChangelog'))

// Fallback: query ping endpoint to populate version/link if missing
async function ensureMeta(){
  if (appVersion.value && changelogUrl.value) return
  try {
    const res = await getJson(route('load').replace('/config_dashboard/load','/config_dashboard/ping'), {})
    if (!appVersion.value && typeof res?.version === 'string') appVersion.value = res.version
    if (!changelogUrl.value && typeof res?.changelog === 'string') changelogUrl.value = res.changelog
  } catch {}
}
ensureMeta()

const pie = ref<HTMLCanvasElement | null>(null)
const perDay = ref<HTMLCanvasElement | null>(null)
const hod = ref<HTMLCanvasElement | null>(null)

// Notes
const notesPrev = ref('')
const notesCurrDraft = ref('')
const isSavingNote = ref(false)
const notesLabelPrev = computed(()=> range.value==='month' ? 'Last month' : 'Last week')
const notesLabelCurr = computed(()=> range.value==='month' ? 'This month' : 'This week')
const notesLabelPrevTitle = computed(()=> range.value==='month' ? 'Notes for previous month' : 'Notes for previous week')
const notesLabelCurrTitle = computed(()=> range.value==='month' ? 'Notes for current month' : 'Notes for current week')

function n1(v:any){ return Number(v ?? 0).toFixed(1) }
function n2(v:any){ return Number(v ?? 0).toFixed(2) }
function arrow(v:number){ return v>0?'▲':(v<0?'▼':'—') }

// ---- Workdays vs Weekend stats (median and average per day) ----
function avg(arr: number[]): number { if (!arr.length) return 0; return arr.reduce((a,b)=>a+b,0)/arr.length }
function median(arr: number[]): number {
  if (!arr.length) return 0
  const s = [...arr].sort((a,b)=>a-b)
  const m = Math.floor(s.length/2)
  return s.length % 2 ? s[m] : (s[m-1]+s[m])/2
}
function dayOfWeek(dateStr: string): number {
  // 0=Sun..6=Sat
  const d = new Date(dateStr+'T00:00:00Z')
  return d.getUTCDay()
}
function getRoot(){ const w:any=window as any; return (w.OC && (w.OC.webroot || w.OC.getRootPath?.())) || (w._oc_webroot) || '' }
function qs(params: Record<string, any>): string { const u=new URLSearchParams(); Object.entries(params).forEach(([k,v])=>{ if(Array.isArray(v)) v.forEach(x=>u.append(k,String(x))); else if(v!==undefined&&v!==null) u.set(k,String(v)) }); return u.toString() }
async function getJson(url: string, params: any){ const q=qs(params||{}); const u=q?(url+(url.includes('?')?'&':'?')+q):url; const res=await fetch(u,{method:'GET',credentials:'same-origin'}); if(!res.ok) throw new Error('HTTP '+res.status); return await res.json() }
async function postJson(url: string, body: any){ const w:any=window as any; const rt=(w.OC?.requestToken)||(w.oc_requesttoken)||''; const headers:any={'Content-Type':'application/json'}; if(rt) headers['requesttoken']=rt; const res=await fetch(url,{method:'POST',credentials:'same-origin',headers,body:JSON.stringify(body||{})}); if(!res.ok) throw new Error('HTTP '+res.status); return await res.json() }

function route(name: string){
  const w:any = window as any
  if (w.OC && typeof w.OC.generateUrl === 'function') {
    if (name === 'load')    return w.OC.generateUrl('/apps/opsdash/config_dashboard/load')
    if (name === 'save')    return w.OC.generateUrl('/apps/opsdash/config_dashboard/save')
    if (name === 'persist') return w.OC.generateUrl('/apps/opsdash/config_dashboard/persist')
    if (name === 'notes')   return w.OC.generateUrl('/apps/opsdash/config_dashboard/notes')
    if (name === 'notesSave') return w.OC.generateUrl('/apps/opsdash/config_dashboard/notes')
    return w.OC.generateUrl('/apps/opsdash/config_dashboard')
  }
  const base = getRoot() + '/apps/opsdash/config_dashboard'
  if (name === 'load') return base + '/load'
  if (name === 'save') return base + '/save'
  if (name === 'persist') return base + '/persist'
  if (name === 'notes')   return base + '/notes'
  if (name === 'notesSave') return base + '/notes'
  return getRoot() + '/apps/opsdash/config_dashboard'
}

function selectAll(v:boolean){
  selected.value = v ? calendars.value.map(c=>c.id) : []
}

function setActiveDayMode(mode:'active'|'all'){
  if (activeDayMode.value !== mode) {
    activeDayMode.value = mode
  }
}

let loadSeq = 0
async function load(){
  const mySeq = ++loadSeq
  isLoading.value = true
  try {
    // Read-only; never send selection here. We load whatever the server has saved.
    const params:any = { range: range.value, offset: offset.value|0, save: false }
    const json:any = await getJson(route('load'), params)
    if (mySeq !== loadSeq) { if (isDbg()) console.warn('discarding stale load response', { mySeq, loadSeq }); return }
    uid.value = json.meta?.uid || ''
    from.value = json.meta?.from || ''
    to.value = json.meta?.to || ''
    isTruncated.value = !!(json.meta && json.meta.truncated)
    truncLimits.value = (json.meta && (json.meta as any).limits) || null

    calendars.value = json.calendars||[]
    colorsByName.value = (json.colors?.byName)||{}
    colorsById.value = (json.colors?.byId)||{}
    // groups mapping (id -> 0..9), default to 0
    const gobj = (json.groups && (json.groups.byId||json.groups.byID||json.groups.ids)) || {}
    const map: Record<string, number> = {}
    for (const c of calendars.value||[]) { const id=String(c.id); const n = Number((gobj as any)[id] ?? 0); map[id] = (isFinite(n)?Math.max(0,Math.min(9,Math.trunc(n))):0) }
    groupsById.value = map
    // targets
    const tw = (json.targets && (json.targets.week||{})) || {}
    const tm = (json.targets && (json.targets.month||{})) || {}
    targetsWeek.value = tw
    targetsMonth.value = tm
    targetsConfig.value = normalizeTargetsConfig((json.targetsConfig ?? createDefaultTargetsConfig()) as TargetsConfig)

    if (isDbg()) {
      console.group('[opsdash] calendars/colors')
      console.table((calendars.value||[]).map(c=>({id:c.id,name:c.displayname,color:c.color, raw:(c as any).color_raw, src:(c as any).color_src})))
      console.log('colors.byId', colorsById.value)
      console.log('colors.byName', colorsByName.value)
      if ((json as any).calDebug) console.log('server calDebug', (json as any).calDebug)
      console.groupEnd()
      console.group('[opsdash] server query debug')
      console.log((json as any).debug)
      console.groupEnd()
    }
    // If server couldn't provide colors (fallback), try WebDAV PROPFIND to get calendar-color like Calendar app
    const missing = (calendars.value||[]).filter((c:any)=>!c.color || (c as any).color_src==='fallback')
    if (missing.length) {
      try {
        const dav = await fetchDavColors(json.meta?.uid||'', calendars.value.map(c=>c.id))
        let updated=false
        calendars.value = calendars.value.map(c=>{
          const col = dav[c.id]
          if (col && col !== c.color) { (c as any).color_src = 'dav'; (c as any).color_raw = col; c.color = col; updated=true }
          return c
        })
        Object.entries(dav).forEach(([id,col])=>{ if (col) colorsById.value[id]=String(col) })
        if (updated) {
          if (isDbg()) { console.log('[opsdash] dav colors applied', dav) }
          // Recompute pie colors based on updated colorsById
          try {
            const pieData:any = charts.value?.pie || {}
            const ids:string[] = pieData.ids || []
            const srvCols:string[] = pieData.colors || []
            const newCols = ids.map((id,i)=> colorsById.value[id] || srvCols[i] || '#60a5fa')
            charts.value = { ...(charts.value||{}), pie: { ...pieData, colors: newCols } }
            if (isDbg()) console.log('[opsdash] recomputed pie colors', newCols)
          } catch(e){ if (isDbg()) console.warn('recompute pie colors failed', e) }
          // Recompute per-day series colors as well
          try {
            const pds:any = (charts.value as any).perDaySeries
            if (pds && Array.isArray(pds.series)) {
              const updSeries = pds.series.map((s:any)=> ({ ...s, color: (colorsById.value[s.id] || s.color || '#60a5fa') }))
              charts.value = { ...(charts.value||{}), perDaySeries: { labels: pds.labels, series: updSeries } }
            }
          } catch(e){ /* ignore */ }
          scheduleDraw()
        }
      } catch(e){ if (isDbg()) console.warn('dav colors failed', e) }
    }
    selected.value = json.selected||[]
    console.info('[opsdash] selection', { selected: selected.value.slice() })
    userChangedSelection.value = false

    Object.assign(stats, json.stats||{})
    byCal.value = json.byCal||[]
    byDay.value = json.byDay||[]
    longest.value = json.longest||[]
    charts.value = json.charts||{}
    await nextTick()
    scheduleDraw()
    // Load notes for current/previous period
    await fetchNotes().catch(()=>{})
  } catch (e:any) {
    console.error(e)
    notifyError('Failed to load data')
  } finally {
    isLoading.value = false
  }
}

async function fetchNotes(){
  const p = { range: range.value, offset: offset.value|0 }
  const json:any = await getJson(route('notes'), p)
  notesPrev.value = String(json?.notes?.previous || '')
  // Always reflect current period's saved content when switching periods
  const curSaved = String(json?.notes?.current || '')
  notesCurrDraft.value = curSaved
}

async function saveNotes(){
  try{
    isSavingNote.value = true
    await postJson(route('notesSave'), { range: range.value, offset: offset.value|0, content: notesCurrDraft.value||'' })
    notifySuccess('Notes saved')
    await fetchNotes()
  }catch(e){ console.error(e); notifyError('Failed to save notes') }
  finally{ isSavingNote.value = false }
}

let saveT: any = null
function queueSave(reload: boolean = true){
  if (saveT) clearTimeout(saveT)
  saveT = setTimeout(async () => {
    // Persist selection securely via POST + CSRF using persist endpoint
    try {
      isSaving.value = true
      // Include groups so group edits are saved too
      const res = await postJson(route('persist'), {
        cals: selected.value,
        groups: groupsById.value,
        targets_week: targetsWeek.value,
        targets_month: targetsMonth.value,
        targets_config: serializeTargetsConfig(targetsConfig.value),
      })
      // Update local selection from read-back to avoid mismatch
      selected.value = Array.isArray(res.read) ? res.read : (Array.isArray(res.saved)?res.saved:[])
      if (res.targets_config_read) {
        targetsConfig.value = normalizeTargetsConfig(res.targets_config_read as TargetsConfig)
      } else if (res.targets_config_saved) {
        targetsConfig.value = normalizeTargetsConfig(res.targets_config_saved as TargetsConfig)
      }
      if (reload) {
        await load()
      }
      notifySuccess('Selection saved')
    } catch (e:any) {
      console.error(e)
      notifyError('Failed to save selection')
    } finally {
      isSaving.value = false
    }
  }, 250)
}

async function save(){
  isLoading.value = true
  try {
    try {
      await postJson(route('save'), { cals: selected.value, groups: groupsById.value })
    } catch (e: any) {
      await getJson(route('save'), { cals: selected.value.join(',') })
    }
    await load()
    notifySuccess('Selection saved')
  } catch (e:any) {
    console.error(e)
    notifyError('Failed to save selection')
  } finally {
    isLoading.value = false
  }
}

function ctxFor(c: HTMLCanvasElement | null){
  if (!c) return null
  const pr = window.devicePixelRatio || 1
  const r = c.getBoundingClientRect()
  if (r.width<2 || r.height<2) return null
  const tw = Math.floor(r.width*pr)
  const th = Math.floor(r.height*pr)
  // Only update backing resolution if it actually changed to avoid layout churn
  if (c.width !== tw) c.width = tw
  if (c.height !== th) c.height = th
  const ctx = c.getContext('2d')!
  ctx.setTransform(pr,0,0,pr,0,0)
  return ctx
}

function drawAll(){ /* charts handled by components */ }

// ---- Grouped charts (per-group Pie + Stacked) ----
const groupList = ref<number[]>([])
const groupPieRefs = ref<Record<number, HTMLCanvasElement|null>>({})
const groupBarRefs = ref<Record<number, HTMLCanvasElement|null>>({})
function setGroupRef(kind:'pie'|'bar', g:number, el:HTMLCanvasElement|null){
  // Avoid replacing the whole object during render (can cause re-render loops)
  if (kind==='pie') {
    if (groupPieRefs.value[g] !== el) groupPieRefs.value[g] = el
  } else {
    if (groupBarRefs.value[g] !== el) groupBarRefs.value[g] = el
  }
}
function recomputeGroupList(){
  // Show a group if at least one selected calendar is assigned to it (1..9)
  const sel = new Set(selected.value||[])
  const gmap = groupsById.value||{}
  const present = new Set<number>()
  Object.entries(gmap).forEach(([id, n]) => {
    const grp = Math.max(0, Math.min(9, Math.trunc(Number(n)||0)))
    if (grp>=1 && grp<=9 && sel.has(String(id))) present.add(grp)
  })
  groupList.value = Array.from(present).sort((a,b)=>a-b)
}
watch([groupsById, selected], ()=>{ recomputeGroupList(); scheduleDraw() })

function drawGroups(){
  const pieAll:any = charts.value?.pie || {}
  const perAll:any = (charts.value as any).perDaySeries
  if (!pieAll || (!perAll || !Array.isArray(perAll.series))) return
  const sel = new Set(selected.value||[])
  const gmap = groupsById.value||{}
  // Draw per used group
  for (const g of groupList.value){
    // Pie
    const cvp = groupPieRefs.value[g] || null
    if (cvp){
      const ctx = ctxFor(cvp); if (ctx){
        const idsAll:string[] = pieAll.ids || []
        const labelsAll:string[] = pieAll.labels || []
        const dataAll:number[] = (pieAll.data||[]).map((x:any)=>Number(x)||0)
        const idx:number[] = []
        for (let i=0;i<idsAll.length;i++){ const id=String(idsAll[i]||''); if (sel.has(id) && (gmap[id]||0)===g && dataAll[i]>0) idx.push(i) }
        const subIds = idx.map(i=>idsAll[i])
        const sub = { ids: subIds, labels: idx.map(i=>labelsAll[i]), data: idx.map(i=>dataAll[i]), colors: subIds.map((id:any, j:number)=> colorsById.value[String(id)] || '#60a5fa') }
        // draw minimal donut
        const W=cvp.clientWidth,H=cvp.clientHeight,cx=W/2,cy=H/2,r=Math.min(W,H)*0.35
        ctx.clearRect(0,0,W,H)
        if (sub.data.length){
          const total=sub.data.reduce((a,b)=>a+Math.max(0,b),0)||1; let ang=-Math.PI/2
          ctx.lineWidth=1; ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--line').trim()||'#e5e7eb'
          sub.data.forEach((v,i)=>{ const f=Math.max(0,v)/total; const a2=ang+f*2*Math.PI; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,ang,a2); ctx.closePath(); ctx.fillStyle=sub.colors[i]||'#60a5fa'; ctx.fill(); ctx.stroke(); ang=a2 })
        }
      }
    }
    // Stacked bar
    const cvb = groupBarRefs.value[g] || null
    if (cvb){
      const ctx = ctxFor(cvb); if (ctx){
        const labels:string[] = perAll.labels||[]
        const series:any[] = (perAll.series||[]).filter((s:any)=> sel.has(String(s.id)) && (gmap[String(s.id)]||0)===g )
        const totals = labels.map((_,i)=> series.reduce((a,s)=>a+Math.max(0, Number(s.data?.[i]||0)),0))
        const W=cvb.clientWidth,H=cvb.clientHeight,pad=28,x0=pad*1.4,y0=H-pad,x1=W-pad
        const line=getComputedStyle(document.documentElement).getPropertyValue('--line').trim()||'#e5e7eb'
        const fg=getComputedStyle(document.documentElement).getPropertyValue('--fg').trim()||'#0f172a'
        ctx.clearRect(0,0,W,H)
        ctx.strokeStyle=line; ctx.lineWidth=1
        ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y0); ctx.moveTo(x0,y0); ctx.lineTo(x0,pad); ctx.stroke()
        const max = Math.max(1, ...totals)
        const n=labels.length||1, ggap=8, bw=Math.max(6,(x1-x0-ggap*(n+1))/n), scale=(y0-pad)/max
        labels.forEach((_,i)=>{
          let y=y0
          series.forEach(s=>{ const v=Math.max(0,Number(s.data?.[i]||0)); const h=v*scale; const x=x0+ggap+i*(bw+ggap); y=y-h; ctx.fillStyle=(colorsById.value[String(s.id)]||s.color||'#93c5fd'); if (h>0.5) ctx.fillRect(x,y,bw,h) })
          ctx.fillStyle=fg; ctx.font='12px ui-sans-serif,system-ui'
          const t=String(labels[i]||''); if (bw>26){ const tw=ctx.measureText(t).width; ctx.fillText(t, x0+ggap+i*(bw+ggap)+bw/2-tw/2, y0+14) }
        })
      }
    }
  }
}

function hexToRgb(hex:string){ const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex||''); if(!m) return null; return {r:parseInt(m[1],16), g:parseInt(m[2],16), b:parseInt(m[3],16)} }
  function rgbToHex(r:number,g:number,b:number){ const c=(n:number)=>('0'+Math.max(0,Math.min(255,Math.round(n))).toString(16)).slice(-2); return '#'+c(r)+c(g)+c(b) }
function tint(hex:string){
  const rgb = hexToRgb(hex); if(!rgb) return hex
  const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  // Slight lightening in dark mode, slight darkening in light mode
  const f = dark ? 1.12 : 0.90
  return rgbToHex(rgb.r*f, rgb.g*f, rgb.b*f)
}
  function invert(hex:string){ const rgb=hexToRgb(hex); if(!rgb) return hex; return rgbToHex(255-rgb.r,255-rgb.g,255-rgb.b) }

  // Heatmap color: blue → purple spectrum
  function heatColor(t:number){
    const clamp=(x:number)=> x<0?0:(x>1?1:x)
    const tt = Math.pow(clamp(t), 0.6) // slight gamma for more contrast in low values
    const c1 = hexToRgb('#e0f2fe') // light blue
    const c2 = hexToRgb('#7c3aed') // violet
    if (!c1 || !c2) return '#7c3aed'
    const mix=(a:number,b:number,p:number)=> Math.round(a + (b-a)*p)
    const r = mix(c1.r, c2.r, tt)
    const g = mix(c1.g, c2.g, tt)
    const b = mix(c1.b, c2.b, tt)
    return `rgb(${r}, ${g}, ${b})`
  }

  async function fetchDavColors(uid:string, ids:string[]): Promise<Record<string,string>>{
    const out: Record<string,string> = {}
    if (!uid) return out
    const rt = (window as any).OC?.requestToken || (window as any).oc_requesttoken || ''
    const root = getRoot()
    // Try each id separately to avoid parsing large multistatus
    for (const id of ids){
      try{
        const url = `${root}/remote.php/dav/calendars/${encodeURIComponent(uid)}/${encodeURIComponent(id)}/`
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<d:propfind xmlns:d="DAV:" xmlns:ical="http://apple.com/ns/ical/">\n  <d:prop><ical:calendar-color/></d:prop>\n</d:propfind>`
        if (isDbg()) console.log('[opsdash] PROPFIND', {url, id})
        const res = await fetch(url, { method:'PROPFIND', credentials:'same-origin', headers:{'Depth':'0','Content-Type':'application/xml','requesttoken': rt}, body })
        if (!res.ok) continue
        const text = await res.text()
        if (isDbg()) console.log('[opsdash] PROPFIND response', {id, status: res.status, length: text.length, sample: text.slice(0,400)})
        const m = text.match(/<[^>]*calendar-color[^>]*>(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|rgb\([^<]+\))<\/[^>]*calendar-color>/i)
        if (m) out[id] = m[1]
      }catch(_){}
    }
    return out
  }

function drawPie(){
  const cv = pie.value, cdata = charts.value.pie
  if (!cv || !cdata) return
  const ctx = ctxFor(cv); if(!ctx) return
  const W=cv.clientWidth,H=cv.clientHeight,cx=W/2,cy=H/2,r=Math.min(W,H)*0.35
  const dataAll=cdata.data||[], labelsAll=cdata.labels||[], idsAll=(cdata.ids||[]), baseColorsAll=(cdata.colors||[])
  // Filter out zero-value calendars from the pie
  const idx:number[]=[]
  for (let i=0;i<dataAll.length;i++){ if ((Number(dataAll[i])||0) > 0) idx.push(i) }
  if (idx.length===0){ ctx.clearRect(0,0,W,H); return }
  const data = idx.map(i=>Number(dataAll[i])||0)
  const labels = idx.map(i=>String(labelsAll[i]||''))
  const ids = idx.map(i=>String(idsAll[i]||''))
  const baseColors = idx.map(i=>baseColorsAll[i])
  const total=data.reduce((a,b)=>a+Math.max(0,b),0)||1; let ang=-Math.PI/2
  const pal=['#60a5fa','#f59e0b','#ef4444','#10b981','#a78bfa','#fb7185','#22d3ee','#f97316']
  ctx.clearRect(0,0,W,H)
  ctx.lineWidth=1; ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--line').trim()||'#e5e7eb'
  const dbgRows:any[] = []
  data.forEach((v,i)=>{const f=Math.max(0,v)/total,a2=ang+f*2*Math.PI; const name=String(labels?.[i]||''); const id=String(ids?.[i]||'');
    const srvCol = baseColors[i]
    const idCol = id && colorsById.value[id]
    const nameCol = colorsByName.value[name]
    // Prefer ID color (latest DAV) over server-provided slice color
    const rawCol = (idCol || nameCol || srvCol || pal[i%pal.length]) as string
    let chosen = rawCol
    if (useInvert()) chosen = invert(chosen)
    if (useTint()) chosen = tint(chosen)
    const col = chosen
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,ang,a2);ctx.closePath();ctx.fillStyle=col;ctx.fill();ctx.stroke();
    const mid=(ang+a2)/2,lx=cx+Math.cos(mid)*(r+12),ly=cy+Math.sin(mid)*(r+12); ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--fg').trim()||'#0f172a'; ctx.font='12px ui-sans-serif,system-ui'
    const txt=`${labels?.[i]?labels[i]+' ':''}(${Number(v).toFixed(2)}h)`; const tw=ctx.measureText(txt).width; ctx.fillText(txt,lx-tw/2,ly)
    ang=a2;
    if (isDbg()) dbgRows.push({i, id, name, value: v, srvCol, idCol, nameCol, chosenRaw: rawCol, invert: useInvert(), tint: useTint(), final: col})
  })
  // minimal: no extra logs
}

function drawPerDay(){
  const cv = perDay.value; if (!cv) return
  const stacked:any = (charts.value as any).perDaySeries
  const legacy:any = charts.value.perDay
  const ctx = ctxFor(cv); if(!ctx) return
  const W=cv.clientWidth,H=cv.clientHeight,pad=28,x0=pad*1.4,y0=H-pad,x1=W-pad
  const line=getComputedStyle(document.documentElement).getPropertyValue('--line').trim()||'#e5e7eb'
  const fg=getComputedStyle(document.documentElement).getPropertyValue('--fg').trim()||'#0f172a'
  ctx.clearRect(0,0,W,H)
  ctx.strokeStyle=line; ctx.lineWidth=1
  ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y0); ctx.moveTo(x0,y0); ctx.lineTo(x0,pad); ctx.stroke()

  if (stacked && stacked.labels && stacked.series) {
    const labels:string[] = stacked.labels||[]
    const series:any[] = stacked.series||[]
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
        const col = colorsById.value[s.id] || s.color || '#93c5fd'
        ctx.fillStyle = col
        if (h>0.5) ctx.fillRect(x, y, bw, h)
      })
      ctx.fillStyle=fg; ctx.font='12px ui-sans-serif,system-ui'
      const t=String(labels[i]||'')
      if (bw>26){ const tw=ctx.measureText(t).width; ctx.fillText(t, x0+g+i*(bw+g)+bw/2-tw/2, y0+14) }
    })
    return
  }
  // legacy single-series fallback
  if (!legacy) return
  const data=legacy.data||[], labelsL=legacy.labels||[]
  const max=Math.max(1,...data.map((v:any)=>Math.max(0,v)))
  const n=(data.length||1), g=8, bw=Math.max(6,(x1-x0-g*(n+1))/n), scale=(y0-pad)/max
  ctx.fillStyle='#93c5fd'
  data.forEach((v:any,i:number)=>{
    const h=Math.max(0,v*scale), x=x0+g+i*(bw+g), y=y0-h; ctx.fillRect(x,y,bw,h)
    ctx.fillStyle=fg; ctx.font='12px ui-sans-serif,system-ui'
    const t=String(labelsL[i]||'')
    if (bw>26){ const tw=ctx.measureText(t).width; ctx.fillText(t, x+bw/2-tw/2, y0+14) }
  })
}

  function drawHod(){
  const cv = hod.value, cdata = charts.value.hod
  if (!cv || !cdata) return
  const ctx = ctxFor(cv); if(!ctx) return
  const W=cv.clientWidth,H=cv.clientHeight
  const rows=cdata.dows||[], cols=cdata.hours||[], m=cdata.matrix||[]
  ctx.clearRect(0,0,W,H)
  const pad=36, x0=pad, y0=pad, x1=W-pad, y1=H-pad
  const cw=(x1-x0)/Math.max(1,cols.length), rh=(y1-y0)/Math.max(1,rows.length)
  const vmax = Math.max(0, ...m.flat()) || 1
  for(let r=0;r<rows.length;r++){
    for(let c=0;c<cols.length;c++){
      const v = (m[r]?.[c]) || 0
      const ratio = v / vmax
      const x = x0 + c*cw, y = y0 + r*rh
      ctx.fillStyle = heatColor(ratio)
      ctx.fillRect(x,y,cw-1,rh-1)
    }
  }
  // axes labels (simple)
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--fg').trim()||'#0f172a'
  ctx.font = '12px ui-sans-serif,system-ui'
  rows.forEach((d,i)=> ctx.fillText(d, 8, y0 + i*rh + 12))
  cols.forEach((h,i)=>{ if (i%2===0) ctx.fillText(String(h), x0 + i*cw + 2, y0 - 6) })
  }

  // Efficient draw scheduling to avoid drawing while hidden or before layout
  // Re-enable chart draw scheduling
  let rafId:number|undefined
  function scheduleDraw(){ /* charts handled by components */ }

  onMounted(() => {
    console.info('[opsdash] start')
    load().catch(err=>{ console.error(err); alert('Initial load failed') })
    // charts handled by components; no global resize wiring
  })

  watch(range, () => { offset.value = 0; load().catch(console.error) })
  watch(pane, () => { scheduleDraw() })
  watch(calendars, () => { recomputeGroupList(); scheduleDraw() })
</script>

<!-- styles moved to global css/style.css to satisfy strict CSP -->
