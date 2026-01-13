<template>
  <div class="notes-section" :style="cardStyle">
    <div v-if="showHeader" class="notes-header">{{ titleText }}</div>
    <div class="notes-history">
      <div class="notes-history__head">
        <div class="hint" :title="prevTitle">{{ prevLabel }}</div>
        <select
          v-if="historyOptions.length"
          v-model="selectedHistoryId"
          class="notes-select"
          :aria-label="t('Select previous notes')"
        >
          <option v-for="opt in historyOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</option>
        </select>
      </div>
      <textarea
        :value="selectedHistoryContent"
        readonly
        rows="3"
        class="notes-textarea notes-textarea--compact"
        :aria-label="t('Previous notes')"
      ></textarea>
    </div>
    <div class="hint" :title="currTitle">{{ currLabel }}</div>
    <textarea :value="modelValue" @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
              rows="5" class="notes-textarea notes-textarea--editable" :placeholder="t('Write your notes…')" :aria-label="t('Current notes')"></textarea>
    <div class="notes-actions">
      <NcButton type="tertiary" :disabled="saving" @click="$emit('save')">{{ t('Save') }}</NcButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NcButton } from '@nextcloud/vue'
import { t } from '../../services/i18n'
const props = defineProps<{
  previous: string
  history?: Array<{ id: string; label: string; title: string; content: string }>
  modelValue: string
  prevLabel: string
  currLabel: string
  prevTitle: string
  currTitle: string
  saving: boolean
  title?: string
  cardBg?: string | null
  showHeader?: boolean
}>()
defineEmits(['update:modelValue','save'])

const cardStyle = computed(() => ({ background: props.cardBg || undefined }))
const titleText = computed(() => props.title || 'Notes')
const showHeader = computed(() => props.showHeader !== false)

const historyOptions = computed(() => (props.history || []).filter((entry) => entry && entry.id && entry.label))
const selectedHistoryId = ref<string>('')

watch(
  () => historyOptions.value,
  (next) => {
    selectedHistoryId.value = next[0]?.id || ''
  },
  { immediate: true },
)

const selectedHistory = computed(() =>
  historyOptions.value.find((entry) => entry.id === selectedHistoryId.value) || null,
)
const selectedHistoryContent = computed(() => selectedHistory.value?.content || props.previous || '')
</script>

<style scoped>
.notes-section {
  display: flex;
  flex-direction: column;
  gap: var(--widget-gap, 8px);
  font-size: var(--widget-font, 14px);
}
.notes-header{
  font-weight:600;
  font-size:var(--widget-title-size, calc(14px * var(--widget-scale, 1)));
}
.notes-textarea {
  width: 100%;
  min-height: calc(120px * var(--widget-scale, 1));
  padding: calc(8px * var(--widget-space, 1)) calc(10px * var(--widget-space, 1));
  border-radius: calc(8px * var(--widget-space, 1));
  border: 1px solid var(--line);
  background: color-mix(in oklab, var(--card), transparent 5%);
  color: var(--fg);
  resize: vertical;
  box-sizing: border-box;
  font: calc(13px * var(--widget-scale, 1))/1.4 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.notes-textarea--compact {
  min-height: calc(70px * var(--widget-scale, 1));
  font-size: calc(12px * var(--widget-scale, 1));
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
  margin-top: calc(4px * var(--widget-space, 1));
}
.notes-history {
  display: flex;
  flex-direction: column;
  gap: calc(6px * var(--widget-space, 1));
}
.notes-history__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(6px * var(--widget-space, 1));
}
.notes-select {
  max-width: 55%;
  padding: calc(4px * var(--widget-space, 1)) calc(8px * var(--widget-space, 1));
  border-radius: calc(6px * var(--widget-space, 1));
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--fg);
  font-size: calc(12px * var(--widget-scale, 1));
}
</style>
