<template>
  <div
    id="opsdash-sidebar-pane-balance"
    class="sb-pane"
    role="tabpanel"
    aria-labelledby="opsdash-sidebar-tab-balance"
  >
    <div class="section-title-row">
      <div class="section-title subtitle">Activity &amp; Balance Card Display</div>
      <button
        type="button"
        class="info-button"
        :aria-expanded="helpActivity || helpThresholds || helpTrend || helpDisplay"
        aria-label="Activity &amp; Balance help"
        @click="emit('toggle-help', 'activity')"
      >
        <span>?</span>
      </button>
    </div>

    <div class="target-section">
      <div class="section-title-row">
        <div class="section-subtitle subtitle">Top card display</div>
      </div>
      <p class="section-hint" v-if="helpActivity">
        Choose which KPIs and the day-off chart appear on the top card. Use projection to show how future days would fill.
      </p>
      <div class="target-section toggle-grid">
        <label
          v-for="[key, label] in activityToggles"
          :key="key"
          class="field checkbox toggle-field"
        >
          <input
            type="checkbox"
            :checked="activitySettings[key]"
            @change="emit('set-activity-toggle', { key, value: ($event.target as HTMLInputElement).checked })"
          />
          <span>{{ label }}</span>
        </label>
      </div>
      <div class="forecast-block">
        <div class="section-title">Chart projection</div>
        <p class="section-hint">Bar forecast for future days (week/month) based on your targets.</p>
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
        <p v-if="activityForecastDescription" class="section-hint forecast-hint">
          {{ activityForecastDescription }}
        </p>
      </div>
    </div>

    <div class="target-section">
      <div class="section-title-row">
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
      <p class="section-hint" v-if="helpThresholds">
        Balance index compares actual vs expected shares (from targets). Example: category targets 30/30/40 — if Work jumps to 80% you’ll get warnings; calendar basis warns if one calendar sits far above its target; “Both” mixes categories and calendars; “Disabled” turns index + warnings off. Notice/Warn thresholds check positive and negative deviations; Warn Index fires if overall deviation is too high.
      </p>
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
            :value="balanceSettings.thresholds.noticeAbove"
            :aria-invalid="!!balanceThresholdMessages.noticeAbove"
            @input="emit('set-threshold', { key: 'noticeAbove', value: ($event.target as HTMLInputElement).value })"
          />
          <div class="input-message info">Notice when actual exceeds target by more than this (e.g., 0.15 = +15pp).</div>
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
            :value="balanceSettings.thresholds.noticeBelow"
            :aria-invalid="!!balanceThresholdMessages.noticeBelow"
            @input="emit('set-threshold', { key: 'noticeBelow', value: ($event.target as HTMLInputElement).value })"
          />
          <div class="input-message info">Notice when actual falls below target by more than this.</div>
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
            :value="balanceSettings.thresholds.warnAbove"
            :aria-invalid="!!balanceThresholdMessages.warnAbove"
            @input="emit('set-threshold', { key: 'warnAbove', value: ($event.target as HTMLInputElement).value })"
          />
          <div class="input-message info">Hard warning when actual exceeds target by more than this (e.g., 0.30 = +30pp).</div>
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
            :value="balanceSettings.thresholds.warnBelow"
            :aria-invalid="!!balanceThresholdMessages.warnBelow"
            @input="emit('set-threshold', { key: 'warnBelow', value: ($event.target as HTMLInputElement).value })"
          />
          <div class="input-message info">Hard warning when actual falls below target by more than this.</div>
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
            :value="balanceSettings.thresholds.warnIndex"
            :aria-invalid="!!balanceThresholdMessages.warnIndex"
            @input="emit('set-threshold', { key: 'warnIndex', value: ($event.target as HTMLInputElement).value })"
          />
          <div class="input-message info">Warn when the overall index (1 - max deviation) drops below this.</div>
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
      <div class="section-title-row">
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
      <p class="section-hint" v-if="helpTrend">
        Control the comparison window and how ratios are expressed. Day on/off never looks ahead; it scans the past using this lookback (default 4). Applies to week and month ranges. Larger lookbacks can take longer to load if many events exist.
      </p>
      <div class="field-grid">
        <label class="field">
          <span class="label">Trend lookback (weeks/months)</span>
          <input
            type="number"
            min="1"
            max="4"
            step="1"
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

    <div class="target-section">
      <div class="section-title-row">
        <div class="section-subtitle subtitle">Chart display</div>
        <button
          type="button"
          class="info-button"
          :aria-expanded="helpDisplay"
          aria-label="Display help"
          @click="emit('toggle-help', 'display')"
        >
          <span>?</span>
        </button>
      </div>
      <p class="section-hint" v-if="helpDisplay">
        Choose which extras appear on the Balance card. Insights add highlighted statements; Notes pins your note beneath the card. All toggles share the same layout for quick scanning.
      </p>
      <div class="toggle-grid">
        <label class="field checkbox toggle-field single-toggle">
          <input
            type="checkbox"
            :checked="balanceSettings.ui.showNotes"
            @change="emit('set-ui-toggle', { key: 'showNotes', value: ($event.target as HTMLInputElement).checked })"
          />
          <div class="toggle-copy">
            <span class="toggle-title">Notes snippet</span>
            <span class="toggle-desc">Pin the current note beneath the Balance summary.</span>
          </div>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue'
import type { ActivityCardConfig, ActivityForecastMode, BalanceConfig } from '../../services/targets'

type InputMessage = { text: string; tone: 'error' | 'warning' }
type ActivityToggleKey = Exclude<keyof ActivityCardConfig, 'forecastMode'>
type ForecastOption = { value: ActivityForecastMode; label: string; description?: string }

const rawProps = defineProps<{
  balanceSettings: BalanceConfig
  activitySettings: ActivityCardConfig
  activityToggles: Array<[ActivityToggleKey, string]>
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
  helpActivity: boolean
  helpThresholds: boolean
  helpTrend: boolean
  helpDisplay: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-help', target: 'activity' | 'thresholds' | 'trend' | 'display'): void
  (e: 'set-activity-toggle', payload: { key: ActivityToggleKey; value: boolean }): void
  (e: 'set-activity-forecast', mode: ActivityForecastMode): void
  (e: 'set-index-basis', value: string): void
  (e: 'set-threshold', payload: { key: 'noticeAbove' | 'noticeBelow' | 'warnAbove' | 'warnBelow' | 'warnIndex'; value: string }): void
  (e: 'set-lookback', value: string): void
  (e: 'set-ui-toggle', payload: { key: 'showNotes'; value: boolean }): void
}>()

const {
  balanceSettings,
  activitySettings,
  activityToggles,
  activityForecastMode,
  activityForecastOptions,
  balanceThresholdMessages,
  balanceLookbackMessage,
  indexBasisOptions,
  helpActivity,
  helpThresholds,
  helpTrend,
  helpDisplay,
} = toRefs(rawProps)

const activityForecastDescription = computed(() => {
  const selected = activityForecastOptions.value?.find((opt) => opt.value === activityForecastMode.value)
  return selected?.description ?? ''
})

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
  background: var(--color-background-contrast, #f8fafc);
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 6px;
  padding: 10px;
  margin: 6px 0 10px;
  font-style: italic;
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
