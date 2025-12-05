<template>
  <!-- Sidebar: range controls, calendar selection + grouping -->
  <NcAppNavigation>
    <slot name="actions" />
    <div class="sb-title" title="Filter and group calendars">Filter Calendars</div>
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
    </div>
    <div class="sb-tabs sb-tabs--secondary" role="tablist" aria-label="Detail settings">
      <button
        id="opsdash-sidebar-tab-activitybalance"
        type="button"
        class="sb-tab"
        :class="{ active: activeTab === 'activitybalance' }"
        role="tab"
        :aria-selected="activeTab === 'activitybalance'"
        aria-controls="opsdash-sidebar-pane-activitybalance"
        @click="activeTab = 'activitybalance'"
      >
        Activity &amp; Balance
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
        Config & Setup
      </button>
      <button
        id="opsdash-sidebar-tab-report"
        type="button"
        class="sb-tab"
        :class="{ active: activeTab === 'report' }"
        role="tab"
        :aria-selected="activeTab === 'report'"
        aria-controls="opsdash-sidebar-pane-report"
        @click="activeTab = 'report'"
      >
        Report
      </button>
      <button
        id="opsdash-sidebar-tab-deck"
        type="button"
        class="sb-tab"
        :class="{ active: activeTab === 'deck' }"
        role="tab"
        :aria-selected="activeTab === 'deck'"
        aria-controls="opsdash-sidebar-pane-deck"
        @click="activeTab = 'deck'"
      >
        Deck
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

    <SidebarConfigPane
      v-else-if="activeTab === 'config'"
      :presets="presetsList"
      :is-loading="props.presetsLoading"
      :is-saving="props.presetSaving"
      :is-applying="props.presetApplying"
      :warnings="props.presetWarnings"
      :theme-preference="props.themePreference"
      :effective-theme="props.effectiveTheme"
      :system-theme="props.systemTheme"
      @save="(name: string) => emit('save-preset', name)"
      @load="(name: string) => emit('load-preset', name)"
      @delete="(name: string) => emit('delete-preset', name)"
      @refresh="() => emit('refresh-presets')"
      @clear-warnings="() => emit('clear-preset-warnings')"
      @rerun-onboarding="() => emit('rerun-onboarding')"
      @set-theme-preference="(value: 'auto' | 'light' | 'dark') => emit('set-theme-preference', value)"
      @export-config="() => emit('export-config')"
      @import-config="(file: File) => emit('import-config', file)"
      @open-shortcuts="(el) => emit('open-shortcuts', el)"
    />

    <SidebarReportPane
      v-else-if="activeTab === 'report'"
      :reporting-config="props.reportingConfig"
      :saving="props.reportingSaving"
      @save-reporting="(value) => emit('save-reporting', value)"
    />

    <SidebarDeckPane
      v-else-if="activeTab === 'deck'"
      :deck-settings="props.deckSettings"
      :saving="props.reportingSaving"
      @save-deck-settings="(value) => emit('save-deck-settings', value)"
    />

    <SidebarBalancePane
      v-else-if="activeTab === 'activitybalance'"
      id="opsdash-sidebar-pane-activitybalance"
      class="sb-pane"
      role="tabpanel"
      aria-labelledby="opsdash-sidebar-tab-activitybalance"
      :activity-forecast-mode="activitySettings.forecastMode"
      :activity-forecast-options="activityForecastOptions"
      :balance-settings="balanceSettings"
      :balance-lookback-message="balanceLookbackMessage"
      :help-trend="helpState.balanceTrend"
      :help-display="helpState.balanceDisplay"
      @toggle-help="toggleBalanceHelp"
      @set-activity-forecast="setActivityForecastMode"
      @set-lookback="setBalanceLookback"
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
import type { ReportingConfig, DeckFeatureSettings } from '../services/reporting'
import SidebarCalendarsPane from './sidebar/SidebarCalendarsPane.vue'
import SidebarBalancePane from './sidebar/SidebarBalancePane.vue'
import SidebarConfigPane from './sidebar/SidebarConfigPane.vue'
import SidebarReportPane from './sidebar/SidebarReportPane.vue'
import SidebarDeckPane from './sidebar/SidebarDeckPane.vue'
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
  targetsConfig: TargetsConfig
  navToggleLabel: string
  navToggleIcon: string
  presets: Array<{ name: string; createdAt?: string | null; updatedAt?: string | null; selectedCount: number; calendarCount: number }>
  presetsLoading: boolean
  presetSaving: boolean
  presetApplying: boolean
  presetWarnings: string[]
  themePreference: 'auto' | 'light' | 'dark'
  effectiveTheme: 'light' | 'dark'
  systemTheme: 'light' | 'dark'
  reportingConfig: ReportingConfig
  deckSettings: DeckFeatureSettings
  reportingSaving: boolean
}>()

const emit = defineEmits([
  'load',
  'update:range',
  'update:offset',
  'select-all',
  'toggle-calendar',
  'set-group',
  'set-target',
  'update:targets-config',
  'toggle-nav',
  'save-preset',
  'load-preset',
  'delete-preset',
  'refresh-presets',
  'clear-preset-warnings',
  'rerun-onboarding',
  'set-theme-preference',
  'export-config',
  'import-config',
  'open-shortcuts',
  'save-reporting',
  'save-deck-settings',
])

type SidebarTab = 'calendars'|'activitybalance'|'config'|'report'|'deck'

const activeTab = ref<SidebarTab>('calendars')

const targets = computed(() => props.targetsConfig)
const categoryOptions = computed(() => targets.value?.categories ?? [])
const presetsList = computed(() => props.presets ?? [])

const BASE_CATEGORY_COLORS = ['#2563EB', '#F97316', '#10B981', '#A855F7', '#EC4899', '#14B8A6', '#F59E0B', '#6366F1', '#0EA5E9', '#65A30D']

const categoryColorPalette = computed(() => {
  const palette = new Set<string>()
  const push = (value?: string | null) => {
    const color = sanitizeHexColor(value)
    if (color) {
      palette.add(color)
    }
  }
  ;(props.calendars || []).forEach((cal: any) => push(cal?.color))
  categoryOptions.value.forEach((cat: any) => push(cat?.color))
  BASE_CATEGORY_COLORS.forEach((color) => palette.add(color))
  return Array.from(palette)
})

function updateConfig(mutator: (cfg: TargetsConfig)=>void){
  const next = normalizeTargetsConfig(JSON.parse(JSON.stringify(props.targetsConfig || {})) as TargetsConfig)
  mutator(next)
  emit('update:targets-config', next)
}

const canAddCategory = computed(() => nextGroupId() !== null)
const activitySettings = computed<ActivityCardConfig>(() => {
  return { ...createDefaultActivityCardConfig(), ...(targets.value?.activityCard ?? {}) }
})

const activityForecastOptions: Array<{ value: ActivityCardConfig['forecastMode']; label: string; description: string }> = [
  { value: 'off', label: 'Do not project future days', description: 'Keep charts empty until events occur.' },
  { value: 'total', label: 'Distribute remaining total target', description: 'Split leftover total target hours evenly across future days using current calendar mix.' },
  { value: 'calendar', label: 'Respect calendar targets', description: 'Use per-calendar targets for the current range and spread remaining hours across future days.' },
  { value: 'category', label: 'Respect category targets', description: 'Allocate remaining category targets across future days according to current mappings.' },
]

const balanceSettings = computed<BalanceConfig>(() => {
  const base = createDefaultBalanceConfig()
  const cfg = targets.value?.balance ?? base
  return {
    ...base,
    ...cfg,
    index: { ...base.index, ...(cfg.index ?? {}) },
    thresholds: { ...base.thresholds, ...(cfg.thresholds ?? {}) },
    relations: { ...base.relations, ...(cfg.relations ?? {}) },
    trend: { ...base.trend, ...(cfg.trend ?? {}) },
    dayparts: { ...base.dayparts, ...(cfg.dayparts ?? {}) },
    ui: { ...base.ui, ...(cfg.ui ?? {}) },
  }
})

const helpState = reactive({
  balanceTrend: false,
  balanceDisplay: false,
})

const calendarTargetMessages = reactive<Record<string, InputMessage | null>>({})
const categoryTargetMessages = reactive<Record<string, InputMessage | null>>({})
const totalTargetMessage = ref<InputMessage | null>(null)
const allDayHoursMessage = ref<InputMessage | null>(null)
const paceThresholdMessages = reactive<{ onTrack: InputMessage | null; atRisk: InputMessage | null }>({ onTrack: null, atRisk: null })
const balanceThresholdMessages = reactive<Record<string, InputMessage | null>>({})
const forecastMomentumMessage = ref<InputMessage | null>(null)
const forecastPaddingMessage = ref<InputMessage | null>(null)
const balanceLookbackMessage = ref<InputMessage | null>(null)

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

function setActivityForecastMode(mode: ActivityCardConfig['forecastMode']) {
  if (mode !== 'off' && mode !== 'total' && mode !== 'calendar' && mode !== 'category') {
    return
  }
  updateConfig(cfg => {
    if (!cfg.activityCard) {
      cfg.activityCard = createDefaultActivityCardConfig()
    }
    cfg.activityCard.forecastMode = mode
  })
}

function toggleBalanceHelp(target: 'thresholds' | 'trend' | 'display') {
  if (target === 'trend') {
    helpState.balanceTrend = !helpState.balanceTrend
  } else if (target === 'display') {
    helpState.balanceDisplay = !helpState.balanceDisplay
  }
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

function setCategoryColor(id: string, value: string){
  const color = sanitizeHexColor(value)
  updateCategory(id, cat => {
    cat.color = color ?? null
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

function setBalanceThreshold(which: 'noticeAbove' | 'noticeBelow' | 'warnAbove' | 'warnBelow' | 'warnIndex', value: string){
  applyNumericUpdate(
    value,
    { min: 0, max: 1, step: 0.01, decimals: 2 },
    (message) => { balanceThresholdMessages[which] = message },
    (num) => updateConfig(cfg => {
      cfg.balance.thresholds[which] = Number(num.toFixed(2))
    }),
  )
}

function setBalanceLookback(value: string){
  applyNumericUpdate(
    value,
    { min: 1, max: 4, step: 1, decimals: 0 },
    (message) => { balanceLookbackMessage.value = message },
    (num) => updateConfig(cfg => { cfg.balance.trend.lookbackWeeks = num }),
  )
}

// showNotes toggle removed from UI; keep placeholder to avoid runtime errors where invoked

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

function addCategory(){
  const group = nextGroupId()
  if (group === null) {
    window.alert?.('All category slots are currently in use (max 9).')
    return
  }
  updateConfig(cfg => {
    const nextColor = findNextCategoryColor(cfg.categories)
    cfg.categories = [...cfg.categories, {
      id: makeCategoryId(),
      label: `Category ${cfg.categories.length + 1}`,
      targetHours: 0,
      includeWeekend: true,
      paceMode: 'days_only',
      color: nextColor,
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

function sanitizeHexColor(value: any): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
    return null
  }
  if (trimmed.length === 4) {
    const [, r, g, b] = trimmed
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
  }
  return trimmed.toUpperCase()
}

function findNextCategoryColor(categories: Array<{ color?: string | null }>): string | null {
  const used = new Set<string>()
  categories.forEach((cat) => {
    const color = sanitizeHexColor(cat?.color ?? null)
    if (color) used.add(color)
  })
  for (const color of BASE_CATEGORY_COLORS) {
    if (!used.has(color)) return color
  }
  return BASE_CATEGORY_COLORS[0] ?? null
}

function openTab(tab: SidebarTab) {
  activeTab.value = tab
}

defineExpose({
  openTab,
})
</script>

<style scoped>
.input-message{font-size:11px;margin-top:4px;color:var(--muted)}
.input-message.error{color:var(--neg)}
.input-message.warning{color:var(--warning)}
</style>
