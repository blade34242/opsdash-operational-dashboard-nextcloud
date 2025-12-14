<template>
  <h3>Configure categories &amp; targets</h3>
  <p v-if="!categoriesEnabled" class="hint">This strategy does not require categories.</p>
  <template v-else>
    <div class="categories-editor">
      <article v-for="cat in categories" :key="cat.id" class="category-card">
        <header class="category-card__header">
          <span class="category-color-indicator" :style="{ backgroundColor: resolvedColor(cat) }" aria-hidden="true" />
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

    <div v-if="selectedCalendars.length" class="calendar-assignments">
      <h4>Assign calendars</h4>
      <div v-for="cal in selectedCalendars" :key="cal.id" class="assignment-row">
        <span class="cal-name">{{ cal.displayname }}</span>
        <select :value="assignments[cal.id]" @change="assignCalendar(cal.id, ($event.target as HTMLSelectElement).value)">
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.label }}</option>
        </select>
      </div>
    </div>
    <p v-else class="hint">Select at least one calendar to continue.</p>
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
  addCategory: () => void
  removeCategory: (id: string) => void
  setCategoryLabel: (id: string, value: string) => void
  setCategoryTarget: (id: string, value: string) => void
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

