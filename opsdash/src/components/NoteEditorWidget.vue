<template>
  <div class="note-card" :style="cardStyle">
    <div class="note-header">
      <div v-if="showHeader" class="title">{{ title }}</div>
      <button class="btn" type="button" :disabled="saving" @click="onSaveClick">Save</button>
    </div>
    <label class="field">
      <span class="label">{{ prevLabel }}</span>
      <textarea class="note" :value="previous" readonly />
    </label>
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
import { computed } from 'vue'
const props = defineProps<{
  previous?: string
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

const title = props.title || 'Notes'
const showHeader = computed(() => props.showHeader !== false)
const prevLabel = props.prevLabel || 'Previous'
const currLabel = props.currLabel || 'Current'
const cardStyle = {
  background: props.cardBg || undefined,
}

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
</style>
