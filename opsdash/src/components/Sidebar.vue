<template>
  <!-- Sidebar: range controls, calendar selection + grouping, notes panel -->
  <NcAppNavigation>
    <slot name="actions" />
    <div class="sb-title" title="Kalender filtern und gruppieren">Filter Calendars</div>
    <div class="rangebar" title="Time range">
      <div class="range-actions">
        <NcButton class="nav-btn" type="primary" :disabled="isLoading" @click="$emit('load')">Load</NcButton>
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

    <div
      v-if="activeTab === 'calendars'"
      id="opsdash-sidebar-pane-calendars"
      class="sb-pane"
      role="tabpanel"
      aria-labelledby="opsdash-sidebar-tab-calendars"
    >
      <div class="sb-actions">
        <NcButton type="tertiary" :disabled="isLoading" @click="$emit('select-all', true)">All</NcButton>
        <NcButton type="tertiary" :disabled="isLoading" @click="$emit('select-all', false)">None</NcButton>
      </div>
      <div class="sb-hints">
        <div class="sb-title" style="margin:0">Per‑Calendar Settings</div>
        <div class="sb-hintline" title="Use categories to drive targets, balance, and summaries."><strong>Category</strong>: choose how this calendar contributes to targets &amp; balance.</div>
        <div class="sb-hintline" title="Define weekly/monthly goals per calendar. Values sync between ranges."><strong>Target (h)</strong>: goal hours for the active range (week ↔ month converts automatically).</div>
        <div class="sb-hintline" title="Only calendars marked Selected contribute to dashboards and KPIs.">Toggle calendars to include or exclude them from stats.</div>
      </div>
      <div class="sb-list">
        <div v-for="c in calendars" :key="c.id" class="cal-card">
          <div class="cal-card-head" @click="$emit('toggle-calendar', c.id)" :aria-pressed="selected.includes(c.id)" role="button" tabindex="0">
            <span class="color-dot" :style="{background:(c.color||'var(--brand)')}"></span>
            <span class="cal-name">{{ c.displayname || c.id }}</span>
            <span class="cal-state" :class="{ on: selected.includes(c.id) }">{{ selected.includes(c.id) ? 'Selected' : 'Hidden' }}</span>
          </div>
          <div class="cal-fields">
            <label class="field">
              <span class="label">Category</span>
              <select :value="calendarCategoryId(c.id)"
                      @change="(e:any)=> setCalendarCategory(c.id, e?.target?.value)">
                <option value="">Unassigned</option>
                <option v-for="cat in categoryOptions" :key="cat.id" :value="cat.id">{{ cat.label }}</option>
              </select>
            </label>
            <label class="field">
              <span class="label">Target (h)</span>
              <input type="number"
                     :value="getTarget(c.id)"
                     min="0" max="10000" step="0.25" aria-label="Target hours"
                     @input="(e:any)=> $emit('set-target', { id: c.id, h: e?.target?.value })"
                     :title="`Target (${range==='week'?'week':'month'}) in hours`" class="target-input" />
            </label>
          </div>
        </div>
        <div class="hint mt-8">Selection is stored per user.</div>
      </div>

    </div>

    <div
      v-else-if="activeTab === 'targets'"
      id="opsdash-sidebar-pane-targets"
      class="sb-pane"
      role="tabpanel"
      aria-labelledby="opsdash-sidebar-tab-targets"
    >
      <div class="sb-title">Target Settings</div>
      <div class="target-config">
        <div class="field">
          <span class="label">Total target (h)</span>
          <input type="number"
                 :value="targets.totalHours"
                 min="0" max="1000" step="0.5"
                 @input="onTotalTarget(($event.target as HTMLInputElement).value)" />
        </div>
        <div class="preset-buttons">
          <NcButton type="tertiary" @click="applyPreset('work-week')">Preset: Work-Week</NcButton>
          <NcButton type="tertiary" @click="applyPreset('balanced-life')">Preset: Balanced-Life</NcButton>
        </div>
        <div class="target-category" v-for="cat in categoryOptions" :key="cat.id">
          <div class="cat-header">
            <input class="cat-name" type="text" :value="cat.label"
                   @input="setCategoryLabel(cat.id, ($event.target as HTMLInputElement).value)"
                   placeholder="Category name" />
            <button class="remove-cat" type="button" @click="removeCategory(cat.id)" :disabled="categoryOptions.length <= 1" title="Remove category">✕</button>
          </div>
          <div class="cat-fields">
            <label class="field">
              <span class="label">Target (h)</span>
              <input type="number"
                     :value="cat.targetHours"
                     min="0" max="1000" step="0.5"
                     @input="setCategoryTarget(cat.id, ($event.target as HTMLInputElement).value)" />
            </label>
            <label class="field">
              <span class="label">Pace mode</span>
              <select :value="cat.paceMode || targets.pace.mode" @change="setCategoryPaceMode(cat.id, ($event.target as HTMLSelectElement).value)">
                <option value="days_only">Days only</option>
                <option value="time_aware">Time aware</option>
              </select>
            </label>
            <label class="field checkbox">
              <input type="checkbox"
                     :checked="cat.includeWeekend"
                     @change="setCategoryWeekend(cat.id, ($event.target as HTMLInputElement).checked)" />
              <span>Weekend</span>
            </label>
          </div>
        </div>
        <NcButton type="tertiary" class="add-category" :disabled="!canAddCategory" @click="addCategory">Add category</NcButton>
        <div class="target-section">
          <div class="section-title">Pace</div>
          <label class="field checkbox">
            <input type="checkbox"
                   :checked="targets.pace.includeWeekendTotal"
                   @change="setIncludeWeekendTotal(($event.target as HTMLInputElement).checked)" />
            <span>Count weekend in total pace</span>
          </label>
          <label class="field">
            <span class="label">Mode</span>
            <select :value="targets.pace.mode" @change="setPaceMode(($event.target as HTMLSelectElement).value)">
              <option value="days_only">Days only</option>
              <option value="time_aware">Time aware</option>
            </select>
          </label>
          <label class="field">
            <span class="label">On track ≥ gap (%)</span>
            <input type="number"
                   :value="targets.pace.thresholds.onTrack"
                   step="0.1"
                   @input="setThreshold('onTrack', ($event.target as HTMLInputElement).value)" />
          </label>
          <label class="field">
            <span class="label">At risk ≥ gap (%)</span>
            <input type="number"
                   :value="targets.pace.thresholds.atRisk"
                   step="0.1"
                   @input="setThreshold('atRisk', ($event.target as HTMLInputElement).value)" />
          </label>
        </div>
        <div class="target-section">
          <div class="section-title">Forecast</div>
          <label class="field">
            <span class="label">Primary method</span>
            <select :value="targets.forecast.methodPrimary" @change="setForecastMethod(($event.target as HTMLSelectElement).value)">
              <option value="linear">Linear</option>
              <option value="momentum">Momentum</option>
            </select>
          </label>
          <label class="field">
            <span class="label">Momentum window (days)</span>
            <input type="number"
                   :value="targets.forecast.momentumLastNDays"
                   min="1" max="14" step="1"
                   @input="setForecastMomentum(($event.target as HTMLInputElement).value)" />
          </label>
          <label class="field">
            <span class="label">Padding (±h)</span>
            <input type="number"
                   :value="targets.forecast.padding"
                   min="0" step="0.1"
                   @input="setForecastPadding(($event.target as HTMLInputElement).value)" />
          </label>
        </div>
        <div class="target-section">
          <div class="section-title">Display</div>
          <label class="field checkbox">
            <input type="checkbox"
                   :checked="targets.ui.showCalendarCharts"
                   @change="setUiOption('showCalendarCharts', ($event.target as HTMLInputElement).checked)" />
            <span>Show calendar charts</span>
          </label>
          <label class="field checkbox">
            <input type="checkbox"
                   :checked="targets.ui.showCategoryCharts"
                   @change="setUiOption('showCategoryCharts', ($event.target as HTMLInputElement).checked)" />
            <span>Show category charts</span>
          </label>
          <label class="field checkbox">
            <input type="checkbox"
                   :checked="targets.ui.showTotalDelta"
                   @change="setUiOption('showTotalDelta', ($event.target as HTMLInputElement).checked)" />
            <span>Show total delta</span>
          </label>
          <label class="field checkbox">
            <input type="checkbox"
                   :checked="targets.ui.showNeedPerDay"
                   @change="setUiOption('showNeedPerDay', ($event.target as HTMLInputElement).checked)" />
            <span>Show need per day</span>
          </label>
          <label class="field checkbox">
            <input type="checkbox"
                   :checked="targets.ui.showCategoryBlocks"
                   @change="setUiOption('showCategoryBlocks', ($event.target as HTMLInputElement).checked)" />
            <span>Show categories</span>
          </label>
          <label class="field checkbox">
            <input type="checkbox"
                   :checked="targets.ui.badges"
                   @change="setUiOption('badges', ($event.target as HTMLInputElement).checked)" />
            <span>Status badges</span>
          </label>
          <label class="field checkbox">
            <input type="checkbox"
                   :checked="targets.ui.includeWeekendToggle"
                   @change="setUiOption('includeWeekendToggle', ($event.target as HTMLInputElement).checked)" />
            <span>Weekend toggle</span>
          </label>
          <label class="field checkbox">
            <input type="checkbox"
                   :checked="targets.includeZeroDaysInStats"
                   @change="setIncludeZeroDays(($event.target as HTMLInputElement).checked)" />
            <span>Include zero days in pace</span>
          </label>
        </div>
      </div>
    </div>

    <div
      v-else-if="activeTab === 'summary'"
      id="opsdash-sidebar-pane-summary"
      class="sb-pane"
      role="tabpanel"
      aria-labelledby="opsdash-sidebar-tab-summary"
    >
      <div class="sb-title">Time Summary</div>
      <div class="target-config">
        <div class="field">
          <span class="label">Average mode</span>
          <div class="summary-mode-toggle">
            <NcCheckboxRadioSwitch type="radio" name="summary-mode-active" :checked="activeDayMode==='active'" @update:checked="val => { if (val) emitActiveMode('active') }">Active days</NcCheckboxRadioSwitch>
            <NcCheckboxRadioSwitch type="radio" name="summary-mode-all" :checked="activeDayMode==='all'" @update:checked="val => { if (val) emitActiveMode('all') }">All days</NcCheckboxRadioSwitch>
          </div>
        </div>
        <div class="target-section">
          <div class="section-title">Display</div>
          <label class="field checkbox">
            <input type="checkbox"
                   :checked="summaryOptions.showTotal"
                   @change="setSummaryOption('showTotal', ($event.target as HTMLInputElement).checked)" />
            <span>Total hours</span>
          </label>
          <label class="field checkbox">
            <input type="checkbox"
                   :checked="summaryOptions.showAverage"
                   @change="setSummaryOption('showAverage', ($event.target as HTMLInputElement).checked)" />
            <span>Average per day</span>
          </label>
          <label class="field checkbox">
            <input type="checkbox"
                   :checked="summaryOptions.showMedian"
                   @change="setSummaryOption('showMedian', ($event.target as HTMLInputElement).checked)" />
            <span>Median per day</span>
          </label>
          <label class="field checkbox">
            <input type="checkbox"
                   :checked="summaryOptions.showBusiest"
                   @change="setSummaryOption('showBusiest', ($event.target as HTMLInputElement).checked)" />
            <span>Busiest day</span>
          </label>
          <label class="field checkbox">
            <input type="checkbox"
                   :checked="summaryOptions.showWorkday"
                   @change="setSummaryOption('showWorkday', ($event.target as HTMLInputElement).checked)" />
            <span>Workdays row</span>
          </label>
          <label class="field checkbox">
            <input type="checkbox"
                   :checked="summaryOptions.showWeekend"
                   @change="setSummaryOption('showWeekend', ($event.target as HTMLInputElement).checked)" />
            <span>Weekend row</span>
          </label>
          <label class="field checkbox">
            <input type="checkbox"
                   :checked="summaryOptions.showWeekendShare"
                   @change="setSummaryOption('showWeekendShare', ($event.target as HTMLInputElement).checked)" />
            <span>Weekend share</span>
          </label>
          <label class="field checkbox">
            <input type="checkbox"
                   :checked="summaryOptions.showCalendarSummary"
                   @change="setSummaryOption('showCalendarSummary', ($event.target as HTMLInputElement).checked)" />
            <span>Top calendars</span>
          </label>
          <label class="field checkbox">
            <input type="checkbox"
                   :checked="summaryOptions.showTopCategory"
                   @change="setSummaryOption('showTopCategory', ($event.target as HTMLInputElement).checked)" />
            <span>Top category</span>
          </label>
          <label class="field checkbox">
            <input type="checkbox"
                   :checked="summaryOptions.showBalance"
                   @change="setSummaryOption('showBalance', ($event.target as HTMLInputElement).checked)" />
            <span>Balance index</span>
          </label>
        </div>
      </div>
    </div>

    <div
      v-else-if="activeTab === 'activity'"
      id="opsdash-sidebar-pane-activity"
      class="sb-pane"
      role="tabpanel"
      aria-labelledby="opsdash-sidebar-tab-activity"
    >
      <div class="section-title-row">
        <div class="section-title">Activity &amp; Schedule</div>
        <button type="button" class="info-button" :aria-expanded="helpState.activity" aria-label="Activity &amp; Schedule help"
                @click="helpState.activity = !helpState.activity">
          <span>?</span>
        </button>
      </div>
      <p class="section-hint" v-if="helpState.activity">Choose which metrics appear on the Activity &amp; Schedule card.</p>
      <div class="target-section toggle-grid">
        <label class="field checkbox toggle-field" v-for="([key, label]) in activityToggles" :key="key">
          <input type="checkbox"
                 :checked="activitySettings[key]"
                 @change="setActivityOption(key, ($event.target as HTMLInputElement).checked)" />
          <span>{{ label }}</span>
        </label>
      </div>
    </div>

    <div
      v-else-if="activeTab === 'balance'"
      id="opsdash-sidebar-pane-balance"
      class="sb-pane"
      role="tabpanel"
      aria-labelledby="opsdash-sidebar-tab-balance"
    >
      <div class="section-title-row">
        <div class="section-title subtitle">Balance Overview</div>
        <button type="button" class="info-button" :aria-expanded="helpState.balanceThresholds || helpState.balanceTrend || helpState.balanceDisplay"
                aria-label="Balance Overview help" @click="helpState.balanceThresholds = helpState.balanceTrend = helpState.balanceDisplay = !helpState.balanceThresholds">
          <span>?</span>
        </button>
      </div>
      <div class="target-section">
        <div class="section-title-row">
          <div class="section-subtitle subtitle">Thresholds</div>
          <button type="button" class="info-button" :aria-expanded="helpState.balanceThresholds" aria-label="Thresholds help"
                  @click="helpState.balanceThresholds = !helpState.balanceThresholds">
            <span>?</span>
          </button>
        </div>
        <p class="section-hint" v-if="helpState.balanceThresholds">Set the share/index limits that trigger balance warnings.</p>
        <div class="field-grid">
          <label class="field">
            <span class="label">Notice max share</span>
            <input type="number" min="0" max="1" step="0.01"
                   :value="balanceSettings.thresholds.noticeMaxShare"
                   @input="setBalanceThreshold('noticeMaxShare', ($event.target as HTMLInputElement).value)" />
          </label>
          <label class="field">
            <span class="label">Warn max share</span>
            <input type="number" min="0" max="1" step="0.01"
                   :value="balanceSettings.thresholds.warnMaxShare"
                   @input="setBalanceThreshold('warnMaxShare', ($event.target as HTMLInputElement).value)" />
          </label>
          <label class="field">
            <span class="label">Warn index</span>
            <input type="number" min="0" max="1" step="0.01"
                   :value="balanceSettings.thresholds.warnIndex"
                   @input="setBalanceThreshold('warnIndex', ($event.target as HTMLInputElement).value)" />
          </label>
        </div>
      </div>
      <div class="target-section">
        <div class="section-title-row">
          <div class="section-subtitle subtitle">Trend &amp; Relations</div>
          <button type="button" class="info-button" :aria-expanded="helpState.balanceTrend" aria-label="Trend help"
                  @click="helpState.balanceTrend = !helpState.balanceTrend">
            <span>?</span>
          </button>
        </div>
        <p class="section-hint" v-if="helpState.balanceTrend">Control the comparison window and how ratios are expressed.</p>
        <div class="field-grid">
          <label class="field">
            <span class="label">Relation display</span>
            <select :value="balanceSettings.relations.displayMode"
                    @change="setBalanceRelation(($event.target as HTMLSelectElement).value)">
              <option value="ratio">Ratio (A : B)</option>
              <option value="factor">Factor (A×)</option>
            </select>
          </label>
          <label class="field">
            <span class="label">Trend lookback (weeks)</span>
            <input type="number" min="1" max="12" step="1"
                   :value="balanceSettings.trend.lookbackWeeks"
                   @input="setBalanceLookback(($event.target as HTMLInputElement).value)" />
          </label>
        </div>
      </div>
      <div class="target-section">
        <div class="section-title-row">
          <div class="section-subtitle subtitle">Display</div>
          <button type="button" class="info-button" :aria-expanded="helpState.balanceDisplay" aria-label="Display help"
                  @click="helpState.balanceDisplay = !helpState.balanceDisplay">
            <span>?</span>
          </button>
        </div>
        <p class="section-hint" v-if="helpState.balanceDisplay">Toggle optional insights and adjust rounding for the card values.</p>
        <div class="toggle-grid">
          <label class="field checkbox toggle-field">
            <input type="checkbox"
                   :checked="balanceSettings.ui.showInsights"
                   @change="setBalanceUiToggle('showInsights', ($event.target as HTMLInputElement).checked)" />
            <span>Insights</span>
          </label>
          <label class="field checkbox toggle-field">
            <input type="checkbox"
                   :checked="balanceSettings.ui.showDailyStacks"
                   @change="setBalanceUiToggle('showDailyStacks', ($event.target as HTMLInputElement).checked)" />
            <span>Daily mix (experimental)</span>
          </label>
        </div>
        <div class="field-grid mt-8">
          <label class="field">
            <span class="label">Percent precision</span>
            <select :value="balanceSettings.ui.roundPercent"
                    @change="setBalanceUiPrecision('roundPercent', ($event.target as HTMLSelectElement).value)">
              <option v-for="n in roundingOptions" :key="`round-percent-${n}`" :value="n">{{ n }}</option>
            </select>
          </label>
          <label class="field">
            <span class="label">Ratio precision</span>
            <select :value="balanceSettings.ui.roundRatio"
                    @change="setBalanceUiPrecision('roundRatio', ($event.target as HTMLSelectElement).value)">
              <option v-for="n in roundingOptions" :key="`round-ratio-${n}`" :value="n">{{ n }}</option>
            </select>
          </label>
        </div>
      </div>
    </div>

    <div
      v-else-if="activeTab === 'notes'"
      id="opsdash-sidebar-pane-notes"
      class="sb-pane"
      role="tabpanel"
      aria-labelledby="opsdash-sidebar-tab-notes"
    >
      <div class="sb-title">Notes</div>
      <NotesPanel
        :previous="notesPrev"
        :model-value="notesCurrDraft"
        :prev-label="notesLabelPrev"
        :curr-label="notesLabelCurr"
        :prev-title="notesLabelPrevTitle"
        :curr-title="notesLabelCurrTitle"
        :saving="isSavingNote"
        @update:modelValue="(v:string)=> $emit('update:notes', v)"
        @save="$emit('save-notes')"
      />
    </div>
  </NcAppNavigation>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import { NcAppNavigation, NcButton, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import { normalizeTargetsConfig, createDefaultActivityCardConfig, createDefaultBalanceConfig, type ActivityCardConfig, type BalanceConfig, type TargetsConfig, type TargetsMode } from '../services/targets'
import NotesPanel from './NotesPanel.vue'

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
}>()

const emit = defineEmits([
  'load','update:range','update:offset','select-all','toggle-calendar','set-group','set-target','update:notes','save-notes','update:targets-config','update:active-mode'
])

const activeTab = ref<'calendars'|'targets'|'summary'|'activity'|'balance'|'notes'>('calendars')

type TargetsPreset = 'work-week'|'balanced-life'

const targets = computed(() => props.targetsConfig)
const categoryOptions = computed(() => targets.value?.categories ?? [])
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

function updateConfig(mutator: (cfg: TargetsConfig)=>void){
  const next = normalizeTargetsConfig(JSON.parse(JSON.stringify(props.targetsConfig || {})) as TargetsConfig)
  mutator(next)
  emit('update:targets-config', next)
}

function onTotalTarget(value: string){
  const num = clampNumber(value, 0, 1000, 0.5)
  updateConfig(cfg => { cfg.totalHours = num })
}

function setCategoryTarget(id: string, value: string){
  const num = clampNumber(value, 0, 1000, 0.5)
  updateCategory(id, cat => { cat.targetHours = num })
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
  const num = clampNumber(value, -100, 100, 0.1)
  updateConfig(cfg => { cfg.pace.thresholds[which] = num })
}

function setBalanceThreshold(which: 'noticeMaxShare' | 'warnMaxShare' | 'warnIndex', value: string){
  const num = clampNumber(value, 0, 1, 0.01)
  updateConfig(cfg => {
    cfg.balance.thresholds[which] = Number(num.toFixed(2))
  })
}

function setBalanceRelation(mode: string){
  const resolved = mode === 'factor' ? 'factor' : 'ratio'
  updateConfig(cfg => {
    cfg.balance.relations.displayMode = resolved
  })
}

function setBalanceLookback(value: string){
  let num = Number(value)
  if (!Number.isFinite(num)) num = balanceSettings.value.trend.lookbackWeeks
  num = Math.round(num)
  num = Math.max(1, Math.min(12, num))
  updateConfig(cfg => {
    cfg.balance.trend.lookbackWeeks = num
  })
}

function setBalanceUiToggle(key: 'showInsights' | 'showDailyStacks', checked: boolean){
  updateConfig(cfg => {
    cfg.balance.ui[key] = checked
  })
}

function setBalanceUiPrecision(key: 'roundPercent' | 'roundRatio', value: string){
  let num = Number(value)
  if (!Number.isFinite(num)) num = balanceSettings.value.ui[key]
  num = Math.max(0, Math.min(3, Math.round(num)))
  updateConfig(cfg => {
    cfg.balance.ui[key] = num
  })
}

function setForecastMethod(value: string){
  const method = value === 'momentum' ? 'momentum' : 'linear'
  updateConfig(cfg => { cfg.forecast.methodPrimary = method })
}

function setForecastMomentum(value: string){
  const raw = Number(value)
  const n = Number.isFinite(raw) ? Math.round(raw) : targets.value.forecast.momentumLastNDays
  const clamped = Math.min(14, Math.max(1, n))
  updateConfig(cfg => { cfg.forecast.momentumLastNDays = clamped })
}

function setForecastPadding(value: string){
  const num = clampNumber(value, 0, 100, 0.1)
  updateConfig(cfg => { cfg.forecast.padding = num })
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

function clampNumber(value: string, min: number, max: number, step: number){
  const num = Number(value)
  if (!isFinite(num)) return min
  const clamped = Math.min(max, Math.max(min, num))
  const rounded = Math.round(clamped / step) * step
  return Number(rounded.toFixed(2))
}
</script>
