<template>
  <div
    id="opsdash-sidebar-pane-config"
    class="sb-pane"
    role="tabpanel"
    aria-labelledby="opsdash-sidebar-tab-config"
  >
    <div class="sb-title">Theme</div>
    <p class="sb-description">
      Pick how Opsdash follows Nextcloud themes. Profile management lives under the Profiles tab.
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

  </div>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue'

const props = defineProps<{
  themePreference: 'auto' | 'light' | 'dark'
  effectiveTheme: 'light' | 'dark'
  systemTheme: 'light' | 'dark'
}>()

const { themePreference, effectiveTheme, systemTheme } = toRefs(props)

const emit = defineEmits<{
  (e: 'set-theme-preference', value: 'auto' | 'light' | 'dark'): void
}>()

const systemThemeLabel = computed(() => systemTheme.value === 'dark' ? 'dark' : 'light')
const effectiveThemeLabel = computed(() => effectiveTheme.value === 'dark' ? 'Dark' : 'Light')

function onThemeSelect(value: 'auto' | 'light' | 'dark') {
  emit('set-theme-preference', value)
}

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
