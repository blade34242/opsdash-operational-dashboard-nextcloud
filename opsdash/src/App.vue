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
import { createDefaultTargetsConfig, buildTargetsSummary, normalizeTargetsConfig, createEmptyTargetsSummary, createDefaultActivityCardConfig, createDefaultBalanceConfig, type ActivityCardConfig, type BalanceConfig, type TargetsConfig, type TargetsProgress } from './services/targets'
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

type ActivityCardSummary = {
  rangeLabel: string
  events: number
  activeDays: number | null
  typicalStart: string | null
  typicalEnd: string | null
  weekendShare: number | null
  eveningShare: number | null
  earliestStart: string | null
  latestEnd: string | null
  overlapEvents: number | null
  longestSession: number | null
  lastDayOff: string | null
  lastHalfDayOff: string | null
}

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
  const raw = (stats as any)?.balance_index ?? (stats as any)?.balanceIndex ?? (stats as any)?.balance_overview?.index
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
  balanceIndex: balanceIndex.value,
  topCategory: topCategory.value ? {
    label: topCategory.value.label,
    actualHours: topCategory.value.summary.actualHours,
    targetHours: topCategory.value.summary.targetHours,
    percent: topCategory.value.summary.percent,
    statusLabel: topCategory.value.summary.statusLabel,
    status: topCategory.value.summary.status,
    color: topCategory.value.color,
  } : null,
}))

const activitySummary = computed<ActivityCardSummary>(() => {
  const raw: any = stats
  return {
    rangeLabel: rangeLabel.value,
    events: safeInt(raw.events),
    activeDays: numOrNull(raw.active_days),
    typicalStart: stringOrNull(raw.typical_start),
    typicalEnd: stringOrNull(raw.typical_end),
    weekendShare: numOrNull(raw.weekend_share),
    eveningShare: numOrNull(raw.evening_share),
    earliestStart: stringOrNull(raw.earliest_start),
    latestEnd: stringOrNull(raw.latest_end),
    overlapEvents: numOrNull(raw.overlap_events),
    longestSession: numOrNull(raw.longest_session),
    lastDayOff: stringOrNull(raw.last_day_off),
    lastHalfDayOff: stringOrNull(raw.last_half_day_off),
  }
})

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

const targetsWeek = ref<Record<string, number>>({})
const targetsMonth = ref<Record<string, number>>({})
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

const balanceOverview = computed<BalanceOverviewSummary>(() => {
  const raw: any = (stats as any)?.balance_overview
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const categories = Array.isArray(raw.categories)
    ? raw.categories.map((cat: any) => ({
        id: String(cat?.id ?? ''),
        label: String(cat?.label ?? ''),
        hours: numOrNull(cat?.hours) ?? 0,
        share: numOrNull(cat?.share) ?? 0,
        prevShare: numOrNull(cat?.prevShare) ?? 0,
        delta: numOrNull(cat?.delta) ?? 0,
        color: typeof cat?.color === 'string' ? cat.color : undefined,
      }))
    : []
  const relations = Array.isArray(raw.relations)
    ? raw.relations
        .filter((rel: any) => rel && rel.label && rel.value)
        .map((rel: any) => ({ label: String(rel.label), value: String(rel.value) }))
    : []
  const trendRaw = raw.trend && typeof raw.trend === 'object' ? raw.trend : {}
  const trend = {
    delta: Array.isArray(trendRaw.delta)
      ? trendRaw.delta.map((item: any) => ({
          id: String(item?.id ?? ''),
          label: String(item?.label ?? ''),
          delta: numOrNull(item?.delta) ?? 0,
        }))
      : [],
    badge: String(trendRaw.badge ?? ''),
  }
  const daily = Array.isArray(raw.daily)
    ? raw.daily.map((day: any) => ({
        date: String(day?.date ?? ''),
        weekday: String(day?.weekday ?? ''),
        total_hours: numOrNull(day?.total_hours) ?? 0,
        categories: Array.isArray(day?.categories)
          ? day.categories.map((cat: any) => ({
              id: String(cat?.id ?? ''),
              label: String(cat?.label ?? ''),
              hours: numOrNull(cat?.hours) ?? 0,
              share: numOrNull(cat?.share) ?? 0,
            }))
          : [],
      }))
    : []
  const insightsRaw = Array.isArray(raw.insights) ? raw.insights.map((s: any) => String(s)) : []
  const warnings = Array.isArray(raw.warnings) ? raw.warnings.map((s: any) => String(s)) : []
  const indexVal = numOrNull(raw.index) ?? 0
  const filteredInsights = balanceCardConfig.value.showInsights ? insightsRaw : []
  return {
    index: indexVal,
    categories,
    relations,
    trend,
    daily,
    insights: filteredInsights,
    warnings,
  }
})

const UNCATEGORIZED_ID = '__uncategorized__'
const UNCATEGORIZED_LABEL = 'Unassigned'

const categoryConfigList = computed(() => Array.isArray(targetsConfig.value?.categories) ? targetsConfig.value.categories : [])
const categoryLabelById = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  categoryConfigList.value.forEach(cat => { map[String(cat.id)] = cat.label || String(cat.id) })
  return map
})
const categoryProgressById = computed(() => {
  const map = new Map<string, TargetsProgress>()
  const cats = targetsSummary.value?.categories || []
  cats.forEach(cat => map.set(String(cat.id), cat))
  return map
})
const categoryIdByGroup = computed(() => {
  const map = new Map<number, string>()
  categoryConfigList.value.forEach(cat => {
    const groups = Array.isArray(cat.groupIds) ? cat.groupIds : []
    groups.forEach(g => {
      const num = Math.max(0, Math.min(9, Math.trunc(Number(g) || 0)))
      map.set(num, String(cat.id))
    })
  })
  return map
})
const calendarMetaById = computed(() => {
  const raw = calendars.value
  if (!Array.isArray(raw)) {
    if (isDbg()) console.warn('[opsdash] calendars not array', raw)
    return {}
  }
  const map: Record<string, { name: string; color?: string }> = {}
  raw.forEach((cal: any) => {
    const id = String(cal?.id ?? '')
    if (!id) return
    const color = (colorsById.value && colorsById.value[id]) || String(cal?.color || '')
    map[id] = {
      name: String(cal?.displayname || cal?.name || cal?.calendar || id),
      color: color || undefined,
    }
  })
  return map
})
const calendarCategoryMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  const categoryByGroup = categoryIdByGroup.value
  const groupMap = groupsById.value || {}
  const assignCategory = (calId: string) => {
    const raw = groupMap?.[calId]
    const group = Math.max(0, Math.min(9, Math.trunc(Number(raw) || 0)))
    const resolved = categoryByGroup.get(group)
    map[calId] = resolved || (group === 0 ? UNCATEGORIZED_ID : UNCATEGORIZED_ID)
  }
  const raw = calendars.value
  if (!Array.isArray(raw)) {
    if (isDbg()) console.warn('[opsdash] calendarCategoryMap: calendars not array', raw)
    return map
  }
  raw.forEach((cal: any) => {
    const id = String(cal?.id ?? '')
    if (!id) return
    assignCategory(id)
  })
  // Ensure selected calendars also have an assignment
  ;(selected.value || []).forEach((id: any) => {
    const calId = String(id ?? '')
    if (!calId) return
    if (!map[calId]) assignCategory(calId)
  })
  return map
})
const categoryColorMap = computed<Record<string, string>>(() => {
  const palette = ['#60a5fa', '#f59e0b', '#ef4444', '#10b981', '#a78bfa', '#fb7185', '#22d3ee', '#f97316']
  const map: Record<string, string> = {}
  let paletteIdx = 0
  const ensureColor = (catId: string) => {
    if (map[catId]) return map[catId]
    // Attempt to pick first calendar color assigned to this category
    const calendarsForCat = Object.entries(calendarCategoryMap.value)
      .filter(([, cid]) => cid === catId)
      .map(([calId]) => calId)
    for (const calId of calendarsForCat) {
      const meta = calendarMetaById.value[calId]
      if (meta?.color) {
        map[catId] = meta.color
        return meta.color
      }
    }
    const color = palette[paletteIdx % palette.length]
    paletteIdx += 1
    map[catId] = color
    return color
  }
  categoryConfigList.value.forEach(cat => ensureColor(String(cat.id)))
  if (Object.values(calendarCategoryMap.value || {}).some(cid => cid === UNCATEGORIZED_ID)) {
    ensureColor(UNCATEGORIZED_ID)
  }
  return map
})

const categoryMappingHint = computed(() => {
  if (!activityCardConfig.value.showHint) return ''
  const cfg: any = targetsConfig.value as any
  const order: any[] = Array.isArray(cfg?.balance?.categories) ? cfg.balance.categories : []
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

function aggregateCategoryRows(): Array<{
  id: string
  label: string
  rows: any[]
  summary: TargetsProgress
  color?: string
}> {
  const result: Array<{
    id: string
    label: string
    rows: any[]
    summary: TargetsProgress
    color?: string
  }> = []
  const assignments = calendarCategoryMap.value
  const summaryMap = categoryProgressById.value
  const byCat = new Map<string, any[]>()
  const rowsSource = byCal.value
  if (!Array.isArray(rowsSource)) {
    if (isDbg()) console.warn('[opsdash] aggregateCategoryRows: byCal not array', rowsSource)
    return result
  }
  rowsSource.forEach((row: any) => {
    const rawId = String(row?.id ?? row?.calendar_id ?? row?.calendar ?? '')
    if (!rawId) return
    const catId = assignments[rawId] || UNCATEGORIZED_ID
    if (!byCat.has(catId)) byCat.set(catId, [])
    byCat.get(catId)!.push({ ...row, calendarId: rawId })
  })
  if (isDbg()) {
    console.log('[opsdash] aggregateCategoryRows', {
      rowsSourceIsArray: Array.isArray(rowsSource),
      rowsSourceLength: Array.isArray(rowsSource) ? rowsSource.length : null,
      rowsSource,
      byCat,
      assignments,
    })
  }

  const totalDaysLeft = targetsSummary.value?.total?.daysLeft ?? 0
  const pacePercent = targetsSummary.value?.total?.calendarPercent ?? 0
  const paceMode = targetsSummary.value?.total?.paceMode ?? targetsConfig.value?.pace?.mode ?? 'days_only'

  const makeFallbackSummary = (catId: string, label: string, rows: any[]): TargetsProgress => {
    const targetHours = rows.reduce((sum, row) => {
      const tMap = currentTargets.value || {}
      const tRaw = Number((tMap as any)[row.calendarId] ?? 0)
      return Number.isFinite(tRaw) ? sum + Math.max(0, tRaw) : sum
    }, 0)
    const actualHours = rows.reduce((sum, row) => {
      const val = Number(row?.total_hours ?? row?.hours ?? 0)
      return Number.isFinite(val) ? sum + Math.max(0, val) : sum
    }, 0)
    const percent = targetHours > 0 ? Math.max(0, Math.min(100, (actualHours / targetHours) * 100)) : 0
    const delta = actualHours - targetHours
    const remaining = Math.max(0, targetHours - actualHours)
    const status = targetHours <= 0 ? 'none' : (percent >= 100 ? 'done' : (delta >= 0 ? 'on_track' : 'behind'))
    const statusLabel = status === 'done' ? 'Done' : status === 'on_track' ? 'On Track' : status === 'behind' ? 'Behind' : '—'
    const needPerDay = totalDaysLeft > 0 ? remaining / totalDaysLeft : 0
    return {
      id: catId,
      label,
      actualHours: Math.round(actualHours * 100) / 100,
      targetHours: Math.round(targetHours * 100) / 100,
      percent,
      deltaHours: Math.round(delta * 100) / 100,
      remainingHours: Math.round(remaining * 100) / 100,
      needPerDay: Math.round(needPerDay * 100) / 100,
      daysLeft: totalDaysLeft,
      calendarPercent: Math.max(0, Math.min(100, pacePercent)),
      gap: Math.round((percent - pacePercent) * 100) / 100,
      status: status as TargetsProgress['status'],
      statusLabel,
      includeWeekend: true,
      paceMode: paceMode,
    }
  }

  const orderedIds = categoryConfigList.value.map(cat => String(cat.id))
  orderedIds.forEach(catId => {
    const label = categoryLabelById.value[catId] || catId
    const rows = byCat.get(catId) || []
    const summary = summaryMap.get(catId) || makeFallbackSummary(catId, label, rows)
    result.push({
      id: catId,
      label,
      rows,
      summary,
      color: categoryColorMap.value[catId],
    })
  })

  if (byCat.has(UNCATEGORIZED_ID)) {
    const rows = byCat.get(UNCATEGORIZED_ID) || []
    result.push({
      id: UNCATEGORIZED_ID,
      label: UNCATEGORIZED_LABEL,
      rows,
      summary: makeFallbackSummary(UNCATEGORIZED_ID, UNCATEGORIZED_LABEL, rows),
      color: categoryColorMap.value[UNCATEGORIZED_ID],
    })
  }
  return result
}

const calendarGroups = computed(() => aggregateCategoryRows())

const calendarChartData = computed(() => ({
  pie: charts.value?.pie || null,
  stacked: (charts.value as any)?.perDaySeries || null,
}))

const categoryChartsById = computed<Record<string, { pie: any | null; stacked: any | null }>>(() => {
  const result: Record<string, { pie: any | null; stacked: any | null }> = {}
  const pieAll: any = charts.value?.pie
  const stackedAll: any = (charts.value as any)?.perDaySeries
  const hasPie = pieAll && Array.isArray(pieAll.data) && Array.isArray(pieAll.ids)
  const hasStacked = stackedAll && Array.isArray(stackedAll.series) && Array.isArray(stackedAll.labels)
  const assignments = calendarCategoryMap.value
  const ids: string[] = hasPie ? (pieAll.ids || []).map((id: any) => String(id ?? '')) : []
  const labels: string[] = hasPie ? (pieAll.labels || []).map((label: any) => String(label ?? '')) : []
  const data: number[] = hasPie ? (pieAll.data || []).map((val: any) => Number(val) || 0) : []
  const colorsAll: string[] = hasPie ? (pieAll.colors || []) : []

  const stackedSeries: any[] = hasStacked ? stackedAll.series : []

  calendarGroups.value.forEach((group) => {
    const pieIndices: number[] = []
    if (hasPie) {
      ids.forEach((id, idx) => {
        if (assignments[id] === group.id) {
          pieIndices.push(idx)
        }
      })
    }
    const pieData = pieIndices.length ? {
      ids: pieIndices.map(idx => ids[idx]),
      labels: pieIndices.map(idx => labels[idx]),
      data: pieIndices.map(idx => data[idx]),
      colors: pieIndices.map(idx => colorsAll[idx] || colorsById.value?.[ids[idx]] || '#60a5fa'),
    } : null

    const stackedSeriesForCat = hasStacked ? stackedSeries.filter((series: any) => assignments[String(series?.id ?? '')] === group.id) : []
    const stackedData = stackedSeriesForCat.length ? {
      labels: stackedAll.labels,
      series: stackedSeriesForCat,
    } : null

    result[group.id] = { pie: pieData, stacked: stackedData }
  })
  return result
})

const topCategory = computed(() => {
  const groups = calendarGroups.value || []
  if (!groups.length) return null
  const ranked = [...groups].sort((a, b) => (b.summary.actualHours || 0) - (a.summary.actualHours || 0))
  return ranked[0] || null
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

function numOrNull(value: any): number | null {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}
function safeInt(value: any): number {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.round(num)
}
function stringOrNull(value: any): string | null {
  if (value === undefined || value === null) return null
  const str = String(value).trim()
  return str === '' ? null : str
}

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
</script>

<!-- styles moved to global css/style.css to satisfy strict CSP -->
