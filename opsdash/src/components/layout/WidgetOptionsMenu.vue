<template>
  <div class="options-wrapper" @keydown.stop>
    <button type="button" class="ghost" title="Configure widget" @click.stop="open = !open">⚙</button>
    <div v-if="open" class="options-pop">
      <div v-for="control in mergedControls" :key="control.key" class="opt-row">
        <label :for="`opt-${control.key}`">{{ control.label }}</label>
        <template v-if="control.type === 'number'">
          <input
            :id="`opt-${control.key}`"
            type="number"
            :min="control.min"
            :max="control.max"
            :step="control.step || 1"
            :value="local[control.key] ?? ''"
            @input="onNumber(control.key, $event)"
          />
        </template>
        <template v-else-if="control.type === 'select'">
          <select :id="`opt-${control.key}`" :value="local[control.key]" @change="onSelect(control.key, $event)">
            <option v-for="opt in control.options || []" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </template>
        <template v-else-if="control.type === 'toggle'">
          <input
            :id="`opt-${control.key}`"
            type="checkbox"
            :checked="!!local[control.key]"
            @change="onToggle(control.key, $event)"
          />
        </template>
        <template v-else-if="control.type === 'text'">
          <input
            :id="`opt-${control.key}`"
            type="text"
            :value="local[control.key] ?? ''"
            @input="onText(control.key, $event)"
          />
        </template>
        <template v-else-if="control.type === 'textarea'">
          <textarea
            :id="`opt-${control.key}`"
            rows="3"
            :value="local[control.key] ?? ''"
            @input="onText(control.key, $event)"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  entry: any
  options: Record<string, any>
}>()

const emit = defineEmits<{
  (e: 'change', key: string, value: any): void
}>()

const open = ref(false)
const local = ref<Record<string, any>>({})

const commonControls = [
  {
    key: 'textSize',
    label: 'Text size',
    type: 'select',
    options: [
      { value: 'sm', label: 'Small' },
      { value: 'md', label: 'Normal' },
      { value: 'lg', label: 'Large' },
    ],
  },
  { key: 'dense', label: 'Dense mode', type: 'toggle' },
]

const mergedControls = computed(() => {
  const specific = props.entry?.controls || []
  return [...specific, ...commonControls]
})

watch(
  () => props.options,
  (next) => {
    local.value = { ...(next || {}) }
  },
  { immediate: true, deep: true },
)

function onNumber(key: string, event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  emit('change', key, value)
}
function onSelect(key: string, event: Event) {
  const value = (event.target as HTMLSelectElement).value
  emit('change', key, value)
}
function onToggle(key: string, event: Event) {
  const value = (event.target as HTMLInputElement).checked
  emit('change', key, value)
}
function onText(key: string, event: Event) {
  const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value
  emit('change', key, value)
}
</script>

<style scoped>
.options-wrapper{
  position:relative;
}
.options-pop{
  position:absolute;
  top:28px;
  right:0;
  background: var(--card, #fff);
  border:1px solid var(--color-border, #d1d5db);
  border-radius:8px;
  box-shadow:0 8px 24px rgba(0,0,0,0.12);
  padding:8px;
  min-width:180px;
  z-index:10;
}
.opt-row{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  margin-bottom:6px;
}
.opt-row:last-child{ margin-bottom:0; }
.opt-row label{
  font-size:12px;
  color:var(--muted);
}
.opt-row input[type=\"number\"],
.opt-row select,
.opt-row input[type=\"text\"]{
  width:90px;
}
.opt-row textarea{
  width:140px;
}
</style>
