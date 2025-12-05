<template>
  <div
    id="opsdash-sidebar-pane-balance"
    class="sb-pane"
    role="tabpanel"
    aria-labelledby="opsdash-sidebar-tab-balance"
  >
    <div class="pane-heading">
      <div class="heading-primary">Activity &amp; Balance</div>
      <div class="heading-subtitle">Card display &amp; warnings</div>
    </div>

    <div class="target-section">
      <div class="forecast-block">
        <div class="section-title">Chart projection</div>
        <div class="section-hint">
          <span class="hint-title">Projection</span>
          <span class="hint-body">Bar forecast for future days (week/month) based on your targets.</span>
        </div>
        <label class="field">
          <span class="label">Projection mode</span>
          <select
            :value="activityForecastMode"
            @change="emit('set-activity-forecast', ($event.target as HTMLSelectElement).value)"
          >
            <option
              v-for="option in activityForecastOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
        <div v-if="activityForecastDescription" class="section-hint compact">
          <span class="hint-title">Details</span>
          <span class="hint-body">{{ activityForecastDescription }}</span>
        </div>
      </div>
    </div>

    <div class="target-section">
      <div class="section-title-row tier-2">
        <div class="section-subtitle subtitle">Trend &amp; relations</div>
        <button
          type="button"
          class="info-button"
          :aria-expanded="helpTrend"
          aria-label="Trend help"
          @click="emit('toggle-help', 'trend')"
        >
          <span>?</span>
        </button>
      </div>
      <div class="section-hint" v-if="helpTrend">
        <span class="hint-title">Trend window</span>
        <span class="hint-body">Controls the comparison window and how ratios are expressed. Day on/off never looks ahead; it scans the past using this lookback (default 4). Applies to week and month ranges. Larger lookbacks can take longer to load if many events exist.</span>
      </div>
      <div class="field-grid">
        <label class="field">
          <span class="label">Trend lookback (weeks/months)</span>
          <input
            type="number"
            min="1"
            max="4"
            step="1"
            :disabled="indexDisabled"
            :value="balanceSettings.trend.lookbackWeeks"
            :aria-invalid="!!balanceLookbackMessage"
            @input="emit('set-lookback', ($event.target as HTMLInputElement).value)"
          />
          <div
            v-if="balanceLookbackMessage"
            :class="['input-message', balanceLookbackMessage?.tone]"
          >
            {{ balanceLookbackMessage?.text }}
          </div>
        </label>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue'
import type { ActivityForecastMode, BalanceConfig } from '../../services/targets'

type InputMessage = { text: string; tone: 'error' | 'warning' }
type ForecastOption = { value: ActivityForecastMode; label: string; description?: string }

const rawProps = defineProps<{
  balanceSettings: BalanceConfig
  activityForecastMode: ActivityForecastMode
  activityForecastOptions: ForecastOption[]
  balanceLookbackMessage: InputMessage | null
  helpTrend: boolean
  helpDisplay: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-help', target: 'trend' | 'display'): void
  (e: 'set-activity-forecast', mode: ActivityForecastMode): void
  (e: 'set-lookback', value: string): void
}>()

const {
  balanceSettings,
  activityForecastMode,
  activityForecastOptions,
  balanceLookbackMessage,
  helpTrend,
  helpDisplay,
} = toRefs(rawProps)

const activityForecastDescription = computed(() => {
  const selected = activityForecastOptions.value?.find((opt) => opt.value === activityForecastMode.value)
  return selected?.description ?? ''
})
</script>

<style scoped>
.toggle-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
.toggle-grid .toggle-field {
  background: var(--color-background-contrast, transparent);
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 6px;
  padding: 8px;
}
.forecast-block {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.forecast-block select {
  width: 100%;
}
.forecast-hint {
  margin: 0;
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
.pane-heading {
  margin-bottom: 12px;
}
.heading-primary {
  font-weight: 700;
  font-size: 16px;
  color: var(--color-text-maxcontrast, inherit);
  line-height: 1.2;
}
.heading-subtitle {
  font-size: 13px;
  color: var(--color-text-lighter, #6b7280);
  margin-top: 2px;
}
.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 8px 0 6px;
}
.section-title-row.tier-2 .section-subtitle {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--color-text-maxcontrast, inherit);
}
.section-subtitle {
  font-weight: 600;
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
.input-message.info {
  color: var(--color-text-lighter, #6b7280);
}
.inline-hint {
  background: var(--color-background-hover, rgba(0, 0, 0, 0.05));
  border: 1px solid var(--color-border, #d1d5db);
  border-left: 4px solid var(--color-primary-element, #2563eb);
  border-radius: 8px;
  padding: 8px 10px;
  margin-top: 6px;
  box-shadow: 0 1px 2px var(--color-box-shadow, rgba(0, 0, 0, 0.08));
}
.toggle-field {
  display: flex;
  align-items: center;
  gap: 8px;
}
.single-toggle {
  grid-column: 1 / -1;
}
.toggle-field input[type='checkbox'] {
  margin: 0;
}
.toggle-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.field-grid {
  align-items: start;
}
</style>
