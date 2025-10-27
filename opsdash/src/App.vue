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
          :nav-toggle-label="navToggleLabel"
          :nav-toggle-icon="navToggleIcon"
          :presets="presets"
          :presets-loading="presetsLoading"
          :preset-saving="presetSaving"
          :preset-applying="presetApplying"
          :preset-warnings="presetWarnings"
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
          @toggle-nav="toggleNav"
          @save-preset="savePreset"
          @load-preset="loadPreset"
          @delete-preset="deletePreset"
          @refresh-presets="refreshPresets"
          @clear-preset-warnings="clearPresetWarnings"
        />
      </template>

      <template #sidebar-toggle>
        <NcAppSidebarToggle :open="navOpen" @toggle="toggleNav" />
      </template>

      <div class="app-shell">
        <div class="app-main">
          <div class="app-container">
            <div
              v-if="showCollapsedRangeControls"
              class="range-toolbar"
              role="toolbar"
              aria-label="Collapsed range controls"
            >
              <button
                class="range-toolbar__btn"
                type="button"
                @click="toggleNav"
                :aria-expanded="navOpen"
                aria-controls="opsdash-sidebar"
                :aria-label="navToggleLabel"
              >
                {{ navToggleIcon }}
              </button>
              <button
                class="range-toolbar__btn"
                type="button"
                :disabled="isLoading"
                @click="loadCurrent"
              >
                Refresh
              </button>
              <div class="range-toolbar__divider" aria-hidden="true" />
              <button
                class="range-toolbar__btn"
                type="button"
                :disabled="isLoading"
                @click="toggleRangeCollapsed"
                :aria-pressed="range === 'month'"
              >
                {{ rangeToggleLabel }}
              </button>
              <div class="range-toolbar__group" role="group" aria-label="Navigate periods">
                <button
                  class="range-toolbar__btn"
                  type="button"
                  :disabled="isLoading"
                  @click="goPrevious"
                >
                  ◀
                </button>
                <span class="range-toolbar__label" :title="rangeDateLabel">
                  {{ rangeDateLabel }}
                </span>
                <button
                  class="range-toolbar__btn"
                  type="button"
                  :disabled="isLoading"
                  @click="goNext"
                >
                  ▶
                </button>
              </div>
            </div>

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
import { buildTargetsSummary, normalizeTargetsConfig, createEmptyTargetsSummary, createDefaultActivityCardConfig, createDefaultBalanceConfig, cloneTargetsConfig, convertWeekToMonth, type ActivityCardConfig, type BalanceConfig, type TargetsConfig } from './services/targets'
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
import { useDashboardPersistence } from '../composables/useDashboardPersistence'
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

type PresetSummary = {
  name: string
  createdAt?: string | null
  updatedAt?: string | null
  selectedCount: number
  calendarCount: number
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
const navToggleIcon = computed(() => navOpen.value ? '⟨' : '⟩')

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
const showCollapsedRangeControls = computed(() => !navOpen.value)
const rangeToggleLabel = computed(() => range.value === 'week' ? 'Switch to month' : 'Switch to week')
const rangeDateLabel = computed(() => {
  if (!from.value || !to.value) return ''
  return `${from.value} – ${to.value}`
})

const presets = ref<PresetSummary[]>([])
const presetsLoading = ref(false)
const presetSaving = ref(false)
const presetApplying = ref(false)
const presetWarnings = ref<string[]>([])
const lastLoadedPreset = ref<string | null>(null)

function loadCurrent(){
  load().catch(console.error)
}

function toggleRangeCollapsed(){
  range.value = range.value === 'week' ? 'month' : 'week'
  offset.value = 0
  load().catch(console.error)
}

function goPrevious(){
  offset.value = (offset.value || 0) - 1
  load().catch(console.error)
}

function goNext(){
  offset.value = (offset.value || 0) + 1
  load().catch(console.error)
}

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
} = useDashboard({
  range,
  offset,
  userChangedSelection,
  route: (name) => route(name),
  getJson,
  notifyError,
  scheduleDraw,
  fetchNotes,
  isDebug: isDbg,
  fetchDavColors,
})

const { queueSave } = useDashboardPersistence({
  route: (name) => route(name),
  postJson,
  notifyError,
  notifySuccess,
  onReload: () => load(),
  selected,
  groupsById,
  targetsWeek,
  targetsMonth,
  targetsConfig,
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

const targetsConfigForRange = computed(() => {
  const base = cloneTargetsConfig(targetsConfig.value)
  if (range.value === 'month') {
    base.totalHours = convertWeekToMonth(base.totalHours)
    base.categories = base.categories.map((cat) => ({
      ...cat,
      targetHours: convertWeekToMonth(cat.targetHours),
    }))
  }
  return base
})

const targetsSummary = computed(() => {
  const cfg = targetsConfigForRange.value
  try {
    return buildTargetsSummary({
      config: cfg,
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
    return createEmptyTargetsSummary(cfg)
  }
})

const currentTargets = computed<Record<string, number>>(() => {
  if (range.value === 'month') {
    const monthMap = targetsMonth.value || {}
    if (monthMap && Object.keys(monthMap).length > 0) {
      return monthMap
    }
    const weekMap = targetsWeek.value || {}
    const converted: Record<string, number> = {}
    Object.entries(weekMap).forEach(([id, value]) => {
      const num = Number(value)
      if (Number.isFinite(num)) {
        converted[id] = convertWeekToMonth(num)
      }
    })
    return converted
  }
  return targetsWeek.value || {}
})

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
  targetsConfig: targetsConfigForRange,
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
  targetsConfig: targetsConfigForRange,
  currentTargets,
  activityCardConfig,
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
    const res = await getJson(route('load').replace('/overview/load','/overview/ping'), {})
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
async function deleteJson(url: string){ const w:any=window as any; const rt=(w.OC?.requestToken)||(w.oc_requesttoken)||''; const headers:any={}; if(rt) headers['requesttoken']=rt; const res=await fetch(url,{method:'DELETE',credentials:'same-origin',headers}); if(!res.ok) throw new Error('HTTP '+res.status); const text = await res.text(); return text ? JSON.parse(text) : {}; }

function route(name: string, param?: string){
  const w:any = window as any
  if (w.OC && typeof w.OC.generateUrl === 'function') {
    if (name === 'load')    return w.OC.generateUrl('/apps/opsdash/overview/load')
    if (name === 'persist') return w.OC.generateUrl('/apps/opsdash/overview/persist')
    if (name === 'notes')   return w.OC.generateUrl('/apps/opsdash/overview/notes')
    if (name === 'notesSave') return w.OC.generateUrl('/apps/opsdash/overview/notes')
    if (name === 'presetsList')   return w.OC.generateUrl('/apps/opsdash/overview/presets')
    if (name === 'presetsSave')   return w.OC.generateUrl('/apps/opsdash/overview/presets')
    if (name === 'presetsLoad')   return w.OC.generateUrl('/apps/opsdash/overview/presets/' + encodeURIComponent(String(param ?? '')))
    if (name === 'presetsDelete') return w.OC.generateUrl('/apps/opsdash/overview/presets/' + encodeURIComponent(String(param ?? '')))
    return w.OC.generateUrl('/apps/opsdash/overview')
  }
  const base = getRoot() + '/apps/opsdash/overview'
  if (name === 'load') return base + '/load'
  if (name === 'persist') return base + '/persist'
  if (name === 'notes')   return base + '/notes'
  if (name === 'notesSave') return base + '/notes'
  if (name === 'presetsList') return base + '/presets'
  if (name === 'presetsSave') return base + '/presets'
  if (name === 'presetsLoad') return base + '/presets/' + encodeURIComponent(param ?? '')
  if (name === 'presetsDelete') return base + '/presets/' + encodeURIComponent(param ?? '')
  return getRoot() + '/apps/opsdash/overview'
}

async function refreshPresets(){
  presetsLoading.value = true
  try {
    const res = await getJson(route('presetsList'), {})
    presets.value = Array.isArray(res?.presets) ? res.presets : []
  } catch (error) {
    console.error(error)
    notifyError('Failed to load presets')
  } finally {
    presetsLoading.value = false
  }
}

async function savePreset(name: string){
  const trimmed = name.trim()
  if (trimmed === '') {
    notifyError('Enter a preset name.')
    return
  }
  presetSaving.value = true
  try {
    const payload = {
      name: trimmed,
      selected: selected.value,
      groups: groupsById.value,
      targets_week: targetsWeek.value,
      targets_month: targetsMonth.value,
      targets_config: targetsConfig.value,
    }
    const res = await postJson(route('presetsSave'), payload)
    presets.value = Array.isArray(res?.presets) ? res.presets : presets.value
    const warnings = Array.isArray(res?.warnings) ? res.warnings : []
    presetWarnings.value = warnings
    lastLoadedPreset.value = trimmed
    notifySuccess(`Profile "${trimmed}" saved`)
  } catch (error) {
    console.error(error)
    notifyError('Failed to save preset')
  } finally {
    presetSaving.value = false
  }
}

function applyPresetData(preset: any) {
  const sel = Array.isArray(preset?.selected) ? preset.selected.map((id: any) => String(id)) : []
  selected.value = sel
  const groups = preset?.groups && typeof preset.groups === 'object' ? preset.groups : {}
  groupsById.value = { ...groups }
  targetsWeek.value = preset?.targets_week && typeof preset.targets_week === 'object' ? preset.targets_week : {}
  targetsMonth.value = preset?.targets_month && typeof preset.targets_month === 'object' ? preset.targets_month : {}
  const cfg = preset?.targets_config && typeof preset.targets_config === 'object'
    ? normalizeTargetsConfig(preset.targets_config as TargetsConfig)
    : cloneTargetsConfig(targetsConfig.value)
  targetsConfig.value = cfg
  userChangedSelection.value = false
}

async function loadPreset(name: string){
  const trimmed = name.trim()
  if (trimmed === '') return
  presetApplying.value = true
  try {
    const res = await getJson(route('presetsLoad', trimmed), {})
    const preset = res?.preset ?? {}
    const warnings = Array.isArray(preset?.warnings) ? preset.warnings : (Array.isArray(res?.warnings) ? res.warnings : [])
    if (warnings.length) {
      const message = `Some items in the saved profile are no longer available:\n\n${warnings.map((w: string) => `• ${w}`).join('\n')}\n\nApply the remaining values?`
      if (!window.confirm(message)) {
        presetWarnings.value = warnings
        presetApplying.value = false
        return
      }
    }
    applyPresetData(preset)
    presetWarnings.value = warnings
    lastLoadedPreset.value = trimmed
    notifySuccess(`Profile "${trimmed}" applied`)
    queueSave(true)
    refreshPresets().catch(err => console.warn('[opsdash] refresh presets after load failed', err))
  } catch (error) {
    console.error(error)
    notifyError('Failed to load preset')
  } finally {
    presetApplying.value = false
  }
}

async function deletePreset(name: string){
  const trimmed = name.trim()
  if (trimmed === '') return
  try {
    const res = await deleteJson(route('presetsDelete', trimmed))
    presets.value = Array.isArray(res?.presets) ? res.presets : presets.value
    notifySuccess(`Profile "${trimmed}" deleted`)
    if (lastLoadedPreset.value === trimmed) {
      lastLoadedPreset.value = null
    }
  } catch (error) {
    console.error(error)
    notifyError('Failed to delete preset')
  }
}

function clearPresetWarnings(){
  presetWarnings.value = []
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
    refreshPresets().catch(err => console.warn('[opsdash] presets fetch failed', err))
    // charts handled by components; no global resize wiring
  })

  watch(range, () => { offset.value = 0; load().catch(console.error) })
</script>

<!-- styles moved to global css/style.css to satisfy strict CSP -->
