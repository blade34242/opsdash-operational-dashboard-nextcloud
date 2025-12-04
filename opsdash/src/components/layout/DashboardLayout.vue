<template>
  <div class="layout-wrapper">
    <div class="layout-grid">
      <div
        v-for="item in ordered"
        :key="item.id"
        class="layout-item"
        :class="[
          widthClass(item.layout.width),
          heightClass(item.layout.height),
          textClass(item.options?.textSize),
          { 'is-editable': editable, 'is-dense': item.options?.dense, 'has-toolbar': editable },
        ]"
      >
        <div v-if="editable" class="edit-bar">
          <div class="edit-left">
            <button type="button" class="ghost" title="Move earlier" @click="$emit('edit:move', item.id, 'up')">←</button>
            <button type="button" class="ghost" title="Move later" @click="$emit('edit:move', item.id, 'down')">→</button>
          </div>
          <div class="edit-right">
            <button type="button" class="ghost" title="Cycle width" @click="$emit('edit:width', item.id)">{{ widthLabel(item.layout.width) }}</button>
            <button type="button" class="ghost" title="Cycle height" @click="$emit('edit:height', item.id)">{{ heightLabel(item.layout.height) }}</button>
            <WidgetOptionsMenu
              v-if="isConfigurable(item.type)"
              :entry="registryEntry(item.type)"
              :options="item.options"
              :open="openOptionsId === item.id"
              :show-advanced="item.type === 'targets_v2'"
              @toggle="toggleOptions(item.id, $event)"
              @open-advanced="openAdvancedTargets(item.id)"
              @change="(key,value)=>$emit('edit:options', item.id, key, value)"
            />
            <button type="button" class="ghost danger" title="Remove widget" @click="$emit('edit:remove', item.id)">✕</button>
          </div>
        </div>
        <component :is="item.component" v-bind="item.props" />
      </div>
    </div>

    <div
      v-if="advancedTargetsId && advancedTargetsConfig"
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
          <button type="button" class="ghost danger" @click="closeAdvancedTargets" aria-label="Close">✕</button>
        </div>
        <SidebarTargetsPane
          :targets="advancedTargetsConfig"
          :category-options="advancedCategoryOptions"
          :total-target-message="totalTargetMessage"
          :all-day-hours-message="allDayHoursMessage"
          :category-target-messages="categoryTargetMessages"
          :pace-threshold-messages="paceThresholdMessages"
          :forecast-momentum-message="forecastMomentumMessage"
          :forecast-padding-message="forecastPaddingMessage"
          :can-add-category="canAddAdvancedCategory"
          :color-palette="advancedColorPalette"
          @total-target-input="setAdvancedTotalTarget"
          @set-all-day-hours="setAdvancedAllDayHours"
          @set-category-label="({ id, label }) => setAdvancedCategoryLabel(id, label)"
          @remove-category="removeAdvancedCategory"
          @set-category-target="({ id, value }) => setAdvancedCategoryTarget(id, value)"
          @set-category-pace="({ id, mode }) => setAdvancedCategoryPace(id, mode)"
          @set-category-weekend="({ id, value }) => setAdvancedCategoryWeekend(id, value)"
          @set-category-color="({ id, color }) => setAdvancedCategoryColor(id, color)"
          @add-category="addAdvancedCategory"
          @set-include-weekend-total="setAdvancedIncludeWeekendTotal"
          @set-pace-mode="setAdvancedPaceMode"
          @set-threshold="({ key, value }) => setAdvancedThreshold(key, value)"
          @set-forecast-method="setAdvancedForecastMethod"
          @set-forecast-momentum="setAdvancedForecastMomentum"
          @set-forecast-padding="setAdvancedForecastPadding"
          @set-ui-option="({ key, value }) => setAdvancedUiOption(key as keyof TargetsConfig['ui'], value)"
        />
        <div class="overlay-actions">
          <div class="overlay-actions__left">
            <button type="button" class="ghost" @click="resetToGlobalTargets">Use global targets</button>
            <button type="button" class="ghost" @click="openOnboardingTargets">Edit via onboarding</button>
          </div>
          <div class="overlay-actions__right">
            <button type="button" class="ghost" @click="closeAdvancedTargets">Cancel</button>
            <button type="button" class="ghost primary" @click="saveAdvancedTargets">Save</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { WidgetDefinition, WidgetRenderContext } from '../../services/widgetsRegistry'
import { mapWidgetToComponent, widgetsRegistry } from '../../services/widgetsRegistry'
import WidgetOptionsMenu from './WidgetOptionsMenu.vue'
import SidebarTargetsPane from '../sidebar/SidebarTargetsPane.vue'
import { normalizeTargetsConfig, cloneTargetsConfig, type TargetsConfig } from '../../services/targets'
import { applyNumericUpdate, type InputMessage } from '../sidebar/validation'

const props = defineProps<{
  widgets: WidgetDefinition[]
  context: WidgetRenderContext
  editable?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit:width', id: string): void
  (e: 'edit:height', id: string): void
  (e: 'edit:remove', id: string): void
  (e: 'edit:move', id: string, dir: 'up' | 'down'): void
  (e: 'edit:options', id: string, key: string, value: any): void
  (e: 'open:onboarding', step?: string): void
}>()

const openOptionsId = ref<string | null>(null)
const advancedTargetsId = ref<string | null>(null)
const advancedTargetsConfig = ref<TargetsConfig | null>(null)
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

const ordered = computed(() => {
  return (props.widgets || [])
    .slice()
    .sort((a, b) => (a.layout.order || 0) - (b.layout.order || 0))
    .map((def) => {
      const mapped = mapWidgetToComponent(def, props.context)
      if (!mapped) return null
      const options = def.options || {}
      return { ...mapped, id: def.id, layout: def.layout, type: def.type, options }
    })
    .filter(Boolean) as Array<{ id: string; component: any; props: any; layout: any; type: string; options: any }>
})

const BASE_CATEGORY_COLORS = ['#2563EB', '#F97316', '#10B981', '#A855F7', '#EC4899', '#14B8A6', '#F59E0B', '#6366F1', '#0EA5E9', '#65A30D']
const advancedCategoryOptions = computed(() => advancedTargetsConfig.value?.categories ?? [])
const advancedColorPalette = computed(() => {
  const palette = new Set<string>()
  const push = (value?: string | null) => {
    const color = sanitizeHexColor(value)
    if (color) palette.add(color)
  }
  advancedCategoryOptions.value.forEach((cat) => push(cat.color))
  BASE_CATEGORY_COLORS.forEach((color) => palette.add(color))
  return Array.from(palette)
})
const canAddAdvancedCategory = computed(() => {
  const cfg = advancedTargetsConfig.value
  if (!cfg) return false
  return nextGroupId(cfg) !== null
})

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
    const color = sanitizeHexColor(cat?.color)
    if (color) used.add(color)
  })
  for (const color of BASE_CATEGORY_COLORS) {
    if (!used.has(color)) return color
  }
  return BASE_CATEGORY_COLORS[0] ?? null
}

function widthClass(width: string) {
  switch (width) {
    case 'quarter': return 'w-quarter'
    case 'half': return 'w-half'
    default: return 'w-full'
  }
}

function heightClass(height: string) {
  switch (height) {
    case 's': return 'h-s'
    case 'l': return 'h-l'
    default: return 'h-m'
  }
}

function widthLabel(width: string) {
  if (width === 'quarter') return '¼'
  if (width === 'half') return '½'
  return '1×'
}

function heightLabel(height: string) {
  if (height === 's') return 'S'
  if (height === 'l') return 'L'
  return 'M'
}

function textClass(size?: string) {
  if (size === 'sm') return 'text-sm'
  if (size === 'lg') return 'text-lg'
  return 'text-md'
}

function registryEntry(type: string) {
  return widgetsRegistry[type]
}

function isConfigurable(type: string) {
  return Boolean(widgetsRegistry[type]?.configurable)
}

function toggleOptions(id: string, nextOpen: boolean) {
  openOptionsId.value = nextOpen ? id : null
  if (!nextOpen && advancedTargetsId.value === id) {
    advancedTargetsId.value = null
    advancedTargetsConfig.value = null
  }
}

function resetAdvancedMessages() {
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

function openAdvancedTargets(id: string) {
  const widget = props.widgets.find(w => w.id === id)
  if (!widget) return
  const opts = widget.options || {}
  const base = opts.useLocalConfig && opts.localConfig
    ? normalizeTargetsConfig(opts.localConfig)
    : normalizeTargetsConfig(props.context.targetsConfig)
  advancedTargetsId.value = id
  advancedTargetsConfig.value = cloneTargetsConfig(base)
  resetAdvancedMessages()
  openOptionsId.value = id
}

function updateAdvancedTargets(mutator: (cfg: TargetsConfig)=>void) {
  if (!advancedTargetsConfig.value) return
  const next = cloneTargetsConfig(advancedTargetsConfig.value)
  mutator(next)
  advancedTargetsConfig.value = next
}

function updateAdvancedCategory(id: string, mutator: (cat: TargetsConfig['categories'][number]) => void) {
  updateAdvancedTargets((cfg) => {
    const cat = cfg.categories.find((c) => c.id === id)
    if (cat) mutator(cat)
  })
}

function setAdvancedTotalTarget(value: string) {
  applyNumericUpdate(
    value,
    { min: 0, max: 1000, step: 0.5, decimals: 2 },
    (message) => { totalTargetMessage.value = message },
    (num) => updateAdvancedTargets((cfg) => { cfg.totalHours = num }),
  )
}

function setAdvancedAllDayHours(value: string) {
  applyNumericUpdate(
    value,
    { min: 0, max: 24, step: 0.25, decimals: 2 },
    (message) => { allDayHoursMessage.value = message },
    (num) => updateAdvancedTargets((cfg) => { cfg.allDayHours = num }),
    '0–24 hours per day',
  )
}

function setAdvancedCategoryTarget(id: string, value: string) {
  applyNumericUpdate(
    value,
    { min: 0, max: 1000, step: 0.5, decimals: 2 },
    (message) => { categoryTargetMessages[id] = message },
    (num) => updateAdvancedCategory(id, (cat) => { cat.targetHours = num }),
  )
}

function setAdvancedCategoryLabel(id: string, label: string) {
  updateAdvancedCategory(id, (cat) => { cat.label = label.trim() || cat.label })
}

function setAdvancedCategoryWeekend(id: string, value: boolean) {
  updateAdvancedCategory(id, (cat) => { cat.includeWeekend = value })
}

function setAdvancedCategoryColor(id: string, color: string) {
  const sanitized = sanitizeHexColor(color)
  updateAdvancedCategory(id, (cat) => { cat.color = sanitized ?? null })
}

function setAdvancedCategoryPace(id: string, mode: string) {
  if (mode !== 'days_only' && mode !== 'time_aware') return
  updateAdvancedCategory(id, (cat) => { cat.paceMode = mode as TargetsConfig['pace']['mode'] })
}

function setAdvancedIncludeWeekendTotal(value: boolean) {
  updateAdvancedTargets((cfg) => { cfg.pace.includeWeekendTotal = value })
}

function setAdvancedPaceMode(mode: string) {
  if (mode !== 'days_only' && mode !== 'time_aware') return
  updateAdvancedTargets((cfg) => { cfg.pace.mode = mode as TargetsConfig['pace']['mode'] })
}

function setAdvancedThreshold(which: 'onTrack' | 'atRisk', value: string) {
  applyNumericUpdate(
    value,
    { min: -100, max: 100, step: 0.1, decimals: 1 },
    (message) => { paceThresholdMessages[which] = message },
    (num) => updateAdvancedTargets((cfg) => { cfg.pace.thresholds[which] = num }),
  )
}

function setAdvancedForecastMethod(method: string) {
  const mode = method === 'momentum' ? 'momentum' : 'linear'
  updateAdvancedTargets((cfg) => { cfg.forecast.methodPrimary = mode })
}

function setAdvancedForecastMomentum(value: string) {
  applyNumericUpdate(
    value,
    { min: 1, max: 14, step: 1, decimals: 0 },
    (message) => { forecastMomentumMessage.value = message },
    (num) => updateAdvancedTargets((cfg) => { cfg.forecast.momentumLastNDays = num }),
  )
}

function setAdvancedForecastPadding(value: string) {
  applyNumericUpdate(
    value,
    { min: 0, max: 100, step: 0.1, decimals: 1 },
    (message) => { forecastPaddingMessage.value = message },
    (num) => updateAdvancedTargets((cfg) => { cfg.forecast.padding = num }),
  )
}

function setAdvancedUiOption(key: keyof TargetsConfig['ui'], value: boolean) {
  updateAdvancedTargets((cfg) => {
    if (!cfg.ui) cfg.ui = { ...defaultTargets.ui }
    cfg.ui[key] = value
  })
}

function addAdvancedCategory() {
  const cfg = advancedTargetsConfig.value
  if (!cfg) return
  const nextGroup = nextGroupId(cfg)
  if (nextGroup === null) return
  updateAdvancedTargets((next) => {
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
      },
    ]
  })
}

function removeAdvancedCategory(id: string) {
  const cfg = advancedTargetsConfig.value
  if (!cfg || cfg.categories.length <= 1) return
  updateAdvancedTargets((next) => {
    next.categories = next.categories.filter((cat) => cat.id !== id)
  })
  delete categoryTargetMessages[id]
}

function saveAdvancedTargets() {
  if (!advancedTargetsConfig.value || !advancedTargetsId.value) return
  emit('edit:options', advancedTargetsId.value, 'localConfig', cloneTargetsConfig(advancedTargetsConfig.value))
  emit('edit:options', advancedTargetsId.value, 'useLocalConfig', true)
  openOptionsId.value = null
  advancedTargetsId.value = null
  advancedTargetsConfig.value = null
  resetAdvancedMessages()
}

function closeAdvancedTargets() {
  openOptionsId.value = null
  advancedTargetsId.value = null
  advancedTargetsConfig.value = null
  resetAdvancedMessages()
}

function resetToGlobalTargets() {
  if (!advancedTargetsId.value) return
  emit('edit:options', advancedTargetsId.value, 'useLocalConfig', false)
  emit('edit:options', advancedTargetsId.value, 'localConfig', null)
  closeAdvancedTargets()
}

function openOnboardingTargets() {
  closeAdvancedTargets()
  emit('open:onboarding', 'categories')
}
</script>

<style scoped>
.layout-wrapper{
  position:relative;
}
.layout-grid{
  display:grid;
  grid-template-columns:repeat(12,1fr);
  gap:12px;
  width:100%;
}
.layout-item{
  min-width:0;
  position:relative;
  display:flex;
  padding:0;
}
.layout-item > *{
  flex:1 1 auto;
}
.w-quarter{ grid-column: span 3; }
.w-half{ grid-column: span 6; }
.w-full{ grid-column: span 12; }
.h-s > *{ min-height:140px; }
.h-m > *{ min-height:220px; }
.h-l > *{ min-height:320px; }
.edit-bar{
  position:absolute;
  bottom:6px;
  right:8px;
  left:8px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:6px;
  z-index:3;
  pointer-events:none;
  background:transparent;
  padding-top:0;
}
.edit-bar .edit-left,
.edit-bar .edit-right{
  display:flex;
  gap:4px;
  align-items:center;
  pointer-events:auto;
}
.ghost{
  border:1px solid var(--color-border, #d1d5db);
  background:rgba(255,255,255,0.9);
  padding:2px 6px;
  border-radius:6px;
  font-size:12px;
  cursor:pointer;
}
.ghost.danger{ color:#b91c1c; border-color:#fca5a5; }
.is-editable{
  outline:1px dashed rgba(107,114,128,0.5);
  border-radius:10px;
}
.has-toolbar{
  padding-bottom:40px;
}
.text-sm{ font-size:12px; line-height:1.2; }
.text-md{ font-size:14px; line-height:1.35; }
.text-lg{ font-size:18px; line-height:1.5; }
.is-dense{ line-height:1.2; }
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
  background:var(--color-background-hover, #f8fafc);
}
.overlay-title{
  font-weight:600;
  font-size:16px;
}
.overlay-subtitle{
  font-size:12px;
  color:var(--muted, #6b7280);
  margin-top:2px;
}
.overlay-actions{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:8px;
  padding:12px 16px;
  border-top:1px solid var(--color-border, #e5e7eb);
  background:var(--color-background-hover, #f8fafc);
}
.overlay-actions__left,
.overlay-actions__right{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}
.ghost.primary{
  border-color:var(--color-primary, #2563EB);
  color:var(--color-primary, #2563EB);
}
@media (max-width: 640px){
  .advanced-overlay{
    padding:16px;
    align-items:flex-start;
  }
}
@media (max-width: 1024px){
  .w-quarter{ grid-column: span 6; }
}
@media (max-width: 768px){
  .w-quarter,.w-half,.w-full{ grid-column: span 12; }
}
</style>
