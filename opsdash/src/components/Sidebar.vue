<template>
  <!-- Sidebar: range controls, calendar selection + grouping, notes panel -->
  <NcAppNavigation>
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
            <span class="label">Group</span>
            <input type="number"
                   :value="getGroup(c.id)"
                   min="0" max="9" step="1" aria-label="Calendar group"
                   @input="(e:any)=> $emit('set-group', { id: c.id, n: e?.target?.value })"
                   title="Group 0–9 (0 = none)" class="group-input" />
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
      <div class="target-category" v-for="cat in targets.categories" :key="cat.id">
        <div class="cat-header">{{ cat.label }}</div>
        <div class="cat-fields">
          <label class="field">
            <span class="label">Target (h)</span>
            <input type="number"
                   :value="cat.targetHours"
                   min="0" max="1000" step="0.5"
                   @input="setCategoryTarget(cat.id, ($event.target as HTMLInputElement).value)" />
          </label>
          <label class="field">
            <span class="label">Group</span>
            <input type="number"
                   :value="cat.groupIds && cat.groupIds.length ? cat.groupIds[0] : ''"
                   min="0" max="9" step="1"
                   @input="setCategoryGroup(cat.id, ($event.target as HTMLInputElement).value)" />
          </label>
          <label class="field checkbox">
            <input type="checkbox"
                   :checked="cat.includeWeekend"
                   @change="setCategoryWeekend(cat.id, ($event.target as HTMLInputElement).checked)" />
            <span>Weekend</span>
          </label>
        </div>
      </div>
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
  </NcAppNavigation>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NcAppNavigation, NcButton, NcCheckboxRadioSwitch, NcAppNavigationItem } from '@nextcloud/vue'
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

type TargetsPreset = 'work-week'|'balanced-life'

const targets = computed(() => props.targetsConfig)

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
  updateConfig(cfg => {
    const cat = cfg.categories.find(c=>c.id===id)
    if (cat) cat.targetHours = num
  })
}

function setCategoryGroup(id: string, value: string){
  const num = clampNumber(value, 0, 9, 1)
  updateConfig(cfg => {
    const cat = cfg.categories.find(c=>c.id===id)
    if (cat) cat.groupIds = Number.isFinite(num) ? [Math.trunc(num)] : []
  })
}

function setCategoryWeekend(id: string, checked: boolean){
  updateConfig(cfg => {
    const cat = cfg.categories.find(c=>c.id===id)
    if (cat) cat.includeWeekend = checked
  })
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

function clampNumber(value: string, min: number, max: number, step: number){
  const num = Number(value)
  if (!isFinite(num)) return min
  const clamped = Math.min(max, Math.max(min, num))
  const rounded = Math.round(clamped / step) * step
  return Number(rounded.toFixed(2))
}
</script>
