<template>
  <div id="opsdash" class="opsdash" :class="{ 'is-nav-collapsed': !navOpen }">
    <OnboardingWizard
      :key="onboardingRunId"
      :visible="onboardingWizardVisible"
      :calendars="wizardCalendars"
      :initial-selection="wizardInitialSelection"
      :initial-strategy="wizardInitialStrategy"
      :onboarding-version="ONBOARDING_VERSION"
      :closable="!autoWizardNeeded"
      :initial-theme-preference="themePreference"
      :system-theme="systemTheme"
      :initial-all-day-hours="wizardInitialAllDayHours"
      :initial-total-hours="wizardInitialTotalHours"
      :initial-deck-settings="wizardInitialDeckSettings"
      :initial-reporting-config="wizardInitialReportingConfig"
      :has-existing-config="hasExistingConfig"
      :saving="isOnboardingSaving"
      :snapshot-saving="isWizardSnapshotSaving"
      :snapshot-notice="wizardSnapshotNotice"
      @close="handleWizardClose"
      @skip="handleWizardSkip"
      @complete="handleWizardComplete"
      @save-current-config="handleWizardSaveSnapshot"
    />
    <NcAppContent app-name="Operational Dashboard" :show-navigation="navOpen">
      <template #navigation>
        <Sidebar
          ref="sidebarRef"
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
          :theme-preference="themePreference"
          :effective-theme="effectiveTheme"
          :system-theme="systemTheme"
          :reporting-config="reportingConfig"
          :deck-settings="deckSettings"
          :reporting-saving="reportingSaving"
          @load="performLoad"
          @update:range="(v)=>{ range=v as any; offset=0; performLoad() }"
          @update:offset="(v)=>{ offset=v as number; performLoad() }"
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
          @rerun-onboarding="openWizardFromSidebar"
          @set-theme-preference="setThemePreference"
          @export-config="exportSidebarConfig"
          @import-config="importSidebarConfig"
          @open-shortcuts="handleOpenShortcuts"
          @save-reporting="handleReportingConfigSave"
          @save-deck-settings="handleDeckSettingsSave"
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

            <div class="cards-toolbar">
              <button type="button" class="ghost-btn" @click="isLayoutEditing = !isLayoutEditing">
                {{ isLayoutEditing ? 'Done editing' : 'Edit layout' }}
              </button>
              <div v-if="isLayoutEditing" class="cards-toolbar__add">
                <select v-model="newWidgetType">
                  <option value="" disabled>Select widget…</option>
                  <option v-for="entry in availableWidgetTypes" :key="entry.type" :value="entry.type">
                    {{ entry.label }}
                  </option>
                </select>
                <button type="button" class="ghost-btn" :disabled="!newWidgetType" @click="addWidget(newWidgetType)">
                  Add
                </button>
                <button type="button" class="ghost-btn" @click="resetWidgets">
                  Reset
                </button>
              </div>
            </div>

            <div class="cards">
              <DashboardLayout
                :widgets="widgets"
                :context="widgetContext"
                :editable="isLayoutEditing"
                @edit:width="cycleWidth"
                @edit:height="cycleHeight"
                @edit:remove="removeWidget"
                @edit:move="moveWidget"
                @edit:options="updateWidgetOptions"
              />
            </div>

            <div class="tabs">
              <a href="#" :class="{active: pane==='cal'}" @click.prevent="pane='cal'">By Calendar</a>
              <a href="#" :class="{active: pane==='day'}" @click.prevent="pane='day'">By Day</a>
              <a href="#" :class="{active: pane==='top'}" @click.prevent="pane='top'">Longest Tasks</a>
              <a href="#" :class="{active: pane==='heat'}" @click.prevent="pane='heat'">Heatmap</a>
              <a
                v-if="deckSettings.enabled"
                href="#"
                :class="{active: pane==='deck'}"
                @click.prevent="pane='deck'"
              >
                Deck
              </a>
            </div>

            <div class="card full tab-panel" v-show="pane==='cal'">
              <NcEmptyContent v-if="byCal.length===0" name="No data" description="Try changing the range or calendars" />
              <template v-else>
                <ByCalendarTable
                  :rows="byCal"
                  :n2="n2"
                  :targets="currentTargets"
                  :groups="calendarGroups"
                  :today-hours="calendarTodayHours"
                />
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

            <div v-if="deckSettings.enabled" class="card full tab-panel" v-show="pane==='deck'">
              <DeckCardsPanel
                :cards="deckFilteredCards"
                :loading="deckLoading"
                :range-label="rangeLabel"
                :last-fetched-at="deckLastFetchedAt"
                :deck-url="deckUrl"
                :error="deckError"
                :filter="deckFilter"
                :can-filter-mine="deckCanFilterMine"
                :filters-enabled="deckSettings.filtersEnabled && deckSettings.enabled"
                @refresh="refreshDeck(true)"
                @update:filter="(value) => (deckFilter = value)"
              />
            </div>

            <div class="hint footer">
              <template v-if="appVersion">
                Operational Dashboard • v{{ appVersion }} • Built by Blade34242 @ Gellert Innovation
              </template>
              <template v-else>
                Operational Dashboard • v0.4.4 • Built by Blade34242 @ Gellert Innovation
              </template>
            </div>
          </div>
        </div>
      </div>
    </NcAppContent>
    <KeyboardShortcutsModal
      :visible="shortcutsOpen"
      :groups="shortcutGroups"
      @close="closeShortcuts"
    />
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
import Sidebar from './components/Sidebar.vue'
import OnboardingWizard from './components/OnboardingWizard.vue'
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal.vue'
import DeckCardsPanel from './components/DeckCardsPanel.vue'
import DashboardLayout from './components/layout/DashboardLayout.vue'
import { buildTargetsSummary, normalizeTargetsConfig, createEmptyTargetsSummary, createDefaultActivityCardConfig, createDefaultBalanceConfig, cloneTargetsConfig, convertWeekToMonth, type ActivityCardConfig, type BalanceConfig, type TargetsConfig } from './services/targets'
import { normalizeReportingConfig, normalizeDeckSettings, type DeckFilterMode } from './services/reporting'
import { ONBOARDING_VERSION } from './services/onboarding'
import { createDefaultWidgets, widgetsRegistry, type WidgetDefinition, type WidgetRenderContext, type WidgetHeight, type WidgetSize } from './services/widgetsRegistry'
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
import { useDashboard, type OnboardingState } from '../composables/useDashboard'
import { useDashboardPersistence } from '../composables/useDashboardPersistence'
import { useDashboardSelection } from '../composables/useDashboardSelection'
import { useDashboardPresets } from '../composables/useDashboardPresets'
import { useChartScheduler } from '../composables/useChartScheduler'
import { useOcHttp } from '../composables/useOcHttp'
import { useAppMeta } from '../composables/useAppMeta'
import { useCalendarLinks } from '../composables/useCalendarLinks'
import { useCharts } from '../composables/useCharts'
import { useCategories } from '../composables/useCategories'
import { useSummaries } from '../composables/useSummaries'
import { useBalance } from '../composables/useBalance'
import { useThemeController } from '../composables/useThemeController'
import { useOnboardingFlow } from '../composables/useOnboardingFlow'
import { useRangeToolbar } from '../composables/useRangeToolbar'
import { useConfigExportImport } from '../composables/useConfigExportImport'
import { useDetailsToggle } from '../composables/useDetailsToggle'
import { useNotesLabels } from '../composables/useNotesLabels'
import { useSidebarState } from '../composables/useSidebarState'
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts'
import { useOnboardingActions } from '../composables/useOnboardingActions'
import { useDeckCards } from '../composables/useDeckCards'
import { trackTelemetry } from './services/telemetry'
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
  warnings: string[]
} | null

const { navOpen, toggleNav, navToggleLabel, navToggleIcon } = useSidebarState()
const sidebarRef = ref<InstanceType<typeof Sidebar> | null>(null)

function ensureSidebarVisible() {
  if (!navOpen.value) {
    toggleNav()
  }
}

const pane = ref<'cal'|'day'|'top'|'heat'|'deck'>('cal')
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

const { scheduleDraw } = useChartScheduler()

const { route, getJson, postJson, deleteJson, root } = useOcHttp()

const { calendarDayLink, fetchDavColors } = useCalendarLinks({
  root,
  isDebug: isDbg,
})

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
  onboarding,
  load,
  themePreference: dashboardThemePreference,
  reportingConfig,
  deckSettings,
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

function handleReportingConfigSave(value: any) {
  reportingConfig.value = normalizeReportingConfig(value, reportingConfig.value)
  queueSave(false)
}

function handleDeckSettingsSave(value: any) {
  deckSettings.value = normalizeDeckSettings(value, deckSettings.value)
  const nextFilter = sanitizeDeckFilter(deckSettings.value.defaultFilter)
  deckFilter.value = nextFilter
  queueSave(false)
}

watch(
  () => deckSettings.value.defaultFilter,
  (next) => {
    const sanitized = sanitizeDeckFilter(next)
    if (sanitized !== deckFilter.value) {
      deckFilter.value = sanitized
    }
  },
)

watch(
  () => deckSettings.value.enabled,
  (enabled) => {
    if (!enabled && pane.value === 'deck') {
      pane.value = 'cal'
    }
  },
)

const {
  deckCards,
  deckLoading,
  deckLastFetchedAt,
  deckError,
  refreshDeck,
} = useDeckCards({
  from,
  to,
  notifyError,
})

const deckFilter = ref<DeckFilterMode>(sanitizeDeckFilter(deckSettings.value.defaultFilter))
const deckVisibleCards = computed(() => {
  const hidden = new Set(
    (deckSettings.value.hiddenBoards || []).map((id) => Number(id)).filter((id) => Number.isFinite(id)),
  )
  return deckCards.value.filter((card) => !hidden.has(card.boardId))
})

const deckMineMatcher = computed(() => {
  const mineMode = deckSettings.value.mineMode ?? 'assignee'
  const userId = (uid.value || '').trim().toLowerCase()
  return (card: any) => {
    if (!userId) return false
    const assigneeMatch = (card.assignees || []).some(
      (assignee: any) => typeof assignee.uid === 'string' && assignee.uid.toLowerCase() === userId,
    )
    const creatorId = typeof card.createdBy === 'string' ? card.createdBy.trim().toLowerCase() : ''
    const creatorMatch = creatorId && creatorId === userId
    const doneById = typeof card.doneBy === 'string' ? card.doneBy.trim().toLowerCase() : ''
    const doneMatch = doneById && doneById === userId
    if (mineMode === 'creator') return creatorMatch || doneMatch
    if (mineMode === 'assignee') return assigneeMatch || doneMatch
    return assigneeMatch || creatorMatch || doneMatch
  }
})

const deckStatusMatches = (card: any, status: 'open' | 'done' | 'archived', includeArchivedInDone: boolean) => {
  if (status === 'open') return card.status === 'active'
  if (status === 'archived') return card.status === 'archived'
  if (status === 'done') {
    if (card.status === 'done') return true
    return includeArchivedInDone && card.status === 'archived'
  }
  return false
}

const deckFilteredCards = computed(() => {
  const mineMatch = deckMineMatcher.value
  const includeArchivedInDone = deckSettings.value.solvedIncludesArchived !== false
  const filter = deckFilter.value
  const cards = deckVisibleCards.value
  if (filter === 'all') return cards
  if (filter === 'mine') {
    return cards.filter((card) => mineMatch(card))
  }
  const [statusKey, scope] = filter.split('_') as ['open' | 'done' | 'archived', 'all' | 'mine']
  return cards.filter((card) => {
    const statusOk = deckStatusMatches(card, statusKey, includeArchivedInDone)
    const mineOk = scope === 'all' ? true : mineMatch(card)
    return statusOk && mineOk
  })
})

const deckSummaryBuckets = computed(() => {
  const mineMatch = deckMineMatcher.value
  const includeArchivedInDone = deckSettings.value.solvedIncludesArchived !== false
  const cards = deckVisibleCards.value
  const rows: Array<{
    key: DeckFilterMode
    label: string
    titles: string[]
    count: number
    board?: { title: string; color?: string }
  }> = []
  const defs: Array<{ key: DeckFilterMode; label: string; status: 'open' | 'done' | 'archived'; mine: boolean }> = [
    { key: 'open_all', label: 'Open · All', status: 'open', mine: false },
    { key: 'open_mine', label: 'Open · Mine', status: 'open', mine: true },
    { key: 'done_all', label: 'Done · All', status: 'done', mine: false },
    { key: 'done_mine', label: 'Done · Mine', status: 'done', mine: true },
    { key: 'archived_all', label: 'Archived · All', status: 'archived', mine: false },
    { key: 'archived_mine', label: 'Archived · Mine', status: 'archived', mine: true },
  ]

  defs.forEach((def) => {
    const filtered = cards.filter((card) => {
      const statusOk = deckStatusMatches(card, def.status, includeArchivedInDone)
      const mineOk = def.mine ? mineMatch(card) : true
      return statusOk && mineOk
    })
    const boardCounts = new Map<number, { count: number; title: string; color?: string }>()
    filtered.forEach((card) => {
      if (card.boardId == null) return
      const entry = boardCounts.get(card.boardId) || { count: 0, title: card.boardTitle, color: card.boardColor }
      entry.count += 1
      entry.title = card.boardTitle
      entry.color = card.boardColor
      boardCounts.set(card.boardId, entry)
    })
    let board: { title: string; color?: string } | undefined
    if (boardCounts.size) {
      const sorted = Array.from(boardCounts.entries()).sort((a, b) => b[1].count - a[1].count)
      board = { title: sorted[0][1].title, color: sorted[0][1].color }
    }
    rows.push({
      key: def.key,
      label: def.label,
      titles: filtered.map((card) => card.title || `Card ${card.id}`),
      count: filtered.length,
      board,
    })
  })

  return rows
})

const deckTickerConfig = computed(() => {
  const ticker = deckSettings.value.ticker || { autoScroll: true, intervalSeconds: 5, showBoardBadges: true }
  const interval = Math.min(10, Math.max(3, Number(ticker.intervalSeconds ?? 5) || 5))
  return {
    autoScroll: ticker.autoScroll !== false,
    intervalSeconds: interval,
  }
})

const deckCanFilterMine = computed(
  () => deckSettings.value.filtersEnabled && deckSettings.value.enabled && Boolean((uid.value || '').trim()),
)


const deckUrl = computed(() => {
  const base = root.value || ''
  return `${base}/apps/deck/`
})

const onboardingState = onboarding
const hasInitialLoad = ref(false)

const {
  themePreference,
  effectiveTheme,
  systemTheme,
  setThemePreference,
} = useThemeController({
  serverPreference: dashboardThemePreference,
  route: (name) => route(name),
  postJson,
  notifySuccess,
  notifyError,
})

// Widget layout state (must be declared before persistence/export/import use it)
const WIDGETS_STORAGE_KEY = 'opsdash.widgets.v1'
const layoutWidgets = ref<WidgetDefinition[]>(loadWidgetLayout())
const isLayoutEditing = ref(false)
const newWidgetType = ref('')

const widgets = computed<WidgetDefinition[]>(() => {
  const defs = layoutWidgets.value
  if (!deckSettings.value.enabled) {
    return defs.filter((w) => w.type !== 'deck')
  }
  return defs
})

const availableWidgetTypes = computed(() => {
  const present = new Set(layoutWidgets.value.map((w) => w.type))
  return Object.keys(widgetsRegistry)
    .filter((type) => !present.has(type))
    .map((type) => ({
      type,
      label: widgetsRegistry[type]?.label || type,
    }))
})

function updateWidget(id: string, updater: (w: WidgetDefinition) => WidgetDefinition) {
  layoutWidgets.value = layoutWidgets.value.map((w) =>
    w.id === id ? updater({ ...w, layout: { ...w.layout } }) : w,
  )
}

function cycleWidth(id: string) {
  const order: WidgetSize[] = ['quarter', 'half', 'full']
  updateWidget(id, (w) => {
    const idx = order.indexOf(w.layout.width as WidgetSize)
    const next = order[(idx + 1) % order.length]
    return { ...w, layout: { ...w.layout, width: next } }
  })
}

function cycleHeight(id: string) {
  const order: WidgetHeight[] = ['s', 'm', 'l']
  updateWidget(id, (w) => {
    const idx = order.indexOf(w.layout.height as WidgetHeight)
    const next = order[(idx + 1) % order.length]
    return { ...w, layout: { ...w.layout, height: next } }
  })
}

function moveWidget(id: string, dir: 'up' | 'down') {
  const ordered = [...layoutWidgets.value].sort((a, b) => (a.layout.order || 0) - (b.layout.order || 0))
  const idx = ordered.findIndex((w) => w.id === id)
  if (idx < 0) return
  const targetIdx = dir === 'up' ? idx - 1 : idx + 1
  if (targetIdx < 0 || targetIdx >= ordered.length) return
  const currentOrder = ordered[idx].layout.order
  ordered[idx].layout.order = ordered[targetIdx].layout.order
  ordered[targetIdx].layout.order = currentOrder
  layoutWidgets.value = ordered
}

function removeWidget(id: string) {
  layoutWidgets.value = layoutWidgets.value.filter((w) => w.id !== id)
}

function addWidget(type: string) {
  const entry = widgetsRegistry[type]
  if (!entry) return
  if (layoutWidgets.value.some((w) => w.type === type)) return
  const maxOrder = layoutWidgets.value.reduce((acc, w) => Math.max(acc, w.layout.order || 0), 0)
  const def: WidgetDefinition = {
    id: `widget-${type}-${Date.now()}`,
    type,
    options: {},
    layout: { ...entry.defaultLayout, order: maxOrder + 10 },
    version: 1,
  }
  layoutWidgets.value = [...layoutWidgets.value, def]
  newWidgetType.value = ''
}

function updateWidgetOptions(id: string, key: string, value: any) {
  layoutWidgets.value = layoutWidgets.value.map((w) => {
    if (w.id !== id) return w
    const opts = { ...(w.options || {}) }
    opts[key] = value
    return { ...w, options: opts }
  })
}

function resetWidgets() {
  layoutWidgets.value = createDefaultWidgets()
}

function loadWidgetLayout(): WidgetDefinition[] {
  try {
    if (typeof localStorage === 'undefined') return createDefaultWidgets()
    const raw = localStorage.getItem(WIDGETS_STORAGE_KEY)
    if (!raw) return createDefaultWidgets()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return createDefaultWidgets()
    const cleaned: WidgetDefinition[] = []
    parsed.forEach((item: any) => {
      const type = String(item?.type ?? '')
      if (!type || !widgetsRegistry[type]) return
      const id = String(item?.id ?? '')
      const width: WidgetSize =
        item?.layout?.width === 'quarter' || item?.layout?.width === 'half' ? item.layout.width : 'full'
      const height: WidgetHeight =
        item?.layout?.height === 's' || item?.layout?.height === 'l' ? item.layout.height : 'm'
      const order = Number(item?.layout?.order ?? 0)
      const options = item?.options && typeof item.options === 'object' ? { ...item.options } : {}
      cleaned.push({
        id: id || `widget-${type}-${cleaned.length + 1}`,
        type,
        options,
        layout: { width, height, order: Number.isFinite(order) ? order : 0 },
        version: Number(item?.version ?? 1) || 1,
      })
    })
    return cleaned.length ? cleaned : createDefaultWidgets()
  } catch (err) {
    console.warn('[opsdash] widget layout load failed', err)
    return createDefaultWidgets()
  }
}

watch(
  () => layoutWidgets.value,
  (next) => {
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(WIDGETS_STORAGE_KEY, JSON.stringify(next))
    } catch (err) {
      console.warn('[opsdash] widget layout save failed', err)
    }
  },
  { deep: true },
)

const { exportSidebarConfig, importSidebarConfig } = useConfigExportImport({
  selected,
  groupsById,
  targetsWeek,
  targetsMonth,
  targetsConfig,
  themePreference,
  onboardingState,
  widgets: layoutWidgets,
  setThemePreference,
  postJson,
  route: (name) => route(name),
  performLoad: () => performLoad(),
  notifySuccess,
  notifyError,
})

const { queueSave, isSaving: reportingSaving } = useDashboardPersistence({
  route: (name) => route(name),
  postJson,
  notifyError,
  notifySuccess,
  onReload: () => performLoad(),
  selected,
  groupsById,
  targetsWeek,
  targetsMonth,
  targetsConfig,
  themePreference,
  reportingConfig,
  deckSettings,
  widgets: layoutWidgets,
})

const {
  isSelected,
  toggleCalendar,
  setGroup,
  setTarget,
  updateTargetsConfig,
  selectAll,
} = useDashboardSelection({
  calendars,
  selected,
  groupsById,
  targetsWeek,
  targetsMonth,
  targetsConfig,
  range,
  queueSave,
  userChangedSelection,
})

const {
  presets,
  presetsLoading,
  presetSaving,
  presetApplying,
  presetWarnings,
  refreshPresets,
  savePreset,
  loadPreset,
  deletePreset,
  clearPresetWarnings,
} = useDashboardPresets({
  route: (name, param) => route(name, param),
  getJson,
  postJson,
  deleteJson,
  notifyError,
  notifySuccess,
  queueSave,
  selected,
  groupsById,
  targetsWeek,
  targetsMonth,
  targetsConfig,
  userChangedSelection,
})

const onboardingActions = useOnboardingActions({
  onboardingState,
  route: (name) => route(name),
  postJson,
  notifySuccess,
  notifyError,
  setThemePreference,
  savePreset,
  reloadAfterPersist: () => performLoad(),
})

const {
  autoWizardNeeded,
  manualWizardOpen,
  onboardingRunId,
  onboardingWizardVisible,
  openWizardFromSidebar,
  hasExistingConfig,
  wizardCalendars,
  wizardInitialSelection,
  wizardInitialStrategy,
  wizardInitialAllDayHours,
  wizardInitialTotalHours,
  wizardInitialDeckSettings,
  wizardInitialReportingConfig,
  isOnboardingSaving,
  isSnapshotSaving: isWizardSnapshotSaving,
  snapshotNotice: wizardSnapshotNotice,
  evaluateOnboarding,
  handleWizardComplete,
  handleWizardSkip,
  handleWizardClose,
  handleWizardSaveSnapshot,
} = useOnboardingFlow({
  onboardingState,
  calendars,
  selected,
  targetsConfig,
  deckSettings,
  reportingConfig,
  hasInitialLoad,
  actions: onboardingActions,
})

async function performLoad() {
  await load()
  if (!hasInitialLoad.value) {
    hasInitialLoad.value = true
  }
  evaluateOnboarding()
}

const {
  showCollapsedRangeControls,
  rangeToggleLabel,
  rangeDateLabel,
  loadCurrent,
  toggleRangeCollapsed,
  goPrevious,
  goNext,
} = useRangeToolbar({
  navOpen,
  range,
  offset,
  from,
  to,
  isLoading,
  performLoad: () => performLoad(),
})

function focusSidebarTab(tab: 'notes' | 'config') {
  ensureSidebarVisible()
  sidebarRef.value?.openTab(tab)
}

const {
  shortcutsOpen,
  openShortcuts,
  closeShortcuts,
  shortcutGroups,
} = useKeyboardShortcuts({
  goPrevious,
  goNext,
  toggleRange: toggleRangeCollapsed,
  saveNotes: () => saveNotes(),
  openNotesPanel: () => focusSidebarTab('notes'),
  openConfigPanel: () => focusSidebarTab('config'),
  ensureSidebarVisible,
  onOpen: ({ source }) => trackTelemetry('shortcuts_opened', { source }),
})

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
  showNotes: !!balanceConfigFull.value.ui.showNotes,
}))
const trendLookbackWeeks = computed(() =>
  Math.max(1, Math.min(12, balanceConfigFull.value.trend?.lookbackWeeks ?? 1)),
)

const balanceNote = computed(() => {
  if (!balanceConfigFull.value.ui.showNotes) {
    return ''
  }
  const current = (notesCurrDraft.value ?? '').trim()
  if (current) {
    return current
  }
  const previousNote = (notesPrev.value ?? '').trim()
  return previousNote
})

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

const calendarTodayHours = computed<Record<string, number>>(() => {
  const stacked = calendarChartData.value?.stacked
  if (!stacked || !Array.isArray(stacked.labels) || !Array.isArray(stacked.series)) return {}
  const todayKey = formatDateKey(new Date())
  const idx = stacked.labels.findIndex((label: any) => String(label ?? '') === todayKey)
  if (idx < 0) return {}
  const map: Record<string, number> = {}
  stacked.series.forEach((row: any) => {
    const id = String(row?.id ?? '')
    const raw = Number(row?.data?.[idx] ?? 0)
    const val = Number.isFinite(raw) ? Math.max(0, raw) : 0
    if (!id) return
    map[id] = (map[id] || 0) + val
  })
  return map
})

const categoryTodayHours = computed<Record<string, number>>(() => {
  const stacked = calendarChartData.value?.stacked
  const labels = stacked?.labels
  const series = stacked?.series
  if (!stacked || !Array.isArray(labels) || !Array.isArray(series)) return {}
  const todayKey = formatDateKey(new Date())
  const idx = labels.findIndex((label: any) => String(label ?? '') === todayKey)
  if (idx < 0) return {}
  const map: Record<string, number> = {}
  series.forEach((row: any) => {
    const calId = String(row?.id ?? '')
    const catId = calendarCategoryMap.value?.[calId]
    if (!catId) return
    const raw = Number(row?.data?.[idx] ?? 0)
    const val = Number.isFinite(raw) ? Math.max(0, raw) : 0
    map[catId] = (map[catId] || 0) + val
  })
  return map
})

const calendarGroupsWithToday = computed(() =>
  calendarGroups.value.map((group) => ({
    ...group,
    todayHours: categoryTodayHours.value[group.id] || 0,
  })),
)

const topCategory = computed(() => {
  const groups = calendarGroups.value || []
  if (!groups.length) return null
  const ranked = [...groups].sort((a, b) => (b.summary.actualHours || 0) - (a.summary.actualHours || 0))
  return ranked[0] || null
})

const { timeSummary, activitySummary, activityDayOffTrend } = useSummaries({
  stats,
  byDay,
  charts,
  calendars,
  selected,
  rangeLabel,
  activeDayMode,
  topCategory,
})

const { detailsIndex, toggle: toggleDetails } = useDetailsToggle()
function isDbg(){ return false }

const { iconSrc, onIconError, appVersion, changelogUrl } = useAppMeta({
  pingUrl: () => route('ping'),
  getJson,
  pkgVersion: pkg?.version ? String(pkg.version) : '',
  root,
})

const {
  notesLabelPrev,
  notesLabelCurr,
  notesLabelPrevTitle,
  notesLabelCurrTitle,
} = useNotesLabels(range)
const widgetContext = computed<WidgetRenderContext>(() => ({
  summary: timeSummary.value,
  targetsSummary: targetsSummary.value,
  targetsConfig: targetsConfig.value,
  groups: calendarGroupsWithToday.value,
  balanceOverview: balanceOverview.value,
  balanceConfig: balanceCardConfig.value,
  rangeLabel: rangeLabel.value,
  rangeMode: range.value,
  lookbackWeeks: trendLookbackWeeks.value,
  balanceNote: balanceNote.value,
  activitySummary: activitySummary.value,
  activityConfig: activityCardConfig.value,
  activityDayOffTrend: activityDayOffTrend.value,
  activityTrendUnit: range.value === 'month' ? 'mo' : 'wk',
  activityDayOffLookback: trendLookbackWeeks.value,
  deckBuckets: deckSummaryBuckets.value,
  deckRangeLabel: rangeLabel.value,
  deckLoading: deckLoading.value,
  deckError: deckError.value,
  deckTicker: deckTickerConfig.value,
  deckShowBoardBadges: deckSettings.value?.ticker?.showBoardBadges !== false,
  notesPrev: notesPrev.value,
  notesCurr: notesCurrDraft.value,
  notesLabelPrev: notesLabelPrev.value,
  notesLabelCurr: notesLabelCurr.value,
  notesLabelPrevTitle: notesLabelPrevTitle.value,
  notesLabelCurrTitle: notesLabelCurrTitle.value,
  isSavingNote: isSavingNote.value,
  onSaveNote: () => saveNotes(),
  onUpdateNotes: (val: string) => { notesCurrDraft.value = val },
}))

function n1(v:any){ return Number(v ?? 0).toFixed(1) }
function n2(v:any){ return Number(v ?? 0).toFixed(2) }
function arrow(v:number){ return v>0?'▲':(v<0?'▼':'—') }

function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function setActiveDayMode(mode:'active'|'all'){
  if (activeDayMode.value !== mode) {
    activeDayMode.value = mode
  }
}

function sanitizeDeckFilter(value: DeckFilterMode | string | undefined): DeckFilterMode {
  const allowed: DeckFilterMode[] = [
    'all',
    'mine',
    'open_all',
    'open_mine',
    'done_all',
    'done_mine',
    'archived_all',
    'archived_mine',
  ]
  return allowed.includes(value as DeckFilterMode) ? (value as DeckFilterMode) : 'all'
}

function handleOpenShortcuts(trigger?: HTMLElement | null) {
  openShortcuts(trigger ?? null, 'button')
}

watch(onboardingState, (state) => {
  if (!hasInitialLoad.value) return
  evaluateOnboarding(state)
})


onMounted(async () => {
  console.info('[opsdash] start')
  try {
    await performLoad()
  } catch (err) {
    console.error(err)
    alert('Initial load failed')
  }
  refreshPresets().catch(err => console.warn('[opsdash] presets fetch failed', err))
  // charts handled by components; no global resize wiring
})

watch(range, () => { offset.value = 0; performLoad().catch(console.error) })
</script>

<!-- styles moved to global css/style.css to satisfy strict CSP -->
