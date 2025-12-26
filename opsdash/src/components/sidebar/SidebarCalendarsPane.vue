<template>
  <div
    id="opsdash-sidebar-pane-calendars"
    class="sb-pane"
    role="tabpanel"
    aria-labelledby="opsdash-sidebar-tab-calendars"
  >
    <div class="sb-actions sb-actions--secondary">
      <NcButton
        type="primary"
        size="small"
        class="rerun-btn"
        title="Open the onboarding setup again"
        @click="$emit('rerun-onboarding')"
      >
        Re-run onboarding
      </NcButton>
      <div class="shortcuts-wrap">
        <NcButton
          type="tertiary"
          size="small"
          class="shortcuts-btn"
          @click="onOpenShortcuts"
        >
          Keyboard shortcuts
        </NcButton>
      </div>
    </div>
    <div class="onboarding-jumps">
      <button type="button" class="ghost sm" @click="$emit('rerun-onboarding', 'dashboard')">Dashboard</button>
      <button type="button" class="ghost sm" @click="$emit('rerun-onboarding', 'calendars')">Calendars</button>
      <button type="button" class="ghost sm" @click="$emit('rerun-onboarding', 'categories')">Targets</button>
      <button type="button" class="ghost sm" @click="$emit('rerun-onboarding', 'preferences')">Preferences</button>
      <button type="button" class="ghost sm" @click="$emit('rerun-onboarding', 'review')">Review</button>
    </div>
    <div v-if="shortcutsOpen" class="shortcuts-box" role="region" aria-label="Keyboard shortcuts">
      <div class="shortcuts-box__header">
        <span>Keyboard shortcuts</span>
        <button type="button" class="ghost sm" @click="shortcutsOpen = false">✕</button>
      </div>
      <div class="shortcuts-box__body">
        <div v-for="group in shortcutGroups" :key="group.id" class="shortcuts-box__group">
          <div class="shortcuts-box__title">{{ group.title }}</div>
          <ul>
            <li v-for="item in group.items" :key="item.id">
              <span class="label">{{ item.label }}</span>
              <span class="combo">{{ item.combo.join(' + ') }}</span>
              <span v-if="item.description" class="desc">{{ item.description }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div class="sb-context">
      <div class="sb-title">Trend lookback (global)</div>
      <div class="sb-inline">
        <input
          type="number"
          min="1"
          max="6"
          step="1"
          :value="lookbackWeeks"
          aria-label="Trend lookback weeks"
          @input="$emit('update-lookback', ($event.target as HTMLInputElement).value)"
        />
        <span class="sb-inline__label">weeks / months</span>
      </div>
      <div v-if="lookbackMessage" :class="['input-message', lookbackMessage.tone]">
        {{ lookbackMessage.text }}
      </div>
    </div>
    <div class="sb-list">
      <div v-for="c in calendars" :key="c.id" class="cal-card">
        <div
          class="cal-card-head"
          role="button"
          tabindex="0"
          :aria-pressed="selected.includes(c.id)"
          @click="$emit('toggle-calendar', c.id)"
        >
          <span class="color-dot" :style="{ background: (c.color || 'var(--brand)') }"></span>
          <span class="cal-name">{{ c.displayname || c.id }}</span>
          <span class="cal-state" :class="{ on: selected.includes(c.id) }">
            {{ selected.includes(c.id) ? 'Selected' : 'Hidden' }}
          </span>
        </div>
        <div class="cal-fields">
          <label class="field">
            <span class="label">Category</span>
            <select
              :value="calendarCategoryId(c.id)"
              @change="$emit('set-category', { id: c.id, category: ($event.target as HTMLSelectElement).value })"
            >
              <option value="">Unassigned</option>
              <option v-for="cat in categoryOptions" :key="cat.id" :value="cat.id">
                {{ cat.label }}
              </option>
            </select>
          </label>
          <label class="field">
            <span class="label">Target (h)</span>
            <input
              type="number"
              :value="getTarget(c.id)"
              min="0"
              max="10000"
              step="0.25"
              aria-label="Target hours"
              :title="`Target (${range === 'week' ? 'week' : 'month'}) in hours`"
              :aria-invalid="!!calendarTargetMessages[c.id]"
              class="target-input"
              @input="$emit('target-input', { id: c.id, value: ($event.target as HTMLInputElement).value })"
            />
            <div
              v-if="calendarTargetMessages[c.id]"
              :class="['input-message', calendarTargetMessages[c.id]?.tone]"
            >
              {{ calendarTargetMessages[c.id]?.text }}
            </div>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NcButton } from '@nextcloud/vue'
import { ref, toRefs } from 'vue'
import { KEYBOARD_SHORTCUT_GROUPS } from '../../services/shortcuts'

type InputMessage = { text: string; tone: 'error' | 'warning' }
const props = defineProps<{
  calendars: Array<any>
  selected: string[]
  range: 'week' | 'month'
  isLoading: boolean
  categoryOptions: Array<{ id: string; label: string }>
  calendarTargetMessages: Record<string, InputMessage | null>
  calendarCategoryId: (id: string) => string
  getTarget: (id: string) => number | string
  lookbackWeeks: number
  lookbackMessage?: InputMessage | null
}>()

const emit = defineEmits<{
  (e: 'toggle-calendar', id: string): void
  (e: 'set-category', payload: { id: string; category: string }): void
  (e: 'target-input', payload: { id: string; value: string }): void
  (e: 'rerun-onboarding', step?: string): void
  (e: 'open-shortcuts', trigger?: HTMLElement | null): void
  (e: 'update-lookback', value: string): void
}>()

// Important: keep props reactive in template; avoid plain destructuring
// Only convert reactive fields with toRefs; call function props directly
const {
  calendars,
  selected,
  range,
  isLoading,
  categoryOptions,
  calendarTargetMessages,
  lookbackWeeks,
  lookbackMessage,
} = toRefs(props)
const calendarCategoryId = (id: string) => props.calendarCategoryId(id)
const getTarget = (id: string) => props.getTarget(id)

const shortcutsOpen = ref(false)
const shortcutGroups = KEYBOARD_SHORTCUT_GROUPS

function onOpenShortcuts(event: MouseEvent) {
  shortcutsOpen.value = !shortcutsOpen.value
}
</script>

<style scoped>
.shortcuts-box{
  margin:8px 0 12px;
  background:color-mix(in oklab, #111827, #1f2937 60%);
  border:1px solid color-mix(in oklab, #4b5563, transparent 20%);
  border-radius:10px;
  box-shadow:0 10px 18px rgba(0,0,0,0.18);
  padding:10px;
}
.shortcuts-box__header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  font-size:12px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:0.04em;
  color:#cbd5f5;
  margin-bottom:8px;
}
.shortcuts-box__body{
  display:flex;
  flex-direction:column;
  gap:10px;
}
.shortcuts-box__title{
  font-size:11px;
  font-weight:700;
  color:#9ca3af;
  text-transform:uppercase;
  letter-spacing:0.04em;
  margin-bottom:4px;
}
.shortcuts-box__group ul{
  list-style:none;
  padding:0;
  margin:0;
  display:flex;
  flex-direction:column;
  gap:6px;
}
.shortcuts-box__group li{
  display:grid;
  grid-template-columns: 1fr auto;
  gap:6px 10px;
  align-items:center;
  color:#e5e7eb;
  font-size:12px;
}
.shortcuts-box__group .combo{
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size:11px;
  background:rgba(15, 23, 42, 0.8);
  border-radius:6px;
  padding:2px 6px;
  color:#f8fafc;
}
.shortcuts-box__group .desc{
  grid-column: 1 / -1;
  color:#94a3b8;
  font-size:11px;
}
.forecast-block select {
  width: 100%;
}
.section-hint {
  background: var(--color-background-hover, rgba(0, 0, 0, 0.05));
  border: 1px solid var(--color-border, #d1d5db);
  border-left: 4px solid var(--color-primary-element, #2563eb);
  border-radius: 8px;
  padding: 10px 12px;
  margin: 6px 0 10px;
  color: var(--color-text-maxcontrast, inherit);
  box-shadow: 0 1px 2px var(--color-box-shadow, rgba(0, 0, 0, 0.08));
}
.section-hint.compact {
  margin: 4px 0 6px;
  padding: 8px 10px;
}
.hint-title {
  display: block;
  font-weight: 600;
  margin-bottom: 2px;
}
.hint-body {
  display: block;
  line-height: 1.4;
}
.field .label {
  font-weight: 600;
  color: var(--color-text-maxcontrast, inherit);
}
.field input[type='number'],
.field select {
  border-radius: 6px;
  padding: 6px 8px;
  border: 1px solid var(--color-border, #d1d5db);
  background: var(--color-main-background, #fff);
  color: var(--color-text-maxcontrast, inherit);
}
.field input[disabled],
.field select[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}
.input-message.warning {
  color: var(--warning, #f97316);
}
.input-message.error {
  color: var(--neg, #dc2626);
}
.field-grid {
  align-items: start;
}
.sb-actions--secondary {
  margin-top: 8px;
  flex-wrap: wrap;
  gap: 6px;
}
.onboarding-jumps{
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  margin:6px 0 10px;
}
.sb-inline{
  display:flex;
  align-items:center;
  gap:8px;
}
.sb-inline input{
  width:72px;
}
.sb-inline__label{
  font-size:12px;
  color: var(--muted, #6b7280);
}
</style>
