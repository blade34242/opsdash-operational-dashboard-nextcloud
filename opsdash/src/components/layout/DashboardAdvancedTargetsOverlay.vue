<template>
  <div
    v-if="widgetId && config"
    class="advanced-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="Targets configuration"
  >
    <div class="advanced-panel">
      <div class="overlay-header">
        <div>
          <div class="overlay-title">Targets (this widget only)</div>
          <div class="overlay-subtitle">Starts from global targets; saving keeps a local copy for this widget.</div>
        </div>
        <button type="button" class="ghost danger" @click="close" aria-label="Close">✕</button>
      </div>
      <div class="overlay-metrics" v-if="config">
        <article class="metric-card">
          <div class="metric-card__label">Overview</div>
          <div class="metric-card__value">{{ Number(config.totalHours || 0).toFixed(1) }} h / week</div>
          <div class="metric-card__hint">{{ categoryOptions.length }} categories • {{ categoryTotalHours.toFixed(1) }} h assigned</div>
        </article>
        <article class="metric-card" :class="{ warn: overlapHours > 0 }">
          <div class="metric-card__label">Overlap</div>
          <div class="metric-card__value">{{ overlapHours.toFixed(1) }} h</div>
          <div class="metric-card__hint">
            {{ overlapHours > 0 ? 'Category totals exceed weekly total target.' : 'Category totals fit within total target.' }}
          </div>
        </article>
      </div>
      <SidebarTargetsPane
        :targets="config"
        :category-options="categoryOptions"
        :total-target-message="totalTargetMessage"
        :all-day-hours-message="allDayHoursMessage"
        :category-target-messages="categoryTargetMessages"
        :pace-threshold-messages="paceThresholdMessages"
        :forecast-momentum-message="forecastMomentumMessage"
        :forecast-padding-message="forecastPaddingMessage"
        :color-palette="colorPalette"
        :can-add-category="canAddCategory"
        @total-target-input="setTotalTarget"
        @set-all-day-hours="setAllDayHours"
        @set-category-target="({ id, value }) => setCategoryTarget(id, value)"
        @set-category-label="({ id, label }) => setCategoryLabel(id, label)"
        @set-category-weekend="({ id, value }) => setCategoryWeekend(id, value)"
        @set-category-pace="({ id, mode }) => setCategoryPace(id, mode)"
        @set-category-color="({ id, color }) => setCategoryColor(id, color)"
        @add-category="addCategory"
        @remove-category="removeCategory"
        @set-include-weekend-total="setIncludeWeekendTotal"
        @set-pace-mode="setPaceMode"
        @set-threshold="({ key, value }) => setThreshold(key, value)"
        @set-forecast-method="setForecastMethod"
        @set-forecast-momentum="setForecastMomentum"
        @set-forecast-padding="setForecastPadding"
        @set-ui-option="({ key, value }) => setUiOption(key as keyof TargetsConfig['ui'], value)"
      />
      <div class="overlay-actions">
        <div class="overlay-actions__left">
          <button type="button" class="ghost" @click="resetToGlobalTargets">Use global targets</button>
          <button type="button" class="ghost" @click="openOnboardingTargets">Edit via onboarding</button>
        </div>
        <div class="overlay-actions__right">
          <button type="button" class="ghost" @click="close">Cancel</button>
          <button type="button" class="ghost primary" @click="save">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import SidebarTargetsPane from '../sidebar/SidebarTargetsPane.vue'
import { normalizeTargetsConfig, cloneTargetsConfig, type TargetsConfig } from '../../services/targets'
import { applyNumericUpdate, type InputMessage } from '../sidebar/validation'
import type { WidgetDefinition } from '../../services/widgetsRegistry'

const props = defineProps<{
  widgetId: string | null
  widgets: WidgetDefinition[]
  contextTargetsConfig: any
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', widgetId: string, config: TargetsConfig): void
  (e: 'use-global', widgetId: string): void
  (e: 'open-onboarding', step?: string): void
}>()

const config = ref<TargetsConfig | null>(null)
const totalTargetMessage = ref<InputMessage | null>(null)
const allDayHoursMessage = ref<InputMessage | null>(null)
const forecastMomentumMessage = ref<InputMessage | null>(null)
const forecastPaddingMessage = ref<InputMessage | null>(null)
const paceThresholdMessages = reactive<{ onTrack: InputMessage | null; atRisk: InputMessage | null }>({
  onTrack: null,
  atRisk: null,
})
const categoryTargetMessages = reactive<Record<string, InputMessage | null>>({})
const defaultTargets = normalizeTargetsConfig(undefined)

watch(
  () => props.widgetId,
  (id) => {
    if (!id) {
      config.value = null
      resetMessages()
      return
    }
    const widget = props.widgets.find((w) => w.id === id)
    const opts: any = widget?.options || {}
    const base = opts.useLocalConfig && opts.localConfig
      ? normalizeTargetsConfig(opts.localConfig)
      : normalizeTargetsConfig(props.contextTargetsConfig)
    config.value = cloneTargetsConfig(base)
    resetMessages()
  },
  { immediate: true },
)

const categoryOptions = computed(() => config.value?.categories ?? [])
const categoryTotalHours = computed(() =>
  categoryOptions.value.reduce((sum, cat) => sum + (Number(cat?.targetHours) || 0), 0),
)
const overlapHours = computed(() => {
  const total = Number(config.value?.totalHours ?? 0)
  return Math.max(0, categoryTotalHours.value - total)
})
const BASE_CATEGORY_COLORS = ['#2563EB', '#F97316', '#10B981', '#A855F7', '#EC4899', '#14B8A6', '#F59E0B', '#6366F1', '#0EA5E9', '#65A30D']
const colorPalette = computed(() => {
  const palette = new Set<string>()
  const push = (value?: string | null) => {
    const color = sanitizeHexColor(value)
    if (color) palette.add(color)
  }
  categoryOptions.value.forEach((cat) => push((cat as any).color))
  BASE_CATEGORY_COLORS.forEach((color) => palette.add(color))
  return Array.from(palette)
})
const canAddCategory = computed(() => {
  const cfg = config.value
  if (!cfg) return false
  return nextGroupId(cfg) !== null
})

function resetMessages() {
  totalTargetMessage.value = null
  allDayHoursMessage.value = null
  forecastMomentumMessage.value = null
  forecastPaddingMessage.value = null
  paceThresholdMessages.onTrack = null
  paceThresholdMessages.atRisk = null
  Object.keys(categoryTargetMessages).forEach((key) => {
    delete categoryTargetMessages[key]
  })
}

function close() {
  emit('close')
}

function save() {
  if (!props.widgetId || !config.value) return
  emit('save', props.widgetId, cloneTargetsConfig(config.value))
}

function resetToGlobalTargets() {
  if (!props.widgetId) return
  emit('use-global', props.widgetId)
}

function openOnboardingTargets() {
  emit('open-onboarding', 'categories')
}

function sanitizeHexColor(value: any): string | null {
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

function nextGroupId(cfg: TargetsConfig): number | null {
  const used = new Set<number>()
  cfg.categories.forEach((cat) => {
    (cat.groupIds || []).forEach((g) => {
      const n = Number(g)
      if (Number.isFinite(n)) used.add(n)
    })
  })
  for (let i = 1; i <= 9; i++) {
    if (!used.has(i)) return i
  }
  return null
}

function makeCategoryId(): string {
  return `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`
}

function findNextCategoryColor(cfg: TargetsConfig): string | null {
  const used = new Set<string>()
  cfg.categories.forEach((cat) => {
    const color = sanitizeHexColor((cat as any)?.color)
    if (color) used.add(color)
  })
  for (const color of BASE_CATEGORY_COLORS) {
    if (!used.has(color)) return color
  }
  return BASE_CATEGORY_COLORS[0] ?? null
}

function updateTargets(mutator: (cfg: TargetsConfig)=>void) {
  if (!config.value) return
  const next = cloneTargetsConfig(config.value)
  mutator(next)
  config.value = next
}

function updateCategory(id: string, mutator: (cat: TargetsConfig['categories'][number]) => void) {
  updateTargets((cfg) => {
    const cat = cfg.categories.find((c) => c.id === id)
    if (cat) mutator(cat)
  })
}

function setTotalTarget(value: string) {
  applyNumericUpdate(
    value,
    { min: 0, max: 1000, step: 0.5, decimals: 2 },
    (message) => { totalTargetMessage.value = message },
    (num) => updateTargets((cfg) => { cfg.totalHours = num }),
  )
}

function setAllDayHours(value: string) {
  applyNumericUpdate(
    value,
    { min: 0, max: 24, step: 0.25, decimals: 2 },
    (message) => { allDayHoursMessage.value = message },
    (num) => updateTargets((cfg) => { cfg.allDayHours = num }),
    '0–24 hours per day',
  )
}

function setCategoryTarget(id: string, value: string) {
  applyNumericUpdate(
    value,
    { min: 0, max: 1000, step: 0.5, decimals: 2 },
    (message) => { categoryTargetMessages[id] = message },
    (num) => updateCategory(id, (cat) => { cat.targetHours = num }),
  )
}

function setCategoryLabel(id: string, label: string) {
  updateCategory(id, (cat) => { cat.label = label.trim() || cat.label })
}

function setCategoryWeekend(id: string, value: boolean) {
  updateCategory(id, (cat) => { cat.includeWeekend = value })
}

function setCategoryColor(id: string, color: string) {
  const sanitized = sanitizeHexColor(color)
  updateCategory(id, (cat) => { (cat as any).color = sanitized ?? null })
}

function setCategoryPace(id: string, mode: string) {
  if (mode !== 'days_only' && mode !== 'time_aware') return
  updateCategory(id, (cat) => { cat.paceMode = mode as TargetsConfig['pace']['mode'] })
}

function setIncludeWeekendTotal(value: boolean) {
  updateTargets((cfg) => { cfg.pace.includeWeekendTotal = value })
}

function setPaceMode(mode: string) {
  if (mode !== 'days_only' && mode !== 'time_aware') return
  updateTargets((cfg) => { cfg.pace.mode = mode as TargetsConfig['pace']['mode'] })
}

function setThreshold(which: 'onTrack' | 'atRisk', value: string) {
  applyNumericUpdate(
    value,
    { min: -100, max: 100, step: 0.1, decimals: 1 },
    (message) => { paceThresholdMessages[which] = message },
    (num) => updateTargets((cfg) => { cfg.pace.thresholds[which] = num }),
  )
}

function setForecastMethod(method: string) {
  const mode = method === 'momentum' ? 'momentum' : 'linear'
  updateTargets((cfg) => { cfg.forecast.methodPrimary = mode })
}

function setForecastMomentum(value: string) {
  applyNumericUpdate(
    value,
    { min: 1, max: 14, step: 1, decimals: 0 },
    (message) => { forecastMomentumMessage.value = message },
    (num) => updateTargets((cfg) => { cfg.forecast.momentumLastNDays = num }),
  )
}

function setForecastPadding(value: string) {
  applyNumericUpdate(
    value,
    { min: 0, max: 100, step: 0.1, decimals: 1 },
    (message) => { forecastPaddingMessage.value = message },
    (num) => updateTargets((cfg) => { cfg.forecast.padding = num }),
  )
}

function setUiOption(key: keyof TargetsConfig['ui'], value: boolean) {
  updateTargets((cfg) => {
    if (!cfg.ui) cfg.ui = { ...defaultTargets.ui }
    ;(cfg.ui as any)[key] = value
  })
}

function addCategory() {
  const cfg = config.value
  if (!cfg) return
  const nextGroup = nextGroupId(cfg)
  if (nextGroup === null) return
  updateTargets((next) => {
    const color = findNextCategoryColor(next)
    next.categories = [
      ...next.categories,
      {
        id: makeCategoryId(),
        label: `Category ${next.categories.length + 1}`,
        targetHours: 0,
        includeWeekend: true,
        paceMode: 'days_only',
        color,
        groupIds: [nextGroup],
      } as any,
    ]
  })
}

function removeCategory(id: string) {
  const cfg = config.value
  if (!cfg || cfg.categories.length <= 1) return
  updateTargets((next) => {
    next.categories = next.categories.filter((cat) => cat.id !== id)
  })
  delete categoryTargetMessages[id]
}
</script>

<style scoped>
.ghost{
  border:1px solid var(--color-border, #d1d5db);
  background:rgba(255,255,255,0.9);
  padding:2px 6px;
  border-radius:6px;
  font-size:12px;
  cursor:pointer;
}
.ghost.primary{
  border-color:var(--color-primary, #2563EB);
  color:var(--color-primary, #2563EB);
}
.advanced-overlay{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,0.4);
  display:flex;
  align-items:flex-start;
  justify-content:center;
  padding:48px 16px;
  z-index:50;
}
.advanced-panel{
  background:var(--color-main-background, #fff);
  color:var(--color-main-text, #0f172a);
  --adv-surface: var(--color-main-background, #fff);
  --adv-surface-alt: var(--color-background-hover, #f8fafc);
  --adv-surface-muted: var(--color-background-contrast, #f8fafc);
  --adv-border: color-mix(in oklab, var(--color-border, #d1d5db), transparent 20%);
  --adv-muted: var(--muted, #64748b);
  --adv-header-top: color-mix(in oklab, var(--color-primary, #2563eb), #ffffff 95%);
  --adv-header-bottom: color-mix(in oklab, var(--color-main-background, #fff), #f8fafc 85%);
  --adv-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
  --adv-warn-border: color-mix(in oklab, #dc2626, var(--color-border, #d1d5db) 45%);
  --adv-warn-bg: color-mix(in oklab, #fff1f2, var(--color-main-background, #fff) 40%);
  width:min(960px, 100%);
  max-height:calc(100vh - 96px);
  border-radius:12px;
  box-shadow:0 20px 60px rgba(0,0,0,0.25);
  overflow:hidden;
  display:flex;
  flex-direction:column;
  border:1px solid var(--color-border, #e5e7eb);
}
.advanced-panel > .sb-pane{
  flex:1 1 auto;
  overflow:auto;
  padding:16px;
}
.overlay-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:14px 16px;
  border-bottom:1px solid var(--color-border, #e5e7eb);
  background:linear-gradient(
    180deg,
    var(--adv-header-top),
    var(--adv-header-bottom)
  );
}
.overlay-title{
  font-weight:700;
  font-size:17px;
}
.overlay-subtitle{
  font-size:12px;
  color:var(--adv-muted);
  margin-top:2px;
}
.overlay-metrics{
  display:grid;
  gap:12px;
  grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));
  padding:14px 16px 4px;
}
.metric-card{
  border:1px solid var(--adv-border);
  border-radius:12px;
  padding:10px 12px;
  background:var(--adv-surface-muted);
  box-shadow:var(--adv-shadow);
  display:grid;
  gap:2px;
}
.metric-card.warn{
  border-color:var(--adv-warn-border);
  background:var(--adv-warn-bg);
}
.metric-card__label{
  font-size:11px;
  letter-spacing:0.04em;
  text-transform:uppercase;
  color:var(--adv-muted);
  font-weight:700;
}
.metric-card__value{
  font-size:18px;
  font-weight:700;
}
.metric-card__hint{
  font-size:12px;
  color:var(--adv-muted);
}
.overlay-actions{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:8px;
  padding:12px 16px;
  border-top:1px solid var(--color-border, #e5e7eb);
  background:var(--adv-surface-alt);
}
.overlay-actions__left,
.overlay-actions__right{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}
.advanced-panel :deep(.sb-title){
  margin:0;
  font-size:13px;
  letter-spacing:0.05em;
  text-transform:uppercase;
  color:var(--adv-muted);
}
.advanced-panel :deep(.target-config){
  display:grid;
  gap:14px;
}
.advanced-panel :deep(.target-config > .field){
  border:1px solid var(--adv-border);
  border-radius:10px;
  padding:10px 12px;
  background:var(--adv-surface-muted);
}
.advanced-panel :deep(.target-config input[type='number']),
.advanced-panel :deep(.target-config input[type='text']),
.advanced-panel :deep(.target-config select){
  width:100%;
  border:1px solid var(--adv-border);
  border-radius:8px;
  padding:7px 10px;
  background:var(--adv-surface);
  color:var(--color-main-text, #0f172a);
}
.advanced-panel :deep(.target-config .field .label){
  display:block;
  margin-bottom:6px;
  font-size:12px;
  font-weight:600;
  color:var(--adv-muted);
}
.advanced-panel :deep(.target-category){
  border:1px solid var(--adv-border);
  border-radius:12px;
  padding:12px;
  background:var(--adv-surface);
  display:grid;
  gap:10px;
}
.advanced-panel :deep(.target-category .cat-header){
  display:flex;
  gap:10px;
  align-items:center;
  flex-wrap:wrap;
}
.advanced-panel :deep(.target-category .cat-name){
  min-width:180px;
}
.advanced-panel :deep(.target-category .remove-cat){
  border:none;
  background:transparent;
  color:var(--adv-muted);
  cursor:pointer;
  font-size:16px;
}
.advanced-panel :deep(.target-category .remove-cat:not(:disabled):hover){
  color:#dc2626;
}
.advanced-panel :deep(.target-category .cat-fields){
  display:grid;
  gap:12px;
  grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));
}
.advanced-panel :deep(.target-section){
  border:1px solid var(--adv-border);
  border-radius:12px;
  padding:12px;
  background:var(--adv-surface);
  display:grid;
  gap:10px;
}
.advanced-panel :deep(.target-section .section-title){
  margin:0;
  font-size:12px;
  text-transform:uppercase;
  letter-spacing:0.04em;
  color:var(--adv-muted);
}
.advanced-panel :deep(.input-message){
  font-size:12px;
  margin-top:6px;
}
.advanced-panel :deep(.input-message.warning){
  color:#b45309;
}
.advanced-panel :deep(.input-message.error){
  color:#dc2626;
}
.advanced-panel :deep(.add-category){
  justify-self:flex-start;
}
:global(#opsdash.opsdash-theme-dark .advanced-panel){
  --adv-surface: var(--color-main-background, #0f172a);
  --adv-surface-alt: color-mix(in oklab, var(--color-main-background, #0f172a), #1f2937 35%);
  --adv-surface-muted: color-mix(in oklab, var(--color-main-background, #0f172a), #111827 52%);
  --adv-border: color-mix(in oklab, var(--color-border, #334155), #000000 10%);
  --adv-muted: #94a3b8;
  --adv-header-top: color-mix(in oklab, var(--color-main-background, #0f172a), #1d4ed8 18%);
  --adv-header-bottom: color-mix(in oklab, var(--color-main-background, #0f172a), #111827 88%);
  --adv-shadow: 0 10px 22px rgba(0, 0, 0, 0.38);
  --adv-warn-border: color-mix(in oklab, #ef4444, var(--color-border, #334155) 58%);
  --adv-warn-bg: color-mix(in oklab, #7f1d1d, var(--color-main-background, #0f172a) 75%);
}
@media (max-width: 640px){
  .advanced-overlay{
    padding:16px;
    align-items:flex-start;
  }
  .overlay-metrics{
    grid-template-columns:1fr;
    padding-top:10px;
  }
}
</style>
