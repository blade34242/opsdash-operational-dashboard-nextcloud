<template>
  <h3>Select the calendars Opsdash should include</h3>
  <div v-if="calendars.length" class="selection-step-toolbar">
    <span class="selection-step-toolbar__meta">{{ localSelection.length }} of {{ calendars.length }} selected</span>
    <div class="selection-step-toolbar__actions">
      <button type="button" class="ghost-btn" :disabled="allSelected" @click="selectAllCalendars">Select all</button>
      <button type="button" class="ghost-btn" :disabled="!localSelection.length" @click="deselectAllCalendars">Deselect all</button>
    </div>
  </div>
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
import { computed } from 'vue'
import type { CalendarSummary } from '../../services/onboarding'

const props = defineProps<{
  calendars: CalendarSummary[]
  localSelection: string[]
  toggleCalendar: (id: string, el: HTMLInputElement) => void
}>()

const allSelected = computed(() => props.calendars.length > 0 && props.localSelection.length === props.calendars.length)

function selectAllCalendars() {
  for (const cal of props.calendars) {
    if (!props.localSelection.includes(cal.id)) {
      props.toggleCalendar(cal.id, { checked: true } as HTMLInputElement)
    }
  }
}

function deselectAllCalendars() {
  for (const cal of props.calendars) {
    if (props.localSelection.includes(cal.id)) {
      props.toggleCalendar(cal.id, { checked: false } as HTMLInputElement)
    }
  }
}
</script>
