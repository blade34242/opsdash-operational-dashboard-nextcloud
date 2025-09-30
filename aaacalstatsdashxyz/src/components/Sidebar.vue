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
  </NcAppNavigation>
</template>

<script setup lang="ts">
import { NcAppNavigation, NcButton, NcCheckboxRadioSwitch, NcAppNavigationItem } from '@nextcloud/vue'
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
}>()

const emit = defineEmits([
  'load','update:range','update:offset','select-all','toggle-calendar','set-group','set-target','update:notes','save-notes'
])

function getGroup(id:string){
  const n = Number((props.groupsById||{})[id] ?? 0)
  return (isFinite(n) ? Math.max(0, Math.min(9, Math.trunc(n))) : 0)
}

function getTarget(id:string){
  const map = props.range==='month' ? (props.targetsMonth||{}) : (props.targetsWeek||{})
  const n = Number((map as any)[id] ?? '')
  return isFinite(n) ? n : ''
}
</script>
