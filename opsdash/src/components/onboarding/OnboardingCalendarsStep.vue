<template>
  <h3>Choose calendars to include</h3>
  <p>Select the calendars Opsdash should include. Goal editing happens later in the dedicated Goals step.</p>
  <div class="calendar-list calendar-list--scroll">
    <label
      v-for="cal in calendars"
      :key="cal.id"
      :class="['calendar-item', { checked: localSelection.includes(cal.id) }]"
    >
      <input
        class="list-checkbox"
        type="checkbox"
        :value="cal.id"
        :checked="localSelection.includes(cal.id)"
        @change="toggleCalendar(cal.id, $event.target as HTMLInputElement)"
      />
      <span class="dot" :style="{ backgroundColor: cal.color || '#3B82F6' }"></span>
      <span class="calendar-item__label">{{ cal.displayname }}</span>
      <span class="calendar-item__state">{{ localSelection.includes(cal.id) ? 'selected' : 'not selected' }}</span>
    </label>
  </div>
  <div v-if="!localSelection.length" class="warning">Select at least one calendar to continue.</div>
</template>

<script setup lang="ts">
import type { CalendarSummary } from '../../services/onboarding'

defineProps<{
  calendars: CalendarSummary[]
  localSelection: string[]
  toggleCalendar: (id: string, el: HTMLInputElement) => void
}>()
</script>
