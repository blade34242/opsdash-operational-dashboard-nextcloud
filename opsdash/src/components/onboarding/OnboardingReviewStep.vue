<template>
  <div class="review-layout">
    <div class="review-main">
      <section class="review-section">
        <h4>Configuration summary</h4>
        <div class="review-row-list">
          <article class="review-row">
            <div>
              <strong>Strategy</strong>
              <p>{{ strategyLine }}</p>
            </div>
            <button type="button" class="review-edit-link" @click="goToStep('strategy')">Edit</button>
          </article>

          <article class="review-row">
            <div>
              <strong>Calendars</strong>
              <p>{{ calendarsLine }}</p>
            </div>
            <button type="button" class="review-edit-link" @click="goToStep('calendars')">Edit</button>
          </article>

          <article class="review-row">
            <div>
              <strong>Deck</strong>
              <p>{{ deckLine }}</p>
            </div>
            <button type="button" class="review-edit-link" @click="goToStep('deck')">Edit</button>
          </article>

          <article class="review-row">
            <div>
              <strong>Goals</strong>
              <p>{{ goalsLine }}</p>
            </div>
            <button type="button" class="review-edit-link" @click="goToStep('goals')">Edit</button>
          </article>

          <article class="review-row">
            <div>
              <strong>Preferences</strong>
              <p>{{ preferencesLine }}</p>
            </div>
            <button type="button" class="review-edit-link" @click="goToStep('preferences')">Edit</button>
          </article>

          <article class="review-row">
            <div>
              <strong>Dashboard</strong>
              <p>{{ dashboardLine }}</p>
            </div>
            <button type="button" class="review-edit-link" @click="goToStep('dashboard')">Edit</button>
          </article>
        </div>
      </section>
    </div>

    <aside class="review-side">
      <section class="review-section">
        <h4>Readiness</h4>
        <ul class="review-checklist">
          <li
            v-for="item in readinessChecks"
            :key="item.id"
            :class="item.ok ? 'is-ok' : 'is-warn'"
          >
            <span class="review-status">{{ item.ok ? 'Ready' : 'Action needed' }}</span>
            <div class="review-checklist__copy">
              <strong>{{ item.title }}</strong>
              <p>{{ item.detail }}</p>
            </div>
            <button
              v-if="!item.ok && item.canFix"
              type="button"
              class="review-inline-btn"
              @click="goToStep(item.step)"
            >
              Fix
            </button>
          </li>
        </ul>
      </section>

      <section v-if="showSaveProfile" class="review-section review-profile">
        <h4>Save profile</h4>
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
      </section>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type ReviewStepId = 'strategy' | 'calendars' | 'deck' | 'goals' | 'preferences' | 'dashboard'

const props = defineProps<{
  strategyTitle: string
  categoriesEnabled: boolean
  calendarTargetsEnabled: boolean
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
  themePreference: 'auto' | 'light' | 'dark'
  dashboardMode: 'quick' | 'standard' | 'pro'
  saveProfile: boolean
  profileName: string
  showSaveProfile: boolean
  setSaveProfile: (enabled: boolean) => void
  setProfileName: (value: string) => void
  goToStep: (step: ReviewStepId) => void
}>()

const totalTarget = computed(() => {
  if (props.categoriesEnabled && props.draftTargetsCategories.length) {
    return props.categoryTotalHours
  }
  if (Number.isFinite(props.totalHoursInput ?? NaN)) {
    return Number(props.totalHoursInput)
  }
  return Number.isFinite(props.draftTotalHours) ? Number(props.draftTotalHours) : 0
})

const dashboardLabel = computed(() => {
  if (props.dashboardMode === 'quick') return 'Empty layout'
  if (props.dashboardMode === 'pro') return 'Advanced layout'
  return 'Standard layout'
})

const themeLabel = computed(() => {
  if (props.themePreference === 'light') return 'Light theme'
  if (props.themePreference === 'dark') return 'Dark theme'
  return 'Follow Nextcloud theme'
})

const strategyLine = computed(() => {
  if (props.categoriesEnabled) {
    return 'Calendar + Category Goals with category targets, per-calendar hours, and assignments.'
  }
  if (props.calendarTargetsEnabled) {
    return 'Calendar Goals with per-calendar weekly targets.'
  }
  return 'Single Goal with one overall weekly target.'
})

const calendarsLine = computed(() => {
  if (!props.selectedCalendars.length) return 'No calendars selected yet.'
  const labels = props.selectedCalendars.slice(0, 3).map((cal) => cal.displayname)
  const more = props.selectedCalendars.length - labels.length
  return more > 0 ? `${labels.join(', ')} +${more} more` : labels.join(', ')
})

const goalsLine = computed(() => {
  if (props.categoriesEnabled && props.draftTargetsCategories.length) {
    const preview = props.draftTargetsCategories.slice(0, 3).map((cat) => `${cat.label} ${cat.targetHours}h`)
    const more = props.draftTargetsCategories.length - preview.length
    return `${preview.join(' · ')}${more > 0 ? ` · +${more} more` : ''} · Total ${totalTarget.value.toFixed(1)} h / week`
  }
  if (props.calendarTargetsEnabled) {
    return `Per-calendar goals with ${totalTarget.value.toFixed(1)} h / week total.`
  }
  return `${totalTarget.value.toFixed(1)} h / week total goal.`
})

const deckLine = computed(() => {
  if (!props.deckEnabled) return 'Deck hidden in this setup.'
  if (!props.deckVisibleBoards.length) return props.deckReviewSummary
  const names = props.deckVisibleBoards.slice(0, 2).map((board) => board.title)
  const more = props.deckVisibleBoards.length - names.length
  return more > 0 ? `${names.join(', ')} +${more} more` : names.join(', ')
})

const preferencesLine = computed(() => `${themeLabel.value} · ${props.reportingEnabled ? props.reportingSummary : 'Recap disabled'}`)

const dashboardLine = computed(() => `${dashboardLabel.value} with the selected widget and tab preset.`)

const readinessChecks = computed(() => {
  const checks: Array<{ id: string; title: string; detail: string; ok: boolean; step: ReviewStepId; canFix: boolean }> = []
  checks.push({
    id: 'calendars',
    title: 'Calendars selected',
    detail:
      props.selectedCalendars.length > 0
        ? `${props.selectedCalendars.length} calendar${props.selectedCalendars.length === 1 ? '' : 's'} selected.`
        : 'Select at least one calendar to generate data.',
    ok: props.selectedCalendars.length > 0,
    step: 'calendars',
    canFix: true,
  })
  checks.push({
    id: 'targets',
    title: 'Targets configured',
    detail:
      totalTarget.value > 0
        ? `${totalTarget.value.toFixed(1)} h weekly target configured.`
        : 'Set a weekly target greater than 0 hours.',
    ok: totalTarget.value > 0,
    step: 'goals',
    canFix: true,
  })
  checks.push({
    id: 'deck',
    title: 'Deck visibility',
    detail:
      !props.deckEnabled || props.deckVisibleBoards.length > 0
        ? props.deckEnabled
          ? `${props.deckVisibleBoards.length} board${props.deckVisibleBoards.length === 1 ? '' : 's'} visible in Deck tab.`
          : 'Deck tab disabled by choice.'
        : 'Deck tab is enabled but no boards are visible.',
    ok: !props.deckEnabled || props.deckVisibleBoards.length > 0,
    step: 'deck',
    canFix: true,
  })
  checks.push({
    id: 'profile',
    title: 'Profile backup',
    detail:
      !props.showSaveProfile || !props.saveProfile || props.profileName.trim().length > 0
        ? props.saveProfile
          ? `Profile "${props.profileName.trim()}" will be saved.`
          : 'No extra profile backup requested.'
        : 'Save profile is enabled but the profile name is empty.',
    ok: !props.showSaveProfile || !props.saveProfile || props.profileName.trim().length > 0,
    step: 'preferences',
    canFix: false,
  })
  return checks
})

</script>
