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
    <div class="sb-actions">
      <NcButton type="tertiary" :disabled="isLoading" @click="$emit('select-all', true)">All</NcButton>
      <NcButton type="tertiary" :disabled="isLoading" @click="$emit('select-all', false)">None</NcButton>
    </div>
    <div class="sb-tabs" role="tablist" aria-label="Sidebar sections">
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
    </div>

    <div
      v-if="activeTab === 'calendars'"
      id="opsdash-sidebar-pane-calendars"
      class="sb-pane"
      role="tabpanel"
      aria-labelledby="opsdash-sidebar-tab-calendars"
    >
      <div class="sb-hints">
        <div class="sb-title" style="margin:0">Per‑Calendar Settings</div>
        <div class="sb-hintline" title="Gruppe 0 = keine Gruppe; 1–9 = benutzerdefinierte Gruppen"><strong>Group</strong>: 0 = none, 1–9 = custom</div>
        <div class="sb-hintline" title="Zielstunden im aktuellen Bereich (Woche/Monat)"><strong>Target (h)</strong>: hours for current range (week/month)</div>
        <div class="sb-hintline" title="Nur ausgewählte Kalender fließen in die Auswertung">Only selected calendars are used</div>
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

    <div
      v-else
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
  </NcAppNavigation>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NcAppNavigation, NcButton, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import { normalizeTargetsConfig, type TargetsConfig, type TargetsMode } from '../services/targets'
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
}>()

const emit = defineEmits([
  'load','update:range','update:offset','select-all','toggle-calendar','set-group','set-target','update:notes','save-notes','update:targets-config'
])

const activeTab = ref<'calendars'|'targets'>('calendars')

type TargetsPreset = 'work-week'|'balanced-life'

const targets = computed(() => props.targetsConfig)
const categoryOptions = computed(() => targets.value?.categories ?? [])
const canAddCategory = computed(() => nextGroupId() !== null)

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
