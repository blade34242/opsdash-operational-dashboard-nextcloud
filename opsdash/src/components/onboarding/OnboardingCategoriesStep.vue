<template>
  <h3>Configure categories &amp; targets</h3>
  <p v-if="!categoriesEnabled" class="hint">This strategy does not require categories.</p>
  <template v-else>
    <div class="category-presets">
      <h4>Quick start presets</h4>
      <p class="hint">Pick a preset to create categories fast. You can edit everything after.</p>
      <div class="preset-grid">
        <button
          v-for="preset in categoryPresets"
          :key="preset.id"
          type="button"
          class="preset-card"
          @click="applyCategoryPreset(preset)"
        >
          <div class="preset-title">{{ preset.title }}</div>
          <div class="preset-desc">{{ preset.description }}</div>
          <div class="preset-swatches">
            <span
              v-for="color in preset.colors"
              :key="`${preset.id}-${color}`"
              class="preset-swatch"
              :style="{ backgroundColor: color }"
              aria-hidden="true"
            />
          </div>
        </button>
      </div>
    </div>
    <div class="categories-editor">
      <div v-if="!categories.length" class="empty-state">
        <p>No categories yet. Add at least one to continue.</p>
      </div>
      <article v-for="cat in categories" :key="cat.id" class="category-card">
        <header class="category-card__header">
          <div class="color-field" data-color-popover>
            <button
              type="button"
              class="color-button"
              :aria-expanded="openColorId === cat.id"
              :aria-label="`Choose color for ${cat.label}`"
              @click.stop="toggleColorPopover(cat.id)"
            >
              <span class="category-color-indicator" :style="{ backgroundColor: resolvedColor(cat) }" aria-hidden="true" />
              <span>Color</span>
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
            <span class="label">Target</span>
            <div class="input-unit">
              <input
                type="number"
                :value="cat.targetHours"
                min="0"
                step="0.5"
                @input="setCategoryTarget(cat.id, ($event.target as HTMLInputElement).value)"
              />
              <span class="unit">h / week</span>
            </div>
          </label>
          <label class="field">
            <span class="label">Pacing</span>
            <select
              :value="cat.paceMode"
              @change="setCategoryPaceMode(cat.id, ($event.target as HTMLSelectElement).value as CategoryDraft['paceMode'])"
            >
              <option value="days_only">Days only</option>
              <option value="time_aware">Time aware</option>
            </select>
            <span class="field-hint">Time aware adjusts for time already logged.</span>
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
      <div v-if="categories.length" class="category-total">Total weekly target: {{ categoryTotalHours.toFixed(1) }} h</div>
    </div>

    <div v-if="selectedCalendars.length" class="calendar-assignments">
      <h4>Assign calendars</h4>
      <p class="hint">Every selected calendar must be assigned before you continue.</p>
      <div v-for="cal in selectedCalendars" :key="cal.id" class="assignment-row" :class="{ 'is-unassigned': !assignments[cal.id] }">
        <span class="cal-name">{{ cal.displayname }}</span>
        <select :value="assignments[cal.id]" @change="assignCalendar(cal.id, ($event.target as HTMLSelectElement).value)">
          <option value="">Unassigned</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.label }}</option>
        </select>
        <span v-if="!assignments[cal.id]" class="assignment-warning">Required</span>
      </div>
      <p v-if="!categories.length" class="warning">Add at least one category to assign calendars.</p>
    </div>
    <div v-if="selectedCalendars.length && showCalendarTargets" class="calendar-targets">
      <h4>Calendar targets (h / week)</h4>
      <div v-for="cal in selectedCalendars" :key="`targets-${cal.id}`" class="target-row">
        <span class="cal-name">{{ cal.displayname }}</span>
        <div class="input-unit">
          <input
            type="number"
            min="0"
            step="0.25"
            :value="getCalendarTarget(cal.id)"
            @input="setCalendarTarget(cal.id, ($event.target as HTMLInputElement).value)"
          />
          <span class="unit">h / week</span>
        </div>
      </div>
    </div>
    <p v-if="!selectedCalendars.length" class="hint">Select at least one calendar to continue.</p>
  </template>
</template>

<script setup lang="ts">
import { NcButton } from '@nextcloud/vue'
import type { CalendarSummary, CategoryDraft } from '../../services/onboarding'

defineProps<{
  categoriesEnabled: boolean
  categories: CategoryDraft[]
  categoryTotalHours: number
  selectedCalendars: CalendarSummary[]
  assignments: Record<string, string>
  showCalendarTargets: boolean
  calendarTargets: Record<string, number>
  getCalendarTarget: (id: string) => number | ''
  setCalendarTarget: (id: string, value: string) => void
  addCategory: () => void
  removeCategory: (id: string) => void
  setCategoryLabel: (id: string, value: string) => void
  categoryPresets: Array<{
    id: string
    title: string
    description: string
    colors: string[]
    categories: Array<Pick<CategoryDraft, 'id' | 'label' | 'targetHours' | 'includeWeekend' | 'paceMode' | 'color'>>
  }>
  applyCategoryPreset: (preset: {
    id: string
    title: string
    description: string
    colors: string[]
    categories: Array<Pick<CategoryDraft, 'id' | 'label' | 'targetHours' | 'includeWeekend' | 'paceMode' | 'color'>>
  }) => void
  setCategoryTarget: (id: string, value: string) => void
  setCategoryPaceMode: (id: string, value: CategoryDraft['paceMode']) => void
  toggleCategoryWeekend: (id: string, checked: boolean) => void
  assignCalendar: (calId: string, categoryId: string) => void
  openColorId: string | null
  toggleColorPopover: (id: string) => void
  closeColorPopover: () => void
  categoryColorPalette: string[]
  resolvedColor: (cat: { color?: string | null }) => string
  applyColor: (id: string, value: string) => void
  onColorInput: (id: string, value: string) => void
}>()
</script>
