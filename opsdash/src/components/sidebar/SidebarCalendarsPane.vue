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
    <div class="sb-context">
      <div class="sb-title">Per‑Calendar Settings</div>
      <p class="sb-description">
        Choose which calendars feed dashboards, then map them to categories so Balance and Targets stay in sync.
      </p>
      <p class="sb-description">
        Use <strong>Category</strong> to group calendars and <strong>Target (h)</strong> to define weekly/monthly goals—the values convert automatically when you switch ranges.
      </p>
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
import { toRefs } from 'vue'

type InputMessage = { text: string; tone: 'error' | 'warning' }

const props = defineProps<{
  calendars: Array<any>
  selected: string[]
  range: 'week' | 'month'
  isLoading: boolean
  categoryOptions: Array<{ id: string; label: string }>
  calendarTargetMessages: Record<string, InputMessage | null>
  calendarCategoryId: (id: string) => string
  getTarget: (id: string) => number | string
}>()

defineEmits<{
  (e: 'select-all', value: boolean): void
  (e: 'toggle-calendar', id: string): void
  (e: 'set-category', payload: { id: string; category: string }): void
  (e: 'target-input', payload: { id: string; value: string }): void
}>()

// Important: keep props reactive in template; avoid plain destructuring
// Only convert reactive fields with toRefs; call function props directly
const { calendars, selected, range, isLoading, categoryOptions, calendarTargetMessages } = toRefs(props)
const calendarCategoryId = (id: string) => props.calendarCategoryId(id)
const getTarget = (id: string) => props.getTarget(id)
</script>
