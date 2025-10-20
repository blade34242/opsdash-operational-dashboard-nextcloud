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
          :active-day-mode="activeDayMode"
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
          @update:active-mode="setActiveDayMode"
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
                :config="targetsConfig.timeSummary"
              />
              <TimeTargetsCard
                :summary="targetsSummary"
                :config="targetsConfig"
                :groups="calendarGroups"
              />
              <ActivityScheduleCard
                :summary="activitySummary"
                :range-label="rangeLabel"
                :category-hint="categoryMappingHint"
                :config="activityCardConfig"
              />
              <BalanceOverviewCard
                :overview="balanceOverview"
                :range-label="rangeLabel"
                :config="balanceCardConfig"
              />
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
                <ByCalendarTable :rows="byCal" :n2="n2" :targets="currentTargets" :groups="calendarGroups" />
                <div class="chart-section" v-if="targetsConfig.ui.showCalendarCharts && (calendarChartData.pie || calendarChartData.stacked)">
                  <h3 class="section-title">Calendars (all)</h3>
                  <div class="grid2 mt-12">
                    <div class="card chart-card">
                      <div class="chart-card__title">Distribution by calendar</div>
                      <PieChart :data="calendarChartData.pie" :colors-by-id="colorsById" :colors-by-name="colorsByName" />
                    </div>
                    <div class="card chart-card">
                      <div class="chart-card__title">Hours per day</div>
                      <StackedBars :stacked="calendarChartData.stacked" :legacy="charts.perDay" :colors-by-id="colorsById" />
                    </div>
                  </div>
                </div>
                <div class="chart-section" v-if="targetsConfig.ui.showCategoryCharts && calendarGroups.length">
                  <h3 class="section-title">Categories</h3>
                  <template v-for="group in calendarGroups" :key="'cat-charts-' + group.id">
                    <div
                      v-if="categoryChartsById[group.id]?.pie || categoryChartsById[group.id]?.stacked"
                      class="category-chart-block"
                    >
                      <div class="category-chart-header">
                        <span class="dot" :style="{ background: categoryColorMap[group.id] || 'var(--brand)' }"></span>
                        <span class="name">{{ group.label }}</span>
                      </div>
                      <div class="grid2 mt-8">
                        <div class="card chart-card">
                          <div class="chart-card__title">Calendar share</div>
                          <PieChart :data="categoryChartsById[group.id]?.pie" :colors-by-id="colorsById" :colors-by-name="colorsByName" />
                        </div>
                        <div class="card chart-card">
                          <div class="chart-card__title">Hours per day</div>
                          <StackedBars :stacked="categoryChartsById[group.id]?.stacked" :legacy="null" :colors-by-id="colorsById" />
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
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
import HeatmapCanvas from './components/HeatmapCanvas.vue'
import ByCalendarTable from './components/ByCalendarTable.vue'
import ByDayTable from './components/ByDayTable.vue'
import TopEventsTable from './components/TopEventsTable.vue'
import TimeSummaryCard from './components/TimeSummaryCard.vue'
import TimeTargetsCard from './components/TimeTargetsCard.vue'
import ActivityScheduleCard from './components/ActivityScheduleCard.vue'
import BalanceOverviewCard from './components/BalanceOverviewCard.vue'
import Sidebar from './components/Sidebar.vue'
import { buildTargetsSummary, normalizeTargetsConfig, createEmptyTargetsSummary, createDefaultActivityCardConfig, createDefaultBalanceConfig, type ActivityCardConfig, type BalanceConfig, type TargetsConfig } from './services/targets'
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

import { onMounted, ref, watch, nextTick, computed } from 'vue'
import { useNotes } from '../composables/useNotes'
import { useDashboard } from '../composables/useDashboard'
import { useCharts } from '../composables/useCharts'
import { useCategories } from '../composables/useCategories'
import { useSummaries } from '../composables/useSummaries'
import { useBalance } from '../composables/useBalance'
// Ensure a visible version even if backend attrs are empty: use package.json as fallback
// @ts-ignore
import pkg from '../package.json'

type BalanceCategorySummary = {
  id: string
  label: string
  hours: number
  share: number
  prevShare: number
  delta: number
  color?: string
}

type BalanceOverviewSummary = {
  index: number
  categories: BalanceCategorySummary[]
  relations: { label: string; value: string }[]
  trend: { delta: Array<{ id: string; label: string; delta: number }>; badge: string }
  daily: Array<{ date: string; weekday: string; total_hours: number; categories: Array<{ id: string; label: string; hours: number; share: number }> }>
  insights: string[]
  warnings: string[]
} | null

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
    nextTick(() => {
      window.dispatchEvent(new Event('resize'))
    })
  }
})

const pane = ref<'cal'|'day'|'top'|'heat'>('cal')
const range = ref<'week'|'month'>('week')
const offset = ref<number>(0)
const truncTooltip = computed(()=>{
  const l:any = truncLimits.value
  if (!l) return 'Partial data due to caps'
  const parts = [] as string[]
  if (l.maxPerCal != null) parts.push(`cap per calendar: ${l.maxPerCal}`)
  if (l.maxTotal != null) parts.push(`cap total: ${l.maxTotal}`)
  if (l.totalProcessed != null) parts.push(`processed: ${l.totalProcessed}`)
  return parts.join(' · ')
})

const userChangedSelection = ref(false)

const notes = useNotes({
  range,
  offset,
  route: (name) => route(name),
  getJson,
  postJson,
  notifySuccess,
  notifyError,
})
const { notesPrev, notesCurrDraft, isSavingNote, fetchNotes, saveNotes } = notes

const {
  calendars,
  colorsByName,
  colorsById,
  groupsById,
  selected,
  isLoading,
  isTruncated,
  truncLimits,
  uid,
  from,
  to,
  stats,
  byCal,
  byDay,
  longest,
  charts,
  targetsWeek,
  targetsMonth,
  targetsConfig,
  load,
  queueSave,
} = useDashboard({
  range,
  offset,
  userChangedSelection,
  route: (name) => route(name),
  getJson,
  postJson,
  notifyError,
  notifySuccess,
  scheduleDraw,
  fetchNotes,
  isDebug: isDbg,
  fetchDavColors,
})

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

const activeDayMode = ref<'active'|'all'>('active')
const rangeLabel = computed(()=> range.value === 'month' ? 'Month' : 'Week')

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

const currentTargets = computed(() => range.value === 'month' ? targetsMonth.value : targetsWeek.value)

const activityCardConfig = computed<ActivityCardConfig>(() => {
  return { ...createDefaultActivityCardConfig(), ...(targetsConfig.value?.activityCard ?? {}) }
})

const balanceConfigFull = computed<BalanceConfig>(() => {
  const base = createDefaultBalanceConfig()
  const cfg = targetsConfig.value?.balance ?? base
  return {
    ...base,
    ...cfg,
    thresholds: { ...base.thresholds, ...(cfg.thresholds ?? {}) },
    relations: { ...base.relations, ...(cfg.relations ?? {}) },
    trend: { ...base.trend, ...(cfg.trend ?? {}) },
    dayparts: { ...base.dayparts, ...(cfg.dayparts ?? {}) },
    ui: { ...base.ui, ...(cfg.ui ?? {}) },
  }
})

const balanceCardConfig = computed(() => ({
  showInsights: !!balanceConfigFull.value.ui.showInsights,
  showDailyStacks: !!balanceConfigFull.value.ui.showDailyStacks,
}))

const { categoryLabelById, categoryColorMap, calendarCategoryMap, calendarGroups } = useCategories({
  calendars,
  selected,
  groupsById,
  colorsById,
  targetsConfig,
  targetsSummary,
  byCal,
  currentTargets,
  isDebug: isDbg,
})

const { balanceOverview } = useBalance({
  stats,
  categoryColorMap,
  balanceCardConfig,
})

const categoryMappingHint = computed(() => {
  if (!activityCardConfig.value.showHint) return ''
  const order: any[] = Array.isArray(targetsConfig.value?.balance?.categories)
    ? targetsConfig.value.balance.categories
    : []
  const labels = order
    .map((raw) => {
      const id = String(raw ?? '').trim()
      if (!id) return ''
      const label = categoryLabelById.value[id]
      return label ? label : id.toUpperCase()
    })
    .filter((label) => label)
  if (!labels.length) return ''
  return `Mapping via Sidebar – ${labels.join(' / ')}`
})

const { calendarChartData, categoryChartsById } = useCharts({
  charts,
  colorsById,
  colorsByName,
  calendarGroups,
  calendarCategoryMap,
})

const topCategory = computed(() => {
  const groups = calendarGroups.value || []
  if (!groups.length) return null
  const ranked = [...groups].sort((a, b) => (b.summary.actualHours || 0) - (a.summary.actualHours || 0))
  return ranked[0] || null
})

const { timeSummary, activitySummary } = useSummaries({
  stats,
  byDay,
  charts,
  calendars,
  selected,
  rangeLabel,
  activeDayMode,
  topCategory,
})

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

const notesLabelPrev = computed(()=> range.value==='month' ? 'Last month' : 'Last week')
const notesLabelCurr = computed(()=> range.value==='month' ? 'This month' : 'This week')
const notesLabelPrevTitle = computed(()=> range.value==='month' ? 'Notes for previous month' : 'Notes for previous week')
const notesLabelCurrTitle = computed(()=> range.value==='month' ? 'Notes for current month' : 'Notes for current week')

function n1(v:any){ return Number(v ?? 0).toFixed(1) }
function n2(v:any){ return Number(v ?? 0).toFixed(2) }
function arrow(v:number){ return v>0?'▲':(v<0?'▼':'—') }

function getRoot(){ const w:any=window as any; return (w.OC && (w.OC.webroot || w.OC.getRootPath?.())) || (w._oc_webroot) || '' }
function qs(params: Record<string, any>): string { const u=new URLSearchParams(); Object.entries(params).forEach(([k,v])=>{ if(Array.isArray(v)) v.forEach(x=>u.append(k,String(x))); else if(v!==undefined&&v!==null) u.set(k,String(v)) }); return u.toString() }
async function getJson(url: string, params: any){ const q=qs(params||{}); const u=q?(url+(url.includes('?')?'&':'?')+q):url; const res=await fetch(u,{method:'GET',credentials:'same-origin'}); if(!res.ok) throw new Error('HTTP '+res.status); return await res.json() }
async function postJson(url: string, body: any){ const w:any=window as any; const rt=(w.OC?.requestToken)||(w.oc_requesttoken)||''; const headers:any={'Content-Type':'application/json'}; if(rt) headers['requesttoken']=rt; const res=await fetch(url,{method:'POST',credentials:'same-origin',headers,body:JSON.stringify(body||{})}); if(!res.ok) throw new Error('HTTP '+res.status); return await res.json() }

function route(name: string){
  const w:any = window as any
  if (w.OC && typeof w.OC.generateUrl === 'function') {
    if (name === 'load')    return w.OC.generateUrl('/apps/opsdash/config_dashboard/load')
    if (name === 'persist') return w.OC.generateUrl('/apps/opsdash/config_dashboard/persist')
    if (name === 'notes')   return w.OC.generateUrl('/apps/opsdash/config_dashboard/notes')
    if (name === 'notesSave') return w.OC.generateUrl('/apps/opsdash/config_dashboard/notes')
    return w.OC.generateUrl('/apps/opsdash/config_dashboard')
  }
  const base = getRoot() + '/apps/opsdash/config_dashboard'
  if (name === 'load') return base + '/load'
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
</script>

<!-- styles moved to global css/style.css to satisfy strict CSP -->
