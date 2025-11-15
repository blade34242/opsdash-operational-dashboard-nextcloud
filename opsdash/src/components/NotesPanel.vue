<template>
  <div class="notes-section">
    <div class="hint" :title="prevTitle">{{ prevLabel }}</div>
    <textarea :value="previous" readonly rows="5" class="notes-textarea" :aria-label="t('Previous notes')"></textarea>
    <div class="hint" :title="currTitle">{{ currLabel }}</div>
    <textarea :value="modelValue" @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
              rows="5" class="notes-textarea notes-textarea--editable" :placeholder="t('Write your notes…')" :aria-label="t('Current notes')"></textarea>
    <div class="notes-actions">
      <NcButton type="tertiary" :disabled="saving" @click="$emit('save')">{{ t('Save') }}</NcButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NcButton } from '@nextcloud/vue'
import { t } from '../services/i18n'
defineProps<{ previous: string; modelValue: string; prevLabel: string; currLabel: string; prevTitle: string; currTitle: string; saving: boolean }>()
defineEmits(['update:modelValue','save'])
</script>

<style scoped>
.notes-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.notes-textarea {
  width: 100%;
  min-height: 120px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: color-mix(in oklab, var(--card), transparent 5%);
  color: var(--fg);
  resize: vertical;
  box-sizing: border-box;
  font: 13px/1.4 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.notes-textarea:focus {
  outline: 2px solid color-mix(in oklab, var(--brand), transparent 60%);
  outline-offset: 1px;
}
.notes-textarea:read-only {
  background: color-mix(in oklab, var(--card), transparent 15%);
  color: var(--muted);
}
.notes-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}
</style>
