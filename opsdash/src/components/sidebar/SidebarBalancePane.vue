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
        <div class="section-subtitle subtitle">Balance index</div>
        <button
          type="button"
          class="info-button"
          :aria-expanded="helpThresholds"
          aria-label="Thresholds help"
          @click="emit('toggle-help', 'thresholds')"
        >
          <span>?</span>
        </button>
      </div>
      <div class="section-hint" v-if="helpThresholds">
        <span class="hint-title">Balance index</span>
        <span class="hint-body">Compares actual vs expected shares from your targets. Example: category targets 30/30/40 — if Work jumps to 80% you’ll get warnings. Calendar basis warns if one calendar sits far above its target. “Both” mixes categories and calendars; “Disabled” turns index + warnings off. Notice/Warn thresholds check positive and negative deviations; Warn Index fires if the overall deviation is too high.</span>
      </div>
      <div class="field-grid">
        <label class="field">
          <span class="label">Index basis</span>
          <select
            :value="balanceSettings.index.basis"
            @change="emit('set-index-basis', ($event.target as HTMLSelectElement).value)"
          >
            <option
              v-for="opt in resolvedIndexBasisOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
          <div class="input-message info">
            {{ resolvedIndexBasisOptions.find(opt => opt.value === balanceSettings.index.basis)?.hint || 'Default: categories. “Both” treats every category and calendar bucket in one index and drives warnings. “Disabled” turns off index and warnings.' }}
          </div>
        </label>
      </div>
      <div class="field-grid">
        <label class="field">
          <span class="label">Notice above target</span>
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            :disabled="indexDisabled"
            :value="balanceSettings.thresholds.noticeAbove"
            :aria-invalid="!!balanceThresholdMessages.noticeAbove"
            @input="emit('set-threshold', { key: 'noticeAbove', value: ($event.target as HTMLInputElement).value })"
          />
          <div class="input-message info inline-hint">Notice when actual exceeds target by more than this (e.g., 0.15 = +15pp).</div>
          <div
            v-if="balanceThresholdMessages.noticeAbove"
            :class="['input-message', balanceThresholdMessages.noticeAbove?.tone]"
          >
            {{ balanceThresholdMessages.noticeAbove?.text }}
          </div>
        </label>
        <label class="field">
          <span class="label">Notice below target</span>
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            :disabled="indexDisabled"
            :value="balanceSettings.thresholds.noticeBelow"
            :aria-invalid="!!balanceThresholdMessages.noticeBelow"
            @input="emit('set-threshold', { key: 'noticeBelow', value: ($event.target as HTMLInputElement).value })"
          />
          <div class="input-message info inline-hint">Notice when actual falls below target by more than this.</div>
          <div
            v-if="balanceThresholdMessages.noticeBelow"
            :class="['input-message', balanceThresholdMessages.noticeBelow?.tone]"
          >
            {{ balanceThresholdMessages.noticeBelow?.text }}
          </div>
        </label>
        <label class="field">
          <span class="label">Warn above target</span>
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            :disabled="indexDisabled"
            :value="balanceSettings.thresholds.warnAbove"
            :aria-invalid="!!balanceThresholdMessages.warnAbove"
            @input="emit('set-threshold', { key: 'warnAbove', value: ($event.target as HTMLInputElement).value })"
          />
          <div class="input-message info inline-hint">Hard warning when actual exceeds target by more than this (e.g., 0.30 = +30pp).</div>
          <div
            v-if="balanceThresholdMessages.warnAbove"
            :class="['input-message', balanceThresholdMessages.warnAbove?.tone]"
          >
            {{ balanceThresholdMessages.warnAbove?.text }}
          </div>
        </label>
        <label class="field">
          <span class="label">Warn below target</span>
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            :disabled="indexDisabled"
            :value="balanceSettings.thresholds.warnBelow"
            :aria-invalid="!!balanceThresholdMessages.warnBelow"
            @input="emit('set-threshold', { key: 'warnBelow', value: ($event.target as HTMLInputElement).value })"
          />
          <div class="input-message info inline-hint">Hard warning when actual falls below target by more than this.</div>
          <div
            v-if="balanceThresholdMessages.warnBelow"
            :class="['input-message', balanceThresholdMessages.warnBelow?.tone]"
          >
            {{ balanceThresholdMessages.warnBelow?.text }}
          </div>
        </label>
        <label class="field">
          <span class="label">Warn index</span>
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            :disabled="indexDisabled"
            :value="balanceSettings.thresholds.warnIndex"
            :aria-invalid="!!balanceThresholdMessages.warnIndex"
            @input="emit('set-threshold', { key: 'warnIndex', value: ($event.target as HTMLInputElement).value })"
          />
          <div class="input-message info inline-hint">Warn when the overall index (1 - max deviation) drops below this.</div>
          <div
            v-if="balanceThresholdMessages.warnIndex"
            :class="['input-message', balanceThresholdMessages.warnIndex?.tone]"
          >
            {{ balanceThresholdMessages.warnIndex?.text }}
          </div>
        </label>
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
  balanceThresholdMessages: {
    noticeAbove: InputMessage | null
    noticeBelow: InputMessage | null
    warnAbove: InputMessage | null
    warnBelow: InputMessage | null
    warnIndex: InputMessage | null
  }
  balanceLookbackMessage: InputMessage | null
  indexBasisOptions?: Array<{ value: 'category' | 'calendar' | 'both' | 'off'; label: string; hint?: string }>
  helpThresholds: boolean
  helpTrend: boolean
  helpDisplay: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-help', target: 'thresholds' | 'trend' | 'display'): void
  (e: 'set-activity-forecast', mode: ActivityForecastMode): void
  (e: 'set-index-basis', value: string): void
  (e: 'set-threshold', payload: { key: 'noticeAbove' | 'noticeBelow' | 'warnAbove' | 'warnBelow' | 'warnIndex'; value: string }): void
  (e: 'set-lookback', value: string): void
}>()

const {
  balanceSettings,
  activityForecastMode,
  activityForecastOptions,
  balanceThresholdMessages,
  balanceLookbackMessage,
  indexBasisOptions,
  helpThresholds,
  helpTrend,
  helpDisplay,
} = toRefs(rawProps)

const activityForecastDescription = computed(() => {
  const selected = activityForecastOptions.value?.find((opt) => opt.value === activityForecastMode.value)
  return selected?.description ?? ''
})

const indexDisabled = computed(() => balanceSettings.value.index.basis === 'off')

const resolvedIndexBasisOptions = computed(() =>
  indexBasisOptions.value && indexBasisOptions.value.length
    ? indexBasisOptions.value
    : [
        { value: 'off', label: 'Disabled', hint: 'Do not compute index or warnings' },
        { value: 'category', label: 'Total categories' },
        { value: 'calendar', label: 'Total calendars' },
        { value: 'both', label: 'Categories + calendars' },
      ],
)
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
