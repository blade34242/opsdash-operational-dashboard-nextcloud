<template>
  <div
    id="opsdash-sidebar-pane-summary"
    class="sb-pane"
    role="tabpanel"
    aria-labelledby="opsdash-sidebar-tab-summary"
  >
    <div class="sb-title">Time Summary</div>
    <div class="target-config">
      <div class="field">
        <span class="label">Average mode</span>
        <div class="summary-mode-toggle">
          <NcCheckboxRadioSwitch
            type="radio"
            name="summary-mode-active"
            :checked="activeDayMode === 'active'"
            @update:checked="val => { if (val) emit('update:activeMode', 'active') }"
          >
            Active days
          </NcCheckboxRadioSwitch>
          <NcCheckboxRadioSwitch
            type="radio"
            name="summary-mode-all"
            :checked="activeDayMode === 'all'"
            @update:checked="val => { if (val) emit('update:activeMode', 'all') }"
          >
            All days
          </NcCheckboxRadioSwitch>
        </div>
      </div>
      <div class="target-section">
        <div class="section-title">Display</div>
        <label
          v-for="toggle in toggles"
          :key="toggle.key"
          class="field checkbox"
        >
          <input
            type="checkbox"
            :checked="resolvedSummaryOptions[toggle.key]"
            @change="emit('toggle-option', { key: toggle.key, value: ($event.target as HTMLInputElement).checked })"
          />
          <span>{{ toggle.label }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NcCheckboxRadioSwitch } from '@nextcloud/vue'
import type { TargetsConfig } from '../../services/targets'

const props = defineProps<{
  summaryOptions: TargetsConfig['timeSummary']
  activeDayMode: 'active' | 'all'
}>()

const emit = defineEmits<{
  (e: 'update:activeMode', mode: 'active' | 'all'): void
  (e: 'toggle-option', payload: { key: keyof TargetsConfig['timeSummary']; value: boolean }): void
}>()

const defaultSummaryOptions: TargetsConfig['timeSummary'] = {
  showTotal: true,
  showAverage: true,
  showMedian: true,
  showBusiest: true,
  showWorkday: true,
  showWeekend: true,
  showWeekendShare: true,
  showCalendarSummary: true,
  showTopCategory: true,
  showBalance: true,
}

const resolvedSummaryOptions = computed(() => ({
  ...defaultSummaryOptions,
  ...(props.summaryOptions ?? {}),
}))

const toggles = [
  { key: 'showTotal', label: 'Total hours' },
  { key: 'showAverage', label: 'Average per day' },
  { key: 'showMedian', label: 'Median per day' },
  { key: 'showBusiest', label: 'Busiest day' },
  { key: 'showWorkday', label: 'Workdays row' },
  { key: 'showWeekend', label: 'Weekend row' },
  { key: 'showWeekendShare', label: 'Weekend share' },
  { key: 'showCalendarSummary', label: 'Top calendars' },
  { key: 'showTopCategory', label: 'Top category' },
  { key: 'showBalance', label: 'Balance index' },
] as const satisfies Array<{ key: keyof TargetsConfig['timeSummary']; label: string }>
</script>
