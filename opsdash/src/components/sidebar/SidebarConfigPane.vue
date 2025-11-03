<template>
  <div
    id="opsdash-sidebar-pane-config"
    class="sb-pane"
    role="tabpanel"
    aria-labelledby="opsdash-sidebar-tab-config"
  >
    <div class="sb-title">Configuration Profiles</div>
    <p class="sb-description">
      Save and restore complete sidebar configurations (calendars, groups, targets, settings).
    </p>

    <div class="theme-section">
      <div class="theme-header">
        <div class="theme-title">Theme &amp; appearance</div>
        <div class="theme-hint">Currently showing {{ effectiveThemeLabel }}</div>
      </div>
      <div class="theme-options" role="radiogroup" aria-label="Theme preference">
        <label class="theme-option">
          <input
            type="radio"
            name="opsdash-theme-preference"
            value="auto"
            :checked="themePreference === 'auto'"
            @change="onThemeSelect('auto')"
          />
          <div class="theme-copy">
            <div class="theme-option__title">Follow Nextcloud</div>
            <div class="theme-option__desc">Match account theme (currently {{ systemThemeLabel }}).</div>
          </div>
        </label>
        <label class="theme-option">
          <input
            type="radio"
            name="opsdash-theme-preference"
            value="light"
            :checked="themePreference === 'light'"
            @change="onThemeSelect('light')"
          />
          <div class="theme-copy">
            <div class="theme-option__title">Force light</div>
            <div class="theme-option__desc">Use the light palette even when Nextcloud switches to dark.</div>
          </div>
        </label>
        <label class="theme-option">
          <input
            type="radio"
            name="opsdash-theme-preference"
            value="dark"
            :checked="themePreference === 'dark'"
            @change="onThemeSelect('dark')"
          />
          <div class="theme-copy">
            <div class="theme-option__title">Force dark</div>
            <div class="theme-option__desc">Keep Opsdash in dark mode, even if Nextcloud stays light.</div>
          </div>
        </label>
      </div>
    </div>

    <div class="setup-actions">
      <NcButton
        type="primary"
        size="small"
        class="rerun-btn"
        title="Open the onboarding setup again"
        @click="emit('rerun-onboarding')"
      >
        Re-run onboarding
      </NcButton>
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
import { ref, onMounted, computed, toRefs } from 'vue'
import { NcButton } from '@nextcloud/vue'

const props = defineProps<{
  presets: Array<{ name: string; createdAt?: string | null; updatedAt?: string | null; selectedCount: number; calendarCount: number }>
  isLoading: boolean
  isSaving: boolean
  isApplying: boolean
  warnings: string[]
  themePreference: 'auto' | 'light' | 'dark'
  effectiveTheme: 'light' | 'dark'
  systemTheme: 'light' | 'dark'
}>()

const { themePreference, effectiveTheme, systemTheme } = toRefs(props)

const emit = defineEmits<{
  (e: 'save', name: string): void
  (e: 'load', name: string): void
  (e: 'delete', name: string): void
  (e: 'refresh'): void
  (e: 'clear-warnings'): void
  (e: 'rerun-onboarding'): void
  (e: 'set-theme-preference', value: 'auto' | 'light' | 'dark'): void
}>()

const presetName = ref('')
const nameError = ref<string | null>(null)

const systemThemeLabel = computed(() => systemTheme.value === 'dark' ? 'dark' : 'light')
const effectiveThemeLabel = computed(() => effectiveTheme.value === 'dark' ? 'Dark' : 'Light')

function onThemeSelect(value: 'auto' | 'light' | 'dark') {
  emit('set-theme-preference', value)
}

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
  if (diffHours < 24) return `${diffHours} h ago`
  const diffDays = Math.round(diffHours / 24)
  if (diffDays < 7) return `${diffDays} d ago`
  return date.toLocaleDateString()
}

onMounted(() => {
  emit('refresh')
})
</script>

<style scoped>
.sb-title {
  font-weight: 600;
  margin-bottom: 6px;
}
.sb-description {
  font-size: 12px;
  color: var(--text-color-tertiary);
  margin: 0 0 10px;
}
.preset-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
.setup-actions {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 12px;
}
.rerun-btn {
  font-size: 12px;
}
.preset-label {
  font-size: 12px;
  font-weight: 600;
}
.preset-form input {
  width: 100%;
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background: var(--color-main-background);
  color: var(--color-main-text);
}
.preset-save {
  align-self: flex-start;
}
.preset-error {
  color: var(--color-error);
  font-size: 12px;
}
.preset-warnings {
  border: 1px solid var(--color-warning);
  background: color-mix(in srgb, var(--color-warning) 10%, transparent);
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 12px;
}
.warnings-title {
  font-weight: 600;
  margin-bottom: 4px;
}
.preset-warnings ul {
  padding-left: 18px;
  margin: 0 0 6px;
}
.preset-clear {
  padding: 2px 6px;
}
.preset-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.preset-header h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}
.preset-empty {
  font-size: 12px;
  color: var(--text-color-tertiary);
}
.preset-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.preset-item {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--color-main-background);
}
.preset-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.preset-name {
  font-weight: 600;
}
.preset-info {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 11px;
  color: var(--text-color-tertiary);
}
.preset-actions {
  display: flex;
  gap: 6px;
}
.theme-section {
  border: 1px solid color-mix(in oklab, var(--line), transparent 30%);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 16px;
  background: color-mix(in oklab, var(--card), transparent 6%);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.theme-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.theme-title {
  font-weight: 600;
  font-size: 13px;
  color: var(--fg);
}
.theme-hint {
  font-size: 11px;
  color: var(--muted);
}
.theme-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.theme-option {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in oklab, var(--line), transparent 40%);
  background: color-mix(in oklab, var(--card), transparent 8%);
}
.theme-option input[type="radio"] {
  margin-top: 4px;
}
.theme-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
}
.theme-option__title {
  font-weight: 600;
  color: var(--fg);
}
.theme-option__desc {
  color: var(--muted);
}
</style>
