<template>
  <div
    id="opsdash-sidebar-pane-notes"
    class="sb-pane"
    role="tabpanel"
    aria-labelledby="opsdash-sidebar-tab-notes"
  >
    <div class="sb-title">{{ t('Notes') }}</div>
    <p class="sb-description">
      {{ t('Keep quick context for the active week or month. Notes save with each range so you can revisit highlights later.') }}
    </p>
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
import { t } from '../../services/i18n'

const props = defineProps<{
  previous: string
  modelValue: string
  prevLabel: string
  currLabel: string
  prevTitle: string
  currTitle: string
  saving: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'save'): void
}>()

const {
  previous,
  modelValue,
  prevLabel,
  currLabel,
  prevTitle,
  currTitle,
  saving,
} = props
</script>

<style scoped>
.sb-description {
  font-size: 12px;
  color: var(--text-color-tertiary);
  margin: 0 0 10px;
}
</style>
