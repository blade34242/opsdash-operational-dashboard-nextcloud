<template>
  <h3>Review your setup</h3>
  <div class="review-grid">
    <div>
      <h5>Strategy</h5>
      <p>{{ strategyTitle }}</p>
    </div>
    <div>
      <h5>Calendars</h5>
      <ul>
        <li v-for="cal in selectedCalendars" :key="cal.id">{{ cal.displayname }}</li>
      </ul>
    </div>
    <div>
      <h5>Targets preview</h5>
      <template v-if="categoriesEnabled && draftTargetsCategories.length">
        <ul>
          <li v-for="cat in draftTargetsCategories" :key="cat.id">{{ cat.label }} — {{ cat.targetHours }} h</li>
        </ul>
        <p class="hint">Total weekly target: {{ categoryTotalHours.toFixed(1) }} h</p>
      </template>
      <template v-else>
        <p>Total target: {{ totalTarget }} h per week</p>
      </template>
    </div>
    <div>
      <h5>Dashboard</h5>
      <p>{{ dashboardLabel }}</p>
    </div>
    <div>
      <h5>Theme</h5>
      <p>{{ themeLabel }}</p>
    </div>
    <div>
      <h5>Deck tab</h5>
      <p>{{ deckReviewSummary }}</p>
      <ul v-if="deckEnabled && deckVisibleBoards.length">
        <li v-for="board in deckVisibleBoards.slice(0, 3)" :key="board.id">{{ board.title }}</li>
        <li v-if="deckVisibleBoards.length > 3">+{{ deckVisibleBoards.length - 3 }} more</li>
      </ul>
    </div>
    <div>
      <h5>Reporting</h5>
      <p>{{ reportingEnabled ? reportingSummary : 'Recap disabled' }}</p>
    </div>
    <div>
      <h5>Activity card</h5>
      <p>{{ showDayOffTrend ? 'Days-off heatmap enabled' : 'Heatmap hidden' }}</p>
    </div>
    <div v-if="showSaveProfile" class="review-profile">
      <h5>Save profile</h5>
      <label class="toggle-row">
        <input
          type="checkbox"
          :checked="saveProfile"
          @change="setSaveProfile(($event.target as HTMLInputElement).checked)"
        />
        <span>Save as new profile</span>
      </label>
      <div v-if="saveProfile" class="field">
        <span class="label">Profile name</span>
        <input
          type="text"
          :value="profileName"
          placeholder="e.g. Team workload"
          @input="setProfileName(($event.target as HTMLInputElement).value)"
        />
      </div>
      <p class="hint">Profiles store widgets/tabs, targets, theme, Deck, and reporting settings.</p>
    </div>
  </div>
  <p class="hint">You can fine-tune categories, goals, and pacing once the dashboard loads.</p>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  strategyTitle: string
  categoriesEnabled: boolean
  selectedCalendars: Array<{ id: string; displayname: string }>
  draftTargetsCategories: Array<{ id: string; label: string; targetHours: number }>
  draftTotalHours: number
  totalHoursInput: number | null
  categoryTotalHours: number
  deckReviewSummary: string
  deckEnabled: boolean
  deckVisibleBoards: Array<{ id: number; title: string }>
  reportingEnabled: boolean
  reportingSummary: string
  showDayOffTrend: boolean
  themePreference: 'auto' | 'light' | 'dark'
  dashboardMode: 'quick' | 'standard' | 'pro'
  saveProfile: boolean
  profileName: string
  showSaveProfile: boolean
  setSaveProfile: (enabled: boolean) => void
  setProfileName: (value: string) => void
}>()

const totalTarget = computed(() => {
  if (Number.isFinite(props.totalHoursInput ?? NaN)) {
    return Number(props.totalHoursInput)
  }
  return Number.isFinite(props.draftTotalHours) ? Number(props.draftTotalHours) : 0
})

const dashboardLabel = computed(() => {
  if (props.dashboardMode === 'quick') return 'Quick layout'
  if (props.dashboardMode === 'pro') return 'Pro layout'
  return 'Standard layout'
})

const themeLabel = computed(() => {
  if (props.themePreference === 'light') return 'Light theme'
  if (props.themePreference === 'dark') return 'Dark theme'
  return 'Follow Nextcloud theme'
})
</script>
