<template>
  <div class="note-card">
    <div class="note-header">
      <div class="title">{{ title }}</div>
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
const props = defineProps<{
  previous?: string
  modelValue?: string
  prevLabel?: string
  currLabel?: string
  saving?: boolean
  title?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'save'): void
}>()

const title = props.title || 'Notes'
const prevLabel = props.prevLabel || 'Previous'
const currLabel = props.currLabel || 'Current'

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
  border-radius:10px;
  padding:12px;
  color:var(--fg,#0f172a);
  display:flex;
  flex-direction:column;
  gap:10px;
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
  padding:6px 10px;
  border-radius:6px;
  border:1px solid var(--color-border,#d1d5db);
  background: var(--card,#fff);
  cursor:pointer;
}
.field{
  display:flex;
  flex-direction:column;
  gap:4px;
}
.label{
  font-size:12px;
  color:var(--muted);
}
.note{
  width:100%;
  min-height:80px;
  border:1px solid var(--color-border,#d1d5db);
  border-radius:6px;
  padding:8px;
  resize:vertical;
}
</style>
