<template>
  <div class="note-card" :style="cardStyle">
    <div class="note-header">
      <div v-if="showHeader" class="title">{{ title }}</div>
      <button class="btn" type="button" :disabled="saving" @click="onSaveClick">Save</button>
    </div>
    <div class="field">
      <div class="field-head">
        <span class="label">{{ prevLabel }}</span>
        <select
          v-if="historyOptions.length"
          v-model="selectedHistoryId"
          class="note-select"
          :aria-label="`Select ${prevLabel}`"
        >
          <option v-for="opt in historyOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</option>
        </select>
      </div>
      <textarea class="note note--compact" :value="selectedHistoryContent" readonly />
    </div>
    <label class="field">
      <span class="label">{{ currLabel }}</span>
      <textarea
        class="note"
        :value="modelValue"
        :disabled="saving"
        @input="onInput"
      />
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
const props = defineProps<{
  previous?: string
  history?: Array<{ id: string; label: string; title: string; content: string }>
  modelValue?: string
  prevLabel?: string
  currLabel?: string
  saving?: boolean
  title?: string
  cardBg?: string | null
  showHeader?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'save'): void
}>()

const title = computed(() => props.title || 'Notes')
const showHeader = computed(() => props.showHeader !== false)
const prevLabel = props.prevLabel || 'Previous'
const currLabel = props.currLabel || 'Current'
const cardStyle = {
  background: props.cardBg || undefined,
}
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

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}
function onSaveClick() {
  emit('save')
}
</script>

<style scoped>
.note-card{
  background: var(--card,#fff);
  border:1px solid var(--color-border,#d1d5db);
  border-radius:calc(10px * var(--widget-space, 1));
  padding:var(--widget-pad, 12px);
  color:var(--fg,#0f172a);
  display:flex;
  flex-direction:column;
  gap:var(--widget-gap, 10px);
  font-size:var(--widget-font, 14px);
}
.note-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
}
.title{
  font-weight:600;
  font-size:var(--widget-title-size, calc(14px * var(--widget-scale, 1)));
}
.btn{
  padding:calc(6px * var(--widget-space, 1)) calc(10px * var(--widget-space, 1));
  border-radius:calc(6px * var(--widget-space, 1));
  border:1px solid var(--color-border,#d1d5db);
  background: var(--card,#fff);
  cursor:pointer;
  font-size:calc(12px * var(--widget-scale, 1));
}
.field{
  display:flex;
  flex-direction:column;
  gap:calc(4px * var(--widget-space, 1));
}
.field-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:calc(6px * var(--widget-space, 1));
}
.label{
  font-size:calc(12px * var(--widget-scale, 1));
  color:var(--muted);
}
.note{
  width:100%;
  min-height:calc(80px * var(--widget-scale, 1));
  border:1px solid var(--color-border,#d1d5db);
  border-radius:calc(6px * var(--widget-space, 1));
  padding:calc(8px * var(--widget-space, 1));
  resize:vertical;
  font-size:calc(13px * var(--widget-scale, 1));
}
.note--compact{
  min-height:calc(60px * var(--widget-scale, 1));
  font-size:calc(12px * var(--widget-scale, 1));
}
.note-select{
  max-width:55%;
  padding:calc(4px * var(--widget-space, 1)) calc(8px * var(--widget-space, 1));
  border-radius:calc(6px * var(--widget-space, 1));
  border:1px solid var(--color-border,#d1d5db);
  background: var(--card,#fff);
  color:var(--fg,#0f172a);
  font-size:calc(12px * var(--widget-scale, 1));
}
</style>
