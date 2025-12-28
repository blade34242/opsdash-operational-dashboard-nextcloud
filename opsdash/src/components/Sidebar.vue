<template>
  <NcAppNavigation>
    <slot name="actions" />
    <div class="sidebar-header">
      <button
        class="sidebar-toggle-btn"
        type="button"
        @click="$emit('toggle-nav')"
        :aria-label="navToggleLabel"
      >
        {{ navToggleIcon }}
      </button>
    </div>
    <div class="rangebar" title="Time range">
      <div class="range-toggle">
        <NcCheckboxRadioSwitch type="radio" name="range-week" :checked="range==='week'" @update:checked="val => { if (val) $emit('update:range','week') }">Week</NcCheckboxRadioSwitch>
        <NcCheckboxRadioSwitch type="radio" name="range-month" :checked="range==='month'" @update:checked="val => { if (val) $emit('update:range','month') }">Month</NcCheckboxRadioSwitch>
      </div>
      <div class="range-nav">
        <NcButton class="nav-btn" type="tertiary" :disabled="isLoading" @click="$emit('update:offset', offset-1)" title="Previous">◀</NcButton>
        <span class="range-dates">{{ from }} – {{ to }}</span>
        <NcButton class="nav-btn" type="tertiary" :disabled="isLoading" @click="$emit('update:offset', offset+1)" title="Next">▶</NcButton>
      </div>
      <div class="range-refresh">
        <button
          class="sidebar-action-btn"
          type="button"
          :disabled="isLoading"
          @click="$emit('load')"
        >
          Refresh
        </button>
      </div>
    </div>

    <div class="sidebar-shortcuts">
      <NcButton
        type="tertiary"
        size="small"
        class="shortcuts-btn"
        @click="shortcutsOpen = !shortcutsOpen"
      >
        Keyboard shortcuts
      </NcButton>
    </div>

    <div class="sidebar-block">
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
      </div>
      <ol class="onboarding-jumps">
        <li><button type="button" class="link" @click="$emit('rerun-onboarding', 'dashboard')">Dashboard</button></li>
        <li><button type="button" class="link" @click="$emit('rerun-onboarding', 'calendars')">Calendars</button></li>
        <li><button type="button" class="link" @click="$emit('rerun-onboarding', 'categories')">Targets</button></li>
        <li><button type="button" class="link" @click="$emit('rerun-onboarding', 'preferences')">Preferences</button></li>
        <li><button type="button" class="link" @click="$emit('rerun-onboarding', 'review')">Review</button></li>
      </ol>
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
    </div>

    <SidebarProfilesPane
      v-if="props.dashboardMode !== 'quick'"
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
      @export-config="() => emit('export-config')"
      @import-config="(file: File) => emit('import-config', file)"
    />
  </NcAppNavigation>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NcAppNavigation, NcButton, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import SidebarProfilesPane from './sidebar/SidebarProfilesPane.vue'
import { KEYBOARD_SHORTCUT_GROUPS } from '../services/shortcuts'

const props = defineProps<{
  isLoading: boolean
  range: 'week'|'month'
  offset: number
  from: string
  to: string
  navToggleLabel: string
  navToggleIcon: string
  presets: Array<{ name: string; createdAt?: string | null; updatedAt?: string | null; selectedCount: number; calendarCount: number }>
  presetsLoading: boolean
  presetSaving: boolean
  presetApplying: boolean
  presetWarnings: string[]
  dashboardMode?: 'quick' | 'standard' | 'pro'
}>()

const emit = defineEmits([
  'load',
  'update:range',
  'update:offset',
  'toggle-nav',
  'save-preset',
  'load-preset',
  'delete-preset',
  'refresh-presets',
  'clear-preset-warnings',
  'rerun-onboarding',
  'export-config',
  'import-config',
])

const presetsList = computed(() => props.presets ?? [])
const shortcutsOpen = ref(false)
const shortcutGroups = KEYBOARD_SHORTCUT_GROUPS
</script>

<style scoped>
.sidebar-header{
  position:absolute;
  top:8px;
  right:8px;
  z-index:2;
}

.sidebar-toggle-btn{
  appearance:none;
  border-radius:14px;
  border:1px solid color-mix(in oklab, var(--brand), transparent 55%);
  background:color-mix(in oklab, var(--brand), transparent 86%);
  color:var(--brand);
  width:38px;
  height:38px;
  display:flex;
  align-items:center;
  justify-content:center;
  box-shadow:0 6px 14px rgba(15,23,42,0.12);
  cursor:pointer;
  font-size:16px;
}

.sidebar-toggle-btn:hover{
  background:color-mix(in oklab, var(--brand), transparent 76%);
  border-color:color-mix(in oklab, var(--brand), transparent 40%);
}

.sidebar-toggle-btn:focus-visible{
  outline:2px solid color-mix(in oklab, var(--brand), transparent 40%);
  outline-offset:2px;
}

:global(.app-opsdash #app-navigation),
:global(.app-opsdash .app-navigation){
  position:relative;
}

.rangebar{
  margin-top:34px;
}

.sidebar-shortcuts{
  margin:8px 0 4px;
}

.onboarding-jumps{
  display:grid;
  gap:4px;
  margin:6px 0 10px;
  padding-left:18px;
  font-size:12px;
  color: var(--muted, #6b7280);
}

.onboarding-jumps .link{
  background: transparent;
  border: 0;
  padding: 0;
  color: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.onboarding-jumps .link:hover{
  color: var(--color-primary-text);
  text-decoration: underline;
}

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

</style>
