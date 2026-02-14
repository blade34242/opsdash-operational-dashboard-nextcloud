<template>
  <section class="review-hero">
    <h3>Review your setup</h3>
    <p class="hint">{{ heroHint }}</p>
    <div class="review-chip-row">
      <span class="review-chip">{{ strategyTitle }}</span>
      <span class="review-chip">{{ dashboardLabel }}</span>
      <span class="review-chip">{{ themeLabel }}</span>
      <span class="review-chip">{{ selectedCalendars.length }} calendar{{ selectedCalendars.length === 1 ? '' : 's' }}</span>
      <span class="review-chip">{{ totalTarget.toFixed(1) }} h / week</span>
    </div>
  </section>

  <div class="review-layout">
    <div class="review-main">
      <section class="review-section">
        <h4>Configuration overview</h4>
        <div class="review-card-grid">
          <article class="review-card">
            <div class="review-card__head">
              <h5>Strategy</h5>
              <button type="button" class="review-edit-link" @click="goToStep('strategy')">Edit</button>
            </div>
            <p class="review-card__value">{{ strategyTitle }}</p>
            <p class="review-card__meta">
              {{ categoriesEnabled ? 'Category targets and calendar assignments are enabled.' : 'Single total weekly target mode.' }}
            </p>
          </article>

          <article class="review-card">
            <div class="review-card__head">
              <h5>Calendars</h5>
              <button type="button" class="review-edit-link" @click="goToStep('calendars')">Edit</button>
            </div>
            <p class="review-card__value">{{ selectedCalendars.length }} selected</p>
            <ul v-if="selectedCalendars.length" class="review-list">
              <li v-for="cal in selectedCalendars.slice(0, 3)" :key="cal.id">{{ cal.displayname }}</li>
              <li v-if="selectedCalendars.length > 3">+{{ selectedCalendars.length - 3 }} more</li>
            </ul>
            <p v-else class="review-card__meta">No calendars selected yet.</p>
          </article>

          <article class="review-card">
            <div class="review-card__head">
              <h5>Targets</h5>
              <button
                type="button"
                class="review-edit-link"
                @click="goToStep(categoriesEnabled ? 'categories' : 'preferences')"
              >
                Edit
              </button>
            </div>
            <p class="review-card__value">{{ totalTarget.toFixed(1) }} h / week</p>
            <ul v-if="categoriesEnabled && draftTargetsCategories.length" class="review-list">
              <li v-for="cat in draftTargetsCategories.slice(0, 4)" :key="cat.id">{{ cat.label }} - {{ cat.targetHours }} h</li>
              <li v-if="draftTargetsCategories.length > 4">+{{ draftTargetsCategories.length - 4 }} more</li>
            </ul>
            <p v-else class="review-card__meta">Total target mode with one weekly goal.</p>
          </article>

          <article class="review-card">
            <div class="review-card__head">
              <h5>Preferences</h5>
              <button type="button" class="review-edit-link" @click="goToStep('preferences')">Edit</button>
            </div>
            <p class="review-card__value">{{ themeLabel }}</p>
            <p class="review-card__meta">{{ reportingEnabled ? reportingSummary : 'Recap disabled' }}</p>
          </article>

          <article class="review-card">
            <div class="review-card__head">
              <h5>Deck tab</h5>
              <button type="button" class="review-edit-link" @click="goToStep('deck')">Edit</button>
            </div>
            <p class="review-card__value">{{ deckReviewSummary }}</p>
            <ul v-if="deckEnabled && deckVisibleBoards.length" class="review-list">
              <li v-for="board in deckVisibleBoards.slice(0, 3)" :key="board.id">{{ board.title }}</li>
              <li v-if="deckVisibleBoards.length > 3">+{{ deckVisibleBoards.length - 3 }} more</li>
            </ul>
          </article>

          <article class="review-card">
            <div class="review-card__head">
              <h5>Dashboard</h5>
              <button type="button" class="review-edit-link" @click="goToStep('dashboard')">Edit</button>
            </div>
            <p class="review-card__value">{{ dashboardLabel }}</p>
            <p class="review-card__meta">Widgets and tabs will follow this selected layout.</p>
          </article>
        </div>
      </section>

      <section class="review-section">
        <h4>Readiness checks</h4>
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
    </div>

    <aside class="review-side">
      <section class="review-section">
        <h4>Quick edits</h4>
        <div class="review-actions">
          <button type="button" class="review-action-btn" @click="goToStep('strategy')">Strategy</button>
          <button type="button" class="review-action-btn" @click="goToStep('calendars')">Calendars</button>
          <button
            type="button"
            class="review-action-btn"
            @click="goToStep(categoriesEnabled ? 'categories' : 'preferences')"
          >
            Targets
          </button>
          <button type="button" class="review-action-btn" @click="goToStep('preferences')">Preferences</button>
          <button type="button" class="review-action-btn" @click="goToStep('deck')">Deck</button>
          <button type="button" class="review-action-btn" @click="goToStep('dashboard')">Dashboard</button>
        </div>
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

type ReviewStepId = 'strategy' | 'dashboard' | 'calendars' | 'categories' | 'preferences' | 'deck'

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
  if (props.dashboardMode === 'quick') return 'Compact layout'
  if (props.dashboardMode === 'pro') return 'Workspace layout'
  return 'Standard layout'
})

const themeLabel = computed(() => {
  if (props.themePreference === 'light') return 'Light theme'
  if (props.themePreference === 'dark') return 'Dark theme'
  return 'Follow Nextcloud theme'
})

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
    step: props.categoriesEnabled ? 'categories' : 'preferences',
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

const heroHint = computed(() => {
  const issues = readinessChecks.value.filter((item) => !item.ok).length
  if (issues === 0) {
    return 'Everything looks good. You can start the dashboard now or quickly edit any section.'
  }
  if (issues === 1) {
    return 'One thing still needs attention before your setup is complete.'
  }
  return `${issues} things still need attention before your setup is complete.`
})
</script>
