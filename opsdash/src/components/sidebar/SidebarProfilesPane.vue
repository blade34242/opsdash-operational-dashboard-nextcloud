<template>
  <div
    id="opsdash-sidebar-pane-profiles"
    class="sb-pane"
    role="tabpanel"
    aria-labelledby="opsdash-sidebar-tab-profiles"
  >
    <div class="sb-title">Profiles</div>
    <p class="sb-description">
      Export/import full configs or save/load named profiles (calendars, groups, targets, widgets, settings).
    </p>

    <div class="setup-actions">
      <NcButton type="tertiary" size="small" @click="emit('export-config')">
        Export configuration
      </NcButton>
      <NcButton type="tertiary" size="small" @click="triggerImport">
        Import configuration
      </NcButton>
      <input
        ref="fileInput"
        type="file"
        accept="application/json"
        class="import-input"
        @change="onFileChange"
      />
    </div>

    <div class="preset-form">
      <label class="preset-label" for="preset-name">Profile name</label>
      <input
        id="preset-name"
        v-model="presetName"
        type="text"
        placeholder="e.g. Focus week"
        :disabled="isSaving"
        @keyup.enter="onSave"
      />
      <div v-if="nameError" class="preset-error">{{ nameError }}</div>
      <NcButton
        class="preset-save"
        type="primary"
        :disabled="isSaving || !presetName.trim()"
        @click="onSave"
      >
        {{ isSaving ? 'Saving…' : 'Save current configuration' }}
      </NcButton>
    </div>

    <div v-if="warnings.length" class="preset-warnings">
      <div class="warnings-title">Warnings</div>
      <ul>
        <li v-for="(warning, idx) in warnings" :key="idx">{{ warning }}</li>
      </ul>
      <NcButton type="tertiary" class="preset-clear" @click="emit('clear-warnings')">
        Clear warnings
      </NcButton>
    </div>

    <div class="preset-header">
      <h3>Saved profiles</h3>
      <NcButton type="tertiary" :disabled="isLoading" @click="emit('refresh')">
        {{ isLoading ? 'Refreshing…' : 'Refresh list' }}
      </NcButton>
    </div>

    <div v-if="!presets.length && !isLoading" class="preset-empty">
      No profiles yet. Save one above to get started.
    </div>

    <ul v-else class="preset-list">
      <li v-for="preset in presets" :key="preset.name" class="preset-item">
        <div class="preset-meta">
          <div class="preset-name">{{ preset.name }}</div>
          <div class="preset-info">
            <span>{{ preset.selectedCount }} calendars</span>
            <span>{{ preset.calendarCount }} groups</span>
            <span v-if="preset.updatedAt">Updated {{ formatRelative(preset.updatedAt) }}</span>
          </div>
        </div>
        <div class="preset-actions">
          <NcButton
            type="primary"
            :disabled="isApplying"
            @click="onLoad(preset.name)"
          >
            {{ isApplying ? 'Applying…' : 'Load' }}
          </NcButton>
          <NcButton
            type="tertiary"
            :disabled="isApplying"
            @click="onDelete(preset.name)"
          >
            Delete
          </NcButton>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NcButton } from '@nextcloud/vue'

const props = defineProps<{
  presets: Array<{ name: string; createdAt?: string | null; updatedAt?: string | null; selectedCount: number; calendarCount: number }>
  isLoading: boolean
  isSaving: boolean
  isApplying: boolean
  warnings: string[]
}>()

const emit = defineEmits<{
  (e: 'save', name: string): void
  (e: 'load', name: string): void
  (e: 'delete', name: string): void
  (e: 'refresh'): void
  (e: 'clear-warnings'): void
  (e: 'export-config'): void
  (e: 'import-config', file: File): void
}>()

const presetName = ref('')
const nameError = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

function onSave() {
  const trimmed = presetName.value.trim()
  if (!trimmed) {
    nameError.value = 'Enter a profile name'
    return
  }
  nameError.value = null
  emit('save', trimmed)
  presetName.value = ''
}

function onLoad(name: string) {
  emit('load', name)
}

function onDelete(name: string) {
  if (window.confirm(`Delete profile "${name}"?`)) {
    emit('delete', name)
  }
}

function triggerImport() {
  fileInput.value?.click()
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  if (file) {
    emit('import-config', file)
  }
  if (input) {
    input.value = ''
  }
}

function formatRelative(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.round(diffMs / 60000)
  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes} min ago`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.round(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  const diffWeeks = Math.round(diffDays / 7)
  if (diffWeeks < 5) return `${diffWeeks}w ago`
  return date.toLocaleDateString()
}
</script>

<style scoped>
.sb-description{
  font-size:12px;
  color:var(--text-color-tertiary);
  margin:0 0 10px;
}
.setup-actions{
  display:flex;
  gap:8px;
  align-items:center;
  flex-wrap:wrap;
  margin-bottom:12px;
}
.setup-actions .import-input{
  display:none;
}
.preset-form{
  display:flex;
  flex-direction:column;
  gap:6px;
  margin-bottom:12px;
}
.preset-label{
  font-size:12px;
  font-weight:600;
}
.preset-form input{
  width:100%;
  padding:6px 8px;
  border-radius:4px;
  border:1px solid var(--color-border);
  background:var(--color-main-background);
  color:var(--color-main-text);
}
.preset-save{
  align-self:flex-start;
}
.preset-error{
  color:var(--color-error);
  font-size:12px;
}
.preset-warnings{
  border:1px solid var(--color-warning);
  background:color-mix(in srgb,var(--color-warning) 10%,transparent);
  border-radius:6px;
  padding:8px;
  margin-bottom:12px;
}
.warnings-title{
  font-weight:600;
  margin-bottom:4px;
}
.preset-warnings ul{
  padding-left:18px;
  margin:0 0 6px;
}
.preset-clear{
  padding:2px 6px;
}
.preset-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom:6px;
}
.preset-header h3{
  margin:0;
  font-size:15px;
  font-weight:600;
}
.preset-empty{
  font-size:12px;
  color:var(--text-color-tertiary);
}
.preset-list{
  list-style:none;
  padding:0;
  margin:0;
  display:flex;
  flex-direction:column;
  gap:8px;
}
.preset-item{
  border:1px solid rgba(56,189,248,0.55);
  border-radius:6px;
  padding:8px;
  display:flex;
  flex-direction:column;
  gap:6px;
  background:#dff1ff;
  color:var(--color-main-text);
}
.preset-meta{
  display:flex;
  flex-direction:column;
  gap:2px;
}
.preset-name{
  font-weight:600;
}
.preset-info{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  font-size:11px;
  color:var(--color-text-lighter);
}

:global(#opsdash.opsdash-theme-dark .preset-item){
  background:#dff1ff;
  border-color:rgba(56,189,248,0.55);
  color:#0f172a;
}

:global(#opsdash.opsdash-theme-dark .preset-info){
  color:#475569;
}
.preset-actions{
  display:flex;
  gap:6px;
}
</style>
