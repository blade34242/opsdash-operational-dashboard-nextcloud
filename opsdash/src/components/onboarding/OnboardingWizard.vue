<template>
  <transition name="onboarding-fade">
    <div v-if="visible" class="onboarding-overlay" role="dialog" aria-modal="true">
      <div class="onboarding-backdrop" @click="handleClose"></div>
      <div class="onboarding-panel" :class="`theme-${previewTheme}`" @click.stop>
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
              :profile-mode="profileMode"
              :set-profile-mode="setProfileMode"
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
            :calendar-targets="calendarTargets"
            :get-calendar-target="getCalendarTarget"
            :set-calendar-target="setCalendarTarget"
            :show-calendar-targets="calendarTargetsEnabled"
          />
        </section>

        <section v-else-if="currentStep === 'categories'" class="onboarding-step">
          <OnboardingCategoriesStep
            :categories-enabled="categoriesEnabled"
            :categories="categories"
            :category-total-hours="categoryTotalHours"
            :selected-calendars="selectedCalendars"
            :assignments="assignments"
            :show-calendar-targets="calendarTargetsEnabled"
            :calendar-targets="calendarTargets"
            :get-calendar-target="getCalendarTarget"
            :set-calendar-target="setCalendarTarget"
            :add-category="addCategory"
            :remove-category="removeCategory"
            :set-category-label="setCategoryLabel"
            :category-presets="categoryPresets"
            :apply-category-preset="applyCategoryPreset"
            :set-category-target="setCategoryTarget"
            :set-category-pace-mode="setCategoryPaceMode"
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
            :categories-enabled="categoriesEnabled"
            :selected-calendars="selectedCalendars"
            :draft-targets-categories="draft.targetsConfig.categories"
            :draft-total-hours="draft.targetsConfig.totalHours"
            :total-hours-input="totalHoursInput"
            :category-total-hours="categoryTotalHours"
            :deck-review-summary="deckReviewSummary"
            :deck-enabled="deckSettingsDraft.enabled"
            :deck-visible-boards="deckVisibleBoards"
            :reporting-enabled="reportingDraft.enabled"
            :reporting-summary="reportingSummary"
            :theme-preference="themePreference"
            :dashboard-mode="dashboardMode"
            :save-profile="saveProfile"
            :profile-name="profileName"
            :show-save-profile="props.hasExistingConfig ?? false"
            :set-save-profile="setSaveProfile"
            :set-profile-name="setProfileName"
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
          :disabled="saving || nextDisabled"
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
import OnboardingIntroStep from './OnboardingIntroStep.vue'
import OnboardingPreferencesStep from './OnboardingPreferencesStep.vue'
import OnboardingDashboardStep from './OnboardingDashboardStep.vue'
import OnboardingStrategyStep from './OnboardingStrategyStep.vue'
import OnboardingCalendarsStep from './OnboardingCalendarsStep.vue'
import OnboardingCategoriesStep from './OnboardingCategoriesStep.vue'
import OnboardingReviewStep from './OnboardingReviewStep.vue'
import type { CalendarSummary, CategoryDraft, StrategyDefinition } from '../../services/onboarding'
import type { DeckFeatureSettings, ReportingConfig } from '../../services/reporting'
import type { TargetsConfig } from '../../services/targets'
import { useOnboardingWizard } from '../../../composables/useOnboardingWizard'

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
  initialCategories?: CategoryDraft[]
  initialAssignments?: Record<string, string>
  snapshotSaving?: boolean
  snapshotNotice?: { type: 'success' | 'error'; message: string } | null
  initialDashboardMode?: 'quick' | 'standard' | 'pro'
  initialTargetsWeek?: Record<string, number>
  initialTargetsConfig?: {
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
    dashboardMode: 'quick' | 'standard' | 'pro'
    saveProfile?: boolean
    profileName?: string
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
  profileMode,
  saveProfile,
  profileName,
  themePreference,
  systemThemeLabel,
  previewTheme,
  totalHoursInput,
  categoryTotalHours,
  categoriesEnabled,
  calendarTargetsEnabled,
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
  dashboardMode,
  dashboardPresets,
  strategies,
  selectedStrategy,
  localSelection,
  toggleCalendar,
  categories,
  selectedCalendars,
  assignments,
  calendarTargets,
  addCategory,
  removeCategory,
  setCategoryLabel,
  setCategoryTarget,
  setCategoryPaceMode,
  toggleCategoryWeekend,
  assignCalendar,
  setCalendarTarget,
  getCalendarTarget,
  openColorId,
  toggleColorPopover,
  closeColorPopover,
  categoryColorPalette,
  categoryPresets,
  resolvedColor,
  applyColor,
  onColorInput,
  draft,
  strategyTitle,
  applyCategoryPreset,
  deckReviewSummary,
  deckVisibleBoards,
  reportingSummary,
  setProfileMode,
  setSaveProfile,
  setProfileName,
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
  border: 1px solid color-mix(in oklab, var(--brand, #2563eb), var(--line, #e2e8f0) 70%);
  border-radius: 14px;
  box-shadow:
    0 18px 48px rgba(15, 23, 42, 0.35),
    inset 0 0 0 1px color-mix(in oklab, var(--brand, #2563eb), transparent 82%);
  display: flex;
  flex-direction: column;
  padding: 24px 28px;
}

.onboarding-panel.theme-light {
  color: #0f172a;
  background: #ffffff;
}

.onboarding-panel.theme-dark {
  --color-main-background: #0f172a;
  --color-background-contrast: #111827;
  --color-text: #e5e7eb;
  --color-text-maxcontrast: #e5e7eb;
  --color-text-light: #94a3b8;
  --color-border: #1f2937;
  --color-primary-element: #60a5fa;
  --color-primary: #60a5fa;
  color: #e5e7eb;
  background: #0f172a;
  box-shadow:
    0 18px 48px rgba(0, 0, 0, 0.5),
    inset 0 0 0 1px color-mix(in oklab, var(--brand, #60a5fa), transparent 82%);
}

.onboarding-panel.theme-dark .hint,
.onboarding-panel.theme-dark .subtitle,
.onboarding-panel.theme-dark .step-pill {
  color: #94a3b8;
}

.onboarding-panel.theme-dark h2,
.onboarding-panel.theme-dark h3,
.onboarding-panel.theme-dark h4,
.onboarding-panel.theme-dark p,
.onboarding-panel.theme-dark li {
  color: #e5e7eb;
}

.onboarding-panel.theme-dark .step-pill {
  background: #111827;
  border-color: #1f2937;
}

.onboarding-panel.theme-dark .step-pill.active {
  color: #93c5fd;
  border-color: rgba(96, 165, 250, 0.6);
  background: rgba(96, 165, 250, 0.18);
}

.onboarding-panel.theme-dark input,
.onboarding-panel.theme-dark select,
.onboarding-panel.theme-dark textarea {
  background: #111827;
  color: #e5e7eb;
  border: 1px solid #1f2937;
}

.onboarding-panel.theme-dark .calendar-item {
  background: #0b1220;
  border-color: #1f2937;
}

.onboarding-panel.theme-dark .category-card,
.onboarding-panel.theme-dark .pref-card,
.onboarding-panel.theme-dark .strategy-card {
  background: #111827;
  border-color: #1f2937;
}

.onboarding-panel.theme-dark .mode-card,
.onboarding-panel.theme-dark .input-unit,
.onboarding-panel.theme-dark .empty-state {
  background: linear-gradient(135deg, #0b1220 0%, #111827 70%);
  border-color: #223046;
}
.onboarding-panel.theme-dark .mode-card {
  color: #e5e7eb;
}

.onboarding-panel.theme-dark .mode-card.active {
  border-color: rgba(96, 165, 250, 0.9);
  box-shadow: 0 18px 32px rgba(0, 0, 0, 0.55);
  background: linear-gradient(135deg, #0f172a 0%, #1f2937 70%);
}

.onboarding-panel.theme-dark .mode-card::before {
  opacity: 0.6;
}

.onboarding-panel.theme-dark .mode-card span {
  color: #cbd5f5;
}

.onboarding-panel.theme-dark .mode-card:hover {
  border-color: rgba(96, 165, 250, 0.75);
  box-shadow: 0 16px 30px rgba(0, 0, 0, 0.5);
}

.onboarding-panel.theme-light .mode-card span {
  color: #475569;
}

.onboarding-panel.theme-dark .input-unit .unit {
  background: #0b1220;
  color: #94a3b8;
}

.onboarding-panel.theme-dark .config-warning {
  border-color: rgba(251, 146, 60, 0.5);
  background: rgba(251, 146, 60, 0.12);
}

.onboarding-panel.theme-dark .config-warning p {
  color: #fde68a;
}

.onboarding-panel.theme-dark .snapshot-notice--success {
  background: rgba(34, 197, 94, 0.18);
  color: #bbf7d0;
}

.onboarding-panel.theme-dark .snapshot-notice--error {
  background: rgba(239, 68, 68, 0.2);
  color: #fecaca;
}

.onboarding-panel.theme-dark .close-btn {
  color: #cbd5f5;
}

.onboarding-panel.theme-dark .close-btn:hover {
  color: #93c5fd;
}

.onboarding-panel.theme-dark .color-popover {
  background: #0b1220;
  border-color: #1f2937;
}

.onboarding-panel.theme-dark .color-link {
  color: #93c5fd;
}

.onboarding-panel.theme-dark .review-grid h5 {
  color: #e2e8f0;
}

.onboarding-panel.theme-dark .warning {
  background: rgba(248, 113, 113, 0.12);
  border-color: rgba(248, 113, 113, 0.4);
  color: #fecaca;
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

.onboarding-overlay .review-profile {
  display: grid;
  gap: 8px;
}

.onboarding-overlay .onboarding-mode {
  margin: 16px 0;
}

.onboarding-overlay .mode-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.onboarding-overlay .mode-card {
  position: relative;
  border: 1px solid var(--color-border);
  background: linear-gradient(
    135deg,
    color-mix(in oklab, var(--color-background-contrast, #ffffff), #ffffff 92%),
    color-mix(in oklab, var(--color-background-contrast, #ffffff), var(--color-primary, #2563eb) 8%)
  );
  border-radius: 10px;
  padding: 12px 14px;
  text-align: left;
  cursor: pointer;
  display: grid;
  gap: 6px;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.onboarding-overlay .mode-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(
    180deg,
    color-mix(in oklab, var(--color-primary, #2563eb), #ffffff 35%),
    color-mix(in oklab, var(--color-primary, #2563eb), #000000 15%)
  );
  opacity: 0.35;
}

.onboarding-overlay .mode-card strong {
  font-size: 0.98rem;
}

.onboarding-overlay .mode-card span {
  font-size: 0.85rem;
  color: var(--color-text-light, #475569);
}

.onboarding-overlay .mode-card:hover {
  border-color: color-mix(in oklab, var(--color-primary, #2563eb), transparent 35%) !important;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.14);
  transform: translateY(-1px);
}

.onboarding-overlay .mode-card.active {
  border-color: var(--color-primary, #2563eb) !important;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.15);
  transform: translateY(-1px);
}

.onboarding-overlay .mode-card.active::before {
  opacity: 0.9;
  width: 6px;
}

.onboarding-overlay .mode-card:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--brand, #2563eb), transparent 45%);
  outline-offset: 2px;
}

.onboarding-overlay .categories-editor {
  display: grid;
  gap: 16px;
}

.onboarding-overlay .category-presets {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
}

.onboarding-overlay .preset-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.onboarding-overlay .preset-card {
  text-align: left;
  border: 1px solid var(--color-border);
  background: var(--color-background-contrast);
  border-radius: 12px;
  padding: 12px 14px;
  display: grid;
  gap: 6px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.onboarding-overlay .preset-card:hover {
  border-color: color-mix(in oklab, var(--color-primary), transparent 40%);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
  transform: translateY(-1px);
}

.onboarding-overlay .preset-card:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--brand, #2563eb), transparent 45%);
  outline-offset: 2px;
}

.onboarding-overlay .preset-title {
  font-weight: 600;
}

.onboarding-overlay .preset-desc {
  font-size: 0.85rem;
  color: var(--color-text-light);
}

.onboarding-overlay .preset-swatches {
  display: flex;
  gap: 6px;
  align-items: center;
}

.onboarding-overlay .preset-swatch {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 30%);
}

.onboarding-overlay .empty-state {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px dashed color-mix(in oklab, var(--color-border), transparent 30%);
  background: color-mix(in oklab, var(--color-background-contrast), transparent 20%);
  color: var(--color-text-light);
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
  flex-wrap: wrap;
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
  min-width: 180px;
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

.onboarding-overlay .color-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-background-contrast);
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--color-text);
  cursor: pointer;
}

.onboarding-overlay .color-button:hover {
  border-color: color-mix(in oklab, var(--color-primary), transparent 35%);
}

.onboarding-overlay .color-button:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--brand, #2563eb), transparent 45%);
  outline-offset: 2px;
}

.onboarding-overlay .color-button .category-color-indicator {
  width: 12px;
  height: 12px;
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

.onboarding-overlay .input-unit {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-background-contrast);
}

.onboarding-overlay .input-unit input {
  border: none;
  padding: 7px 10px;
  background: transparent;
}

.onboarding-overlay .input-unit .unit {
  padding: 6px 10px;
  font-size: 0.75rem;
  color: var(--color-text-light);
  background: color-mix(in oklab, var(--color-border), transparent 70%);
  white-space: nowrap;
}

.onboarding-overlay .field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.onboarding-overlay .field .label {
  font-size: 0.8rem;
  color: var(--color-text-light);
}

.onboarding-overlay .field-hint {
  display: block;
  margin-top: 4px;
  font-size: 0.75rem;
  color: var(--color-text-light);
}

.onboarding-overlay .calendar-assignments {
  margin-top: 24px;
  display: grid;
  gap: 12px;
}

.onboarding-overlay .calendar-targets {
  margin-top: 16px;
  display: grid;
  gap: 12px;
}

.onboarding-overlay .assignment-row {
  display: grid;
  grid-template-columns: 1fr minmax(160px, 220px) auto;
  gap: 12px;
  align-items: center;
}

.onboarding-overlay .target-row {
  display: grid;
  grid-template-columns: 1fr minmax(150px, 200px);
  gap: 12px;
  align-items: center;
}

.onboarding-overlay .assignment-row select {
  padding: 6px 8px;
}

.onboarding-overlay .cal-name {
  font-size: 0.95rem;
}

.onboarding-overlay .assignment-warning {
  font-size: 0.75rem;
  color: var(--color-error);
}

.onboarding-overlay .assignment-row.is-unassigned select {
  border-color: color-mix(in oklab, var(--color-error), transparent 50%);
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

.onboarding-overlay .toggle-row {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 0.95rem;
}

.onboarding-overlay .toggle-row input[type="checkbox"] {
  transform: scale(1.05);
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
