<template>
  <h3>Choose calendars to include</h3>
  <p>Select the calendars you want to track. You can adjust later at any time.</p>
  <div class="calendar-list">
    <label
      v-for="cal in calendars"
      :key="cal.id"
      :class="['calendar-item', { checked: localSelection.includes(cal.id) }]"
    >
      <input
        type="checkbox"
        :value="cal.id"
        :checked="localSelection.includes(cal.id)"
        @change="toggleCalendar(cal.id, $event.target as HTMLInputElement)"
      />
      <span class="dot" :style="{ backgroundColor: cal.color || '#3B82F6' }"></span>
      <span>{{ cal.displayname }}</span>
    </label>
  </div>
  <div v-if="localSelection.length" class="calendar-targets">
    <h4>Calendar targets (h / week)</h4>
    <div
      v-for="cal in calendars.filter((c) => localSelection.includes(c.id))"
      :key="`target-${cal.id}`"
      class="target-row"
    >
      <span class="cal-name">{{ cal.displayname }}</span>
      <input
        type="number"
        min="0"
        step="0.25"
        :value="getCalendarTarget(cal.id)"
        @input="setCalendarTarget(cal.id, ($event.target as HTMLInputElement).value)"
      />
    </div>
  </div>
  <div v-if="!localSelection.length" class="warning">Select at least one calendar to continue.</div>
</template>

<script setup lang="ts">
import type { CalendarSummary } from '../../services/onboarding'

defineProps<{
  calendars: CalendarSummary[]
  localSelection: string[]
  toggleCalendar: (id: string, el: HTMLInputElement) => void
  calendarTargets: Record<string, number>
  getCalendarTarget: (id: string) => number | ''
  setCalendarTarget: (id: string, value: string) => void
}>()
</script>
