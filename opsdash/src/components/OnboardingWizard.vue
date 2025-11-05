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

        <main class="onboarding-body">
          <section v-if="currentStep === 'intro'" class="onboarding-step">
            <h3>Opsdash visualises your calendar time and keeps goals on track.</h3>
          <ul class="highlights">
            <li>Targets — stay aligned with your weekly/monthly goals.</li>
            <li>Balance — ensure your focus areas get the right attention.</li>
            <li>Notes — capture insights and the story behind the numbers.</li>
          </ul>
          <div v-if="props.hasExistingConfig" class="config-warning">
            <p>
              You already have a dashboard configuration. Saving a preset now keeps a backup before onboarding applies new values.
            </p>
            <NcButton type="tertiary" size="small" @click="emit('save-current-config')">Save current setup as preset</NcButton>
          </div>
          <p class="hint">You can change configuration later from the Sidebar.</p>
        </section>

        <section v-else-if="currentStep === 'preferences'" class="onboarding-step">
          <h3>Final tweaks</h3>
          <p class="hint">You can change these options later from Config &amp; Setup.</p>
          <div class="preferences-grid">
            <article class="pref-card">
              <h4>Theme &amp; appearance</h4>
              <p class="pref-desc">Choose how Opsdash reacts to your Nextcloud theme. Charts keep their calendar colors.</p>
              <div class="theme-options" role="radiogroup" aria-label="Theme preference">
                <label class="theme-option">
                  <input
                    type="radio"
                    name="onboarding-theme"
                    value="auto"
                    :checked="themePreference === 'auto'"
                    @change="themePreference = 'auto'"
                  />
                  <div class="theme-copy">
                    <div class="theme-option__title">Follow Nextcloud</div>
                    <div class="theme-option__desc">Matches your account theme (currently {{ systemThemeLabel }}).</div>
                  </div>
                </label>
                <label class="theme-option">
                  <input
                    type="radio"
                    name="onboarding-theme"
                    value="light"
                    :checked="themePreference === 'light'"
                    @change="themePreference = 'light'"
                  />
                  <div class="theme-copy">
                    <div class="theme-option__title">Force light</div>
                    <div class="theme-option__desc">Always use the light palette, even if Nextcloud switches to dark.</div>
                  </div>
                </label>
                <label class="theme-option">
                  <input
                    type="radio"
                    name="onboarding-theme"
                    value="dark"
                    :checked="themePreference === 'dark'"
                    @change="themePreference = 'dark'"
                  />
                  <div class="theme-copy">
                    <div class="theme-option__title">Force dark</div>
                    <div class="theme-option__desc">Keep Opsdash dark, even when Nextcloud stays light.</div>
                  </div>
                </label>
              </div>
              <div class="theme-preview">Preview: {{ previewTheme === 'dark' ? 'Dark' : 'Light' }} mode</div>
            </article>

            <article class="pref-card">
              <h4>Total weekly target</h4>
              <p class="pref-desc">Set your overall weekly goal. You can fine-tune per-category targets later.</p>
              <label class="field">
                <span class="label">Total target (h / week)</span>
                <input
                  type="number"
                  :value="totalHoursInput ?? categoryTotalHours"
                  :disabled="categoriesEnabled"
                  min="0"
                  max="1000"
                  step="0.5"
                  @input="onTotalHoursChange($event.target as HTMLInputElement)"
                />
              </label>
              <p v-if="categoriesEnabled" class="pref-hint">Using categories — total derives from category targets ({{ categoryTotalHours.toFixed(1) }} h).</p>
            </article>

            <article class="pref-card">
              <h4>All-day events</h4>
              <p class="pref-desc">Tell Opsdash how many hours an all-day calendar event should contribute per day.</p>
              <label class="field">
                <span class="label">All-day hours per day</span>
                <input
                  type="number"
                  :value="allDayHoursInput"
                  min="0"
                  max="24"
                  step="0.25"
                  @input="onAllDayHoursChange($event.target as HTMLInputElement)"
                />
              </label>
              <p class="pref-hint">Default is 8 h — adjust if your organisation tracks different durations.</p>
            </article>
          </div>
        </section>

        <section v-else-if="currentStep === 'strategy'" class="onboarding-step">
          <h3>Select a starting strategy</h3>
          <div class="strategy-grid">
            <article
              v-for="strategy in strategies"
              :key="strategy.id"
              class="strategy-card"
              :class="{ active: selectedStrategy === strategy.id }"
              @click="selectedStrategy = strategy.id"
            >
              <h4>{{ strategy.title }}</h4>
              <p class="subtitle">{{ strategy.subtitle }}</p>
              <ul>
                <li v-for="point in strategy.highlights" :key="point">{{ point }}</li>
              </ul>
              <footer>Best for: {{ strategy.recommendedFor }}</footer>
            </article>
          </div>
        </section>

        <section v-else-if="currentStep === 'calendars'" class="onboarding-step">
          <h3>Choose calendars to include</h3>
          <p>Select the calendars you want to track. You can adjust later at any time.</p>
          <div class="calendar-list">
            <label v-for="cal in calendars" :key="cal.id" :class="['calendar-item', { checked: localSelection.includes(cal.id) }]">
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
          <div v-if="!localSelection.length" class="warning">Select at least one calendar to continue.</div>
        </section>

        <section v-else-if="currentStep === 'categories'" class="onboarding-step">
          <h3>Configure categories &amp; targets</h3>
          <p v-if="!categoriesEnabled" class="hint">This strategy does not require categories.</p>
          <template v-else>
            <div class="categories-editor">
              <article v-for="cat in categories" :key="cat.id" class="category-card">
                <header class="category-card__header">
                  <span
                    class="category-color-indicator"
                    :style="{ backgroundColor: resolvedColor(cat) }"
                    aria-hidden="true"
                  />
                  <input
                    class="category-name"
                    type="text"
                    :value="cat.label"
                    placeholder="Category name"
                    @input="setCategoryLabel(cat.id, ($event.target as HTMLInputElement).value)"
                  />
                  <div class="category-actions">
                    <button
                      class="remove-category"
                      type="button"
                      :disabled="categories.length <= 1"
                      title="Remove category"
                      @click="removeCategory(cat.id)"
                    >
                      ✕
                    </button>
                  </div>
                </header>
                <div class="category-card__fields">
                  <label class="field">
                    <span class="label">Target (h / week)</span>
                    <input
                      type="number"
                      :value="cat.targetHours"
                      min="0"
                      step="0.5"
                      @input="setCategoryTarget(cat.id, ($event.target as HTMLInputElement).value)"
                    />
                  </label>
                  <label class="field checkbox">
                    <input
                      type="checkbox"
                      :checked="cat.includeWeekend"
                      @change="toggleCategoryWeekend(cat.id, ($event.target as HTMLInputElement).checked)"
                    />
                    <span>Include weekend</span>
                  </label>
                  <div class="field color-field">
                    <button
                      type="button"
                      class="color-link"
                      :aria-expanded="openColorId === cat.id"
                      :aria-label="`Choose color for ${cat.label}`"
                      data-color-popover
                      @click.stop="toggleColorPopover(cat.id)"
                    >
                      Color
                    </button>
                    <div
                      v-if="openColorId === cat.id"
                      class="color-popover"
                      :id="`onboarding-color-popover-${cat.id}`"
                      tabindex="-1"
                      @keydown.esc.prevent="closeColorPopover()"
                    >
                      <div class="swatch-grid" role="group" aria-label="Preset colors">
                        <button
                          v-for="swatch in categoryColorPalette"
                          :key="`${cat.id}-swatch-${swatch}`"
                          type="button"
                          class="color-swatch"
                          :class="{ active: resolvedColor(cat) === swatch }"
                          :style="{ backgroundColor: swatch }"
                          :aria-label="`Use color ${swatch}`"
                          @click="applyColor(cat.id, swatch)"
                        />
                      </div>
                      <label class="custom-color">
                        <span>Custom</span>
                        <input
                          class="color-input"
                          type="color"
                          :value="resolvedColor(cat)"
                          aria-label="Pick custom color"
                          @input="onColorInput(cat.id, ($event.target as HTMLInputElement).value)"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </article>
              <NcButton type="tertiary" class="add-category" @click="addCategory">Add category</NcButton>
              <div class="category-total">Total weekly target: {{ categoryTotalHours.toFixed(1) }} h</div>
            </div>

            <div class="calendar-assignments" v-if="selectedCalendars.length">
              <h4>Assign calendars</h4>
              <div
                v-for="cal in selectedCalendars"
                :key="cal.id"
                class="assignment-row"
              >
                <span class="cal-name">{{ cal.displayname }}</span>
                <select
                  :value="assignments[cal.id]"
                  @change="assignCalendar(cal.id, ($event.target as HTMLSelectElement).value)"
                >
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.label }}</option>
                </select>
              </div>
            </div>
            <p v-else class="hint">Select at least one calendar to continue.</p>
          </template>
        </section>

        <section v-else-if="currentStep === 'review'" class="onboarding-step">
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
              <template v-if="draft.targetsConfig.categories.length">
                <ul>
                  <li v-for="cat in draft.targetsConfig.categories" :key="cat.id">
                    {{ cat.label }} — {{ cat.targetHours }} h
                  </li>
                </ul>
                <p class="hint">Total weekly target: {{ categoryTotalHours.toFixed(1) }} h</p>
              </template>
              <template v-else>
                <p>Total target: {{ draft.targetsConfig.totalHours }} h per week</p>
              </template>
            </div>
          </div>
          <p class="hint">You can fine-tune categories, goals, and pacing once the dashboard loads.</p>
        </section>
      </main>

      <footer class="onboarding-footer">
        <NcButton v-if="canGoBack" type="tertiary" :disabled="saving" @click="prevStep">Back</NcButton>
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
import { computed, ref, watch, onUnmounted, onMounted, nextTick } from 'vue'
import { NcButton } from '@nextcloud/vue'
import {
  getStrategyDefinitions,
  buildStrategyResult,
  createStrategyDraft,
  type StrategyDefinition,
  type CalendarSummary,
  type CategoryDraft,
} from '../services/onboarding'

const props = defineProps<{
  visible: boolean
  calendars: CalendarSummary[]
  initialSelection: string[]
  initialStrategy?: StrategyDefinition['id']
  onboardingVersion: number
  saving?: boolean
  closable?: boolean
  initialThemePreference?: 'auto' | 'light' | 'dark'
  systemTheme?: 'light' | 'dark'
  initialAllDayHours?: number
  initialTotalHours?: number
  hasExistingConfig?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'skip'): void
  (e: 'complete', payload: {
    strategy: StrategyDefinition['id']
    selected: string[]
    targetsConfig: ReturnType<typeof buildStrategyResult>['targetsConfig']
    groups: Record<string, number>
    targetsWeek: Record<string, number>
    targetsMonth: Record<string, number>
    themePreference: 'auto' | 'light' | 'dark'
  }): void
  (e: 'save-current-config'): void
}>()

const stepOrder = ['intro', 'strategy', 'calendars', 'categories', 'preferences', 'review'] as const
type StepId = typeof stepOrder[number]

const stepIndex = ref(0)
const selectedStrategy = ref<StrategyDefinition['id']>('total_only')
const localSelection = ref<string[]>([])
const categories = ref<CategoryDraft[]>([])
const assignments = ref<Record<string, string>>({})
const themePreference = ref<'auto' | 'light' | 'dark'>('auto')
const allDayHoursInput = ref(8)
const totalHoursInput = ref<number | null>(null)
const openColorId = ref<string | null>(null)
const previewTheme = computed(() => {
  if (themePreference.value === 'auto') {
    return props.systemTheme === 'dark' ? 'dark' : 'light'
  }
  return themePreference.value
})
const systemThemeLabel = computed(() => props.systemTheme === 'dark' ? 'dark' : 'light')
const BASE_CATEGORY_COLORS = ['#2563EB', '#F97316', '#10B981', '#A855F7', '#EC4899', '#14B8A6', '#F59E0B', '#6366F1', '#0EA5E9', '#65A30D']
const categoryTotalHours = computed(() =>
  categories.value.reduce((sum, cat) => sum + (Number.isFinite(cat.targetHours) ? cat.targetHours : 0), 0),
)

const categoryColorPalette = computed(() => {
  const palette = new Set<string>()
  const push = (value?: string | null) => {
    const color = sanitizeColor(value)
    if (color) palette.add(color)
  }
  props.calendars.forEach((cal) => push(cal.color))
  categories.value.forEach((cat) => push(cat.color))
  BASE_CATEGORY_COLORS.forEach((color) => palette.add(color))
  return Array.from(palette)
})

const strategies = getStrategyDefinitions()
const selectedStrategyDef = computed(() => strategies.find((s) => s.id === selectedStrategy.value) ?? strategies[0])
const categoriesEnabled = computed(() => selectedStrategyDef.value.layers.categories)
const isClosable = computed(() => props.closable !== false)

const enabledSteps = computed(() => stepOrder.filter((step) => (step === 'categories' ? categoriesEnabled.value : true)))
const currentStep = computed<StepId>(() => enabledSteps.value[Math.min(stepIndex.value, enabledSteps.value.length - 1)])
const stepNumber = computed(() => stepIndex.value + 1)
const totalSteps = computed(() => enabledSteps.value.length)
const saving = computed(() => props.saving === true)

const BODY_SCROLL_CLASS = 'opsdash-onboarding-lock'

function setScrollLocked(locked: boolean) {
  if (typeof document === 'undefined') return
  const body = document.body
  if (!body) return
  if (locked) {
    body.classList.add(BODY_SCROLL_CLASS)
    body.dataset.opsdashOnboarding = '1'
  } else {
    body.classList.remove(BODY_SCROLL_CLASS)
    delete body.dataset.opsdashOnboarding
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      resetWizard()
      closeColorPopover()
    }
    setScrollLocked(visible)
  },
  { immediate: true },
)

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('click', handleDocumentClick)
  }
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', handleDocumentClick)
  }
  setScrollLocked(false)
})

function resetWizard() {
  stepIndex.value = 0
  selectedStrategy.value = props.initialStrategy ?? 'total_only'
  const initial = props.initialSelection?.length ? [...props.initialSelection] : props.calendars.map((c) => c.id)
  localSelection.value = Array.from(new Set(initial.filter((id) => props.calendars.some((cal) => cal.id === id))))
  themePreference.value = props.initialThemePreference ?? 'auto'
  allDayHoursInput.value = clampAllDayHours(props.initialAllDayHours ?? 8)
  totalHoursInput.value = clampTotalHours(props.initialTotalHours ?? null)
  initializeStrategyState()
  if (categoriesEnabled.value) {
    totalHoursInput.value = clampTotalHours(categoryTotalHours.value)
  } else if (totalHoursInput.value === null) {
    totalHoursInput.value = 40
  }
}

function initializeStrategyState() {
  const draft = createStrategyDraft(selectedStrategy.value, props.calendars, localSelection.value)
  categories.value = draft.categories.map((cat) => ({ ...cat }))
  assignments.value = { ...draft.assignments }
  ensureAssignments()
  syncTotalsWithStrategy()
}

function ensureAssignments() {
  if (!categoriesEnabled.value || !categories.value.length) {
    assignments.value = {}
    return
  }
  const available = new Set(categories.value.map((cat) => cat.id))
  const fallback = categories.value[0].id
  const nextAssignments: Record<string, string> = {}
  localSelection.value.forEach((calId) => {
    const wanted = assignments.value[calId]
    nextAssignments[calId] = available.has(wanted) ? wanted : fallback
  })
  assignments.value = nextAssignments
}

function syncTotalsWithStrategy() {
  if (categoriesEnabled.value) {
    totalHoursInput.value = clampTotalHours(categoryTotalHours.value)
  } else {
    const inferred = clampTotalHours(props.initialTotalHours ?? totalHoursInput.value ?? 40)
    totalHoursInput.value = inferred ?? 40
  }
}

watch(selectedStrategy, () => {
  initializeStrategyState()
  stepIndex.value = Math.min(stepIndex.value, enabledSteps.value.length - 1)
})

watch(enabledSteps, (steps) => {
  if (stepIndex.value >= steps.length) {
    stepIndex.value = Math.max(steps.length - 1, 0)
  }
})

watch(categoriesEnabled, () => {
  syncTotalsWithStrategy()
})

watch(categoryTotalHours, (total) => {
  if (categoriesEnabled.value) {
    totalHoursInput.value = clampTotalHours(total)
  }
})

watch(currentStep, (step) => {
  if (step !== 'categories') {
    closeColorPopover()
  }
})

watch(() => props.visible, (visible) => {
  if (!visible) {
    closeColorPopover()
  }
})

watch(localSelection, () => {
  ensureAssignments()
}, { deep: true })

watch(categories, () => {
  ensureAssignments()
}, { deep: true })

function addCategory() {
  const id = `cat_${Date.now().toString(36)}_${categories.value.length}`
  categories.value = [
    ...categories.value,
    {
      id,
      label: `Category ${categories.value.length + 1}`,
      targetHours: 8,
      includeWeekend: false,
      paceMode: 'days_only',
    },
  ]
  ensureAssignments()
}

function removeCategory(id: string) {
  if (categories.value.length <= 1) return
  categories.value = categories.value.filter((cat) => cat.id !== id)
  ensureAssignments()
}

function setCategoryLabel(id: string, value: string) {
  categories.value = categories.value.map((cat) => (cat.id === id ? { ...cat, label: value } : cat))
}

function setCategoryTarget(id: string, value: string) {
  const parsed = Number(value)
  const sanitized = Number.isFinite(parsed) ? Math.max(0, Math.min(1000, parsed)) : undefined
  categories.value = categories.value.map((cat) =>
    cat.id === id ? { ...cat, targetHours: sanitized ?? cat.targetHours } : cat,
  )
}

function toggleCategoryWeekend(id: string, checked: boolean) {
  categories.value = categories.value.map((cat) => (cat.id === id ? { ...cat, includeWeekend: checked } : cat))
}

function assignCalendar(calId: string, categoryId: string) {
  assignments.value = {
    ...assignments.value,
    [calId]: categoryId,
  }
}

function toggleColorPopover(id: string) {
  if (openColorId.value === id) {
    closeColorPopover()
    return
  }
  openColorId.value = id
  nextTick(() => {
    const el = document.getElementById(`onboarding-color-popover-${id}`)
    el?.focus()
  })
}

function closeColorPopover() {
  openColorId.value = null
}

function handleDocumentClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (!target?.closest('[data-color-popover]')) {
    closeColorPopover()
  }
}

function sanitizeColor(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
    return null
  }
  if (trimmed.length === 4) {
    const [, r, g, b] = trimmed
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
  }
  return trimmed.toUpperCase()
}

function resolvedColor(cat: { color?: string | null }): string {
  return sanitizeColor(cat?.color) ?? defaultColor.value
}

function onColorInput(id: string, value: string) {
  const color = sanitizeColor(value)
  setCategoryColor(id, color ?? defaultColor.value)
}

function applyColor(id: string, value: string) {
  const color = sanitizeColor(value)
  setCategoryColor(id, color ?? defaultColor.value)
  closeColorPopover()
}

function clampAllDayHours(value: number): number {
  if (!Number.isFinite(value)) return 8
  const clamped = Math.max(0, Math.min(24, value))
  return Math.round(clamped * 100) / 100
}

function clampTotalHours(value: number | null): number | null {
  if (!Number.isFinite(value)) return null
  const clamped = Math.max(0, Math.min(1000, Number(value)))
  return Math.round(clamped * 100) / 100
}

function setCategoryColor(id: string, color: string | null) {
  categories.value = categories.value.map((cat) =>
    cat.id === id ? { ...cat, color } : cat,
  )
}

function onTotalHoursChange(input: HTMLInputElement) {
  if (categoriesEnabled.value) return
  const parsed = Number(input.value)
  if (!Number.isFinite(parsed)) {
    totalHoursInput.value = null
    return
  }
  totalHoursInput.value = clampTotalHours(parsed)
}

function onAllDayHoursChange(input: HTMLInputElement) {
  const parsed = Number(input.value)
  allDayHoursInput.value = clampAllDayHours(Number.isFinite(parsed) ? parsed : allDayHoursInput.value)
}

const selectedCalendars = computed(() =>
  props.calendars.filter((cal) => localSelection.value.includes(cal.id)),
)

const draft = computed(() =>
  buildStrategyResult(selectedStrategy.value, props.calendars, localSelection.value, categoriesEnabled.value
    ? { categories: categories.value, assignments: assignments.value }
    : undefined),
)

const strategyTitle = computed(() => selectedStrategyDef.value.title)

const canGoBack = computed(() => stepIndex.value > 0)
const canGoNext = computed(() => stepIndex.value < enabledSteps.value.length - 1)
const nextDisabled = computed(() => {
  if (currentStep.value === 'strategy') {
    return !selectedStrategy.value
  }
  if (currentStep.value === 'calendars') {
    return localSelection.value.length === 0
  }
  if (currentStep.value === 'categories' && categoriesEnabled.value) {
    if (!localSelection.value.length) return true
    if (!categories.value.length) return true
    const available = new Set(categories.value.map((cat) => cat.id))
    if (localSelection.value.some((id) => !available.has(assignments.value[id]))) {
      return true
    }
  }
  if (currentStep.value === 'preferences') {
    if (!categoriesEnabled.value) {
      if (totalHoursInput.value === null || totalHoursInput.value < 0) return true
    }
    if (allDayHoursInput.value < 0 || allDayHoursInput.value > 24) return true
  }
  return false
})

function nextStep() {
  if (canGoNext.value && !nextDisabled.value) {
    stepIndex.value += 1
  }
}

function prevStep() {
  if (canGoBack.value) {
    stepIndex.value -= 1
  }
}

function handleSkip() {
  emit('skip')
}

function handleClose() {
  if (!isClosable.value) return
  emit('close')
}

function emitComplete() {
  const result = buildStrategyResult(
    selectedStrategy.value,
    props.calendars,
    localSelection.value,
    categoriesEnabled.value
      ? { categories: categories.value.map((cat) => ({ ...cat })), assignments: { ...assignments.value } }
      : undefined,
  )

  const config = { ...result.targetsConfig }
  config.allDayHours = clampAllDayHours(allDayHoursInput.value)
  if (categoriesEnabled.value) {
    const total = clampTotalHours(categoryTotalHours.value)
    if (total != null) config.totalHours = total
  } else if (totalHoursInput.value != null) {
    const total = clampTotalHours(totalHoursInput.value)
    if (total != null) config.totalHours = total
  }
  result.targetsConfig = config

  emit('complete', {
    strategy: selectedStrategy.value,
    selected: result.selected,
    targetsConfig: result.targetsConfig,
    groups: result.groups,
    targetsWeek: result.targetsWeek,
    targetsMonth: result.targetsMonth,
    themePreference: themePreference.value,
  })
}

function toggleCalendar(id: string, checkbox: HTMLInputElement) {
  const checked = checkbox.checked
  if (checked) {
    if (!localSelection.value.includes(id)) {
      localSelection.value = [...localSelection.value, id]
    }
  } else {
    localSelection.value = localSelection.value.filter((cid) => cid !== id)
  }
}
</script>

<style scoped>
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

.skip-link {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: 0.95rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  color: var(--color-text-light);
}

.close-btn:hover {
  color: var(--color-primary);
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

.highlights {
  padding-left: 18px;
}

.config-warning {
  border: 1px solid color-mix(in srgb, var(--color-warning, #f97316) 35%, transparent);
  background: color-mix(in srgb, var(--color-warning, #f97316) 12%, transparent);
  border-radius: 8px;
  padding: 12px;
  margin: 12px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-warning p {
  margin: 0;
  font-size: 0.95rem;
  color: var(--color-text);
}

.hint {
  color: var(--color-text-light);
  margin-top: 12px;
}

.strategy-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.strategy-card {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.strategy-card.active {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.strategy-card h4 {
  margin: 0;
}

.strategy-card .subtitle {
  color: var(--color-text-light);
  margin: 0;
}

.strategy-card footer {
  margin-top: auto;
  font-size: 0.85rem;
  color: var(--color-text-light);
}

.calendar-list {
  display: grid;
  gap: 8px;
  margin-top: 8px;
}

.calendar-item {
  display: grid;
  grid-template-columns: auto auto 1fr;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.calendar-item.checked {
  border-color: var(--color-primary);
}

.calendar-item input {
  margin: 0;
}

.calendar-item .dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.warning {
  color: var(--color-error);
  margin-top: 12px;
}

.review-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.review-grid h5 {
  margin: 0 0 8px;
  font-size: 0.95rem;
  color: var(--color-text-light);
}

.categories-editor {
  display: grid;
  gap: 16px;
}

.category-card {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  background: var(--color-main-background, #fff);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-card__header {
  display: flex;
  gap: 12px;
  align-items: center;
}

.category-color-indicator {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 40%);
  flex-shrink: 0;
}

.category-name {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.category-actions {
  display: flex;
  gap: 8px;
}

.remove-category {
  background: none;
  border: none;
  color: var(--color-text-light);
  cursor: pointer;
  font-size: 1.1rem;
}

.remove-category:disabled {
  opacity: 0.4;
  cursor: default;
}

.remove-category:not(:disabled):hover {
  color: var(--color-error);
}

.category-card__fields {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.color-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
}

.color-link {
  align-self: flex-start;
  border: none;
  background: transparent;
  padding: 0;
  font-size: 12px;
  color: var(--brand, #2563eb);
  text-decoration: underline;
  cursor: pointer;
}

.color-link:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--brand, #2563eb), transparent 45%);
  outline-offset: 2px;
}

.color-popover {
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

.color-popover:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--brand, #2563eb), transparent 45%);
  outline-offset: 2px;
}

.swatch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 20px));
  justify-content: flex-start;
  gap: 6px;
}

.color-swatch {
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

.color-swatch.active {
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--brand, #2563eb), transparent 55%);
}

.color-swatch:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--brand, #2563eb), transparent 45%);
  outline-offset: 1px;
}

.custom-color {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--color-text-light);
}

.color-input {
  width: 44px;
  height: 26px;
  padding: 0;
  border-radius: 6px;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 40%);
  background: transparent;
}

.add-category {
  justify-self: flex-start;
}

.category-total {
  font-size: 0.9rem;
  color: var(--color-text-light);
}

.calendar-assignments {
  margin-top: 24px;
  display: grid;
  gap: 12px;
}

.assignment-row {
  display: grid;
  grid-template-columns: 1fr minmax(160px, 220px);
  gap: 12px;
  align-items: center;
}

.assignment-row select {
  padding: 6px 8px;
}

.cal-name {
  font-size: 0.95rem;
}

.onboarding-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.preferences-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.pref-card {
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 30%);
  border-radius: 10px;
  padding: 12px;
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 6%);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pref-card h4 {
  margin: 0;
}

.pref-desc {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-light);
}

.pref-hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-light);
}

.theme-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.theme-option {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in oklab, var(--color-border), transparent 40%);
  background: color-mix(in oklab, var(--color-main-background, #fff), transparent 8%);
}

.theme-option input[type="radio"] {
  margin-top: 4px;
}

.theme-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.9rem;
}

.theme-option__title {
  font-weight: 600;
  color: var(--color-text);
}

.theme-option__desc {
  color: var(--color-text-light);
  font-size: 0.85rem;
}

.theme-preview {
  font-size: 0.85rem;
  color: var(--color-text-light);
}

:global(body.opsdash-onboarding-lock) {
  overflow: hidden;
}
</style>
