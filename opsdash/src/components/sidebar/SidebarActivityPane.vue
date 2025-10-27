<template>
  <div
    id="opsdash-sidebar-pane-activity"
    class="sb-pane"
    role="tabpanel"
    aria-labelledby="opsdash-sidebar-tab-activity"
  >
    <div class="section-title-row">
      <div class="section-title">Activity &amp; Schedule</div>
      <button
        type="button"
        class="info-button"
        :aria-expanded="helpOpen"
        aria-label="Activity &amp; Schedule help"
        @click="emit('toggle-help')"
      >
        <span>?</span>
      </button>
    </div>
    <p class="section-hint" v-if="helpOpen">Choose which metrics appear on the Activity &amp; Schedule card.</p>
    <div class="target-section toggle-grid">
      <label
        v-for="[key, label] in activityToggles"
        :key="key"
        class="field checkbox toggle-field"
      >
        <input
          type="checkbox"
          :checked="activitySettings[key]"
          @change="emit('toggle-option', { key, value: ($event.target as HTMLInputElement).checked })"
        />
        <span>{{ label }}</span>
      </label>
    </div>
    <div class="forecast-block">
      <div class="section-title">Bar chart projection</div>
      <label class="field">
        <span class="label">Projection mode</span>
        <select
          :value="forecastMode"
          @change="onForecastModeChange(($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="option in forecastOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </label>
      <p v-if="forecastDescription" class="section-hint forecast-hint">
        {{ forecastDescription }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue'
import type { ActivityCardConfig, ActivityForecastMode } from '../../services/targets'

type ActivityToggleKey = Exclude<keyof ActivityCardConfig, 'forecastMode'>
type ForecastOption = { value: ActivityForecastMode; label: string; description?: string }

const rawProps = defineProps<{
  activitySettings: ActivityCardConfig
  activityToggles: Array<[ActivityToggleKey, string]>
  forecastMode: ActivityForecastMode
  forecastOptions: ForecastOption[]
  helpOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-help'): void
  (e: 'toggle-option', payload: { key: ActivityToggleKey; value: boolean }): void
  (e: 'update-forecast-mode', mode: ActivityForecastMode): void
}>()

const { activitySettings, activityToggles, forecastMode, forecastOptions, helpOpen } = toRefs(rawProps)

const forecastDescription = computed(() => {
  const selected = forecastOptions.value?.find((opt) => opt.value === forecastMode.value)
  return selected?.description ?? ''
})

function onForecastModeChange(mode: string) {
  if (mode === 'off' || mode === 'total' || mode === 'calendar' || mode === 'category') {
    emit('update-forecast-mode', mode)
  }
}
</script>

<style scoped>
.forecast-block {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.forecast-block .field {
  max-width: 100%;
}
.forecast-block select {
  width: 100%;
}
.forecast-hint {
  margin: 0;
}
</style>
