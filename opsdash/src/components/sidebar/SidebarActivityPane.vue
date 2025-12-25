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
  </div>
</template>

<script setup lang="ts">
import { toRefs } from 'vue'
import type { ActivityCardConfig } from '../../services/targets'

type ActivityToggleKey = Exclude<keyof ActivityCardConfig, 'forecastMode'>
const rawProps = defineProps<{
  activitySettings: ActivityCardConfig
  activityToggles: Array<[ActivityToggleKey, string]>
  helpOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-help'): void
  (e: 'toggle-option', payload: { key: ActivityToggleKey; value: boolean }): void
}>()

const { activitySettings, activityToggles, helpOpen } = toRefs(rawProps)
</script>

<style scoped>
</style>
