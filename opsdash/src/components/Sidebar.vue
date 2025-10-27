<template>
  <!-- Sidebar: range controls, calendar selection + grouping, notes panel -->
  <NcAppNavigation>
    <slot name="actions" />
    <div class="sb-title" title="Kalender filtern und gruppieren">Filter Calendars</div>
    <div class="rangebar" title="Time range">
      <div class="range-actions">
        <button
          class="sidebar-action-btn"
          type="button"
          :disabled="isLoading"
          @click="$emit('load')"
        >
          Refresh
        </button>
        <button
          class="sidebar-action-btn sidebar-action-btn--icon"
          type="button"
          @click="$emit('toggle-nav')"
          :aria-label="navToggleLabel"
        >
          {{ navToggleIcon }}
        </button>
      </div>
      <div class="range-toggle">
        <NcCheckboxRadioSwitch type="radio" name="range-week" :checked="range==='week'" @update:checked="val => { if (val) $emit('update:range','week') }">Week</NcCheckboxRadioSwitch>
        <NcCheckboxRadioSwitch type="radio" name="range-month" :checked="range==='month'" @update:checked="val => { if (val) $emit('update:range','month') }">Month</NcCheckboxRadioSwitch>
      </div>
      <div class="range-nav">
        <NcButton class="nav-btn" type="tertiary" :disabled="isLoading" @click="$emit('update:offset', offset-1)" title="Previous">◀</NcButton>
        <span class="range-dates">{{ from }} – {{ to }}</span>
        <NcButton class="nav-btn" type="tertiary" :disabled="isLoading" @click="$emit('update:offset', offset+1)" title="Next">▶</NcButton>
      </div>
    </div>
    <div class="sb-tabs sb-tabs--primary" role="tablist" aria-label="Sidebar sections">
      <button
        id="opsdash-sidebar-tab-calendars"
        type="button"
        class="sb-tab"
        :class="{ active: activeTab === 'calendars' }"
        role="tab"
        :aria-selected="activeTab === 'calendars'"
        aria-controls="opsdash-sidebar-pane-calendars"
        @click="activeTab = 'calendars'"
      >
        Calendars
      </button>
      <button
        id="opsdash-sidebar-tab-targets"
        type="button"
        class="sb-tab"
        :class="{ active: activeTab === 'targets' }"
        role="tab"
        :aria-selected="activeTab === 'targets'"
        aria-controls="opsdash-sidebar-pane-targets"
        @click="activeTab = 'targets'"
      >
        Targets
      </button>
      <button
        id="opsdash-sidebar-tab-summary"
        type="button"
        class="sb-tab"
        :class="{ active: activeTab === 'summary' }"
        role="tab"
        :aria-selected="activeTab === 'summary'"
        aria-controls="opsdash-sidebar-pane-summary"
        @click="activeTab = 'summary'"
      >
        Summary
      </button>
    </div>
    <div class="sb-tabs sb-tabs--secondary" role="tablist" aria-label="Detail settings">
      <button
        id="opsdash-sidebar-tab-activity"
        type="button"
        class="sb-tab"
        :class="{ active: activeTab === 'activity' }"
        role="tab"
        :aria-selected="activeTab === 'activity'"
        aria-controls="opsdash-sidebar-pane-activity"
        @click="activeTab = 'activity'"
      >
        Activity &amp; Schedule
      </button>
      <button
        id="opsdash-sidebar-tab-balance"
        type="button"
        class="sb-tab"
        :class="{ active: activeTab === 'balance' }"
        role="tab"
        :aria-selected="activeTab === 'balance'"
        aria-controls="opsdash-sidebar-pane-balance"
        @click="activeTab = 'balance'"
      >
        Balance
      </button>
      <button
        id="opsdash-sidebar-tab-notes"
        type="button"
        class="sb-tab"
        :class="{ active: activeTab === 'notes' }"
        role="tab"
        :aria-selected="activeTab === 'notes'"
        aria-controls="opsdash-sidebar-pane-notes"
        @click="activeTab = 'notes'"
      >
        Notes
      </button>
    </div>

    <div class="sb-tabs sb-tabs--secondary" role="tablist" aria-label="Advanced configuration">
      <button
        id="opsdash-sidebar-tab-config"
        type="button"
        class="sb-tab"
        :class="{ active: activeTab === 'config' }"
        role="tab"
        :aria-selected="activeTab === 'config'"
        aria-controls="opsdash-sidebar-pane-config"
        @click="activeTab = 'config'"
      >
        Config
      </button>
    </div>

    <SidebarCalendarsPane
      v-if="activeTab === 'calendars'"
      :calendars="calendars"
      :selected="selected"
      :range="range"
      :is-loading="isLoading"
      :category-options="categoryOptions"
      :calendar-target-messages="calendarTargetMessages"
      :calendar-category-id="calendarCategoryId"
      :get-target="getTarget"
      @select-all="emitSelectAll"
      @toggle-calendar="emitToggleCalendar"
      @set-category="handleCalendarCategory"
      @target-input="handleCalendarTargetInput"
    />

    <SidebarTargetsPane
      v-else-if="activeTab === 'targets'"
      :targets="targets"
      :category-options="categoryOptions"
      :total-target-message="totalTargetMessage"
      :all-day-hours-message="allDayHoursMessage"
      :category-target-messages="categoryTargetMessages"
      :pace-threshold-messages="paceThresholdMessages"
      :forecast-momentum-message="forecastMomentumMessage"
      :forecast-padding-message="forecastPaddingMessage"
      :can-add-category="canAddCategory"
      @total-target-input="onTotalTarget"
      @apply-preset="applyPreset"
      @set-all-day-hours="setAllDayHours"
      @set-category-label="({ id, label }) => setCategoryLabel(id, label)"
      @remove-category="removeCategory"
      @set-category-target="({ id, value }) => setCategoryTarget(id, value)"
      @set-category-pace="({ id, mode }) => setCategoryPaceMode(id, mode)"
      @set-category-weekend="({ id, value }) => setCategoryWeekend(id, value)"
      @add-category="addCategory"
      @set-include-weekend-total="setIncludeWeekendTotal"
      @set-pace-mode="setPaceMode"
      @set-threshold="({ key, value }) => setThreshold(key, value)"
      @set-forecast-method="setForecastMethod"
      @set-forecast-momentum="setForecastMomentum"
      @set-forecast-padding="setForecastPadding"
      @set-ui-option="({ key, value }) => setUiOption(key as keyof TargetsConfig['ui'], value)"
      @set-include-zero-days="setIncludeZeroDays"
    />

    <SidebarSummaryPane
      v-else-if="activeTab === 'summary'"
      :summary-options="summaryOptions"
      :active-day-mode="activeDayMode"
      @update:activeMode="emitActiveMode"
      @toggle-option="handleSummaryOption"
    />

    <SidebarConfigPane
      v-else-if="activeTab === 'config'"
      :presets="presetsList"
      :is-loading="props.presetsLoading"
      :is-saving="props.presetSaving"
      :is-applying="props.presetApplying"
      :warnings="props.presetWarnings"
      @save="(name: string) => emit('save-preset', name)"
      @load="(name: string) => emit('load-preset', name)"
      @delete="(name: string) => emit('delete-preset', name)"
      @refresh="() => emit('refresh-presets')"
      @clear-warnings="() => emit('clear-preset-warnings')"
    />

    <SidebarActivityPane
      v-else-if="activeTab === 'activity'"
      :activity-settings="activitySettings"
      :activity-toggles="activityToggles"
      :help-open="helpState.activity"
      @toggle-help="toggleActivityHelp"
      @toggle-option="handleActivityOption"
    />

    <SidebarBalancePane
      v-else-if="activeTab === 'balance'"
      :balance-settings="balanceSettings"
      :balance-threshold-messages="balanceThresholdMessages"
      :balance-lookback-message="balanceLookbackMessage"
      :balance-ui-precision-messages="balanceUiPrecisionMessages"
      :rounding-options="roundingOptions"
      :help-thresholds="helpState.balanceThresholds"
      :help-trend="helpState.balanceTrend"
      :help-display="helpState.balanceDisplay"
      @toggle-help="toggleBalanceHelp"
      @set-threshold="handleBalanceThreshold"
      @set-relation="setBalanceRelation"
      @set-lookback="setBalanceLookback"
      @set-ui-toggle="handleBalanceUiToggle"
      @set-ui-precision="handleBalanceUiPrecision"
    />

    <SidebarNotesPane
      v-else-if="activeTab === 'notes'"
      :previous="notesPrev"
      :model-value="notesCurrDraft"
      :prev-label="notesLabelPrev"
      :curr-label="notesLabelCurr"
      :prev-title="notesLabelPrevTitle"
      :curr-title="notesLabelCurrTitle"
      :saving="isSavingNote"
      @update:modelValue="value => $emit('update:notes', value)"
      @save="$emit('save-notes')"
    />
  </NcAppNavigation>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import { NcAppNavigation, NcButton, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import {
  normalizeTargetsConfig,
  createDefaultActivityCardConfig,
  createDefaultBalanceConfig,
  type ActivityCardConfig,
  type BalanceConfig,
  type TargetsConfig,
  type TargetsMode,
} from '../services/targets'
import SidebarCalendarsPane from './sidebar/SidebarCalendarsPane.vue'
import SidebarTargetsPane from './sidebar/SidebarTargetsPane.vue'
import SidebarSummaryPane from './sidebar/SidebarSummaryPane.vue'
import SidebarActivityPane from './sidebar/SidebarActivityPane.vue'
import SidebarBalancePane from './sidebar/SidebarBalancePane.vue'
import SidebarNotesPane from './sidebar/SidebarNotesPane.vue'
import SidebarConfigPane from './sidebar/SidebarConfigPane.vue'
import { applyNumericUpdate, type InputMessage } from './sidebar/validation'

const props = defineProps<{
  calendars: Array<{id:string;displayname:string;color?:string}>
  selected: string[]
  groupsById: Record<string, number>
  isLoading: boolean
  range: 'week'|'month'
  offset: number
  from: string
  to: string
  // targets maps
  targetsWeek?: Record<string, number>
  targetsMonth?: Record<string, number>
  // notes
  notesPrev: string
  notesCurrDraft: string
  notesLabelPrev: string
  notesLabelCurr: string
  notesLabelPrevTitle: string
  notesLabelCurrTitle: string
  isSavingNote: boolean
  targetsConfig: TargetsConfig
  activeDayMode: 'active' | 'all'
  navToggleLabel: string
  navToggleIcon: string
  presets: Array<{ name: string; createdAt?: string | null; updatedAt?: string | null; selectedCount: number; calendarCount: number }>
  presetsLoading: boolean
  presetSaving: boolean
  presetApplying: boolean
  presetWarnings: string[]
}>()

const emit = defineEmits([
  'load','update:range','update:offset','select-all','toggle-calendar','set-group','set-target','update:notes','save-notes','update:targets-config','update:active-mode','toggle-nav','save-preset','load-preset','delete-preset','refresh-presets','clear-preset-warnings'
])

const activeTab = ref<'calendars'|'targets'|'summary'|'activity'|'balance'|'notes'|'config'>('calendars')

type TargetsPreset = 'work-week'|'balanced-life'

const targets = computed(() => props.targetsConfig)
const categoryOptions = computed(() => targets.value?.categories ?? [])
const presetsList = computed(() => props.presets ?? [])

function updateConfig(mutator: (cfg: TargetsConfig)=>void){
  const next = normalizeTargetsConfig(JSON.parse(JSON.stringify(props.targetsConfig || {})) as TargetsConfig)
  mutator(next)
  emit('update:targets-config', next)
}

const canAddCategory = computed(() => nextGroupId() !== null)
const summaryOptions = computed(() => targets.value?.timeSummary ?? {
  showTotal: true,
  showAverage: true,
  showMedian: true,
  showBusiest: true,
  showWorkday: true,
  showWeekend: true,
  showWeekendShare: true,
  showCalendarSummary: true,
  showTopCategory: true,
  showBalance: true,
})

const activitySettings = computed<ActivityCardConfig>(() => {
  return { ...createDefaultActivityCardConfig(), ...(targets.value?.activityCard ?? {}) }
})

const activityLabels: Record<keyof ActivityCardConfig, string> = {
  showWeekendShare: 'Weekend share',
  showEveningShare: 'Evening share',
  showEarliestLatest: 'Earliest/Late times',
  showOverlaps: 'Overlaps',
  showLongestSession: 'Longest session',
  showLastDayOff: 'Last day off',
  showHint: 'Show mapping hint',
}

const activityToggles = computed(() => Object.entries(activityLabels) as Array<[keyof ActivityCardConfig, string]>)

const balanceSettings = computed<BalanceConfig>(() => {
  const base = createDefaultBalanceConfig()
  const cfg = targets.value?.balance ?? base
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

const roundingOptions = [0, 1, 2, 3]

const helpState = reactive({
  activity: false,
  balanceThresholds: false,
  balanceTrend: false,
  balanceDisplay: false,
})

const calendarTargetMessages = reactive<Record<string, InputMessage | null>>({})
const categoryTargetMessages = reactive<Record<string, InputMessage | null>>({})
const totalTargetMessage = ref<InputMessage | null>(null)
const allDayHoursMessage = ref<InputMessage | null>(null)
const paceThresholdMessages = reactive<{ onTrack: InputMessage | null; atRisk: InputMessage | null }>({ onTrack: null, atRisk: null })
const balanceThresholdMessages = reactive<{ noticeMaxShare: InputMessage | null; warnMaxShare: InputMessage | null; warnIndex: InputMessage | null }>({
  noticeMaxShare: null,
  warnMaxShare: null,
  warnIndex: null,
})
const forecastMomentumMessage = ref<InputMessage | null>(null)
const forecastPaddingMessage = ref<InputMessage | null>(null)
const balanceLookbackMessage = ref<InputMessage | null>(null)
const balanceUiPrecisionMessages = reactive<{ roundPercent: InputMessage | null; roundRatio: InputMessage | null }>({
  roundPercent: null,
  roundRatio: null,
})

function nextGroupId(): number | null {
  const used = new Set<number>()
  for (const cat of categoryOptions.value) {
    (cat.groupIds || []).forEach((g:number) => used.add(Number(g)))
  }
  Object.values(props.groupsById || {}).forEach((g:any) => used.add(Number(g)))
  for (let i = 1; i <= 9; i++) {
    if (!used.has(i)) return i
  }
  return null
}

function makeCategoryId(): string {
  return `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,5)}`
}

function calendarCategoryId(id: string): string {
  const group = getGroup(id)
  const cat = categoryOptions.value.find(cat => Array.isArray(cat.groupIds) && cat.groupIds.includes(group))
  return cat ? cat.id : ''
}

function setCalendarCategory(calendarId: string, categoryId: string){
  if (!categoryId) {
    emit('set-group', { id: calendarId, n: 0 })
    return
  }
  const cat = categoryOptions.value.find(cat => cat.id === categoryId)
  if (!cat) {
    emit('set-group', { id: calendarId, n: 0 })
    return
  }
  const group = ensureCategoryGroup(cat.id)
  emit('set-group', { id: calendarId, n: group })
}

function ensureCategoryGroup(catId: string): number {
  const cat = categoryOptions.value.find(cat => cat.id === catId)
  if (!cat) return 0
  const existing = Array.isArray(cat.groupIds) && cat.groupIds.length ? Number(cat.groupIds[0]) : null
  if (existing && Number.isFinite(existing)) return existing
  const next = nextGroupId() ?? 0
  updateConfig(cfg => {
    const target = cfg.categories.find(c => c.id === catId)
    if (target) target.groupIds = next ? [next] : []
  })
  return next
}

function updateCategory(id: string, mutator: (cat: any) => void){
  updateConfig(cfg => {
    const cat = cfg.categories.find(c => c.id === id)
    if (cat) mutator(cat)
  })
}

function getGroup(id:string){
  const n = Number((props.groupsById||{})[id] ?? 0)
  return (isFinite(n) ? Math.max(0, Math.min(9, Math.trunc(n))) : 0)
}

function getTarget(id:string){
  const map = props.range==='month' ? (props.targetsMonth||{}) : (props.targetsWeek||{})
  const n = Number((map as any)[id] ?? '')
  return isFinite(n) ? n : ''
}

function emitSelectAll(value: boolean) {
  emit('select-all', value)
}

function emitToggleCalendar(id: string) {
  emit('toggle-calendar', id)
}

function handleCalendarCategory(payload: { id: string; category: string }) {
  setCalendarCategory(payload.id, payload.category)
}

function handleCalendarTargetInput(payload: { id: string; value: string }) {
  onCalendarTargetInput(payload.id, payload.value)
}

function handleSummaryOption(payload: { key: keyof TargetsConfig['timeSummary']; value: boolean }) {
  setSummaryOption(payload.key, payload.value)
}

function handleActivityOption(payload: { key: keyof ActivityCardConfig; value: boolean }) {
  setActivityOption(payload.key, payload.value)
}

function toggleActivityHelp() {
  helpState.activity = !helpState.activity
}

function toggleBalanceHelp(target: 'all' | 'thresholds' | 'trend' | 'display') {
  if (target === 'all') {
    const next = !(helpState.balanceThresholds && helpState.balanceTrend && helpState.balanceDisplay)
    helpState.balanceThresholds = next
    helpState.balanceTrend = next
    helpState.balanceDisplay = next
    return
  }
  if (target === 'thresholds') {
    helpState.balanceThresholds = !helpState.balanceThresholds
  } else if (target === 'trend') {
    helpState.balanceTrend = !helpState.balanceTrend
  } else if (target === 'display') {
    helpState.balanceDisplay = !helpState.balanceDisplay
  }
}

function handleBalanceThreshold(payload: { key: 'noticeMaxShare' | 'warnMaxShare' | 'warnIndex'; value: string }) {
  setBalanceThreshold(payload.key, payload.value)
}

function handleBalanceUiToggle(payload: { key: 'showInsights' | 'showDailyStacks' | 'dayparts'; value: boolean }) {
  if (payload.key === 'dayparts') {
    updateConfig(cfg => {
      cfg.balance.dayparts.enabled = payload.value
    })
    return
  }
  setBalanceUiToggle(payload.key as 'showInsights' | 'showDailyStacks', payload.value)
}

function handleBalanceUiPrecision(payload: { key: 'roundPercent' | 'roundRatio'; value: string }) {
  setBalanceUiPrecision(payload.key, payload.value)
}

function onCalendarTargetInput(id: string, value: string){
  applyNumericUpdate(
    value,
    { min: 0, max: 10000, step: 0.25, decimals: 2 },
    (message) => { calendarTargetMessages[id] = message },
    (num) => emit('set-target', { id, h: num }),
  )
}

function onTotalTarget(value: string){
  applyNumericUpdate(
    value,
    { min: 0, max: 1000, step: 0.5, decimals: 2 },
    (message) => { totalTargetMessage.value = message },
    (num) => updateConfig(cfg => { cfg.totalHours = num }),
  )
}

function setAllDayHours(value: string){
  applyNumericUpdate(
    value,
    { min: 0, max: 24, step: 0.25, decimals: 2 },
    (message) => { allDayHoursMessage.value = message },
    (num) => updateConfig(cfg => { cfg.allDayHours = num }),
    '0–24 hours per day',
  )
}

function setCategoryTarget(id: string, value: string){
  applyNumericUpdate(
    value,
    { min: 0, max: 1000, step: 0.5, decimals: 2 },
    (message) => { categoryTargetMessages[id] = message },
    (num) => updateCategory(id, cat => { cat.targetHours = num }),
  )
}

function setCategoryLabel(id: string, value: string){
  updateCategory(id, cat => { cat.label = value.trim() || cat.label })
}

function setCategoryWeekend(id: string, checked: boolean){
  updateCategory(id, cat => { cat.includeWeekend = checked })
}

function emitActiveMode(mode: 'active' | 'all'){
  if (props.activeDayMode === mode) return
  emit('update:active-mode', mode)
}

function setSummaryOption(key: keyof TargetsConfig['timeSummary'], checked: boolean){
  updateConfig(cfg => {
    if (!cfg.timeSummary) {
      cfg.timeSummary = JSON.parse(JSON.stringify(summaryOptions.value))
    }
    cfg.timeSummary[key] = checked
  })
}

function setActivityOption(key: keyof ActivityCardConfig, checked: boolean){
  updateConfig(cfg => {
    if (!cfg.activityCard) {
      cfg.activityCard = createDefaultActivityCardConfig()
    }
    cfg.activityCard[key] = checked
  })
}

function setCategoryPaceMode(id: string, mode: string){
  if (mode !== 'days_only' && mode !== 'time_aware') return
  updateCategory(id, cat => { cat.paceMode = mode as TargetsMode })
}

function setIncludeWeekendTotal(checked: boolean){
  updateConfig(cfg => { cfg.pace.includeWeekendTotal = checked })
}

function setPaceMode(mode: string){
  if (mode !== 'days_only' && mode !== 'time_aware') return
  updateConfig(cfg => { cfg.pace.mode = mode as TargetsMode })
}

function setThreshold(which: 'onTrack'|'atRisk', value: string){
  applyNumericUpdate(
    value,
    { min: -100, max: 100, step: 0.1, decimals: 1 },
    (message) => { paceThresholdMessages[which] = message },
    (num) => updateConfig(cfg => { cfg.pace.thresholds[which] = num }),
  )
}

function setBalanceThreshold(which: 'noticeMaxShare' | 'warnMaxShare' | 'warnIndex', value: string){
  applyNumericUpdate(
    value,
    { min: 0, max: 1, step: 0.01, decimals: 2 },
    (message) => { balanceThresholdMessages[which] = message },
    (num) => updateConfig(cfg => {
      cfg.balance.thresholds[which] = Number(num.toFixed(2))
    }),
  )
}

function setBalanceRelation(mode: string){
  const resolved = mode === 'factor' ? 'factor' : 'ratio'
  updateConfig(cfg => {
    cfg.balance.relations.displayMode = resolved
  })
}

function setBalanceLookback(value: string){
  applyNumericUpdate(
    value,
    { min: 1, max: 12, step: 1, decimals: 0 },
    (message) => { balanceLookbackMessage.value = message },
    (num) => updateConfig(cfg => { cfg.balance.trend.lookbackWeeks = num }),
  )
}

function setBalanceUiToggle(key: 'showInsights' | 'showDailyStacks', checked: boolean){
  updateConfig(cfg => {
    cfg.balance.ui[key] = checked
  })
}

function setBalanceUiPrecision(key: 'roundPercent' | 'roundRatio', value: string){
  applyNumericUpdate(
    value,
    { min: 0, max: 3, step: 1, decimals: 0 },
    (message) => { balanceUiPrecisionMessages[key] = message },
    (num) => updateConfig(cfg => { cfg.balance.ui[key] = num }),
  )
}

function setForecastMethod(value: string){
  const method = value === 'momentum' ? 'momentum' : 'linear'
  updateConfig(cfg => { cfg.forecast.methodPrimary = method })
}

function setForecastMomentum(value: string){
  applyNumericUpdate(
    value,
    { min: 1, max: 14, step: 1, decimals: 0 },
    (message) => { forecastMomentumMessage.value = message },
    (num) => updateConfig(cfg => { cfg.forecast.momentumLastNDays = num }),
  )
}

function setForecastPadding(value: string){
  applyNumericUpdate(
    value,
    { min: 0, max: 100, step: 0.1, decimals: 1 },
    (message) => { forecastPaddingMessage.value = message },
    (num) => updateConfig(cfg => { cfg.forecast.padding = num }),
  )
}

function setUiOption<K extends keyof TargetsConfig['ui']>(key: K, checked: boolean){
  updateConfig(cfg => { cfg.ui[key] = checked })
}

function setIncludeZeroDays(checked: boolean){
  updateConfig(cfg => { cfg.includeZeroDaysInStats = checked })
}

function applyPreset(preset: TargetsPreset){
  updateConfig(cfg => {
    if (preset === 'work-week'){
      cfg.totalHours = 48
      cfg.categories = [
        { id:'work', label:'Work', targetHours:32, includeWeekend:false, paceMode:'days_only', groupIds:[1] },
        { id:'hobby', label:'Hobby', targetHours:6, includeWeekend:true, paceMode:'days_only', groupIds:[2] },
        { id:'sport', label:'Sport', targetHours:4, includeWeekend:true, paceMode:'days_only', groupIds:[3] },
      ]
      cfg.allDayHours = 8
      cfg.pace.includeWeekendTotal = true
      cfg.pace.mode = 'days_only'
      cfg.pace.thresholds = { onTrack: -2, atRisk: -10 }
      cfg.forecast.methodPrimary = 'linear'
      cfg.forecast.momentumLastNDays = 2
      cfg.forecast.padding = 1.5
      cfg.includeZeroDaysInStats = false
      cfg.ui.showCalendarCharts = true
      cfg.ui.showCategoryCharts = true
    } else if (preset === 'balanced-life'){
      cfg.totalHours = 48
      cfg.categories = [
        { id:'work', label:'Work', targetHours:32, includeWeekend:false, paceMode:'time_aware', groupIds:[1] },
        { id:'hobby', label:'Hobby', targetHours:8, includeWeekend:true, paceMode:'time_aware', groupIds:[2] },
        { id:'sport', label:'Sport', targetHours:6, includeWeekend:true, paceMode:'time_aware', groupIds:[3] },
      ]
      cfg.allDayHours = 8
      cfg.pace.includeWeekendTotal = true
      cfg.pace.mode = 'time_aware'
      cfg.pace.thresholds = { onTrack: -2, atRisk: -10 }
      cfg.forecast.methodPrimary = 'linear'
      cfg.forecast.momentumLastNDays = 2
      cfg.forecast.padding = 1.5
      cfg.includeZeroDaysInStats = false
      cfg.ui.showCalendarCharts = true
      cfg.ui.showCategoryCharts = true
    }
  })
}

function addCategory(){
  const group = nextGroupId()
  if (group === null) {
    window.alert?.('All category slots are currently in use (max 9).')
    return
  }
  updateConfig(cfg => {
    cfg.categories = [...cfg.categories, {
      id: makeCategoryId(),
      label: `Category ${cfg.categories.length + 1}`,
      targetHours: 0,
      includeWeekend: true,
      paceMode: 'days_only',
      groupIds: [group],
    }]
  })
}

function removeCategory(id: string){
  if (categoryOptions.value.length <= 1) return
  const cat = categoryOptions.value.find(c => c.id === id)
  if (!cat) return
  const group = Array.isArray(cat.groupIds) && cat.groupIds.length ? Number(cat.groupIds[0]) : null
  updateConfig(cfg => {
    cfg.categories = cfg.categories.filter(c => c.id !== id)
  })
  if (group !== null) {
    Object.entries(props.groupsById || {}).forEach(([calId, grp]) => {
      if (Number(grp) === group) {
        emit('set-group', { id: calId, n: 0 })
      }
    })
  }
}
</script>

<style scoped>
.input-message{font-size:11px;margin-top:4px;color:var(--muted)}
.input-message.error{color:var(--neg)}
.input-message.warning{color:var(--warning)}
</style>
