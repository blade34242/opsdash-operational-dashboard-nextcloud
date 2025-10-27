<template>
  <div
    id="opsdash-sidebar-pane-targets"
    class="sb-pane"
    role="tabpanel"
    aria-labelledby="opsdash-sidebar-tab-targets"
  >
    <div class="sb-title">Target Settings</div>
    <div class="target-config">
      <div class="field">
        <span class="label">Total target (h)</span>
        <input
          type="number"
          :value="targets.totalHours"
          min="0"
          max="1000"
          step="0.5"
          :aria-invalid="!!totalTargetMessage"
          @input="$emit('total-target-input', ($event.target as HTMLInputElement).value)"
        />
        <div v-if="totalTargetMessage" :class="['input-message', totalTargetMessage?.tone]">
          {{ totalTargetMessage?.text }}
        </div>
      </div>
      <div class="field">
        <span class="label">All-day event (h per day)</span>
        <input
          type="number"
          :value="targets.allDayHours"
          min="0"
          max="24"
          step="0.25"
          :aria-invalid="!!allDayHoursMessage"
          @input="$emit('set-all-day-hours', ($event.target as HTMLInputElement).value)"
        />
        <div v-if="allDayHoursMessage" :class="['input-message', allDayHoursMessage?.tone]">
          {{ allDayHoursMessage?.text }}
        </div>
      </div>
      <div class="preset-buttons">
        <NcButton type="tertiary" @click="$emit('apply-preset', 'work-week')">Preset: Work-Week</NcButton>
        <NcButton type="tertiary" @click="$emit('apply-preset', 'balanced-life')">Preset: Balanced-Life</NcButton>
      </div>
      <div class="target-category" v-for="cat in categoryOptions" :key="cat.id">
        <div class="cat-header">
          <input
            class="cat-name"
            type="text"
            :value="cat.label"
            placeholder="Category name"
            @input="$emit('set-category-label', { id: cat.id, label: ($event.target as HTMLInputElement).value })"
          />
          <button
            class="remove-cat"
            type="button"
            :disabled="categoryOptions.length <= 1"
            title="Remove category"
            @click="$emit('remove-category', cat.id)"
          >
            ✕
          </button>
        </div>
        <div class="cat-fields">
          <label class="field">
            <span class="label">Target (h)</span>
            <input
              type="number"
              :value="cat.targetHours"
              min="0"
              max="1000"
              step="0.5"
              :aria-invalid="!!categoryTargetMessages[cat.id]"
              @input="$emit('set-category-target', { id: cat.id, value: ($event.target as HTMLInputElement).value })"
            />
            <div v-if="categoryTargetMessages[cat.id]" :class="['input-message', categoryTargetMessages[cat.id]?.tone]">
              {{ categoryTargetMessages[cat.id]?.text }}
            </div>
          </label>
          <label class="field">
            <span class="label">Pace mode</span>
            <select
              :value="cat.paceMode || targets.pace.mode"
              @change="$emit('set-category-pace', { id: cat.id, mode: ($event.target as HTMLSelectElement).value })"
            >
              <option value="days_only">Days only</option>
              <option value="time_aware">Time aware</option>
            </select>
          </label>
          <label class="field checkbox">
            <input
              type="checkbox"
              :checked="cat.includeWeekend"
              @change="$emit('set-category-weekend', { id: cat.id, value: ($event.target as HTMLInputElement).checked })"
            />
            <span>Weekend</span>
          </label>
        </div>
      </div>
      <NcButton
        type="tertiary"
        class="add-category"
        :disabled="!canAddCategory"
        @click="$emit('add-category')"
      >
        Add category
      </NcButton>

      <div class="target-section">
        <div class="section-title">Pace</div>
        <label class="field checkbox">
          <input
            type="checkbox"
            :checked="targets.pace.includeWeekendTotal"
            @change="$emit('set-include-weekend-total', ($event.target as HTMLInputElement).checked)"
          />
          <span>Count weekend in total pace</span>
        </label>
        <label class="field">
          <span class="label">Mode</span>
          <select
            :value="targets.pace.mode"
            @change="$emit('set-pace-mode', ($event.target as HTMLSelectElement).value)"
          >
            <option value="days_only">Days only</option>
            <option value="time_aware">Time aware</option>
          </select>
        </label>
        <label class="field">
          <span class="label">On track ≥ gap (%)</span>
          <input
            type="number"
            :value="targets.pace.thresholds.onTrack"
            step="0.1"
            :aria-invalid="!!paceThresholdMessages.onTrack"
            @input="$emit('set-threshold', { key: 'onTrack', value: ($event.target as HTMLInputElement).value })"
          />
          <div v-if="paceThresholdMessages.onTrack" :class="['input-message', paceThresholdMessages.onTrack?.tone]">
            {{ paceThresholdMessages.onTrack?.text }}
          </div>
        </label>
        <label class="field">
          <span class="label">At risk ≥ gap (%)</span>
          <input
            type="number"
            :value="targets.pace.thresholds.atRisk"
            step="0.1"
            :aria-invalid="!!paceThresholdMessages.atRisk"
            @input="$emit('set-threshold', { key: 'atRisk', value: ($event.target as HTMLInputElement).value })"
          />
          <div v-if="paceThresholdMessages.atRisk" :class="['input-message', paceThresholdMessages.atRisk?.tone]">
            {{ paceThresholdMessages.atRisk?.text }}
          </div>
        </label>
      </div>

      <div class="target-section">
        <div class="section-title">Forecast</div>
        <label class="field">
          <span class="label">Primary method</span>
          <select
            :value="targets.forecast.methodPrimary"
            @change="$emit('set-forecast-method', ($event.target as HTMLSelectElement).value)"
          >
            <option value="linear">Linear</option>
            <option value="momentum">Momentum</option>
          </select>
        </label>
        <label class="field">
          <span class="label">Momentum window (days)</span>
          <input
            type="number"
            :value="targets.forecast.momentumLastNDays"
            min="1"
            max="14"
            step="1"
            :aria-invalid="!!forecastMomentumMessage"
            @input="$emit('set-forecast-momentum', ($event.target as HTMLInputElement).value)"
          />
          <div v-if="forecastMomentumMessage" :class="['input-message', forecastMomentumMessage?.tone]">
            {{ forecastMomentumMessage?.text }}
          </div>
        </label>
        <label class="field">
          <span class="label">Padding (±h)</span>
          <input
            type="number"
            :value="targets.forecast.padding"
            min="0"
            step="0.1"
            :aria-invalid="!!forecastPaddingMessage"
            @input="$emit('set-forecast-padding', ($event.target as HTMLInputElement).value)"
          />
          <div v-if="forecastPaddingMessage" :class="['input-message', forecastPaddingMessage?.tone]">
            {{ forecastPaddingMessage?.text }}
          </div>
        </label>
      </div>

      <div class="target-section">
        <div class="section-title">Display</div>
        <label class="field checkbox">
          <input
            type="checkbox"
            :checked="targets.ui.showCalendarCharts"
            @change="$emit('set-ui-option', { key: 'showCalendarCharts', value: ($event.target as HTMLInputElement).checked })"
          />
          <span>Show calendar charts</span>
        </label>
        <label class="field checkbox">
          <input
            type="checkbox"
            :checked="targets.ui.showCategoryCharts"
            @change="$emit('set-ui-option', { key: 'showCategoryCharts', value: ($event.target as HTMLInputElement).checked })"
          />
          <span>Show category charts</span>
        </label>
        <label class="field checkbox">
          <input
            type="checkbox"
            :checked="targets.ui.showTotalDelta"
            @change="$emit('set-ui-option', { key: 'showTotalDelta', value: ($event.target as HTMLInputElement).checked })"
          />
          <span>Show total delta</span>
        </label>
        <label class="field checkbox">
          <input
            type="checkbox"
            :checked="targets.ui.showNeedPerDay"
            @change="$emit('set-ui-option', { key: 'showNeedPerDay', value: ($event.target as HTMLInputElement).checked })"
          />
          <span>Show need per day</span>
        </label>
        <label class="field checkbox">
          <input
            type="checkbox"
            :checked="targets.ui.showCategoryBlocks"
            @change="$emit('set-ui-option', { key: 'showCategoryBlocks', value: ($event.target as HTMLInputElement).checked })"
          />
          <span>Show categories</span>
        </label>
        <label class="field checkbox">
          <input
            type="checkbox"
            :checked="targets.ui.badges"
            @change="$emit('set-ui-option', { key: 'badges', value: ($event.target as HTMLInputElement).checked })"
          />
          <span>Status badges</span>
        </label>
        <label class="field checkbox">
          <input
            type="checkbox"
            :checked="targets.ui.includeWeekendToggle"
            @change="$emit('set-ui-option', { key: 'includeWeekendToggle', value: ($event.target as HTMLInputElement).checked })"
          />
          <span>Weekend toggle</span>
        </label>
        <label class="field checkbox">
          <input
            type="checkbox"
            :checked="targets.includeZeroDaysInStats"
            @change="$emit('set-include-zero-days', ($event.target as HTMLInputElement).checked)"
          />
          <span>Include zero days in pace</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NcButton } from '@nextcloud/vue'
import type { TargetsConfig } from '../../services/targets'

type InputMessage = { text: string; tone: 'error' | 'warning' }

defineProps<{
  targets: TargetsConfig
  categoryOptions: Array<{
    id: string
    label: string
    targetHours: number
    includeWeekend: boolean
    paceMode?: string
  }>
  totalTargetMessage: InputMessage | null
  allDayHoursMessage: InputMessage | null
  categoryTargetMessages: Record<string, InputMessage | null>
  paceThresholdMessages: { onTrack: InputMessage | null; atRisk: InputMessage | null }
  forecastMomentumMessage: InputMessage | null
  forecastPaddingMessage: InputMessage | null
  canAddCategory: boolean
}>()

defineEmits<{
  (e: 'total-target-input', value: string): void
  (e: 'apply-preset', preset: string): void
  (e: 'set-all-day-hours', value: string): void
  (e: 'set-category-label', payload: { id: string; label: string }): void
  (e: 'remove-category', id: string): void
  (e: 'set-category-target', payload: { id: string; value: string }): void
  (e: 'set-category-pace', payload: { id: string; mode: string }): void
  (e: 'set-category-weekend', payload: { id: string; value: boolean }): void
  (e: 'add-category'): void
  (e: 'set-include-weekend-total', value: boolean): void
  (e: 'set-pace-mode', mode: string): void
  (e: 'set-threshold', payload: { key: 'onTrack' | 'atRisk'; value: string }): void
  (e: 'set-forecast-method', method: string): void
  (e: 'set-forecast-momentum', value: string): void
  (e: 'set-forecast-padding', value: string): void
  (e: 'set-ui-option', payload: { key: string; value: boolean }): void
  (e: 'set-include-zero-days', value: boolean): void
}>()
</script>
