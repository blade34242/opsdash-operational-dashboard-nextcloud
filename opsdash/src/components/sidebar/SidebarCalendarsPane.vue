<template>
  <div
    id="opsdash-sidebar-pane-calendars"
    class="sb-pane"
    role="tabpanel"
    aria-labelledby="opsdash-sidebar-tab-calendars"
  >
    <div class="sb-actions">
      <NcButton type="tertiary" :disabled="isLoading" @click="$emit('select-all', true)">All</NcButton>
      <NcButton type="tertiary" :disabled="isLoading" @click="$emit('select-all', false)">None</NcButton>
    </div>
    <div class="sb-actions sb-actions--secondary">
      <NcButton
        type="primary"
        size="small"
        class="rerun-btn"
        title="Open the onboarding setup again"
        @click="$emit('rerun-onboarding')"
      >
        Re-run onboarding
      </NcButton>
      <NcButton
        type="tertiary"
        size="small"
        class="shortcuts-btn"
        @click="onOpenShortcuts"
      >
        Keyboard shortcuts
      </NcButton>
    </div>
    <div class="sb-context">
      <div class="sb-title">Per‑Calendar Settings</div>
      <p class="sb-description">
        Choose which calendars feed dashboards, then map them to categories so Balance and Targets stay in sync.
      </p>
      <p class="sb-description">
        Use <strong>Category</strong> to group calendars and <strong>Target (h)</strong> to define weekly/monthly goals—the values convert automatically when you switch ranges.
      </p>
    </div>
    <div class="sb-context">
      <div class="sb-title">Projection &amp; Trend</div>
      <p class="sb-description">
        Control the activity projection and the lookback window for balance trends.
      </p>
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
      <div class="field-grid">
        <label class="field">
          <span class="label">Trend lookback (weeks/months)</span>
          <input
            type="number"
            min="1"
            max="4"
            step="1"
            :disabled="indexDisabled"
            :value="balanceLookback"
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
    <div class="sb-list">
      <div v-for="c in calendars" :key="c.id" class="cal-card">
        <div
          class="cal-card-head"
          role="button"
          tabindex="0"
          :aria-pressed="selected.includes(c.id)"
          @click="$emit('toggle-calendar', c.id)"
        >
          <span class="color-dot" :style="{ background: (c.color || 'var(--brand)') }"></span>
          <span class="cal-name">{{ c.displayname || c.id }}</span>
          <span class="cal-state" :class="{ on: selected.includes(c.id) }">
            {{ selected.includes(c.id) ? 'Selected' : 'Hidden' }}
          </span>
        </div>
        <div class="cal-fields">
          <label class="field">
            <span class="label">Category</span>
            <select
              :value="calendarCategoryId(c.id)"
              @change="$emit('set-category', { id: c.id, category: ($event.target as HTMLSelectElement).value })"
            >
              <option value="">Unassigned</option>
              <option v-for="cat in categoryOptions" :key="cat.id" :value="cat.id">
                {{ cat.label }}
              </option>
            </select>
          </label>
          <label class="field">
            <span class="label">Target (h)</span>
            <input
              type="number"
              :value="getTarget(c.id)"
              min="0"
              max="10000"
              step="0.25"
              aria-label="Target hours"
              :title="`Target (${range === 'week' ? 'week' : 'month'}) in hours`"
              :aria-invalid="!!calendarTargetMessages[c.id]"
              class="target-input"
              @input="$emit('target-input', { id: c.id, value: ($event.target as HTMLInputElement).value })"
            />
            <div
              v-if="calendarTargetMessages[c.id]"
              :class="['input-message', calendarTargetMessages[c.id]?.tone]"
            >
              {{ calendarTargetMessages[c.id]?.text }}
            </div>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NcButton } from '@nextcloud/vue'
import { computed, toRefs } from 'vue'
import type { ActivityForecastMode } from '../../services/targets'

type InputMessage = { text: string; tone: 'error' | 'warning' }
type ForecastOption = { value: ActivityForecastMode; label: string; description?: string }

const props = defineProps<{
  calendars: Array<any>
  selected: string[]
  range: 'week' | 'month'
  isLoading: boolean
  categoryOptions: Array<{ id: string; label: string }>
  calendarTargetMessages: Record<string, InputMessage | null>
  calendarCategoryId: (id: string) => string
  getTarget: (id: string) => number | string
  activityForecastMode: ActivityForecastMode
  activityForecastOptions: ForecastOption[]
  balanceLookback: number
  balanceLookbackMessage: InputMessage | null
  indexDisabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'select-all', value: boolean): void
  (e: 'toggle-calendar', id: string): void
  (e: 'set-category', payload: { id: string; category: string }): void
  (e: 'target-input', payload: { id: string; value: string }): void
  (e: 'set-activity-forecast', mode: ActivityForecastMode): void
  (e: 'set-lookback', value: string): void
  (e: 'rerun-onboarding'): void
  (e: 'open-shortcuts', trigger?: HTMLElement | null): void
}>()

// Important: keep props reactive in template; avoid plain destructuring
// Only convert reactive fields with toRefs; call function props directly
const {
  calendars,
  selected,
  range,
  isLoading,
  categoryOptions,
  calendarTargetMessages,
  activityForecastMode,
  activityForecastOptions,
  balanceLookback,
  balanceLookbackMessage,
  indexDisabled,
} = toRefs(props)
const calendarCategoryId = (id: string) => props.calendarCategoryId(id)
const getTarget = (id: string) => props.getTarget(id)

const activityForecastDescription = computed(() => {
  const selectedOption = activityForecastOptions.value?.find((opt) => opt.value === activityForecastMode.value)
  return selectedOption?.description ?? ''
})

function onOpenShortcuts(event: MouseEvent) {
  const target = event.currentTarget as HTMLElement | null
  emit('open-shortcuts', target ?? undefined)
}
</script>

<style scoped>
.forecast-block {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.forecast-block select {
  width: 100%;
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
.input-message.warning {
  color: var(--warning, #f97316);
}
.input-message.error {
  color: var(--neg, #dc2626);
}
.field-grid {
  align-items: start;
}
.sb-actions--secondary {
  margin-top: 8px;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
