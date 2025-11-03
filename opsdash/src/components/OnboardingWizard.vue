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
          <p class="hint">You can change configuration later from the Sidebar.</p>
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
import { computed, ref, watch, onUnmounted } from 'vue'
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
  }): void
}>()

const stepOrder = ['intro', 'strategy', 'calendars', 'categories', 'review'] as const
type StepId = typeof stepOrder[number]

const stepIndex = ref(0)
const selectedStrategy = ref<StrategyDefinition['id']>('total_only')
const localSelection = ref<string[]>([])
const categories = ref<CategoryDraft[]>([])
const assignments = ref<Record<string, string>>({})

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
    }
    setScrollLocked(visible)
  },
  { immediate: true },
)

onUnmounted(() => {
  setScrollLocked(false)
})

function resetWizard() {
  stepIndex.value = 0
  selectedStrategy.value = props.initialStrategy ?? 'total_only'
  const initial = props.initialSelection?.length ? [...props.initialSelection] : props.calendars.map((c) => c.id)
  localSelection.value = Array.from(new Set(initial.filter((id) => props.calendars.some((cal) => cal.id === id))))
  initializeStrategyState()
}

function initializeStrategyState() {
  const draft = createStrategyDraft(selectedStrategy.value, props.calendars, localSelection.value)
  categories.value = draft.categories.map((cat) => ({ ...cat }))
  assignments.value = { ...draft.assignments }
  ensureAssignments()
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

watch(selectedStrategy, () => {
  initializeStrategyState()
  stepIndex.value = Math.min(stepIndex.value, enabledSteps.value.length - 1)
})

watch(enabledSteps, (steps) => {
  if (stepIndex.value >= steps.length) {
    stepIndex.value = Math.max(steps.length - 1, 0)
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
  categories.value = categories.value.map((cat) =>
    cat.id === id ? { ...cat, targetHours: Number.isFinite(parsed) ? parsed : cat.targetHours } : cat,
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

const categoryTotalHours = computed(() =>
  categories.value.reduce((sum, cat) => sum + (Number.isFinite(cat.targetHours) ? cat.targetHours : 0), 0),
)

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
  emit('complete', {
    strategy: selectedStrategy.value,
    selected: draft.value.selected,
    targetsConfig: draft.value.targetsConfig,
    groups: draft.value.groups,
    targetsWeek: draft.value.targetsWeek,
    targetsMonth: draft.value.targetsMonth,
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

:global(body.opsdash-onboarding-lock) {
  overflow: hidden;
}
</style>
