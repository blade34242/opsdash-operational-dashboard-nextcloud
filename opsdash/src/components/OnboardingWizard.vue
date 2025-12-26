<template>
  <transition name="onboarding-fade">
    <div v-if="visible" class="onboarding-overlay" role="dialog" aria-modal="true">
      <div class="onboarding-backdrop" @click="handleClose"></div>
      <div class="onboarding-panel" @click.stop>
        <header class="onboarding-header">
          <div class="onboarding-title">
            <h2>Welcome to Opsdash</h2>
            <p class="subtitle">Step {{ stepNumber }} of {{ totalSteps }}</p>
          </div>
          <div class="onboarding-actions">
            <button type="button" class="skip-link" @click="handleSkip" :disabled="saving">Maybe later</button>
            <button
              v-if="isClosable"
              type="button"
              class="close-btn"
              :disabled="saving"
              @click="handleClose"
              aria-label="Close onboarding"
            >
              ×
            </button>
          </div>
        </header>

        <nav class="onboarding-step-nav" aria-label="Onboarding steps">
          <button
            v-for="step in enabledSteps"
            :key="step"
            type="button"
            class="step-pill"
            :class="{ active: step === currentStep }"
            :disabled="saving"
            @click="goToStep(step)"
          >
            {{ stepLabel(step) }}
          </button>
        </nav>

        <main class="onboarding-body">
          <section v-if="currentStep === 'intro'" class="onboarding-step">
            <OnboardingIntroStep
              :has-existing-config="props.hasExistingConfig ?? false"
              :snapshot-saving="props.snapshotSaving ?? false"
              :saving="saving"
              :snapshot-notice="props.snapshotNotice ?? null"
              :on-save-current-config="() => emit('save-current-config')"
            />
          </section>

        <section v-else-if="currentStep === 'preferences'" class="onboarding-step">
          <OnboardingPreferencesStep
            :theme-preference="themePreference"
            :system-theme-label="systemThemeLabel"
            :preview-theme="previewTheme"
            :set-theme-preference="(value) => (themePreference = value)"
            :total-hours-input="totalHoursInput"
            :category-total-hours="categoryTotalHours"
            :categories-enabled="categoriesEnabled"
            :on-total-hours-change="onTotalHoursChange"
            :all-day-hours-input="allDayHoursInput"
            :on-all-day-hours-change="onAllDayHoursChange"
            :trend-lookback-input="trendLookbackInput"
            :on-trend-lookback-change="onTrendLookbackChange"
            :deck-settings-draft="deckSettingsDraft"
            :set-deck-enabled="setDeckEnabled"
            :deck-boards="deckBoards"
            :deck-boards-loading="deckBoardsLoading"
            :deck-boards-error="deckBoardsError"
            :is-deck-board-visible="isDeckBoardVisible"
            :toggle-deck-board="toggleDeckBoard"
            :reporting-draft="reportingDraft"
            :set-reporting-enabled="setReportingEnabled"
            :set-reporting-schedule="setReportingSchedule"
            :set-reporting-interim="setReportingInterim"
            :update-reporting="updateReporting"
            :activity-draft="activityDraft"
            :set-activity-day-off="setActivityDayOff"
          />
        </section>

        <section v-else-if="currentStep === 'dashboard'" class="onboarding-step">
          <OnboardingDashboardStep
            :dashboard-mode="dashboardMode"
            :set-dashboard-mode="(mode) => (dashboardMode = mode)"
            :dashboard-presets="dashboardPresets"
          />
        </section>

        <section v-else-if="currentStep === 'strategy'" class="onboarding-step">
          <OnboardingStrategyStep
            :strategies="strategies"
            :selected-strategy="selectedStrategy"
            :set-selected-strategy="(id) => (selectedStrategy = id)"
          />
        </section>

        <section v-else-if="currentStep === 'calendars'" class="onboarding-step">
          <OnboardingCalendarsStep
            :calendars="calendars"
            :local-selection="localSelection"
            :toggle-calendar="toggleCalendar"
          />
        </section>

        <section v-else-if="currentStep === 'categories'" class="onboarding-step">
          <OnboardingCategoriesStep
            :categories-enabled="categoriesEnabled"
            :categories="categories"
            :category-total-hours="categoryTotalHours"
            :selected-calendars="selectedCalendars"
            :assignments="assignments"
            :add-category="addCategory"
            :remove-category="removeCategory"
            :set-category-label="setCategoryLabel"
            :set-category-target="setCategoryTarget"
            :toggle-category-weekend="toggleCategoryWeekend"
            :assign-calendar="assignCalendar"
            :open-color-id="openColorId"
            :toggle-color-popover="toggleColorPopover"
            :close-color-popover="closeColorPopover"
            :category-color-palette="categoryColorPalette"
            :resolved-color="resolvedColor"
            :apply-color="applyColor"
            :on-color-input="onColorInput"
          />
        </section>

        <section v-else-if="currentStep === 'review'" class="onboarding-step">
          <OnboardingReviewStep
            :strategy-title="strategyTitle"
            :selected-calendars="selectedCalendars"
            :draft-targets-categories="draft.targetsConfig.categories"
            :draft-total-hours="draft.targetsConfig.totalHours"
            :category-total-hours="categoryTotalHours"
            :deck-review-summary="deckReviewSummary"
            :deck-enabled="deckSettingsDraft.enabled"
            :deck-visible-boards="deckVisibleBoards"
            :reporting-enabled="reportingDraft.enabled"
            :reporting-summary="reportingSummary"
            :show-day-off-trend="activityDraft.showDayOffTrend"
          />
        </section>
      </main>

      <footer class="onboarding-footer">
        <NcButton v-if="canGoBack" type="tertiary" :disabled="saving" @click="prevStep">Back</NcButton>
        <NcButton type="tertiary" :disabled="saving || nextDisabled" @click="emitSaveStep">Save step</NcButton>
        <NcButton v-if="canGoNext" type="primary" :disabled="nextDisabled || saving" @click="nextStep">Continue</NcButton>
        <NcButton
          v-else
          type="primary"
          :disabled="saving"
          @click="emitComplete"
        >
          Start dashboard
        </NcButton>
      </footer>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { NcButton } from '@nextcloud/vue'
import OnboardingIntroStep from './onboarding/OnboardingIntroStep.vue'
import OnboardingPreferencesStep from './onboarding/OnboardingPreferencesStep.vue'
import OnboardingDashboardStep from './onboarding/OnboardingDashboardStep.vue'
import OnboardingStrategyStep from './onboarding/OnboardingStrategyStep.vue'
import OnboardingCalendarsStep from './onboarding/OnboardingCalendarsStep.vue'
import OnboardingCategoriesStep from './onboarding/OnboardingCategoriesStep.vue'
import OnboardingReviewStep from './onboarding/OnboardingReviewStep.vue'
import type { CalendarSummary, StrategyDefinition } from '../services/onboarding'
import type { DeckFeatureSettings, ReportingConfig } from '../services/reporting'
import type { ActivityCardConfig, TargetsConfig } from '../services/targets'
import { useOnboardingWizard } from '../../composables/useOnboardingWizard'

const props = defineProps<{
  visible: boolean
  calendars: CalendarSummary[]
  initialSelection: string[]
  initialStrategy?: StrategyDefinition['id']
  startStep?: 'intro' | 'strategy' | 'dashboard' | 'calendars' | 'categories' | 'preferences' | 'review' | null
  onboardingVersion: number
  saving?: boolean
  closable?: boolean
  initialThemePreference?: 'auto' | 'light' | 'dark'
  systemTheme?: 'light' | 'dark'
  initialAllDayHours?: number
  initialTotalHours?: number
  initialDeckSettings?: DeckFeatureSettings
  initialReportingConfig?: ReportingConfig
  hasExistingConfig?: boolean
  snapshotSaving?: boolean
  snapshotNotice?: { type: 'success' | 'error'; message: string } | null
  initialDashboardMode?: 'quick' | 'standard' | 'pro'
  initialTargetsConfig?: {
    activityCard?: Pick<ActivityCardConfig, 'showDayOffTrend'>
    balanceTrendLookback?: number
  } | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'skip'): void
  (e: 'complete', payload: {
    strategy: StrategyDefinition['id']
    selected: string[]
    targetsConfig: TargetsConfig
    groups: Record<string, number>
    targetsWeek: Record<string, number>
    targetsMonth: Record<string, number>
    themePreference: 'auto' | 'light' | 'dark'
    deckSettings: DeckFeatureSettings
    reportingConfig: ReportingConfig
    activityCard: Pick<ActivityCardConfig, 'showDayOffTrend'>
    dashboardMode: 'quick' | 'standard' | 'pro'
  }): void
  (e: 'save-step', payload: Record<string, unknown>): void
  (e: 'save-current-config'): void
}>()

const {
  stepNumber,
  totalSteps,
  enabledSteps,
  currentStep,
  isClosable,
  saving,
  stepLabel,
  goToStep,
  handleClose,
  handleSkip,
  canGoBack,
  canGoNext,
  nextDisabled,
  prevStep,
  nextStep,
  emitComplete,
  themePreference,
  systemThemeLabel,
  previewTheme,
  totalHoursInput,
  categoryTotalHours,
  categoriesEnabled,
  onTotalHoursChange,
  allDayHoursInput,
  onAllDayHoursChange,
  trendLookbackInput,
  onTrendLookbackChange,
  deckSettingsDraft,
  setDeckEnabled,
  deckBoards,
  deckBoardsLoading,
  deckBoardsError,
  isDeckBoardVisible,
  toggleDeckBoard,
  reportingDraft,
  setReportingEnabled,
  setReportingSchedule,
  setReportingInterim,
  updateReporting,
  activityDraft,
  setActivityDayOff,
  dashboardMode,
  dashboardPresets,
  strategies,
  selectedStrategy,
  localSelection,
  toggleCalendar,
  categories,
  selectedCalendars,
  assignments,
  addCategory,
  removeCategory,
  setCategoryLabel,
  setCategoryTarget,
  toggleCategoryWeekend,
  assignCalendar,
  openColorId,
  toggleColorPopover,
  closeColorPopover,
  categoryColorPalette,
  resolvedColor,
  applyColor,
  onColorInput,
  draft,
  strategyTitle,
  deckReviewSummary,
  deckVisibleBoards,
  reportingSummary,
  buildStepPayload,
} = useOnboardingWizard({ props, emit })

function emitSaveStep() {
  emit('save-step', buildStepPayload(currentStep.value))
}

</script>

<style>
.onboarding-fade-enter-active,
.onboarding-fade-leave-active {
  transition: opacity 0.2s ease;
}

.onboarding-fade-enter-from,
.onboarding-fade-leave-to {
  opacity: 0;
}

.onboarding-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.onboarding-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
}

.onboarding-panel {
  position: relative;
  z-index: 1;
  width: min(960px, 100%);
  max-height: calc(100vh - 48px);
  background: var(--color-main-background, #fff);
  border-radius: 12px;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.35);
  display: flex;
  flex-direction: column;
  padding: 24px 28px;
}

.onboarding-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 16px;
}

.onboarding-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.onboarding-title h2 {
  margin: 0;
  font-size: 1.6rem;
}

.onboarding-title .subtitle {
  margin: 4px 0 0;
  color: var(--color-text-light);
}

.onboarding-overlay .skip-link {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: 0.95rem;
}

.onboarding-overlay .close-btn {
  background: none;
  border: none;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  color: var(--color-text-light);
}

.onboarding-overlay .close-btn:hover {
  color: var(--color-primary);
}

.onboarding-step-nav{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  margin:0 0 12px;
}
.onboarding-overlay .step-pill{
  border:1px solid var(--color-border);
  background:var(--color-background-contrast);
  padding:6px 10px;
  border-radius:999px;
  font-size:12px;
  cursor:pointer;
  color:var(--color-text);
}
.onboarding-overlay .step-pill.active{
  border-color:var(--color-primary);
  color:var(--color-primary);
  background:rgba(37,99,235,0.08);
}
.onboarding-overlay .step-pill:disabled{
  opacity:0.6;
  cursor:default;
}

.onboarding-body {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
  margin-right: -8px;
}

.onboarding-step h3 {
  margin-top: 0;
}

.onboarding-overlay .highlights {
  padding-left: 18px;
}

.onboarding-overlay .config-warning {
  border: 1px solid color-mix(in srgb, var(--color-warning, #f97316) 35%, transparent);
  background: color-mix(in srgb, var(--color-warning, #f97316) 12%, transparent);
  border-radius: 8px;
  padding: 12px;
  margin: 12px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.onboarding-overlay .config-warning p {
  margin: 0;
  font-size: 0.95rem;
  color: var(--color-text);
}

.onboarding-overlay .hint {
  color: var(--color-text-light);
  margin-top: 12px;
}

.onboarding-overlay .snapshot-notice {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 0.9rem;
}

.onboarding-overlay .snapshot-notice--success {
  background: color-mix(in srgb, #22c55e 15%, transparent);
  color: #14532d;
}

.onboarding-overlay .snapshot-notice--error {
  background: color-mix(in srgb, #ef4444 15%, transparent);
  color: #7f1d1d;
}

.onboarding-overlay .strategy-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.onboarding-overlay .strategy-card {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.onboarding-overlay .strategy-card.active {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.onboarding-overlay .strategy-card h4 {
  margin: 0;
}

.onboarding-overlay .strategy-card .subtitle {
  color: var(--color-text-light);
  margin: 0;
}

.onboarding-overlay .strategy-card footer {
  margin-top: auto;
  font-size: 0.85rem;
  color: var(--color-text-light);
}

.onboarding-overlay .calendar-list {
  display: grid;
  gap: 8px;
  margin-top: 8px;
}

.onboarding-overlay .calendar-item {
  display: grid;
  grid-template-columns: auto auto 1fr;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.onboarding-overlay .calendar-item.checked {
  border-color: var(--color-primary);
}

.onboarding-overlay .calendar-item input {
  margin: 0;
}

.onboarding-overlay .calendar-item .dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.onboarding-overlay .warning {
  color: var(--color-error);
  margin-top: 12px;
}

.onboarding-overlay .review-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.onboarding-overlay .review-grid h5 {
  margin: 0 0 8px;
  font-size: 0.95rem;
  color: var(--color-text-light);
}

.onboarding-overlay .categories-editor {
  display: grid;
  gap: 16px;
}

.onboarding-overlay .category-card {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  background: var(--color-main-background, #fff);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.onboarding-overlay .category-card__header {
  display: flex;
  gap: 12px;
  align-items: center;
}

.onboarding-overlay .category-color-indicator {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 40%);
  flex-shrink: 0;
}

.onboarding-overlay .category-name {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.onboarding-overlay .category-actions {
  display: flex;
  gap: 8px;
}

.onboarding-overlay .remove-category {
  background: none;
  border: none;
  color: var(--color-text-light);
  cursor: pointer;
  font-size: 1.1rem;
}

.onboarding-overlay .remove-category:disabled {
  opacity: 0.4;
  cursor: default;
}

.onboarding-overlay .remove-category:not(:disabled):hover {
  color: var(--color-error);
}

.onboarding-overlay .category-card__fields {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.onboarding-overlay .color-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
}

.onboarding-overlay .color-link {
  align-self: flex-start;
  border: none;
  background: transparent;
  padding: 0;
  font-size: 12px;
  color: var(--brand, #2563eb);
  text-decoration: underline;
  cursor: pointer;
}

.onboarding-overlay .color-link:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--brand, #2563eb), transparent 45%);
  outline-offset: 2px;
}

.onboarding-overlay .color-popover {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 30;
  min-width: 160px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 30%);
  background: var(--color-main-background, #fff);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.25);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.onboarding-overlay .color-popover:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--brand, #2563eb), transparent 45%);
  outline-offset: 2px;
}

.onboarding-overlay .swatch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 20px));
  justify-content: flex-start;
  gap: 6px;
}

.onboarding-overlay .color-swatch {
  width: 18px;
  height: 18px;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  border: 1px solid color-mix(in oklab, #000, transparent 80%);
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.onboarding-overlay .color-swatch.active {
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--brand, #2563eb), transparent 55%);
}

.onboarding-overlay .color-swatch:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--brand, #2563eb), transparent 45%);
  outline-offset: 1px;
}

.onboarding-overlay .custom-color {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--color-text-light);
}

.onboarding-overlay .color-input {
  width: 44px;
  height: 26px;
  padding: 0;
  border-radius: 6px;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 40%);
  background: transparent;
}

.onboarding-overlay .add-category {
  justify-self: flex-start;
}

.onboarding-overlay .category-total {
  font-size: 0.9rem;
  color: var(--color-text-light);
}

.onboarding-overlay .calendar-assignments {
  margin-top: 24px;
  display: grid;
  gap: 12px;
}

.onboarding-overlay .assignment-row {
  display: grid;
  grid-template-columns: 1fr minmax(160px, 220px);
  gap: 12px;
  align-items: center;
}

.onboarding-overlay .assignment-row select {
  padding: 6px 8px;
}

.onboarding-overlay .cal-name {
  font-size: 0.95rem;
}

.onboarding-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.onboarding-overlay .preferences-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.onboarding-overlay .pref-card {
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 30%);
  border-radius: 10px;
  padding: 12px;
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 6%);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.onboarding-overlay .pref-card h4 {
  margin: 0;
}

.onboarding-overlay .pref-card--deck .toggle-row {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 0.95rem;
}

.onboarding-overlay .pref-card--deck input[type="checkbox"] {
  transform: scale(1.05);
}

.onboarding-overlay .deck-board-list {
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 40%);
  border-radius: 8px;
  padding: 10px;
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 6%);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.onboarding-overlay .deck-board-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.onboarding-overlay .deck-board-option {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 0.9rem;
}

.onboarding-overlay .deck-status {
  font-size: 0.85rem;
  color: var(--color-text-light);
}

.onboarding-overlay .deck-status--error {
  color: var(--color-error);
}

.onboarding-overlay .pref-desc {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-light);
}

.onboarding-overlay .pref-hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-light);
}

.onboarding-overlay .theme-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.onboarding-overlay .theme-option {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 40%);
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 8%);
}

.onboarding-overlay .theme-option input[type="radio"] {
  margin-top: 4px;
}

.onboarding-overlay .theme-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.9rem;
}

.onboarding-overlay .theme-option__title {
  font-weight: 600;
  color: var(--color-text);
}

.onboarding-overlay .theme-option__desc {
  color: var(--color-text-light);
  font-size: 0.85rem;
}

.onboarding-overlay .theme-preview {
  font-size: 0.85rem;
  color: var(--color-text-light);
}

:global(body.opsdash-onboarding-lock) {
  overflow: hidden;
}
</style>
