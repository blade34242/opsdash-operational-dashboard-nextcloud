<template>
  <div
    id="opsdash-sidebar-pane-balance"
    class="sb-pane"
    role="tabpanel"
    aria-labelledby="opsdash-sidebar-tab-balance"
  >
    <div class="section-title-row">
      <div class="section-title subtitle">Balance Overview</div>
      <button
        type="button"
        class="info-button"
        :aria-expanded="helpThresholds || helpTrend || helpDisplay"
        aria-label="Balance Overview help"
        @click="emit('toggle-help', 'all')"
      >
        <span>?</span>
      </button>
    </div>

    <div class="target-section">
      <div class="section-title-row">
        <div class="section-subtitle subtitle">Thresholds</div>
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
      <p class="section-hint" v-if="helpThresholds">Set the share/index limits that trigger balance warnings.</p>
      <div class="field-grid">
        <label class="field">
          <span class="label">Notice max share</span>
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            :value="balanceSettings.thresholds.noticeMaxShare"
            :aria-invalid="!!balanceThresholdMessages.noticeMaxShare"
            @input="emit('set-threshold', { key: 'noticeMaxShare', value: ($event.target as HTMLInputElement).value })"
          />
          <div
            v-if="balanceThresholdMessages.noticeMaxShare"
            :class="['input-message', balanceThresholdMessages.noticeMaxShare?.tone]"
          >
            {{ balanceThresholdMessages.noticeMaxShare?.text }}
          </div>
        </label>
        <label class="field">
          <span class="label">Warn max share</span>
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            :value="balanceSettings.thresholds.warnMaxShare"
            :aria-invalid="!!balanceThresholdMessages.warnMaxShare"
            @input="emit('set-threshold', { key: 'warnMaxShare', value: ($event.target as HTMLInputElement).value })"
          />
          <div
            v-if="balanceThresholdMessages.warnMaxShare"
            :class="['input-message', balanceThresholdMessages.warnMaxShare?.tone]"
          >
            {{ balanceThresholdMessages.warnMaxShare?.text }}
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
        <div class="section-subtitle subtitle">Trend &amp; Relations</div>
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
      <p class="section-hint" v-if="helpTrend">Control the comparison window and how ratios are expressed.</p>
      <div class="field-grid">
        <label class="field">
          <span class="label">Relation display</span>
          <select
            :value="balanceSettings.relations.displayMode"
            @change="emit('set-relation', ($event.target as HTMLSelectElement).value)"
          >
            <option value="ratio">Ratio (A : B)</option>
            <option value="factor">Factor (A×)</option>
          </select>
        </label>
        <label class="field">
          <span class="label">Trend lookback (weeks)</span>
          <input
            type="number"
            min="1"
            max="12"
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
        <div class="section-subtitle subtitle">Display</div>
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
      <p class="section-hint" v-if="helpDisplay">Toggle optional insights and adjust rounding for the card values.</p>
      <div class="toggle-grid">
        <label class="field checkbox toggle-field">
          <input
            type="checkbox"
            :checked="balanceSettings.ui.showInsights"
            @change="emit('set-ui-toggle', { key: 'showInsights', value: ($event.target as HTMLInputElement).checked })"
          />
          <span>Insights</span>
        </label>
        <label class="field checkbox toggle-field">
          <input
            type="checkbox"
            :checked="balanceSettings.ui.showDailyStacks"
            @change="emit('set-ui-toggle', { key: 'showDailyStacks', value: ($event.target as HTMLInputElement).checked })"
          />
          <span>Daily mix (experimental)</span>
        </label>
        <label class="field checkbox toggle-field">
          <input
            type="checkbox"
            :checked="balanceSettings.dayparts.enabled"
            @change="emit('set-ui-toggle', { key: 'dayparts', value: ($event.target as HTMLInputElement).checked })"
          />
          <span>Dayparts</span>
        </label>
      </div>
      <div class="field-grid mt-8">
        <label class="field">
          <span class="label">Percent precision</span>
          <select
            :value="balanceSettings.ui.roundPercent"
            :aria-invalid="!!balanceUiPrecisionMessages.roundPercent"
            @change="emit('set-ui-precision', { key: 'roundPercent', value: ($event.target as HTMLSelectElement).value })"
          >
            <option v-for="n in roundingOptions" :key="`round-percent-${n}`" :value="n">{{ n }}</option>
          </select>
          <div
            v-if="balanceUiPrecisionMessages.roundPercent"
            :class="['input-message', balanceUiPrecisionMessages.roundPercent?.tone]"
          >
            {{ balanceUiPrecisionMessages.roundPercent?.text }}
          </div>
        </label>
        <label class="field">
          <span class="label">Ratio precision</span>
          <select
            :value="balanceSettings.ui.roundRatio"
            :aria-invalid="!!balanceUiPrecisionMessages.roundRatio"
            @change="emit('set-ui-precision', { key: 'roundRatio', value: ($event.target as HTMLSelectElement).value })"
          >
            <option v-for="n in roundingOptions" :key="`round-ratio-${n}`" :value="n">{{ n }}</option>
          </select>
          <div
            v-if="balanceUiPrecisionMessages.roundRatio"
            :class="['input-message', balanceUiPrecisionMessages.roundRatio?.tone]"
          >
            {{ balanceUiPrecisionMessages.roundRatio?.text }}
          </div>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRefs } from 'vue'
import type { BalanceConfig } from '../../services/targets'

type InputMessage = { text: string; tone: 'error' | 'warning' }

const rawProps = defineProps<{
  balanceSettings: BalanceConfig
  balanceThresholdMessages: { noticeMaxShare: InputMessage | null; warnMaxShare: InputMessage | null; warnIndex: InputMessage | null }
  balanceLookbackMessage: InputMessage | null
  balanceUiPrecisionMessages: { roundPercent: InputMessage | null; roundRatio: InputMessage | null }
  roundingOptions: number[]
  helpThresholds: boolean
  helpTrend: boolean
  helpDisplay: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-help', target: 'all' | 'thresholds' | 'trend' | 'display'): void
  (e: 'set-threshold', payload: { key: 'noticeMaxShare' | 'warnMaxShare' | 'warnIndex'; value: string }): void
  (e: 'set-relation', mode: string): void
  (e: 'set-lookback', value: string): void
  (e: 'set-ui-toggle', payload: { key: 'showInsights' | 'showDailyStacks' | 'dayparts'; value: boolean }): void
  (e: 'set-ui-precision', payload: { key: 'roundPercent' | 'roundRatio'; value: string }): void
}>()

const {
  balanceSettings,
  balanceThresholdMessages,
  balanceLookbackMessage,
  balanceUiPrecisionMessages,
  roundingOptions,
  helpThresholds,
  helpTrend,
  helpDisplay,
} = toRefs(rawProps)
</script>
