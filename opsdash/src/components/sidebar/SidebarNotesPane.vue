<template>
  <div
    id="opsdash-sidebar-pane-notes"
    class="sb-pane"
    role="tabpanel"
    aria-labelledby="opsdash-sidebar-tab-notes"
  >
    <div class="sb-title">Notes</div>
    <p class="sb-description">
      Keep quick context for the active week or month. Notes save with each range so you can revisit highlights later.
    </p>
    <div class="notes-config">
      <label class="notes-toggle">
        <input
          type="checkbox"
          :checked="showNotesInBalance"
          @change="emit('toggle-balance-note', ($event.target as HTMLInputElement).checked)"
        />
        <span>Show this note on the Balance card</span>
      </label>
    </div>
    <NotesPanel
      :previous="previous"
      :model-value="modelValue"
      :prev-label="prevLabel"
      :curr-label="currLabel"
      :prev-title="prevTitle"
      :curr-title="currTitle"
      :saving="saving"
      @update:modelValue="value => emit('update:modelValue', value)"
      @save="emit('save')"
    />
  </div>
</template>

<script setup lang="ts">
import NotesPanel from '../NotesPanel.vue'

const props = defineProps<{
  previous: string
  modelValue: string
  prevLabel: string
  currLabel: string
  prevTitle: string
  currTitle: string
  saving: boolean
  showNotesInBalance: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'save'): void
  (e: 'toggle-balance-note', value: boolean): void
}>()

const {
  previous,
  modelValue,
  prevLabel,
  currLabel,
  prevTitle,
  currTitle,
  saving,
  showNotesInBalance,
} = props
</script>

<style scoped>
.sb-description {
  font-size: 12px;
  color: var(--text-color-tertiary);
  margin: 0 0 10px;
}
.notes-config {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 12px;
}
.notes-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--fg);
}
.notes-toggle input {
  width: 16px;
  height: 16px;
}
</style>
