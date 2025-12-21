<template>
  <div class="options-wrapper" @keydown.stop>
    <button type="button" class="ghost" title="Configure widget" @click.stop="open = !open">⚙</button>
    <div v-if="open" class="options-pop">
      <div class="opt-section">
        <div class="opt-section__title">Layout & title</div>
        <div v-for="control in coreControls" :key="control.key" class="opt-row">
          <label :for="`opt-${control.key}`">{{ control.label }}</label>
          <template v-if="control.type === 'number'">
            <input
              :id="`opt-${control.key}`"
              type="number"
              :min="control.min"
              :max="control.max"
              :step="control.step || 1"
              :value="valueFor(control.key) ?? ''"
              @input="onNumber(control.key, $event)"
            />
          </template>
          <template v-else-if="control.type === 'select'">
            <select :id="`opt-${control.key}`" :value="valueFor(control.key)" @change="onSelect(control.key, $event)">
              <option v-for="opt in control.options || []" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </template>
          <template v-else-if="control.type === 'toggle'">
            <input
              :id="`opt-${control.key}`"
              type="checkbox"
              :checked="!!valueFor(control.key)"
              @change="onToggle(control.key, $event)"
            />
          </template>
          <template v-else-if="control.type === 'text'">
            <input
              :id="`opt-${control.key}`"
              type="text"
              :value="valueFor(control.key) ?? ''"
              @input="onText(control.key, $event)"
            />
          </template>
          <template v-else-if="control.type === 'color'">
            <input
              :id="`opt-${control.key}`"
              type="color"
              :value="valueFor(control.key) || '#000000'"
              @input="onText(control.key, $event)"
            />
          </template>
        </div>
      </div>

      <div class="opt-section" v-if="specificControls.length">
        <div class="opt-section__title">Widget options</div>
        <div v-for="control in specificControls" :key="control.key" class="opt-row">
          <label :for="`opt-${control.key}`">{{ control.label }}</label>
          <template v-if="control.type === 'number'">
            <input
              :id="`opt-${control.key}`"
              type="number"
              :min="control.min"
              :max="control.max"
              :step="control.step || 1"
            :value="valueFor(control.key) ?? ''"
            @input="onNumber(control.key, $event)"
          />
        </template>
          <template v-else-if="control.type === 'select'">
            <select :id="`opt-${control.key}`" :value="valueFor(control.key)" @change="onSelect(control.key, $event)">
              <option v-for="opt in control.options || []" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </template>
          <template v-else-if="control.type === 'toggle'">
            <input
              :id="`opt-${control.key}`"
              type="checkbox"
              :checked="!!valueFor(control.key)"
              @change="onToggle(control.key, $event)"
            />
          </template>
          <template v-else-if="control.type === 'text'">
            <input
              :id="`opt-${control.key}`"
              type="text"
              :value="valueFor(control.key) ?? ''"
              @input="onText(control.key, $event)"
            />
          </template>
          <template v-else-if="control.type === 'color'">
            <input
              :id="`opt-${control.key}`"
              type="color"
              :value="valueFor(control.key) || '#000000'"
              @input="onText(control.key, $event)"
            />
          </template>
          <template v-else-if="control.type === 'colorlist'">
            <div class="colorlist">
              <div
                v-for="(col, idx) in paletteValue(control.key)"
                :key="`${control.key}-${idx}`"
                class="colorlist__item"
              >
                <input
                  type="color"
                  :value="col"
                  @input="onPalette(control.key, idx, $event)"
                />
              </div>
              <button type="button" class="ghost sm" @click="addPalette(control.key)">+</button>
            </div>
          </template>
          <template v-else-if="control.type === 'multiselect'">
            <div class="multi">
              <label v-for="opt in control.options || []" :key="`${control.key}-${opt.value}`" class="multi__item">
                <input
                  type="checkbox"
                  :value="opt.value"
                  :checked="Array.isArray(valueFor(control.key)) ? valueFor(control.key).includes(opt.value) : false"
                  @change="onMulti(control.key, opt.value, $event)"
                />
                <span>{{ opt.label }}</span>
              </label>
            </div>
          </template>
          <template v-else-if="control.type === 'textarea'">
            <textarea
              :id="`opt-${control.key}`"
              rows="3"
              :value="valueFor(control.key) ?? ''"
              @input="onText(control.key, $event)"
            />
          </template>
        </div>
      </div>
      <div v-if="showAdvanced" class="opt-row opt-row--footer">
        <button
          type="button"
          class="link-btn"
          title="Opens a full targets editor for this widget only. Use the reset inside to go back to global."
          @click.stop="emit('open-advanced')"
        >
          Advanced targets (widget only)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  entry: any
  options: Record<string, any>
  open: boolean
  showAdvanced?: boolean
  context?: Record<string, any>
}>()

const emit = defineEmits<{
  (e: 'change', key: string, value: any): void
  (e: 'toggle', open: boolean): void
  (e: 'open-advanced'): void
}>()

const local = ref<Record<string, any>>({})

const coreControls = [
  { key: 'titlePrefix', label: 'Title prefix', type: 'text' },
  {
    key: 'cardBg',
    label: 'Card background',
    type: 'color',
    hint: 'Pick a card fill; leave empty for default.',
  },
  {
    key: 'scale',
    label: 'Scale',
    type: 'select',
    options: [
      { value: 'sm', label: 'Small' },
      { value: 'md', label: 'Normal' },
      { value: 'lg', label: 'Large' },
      { value: 'xl', label: 'Extra large' },
    ],
  },
  { key: 'dense', label: 'Dense mode', type: 'toggle' },
]

const specificControls = computed(() => {
  const blockKeys = new Set(coreControls.map((c) => c.key))
  const controls = props.entry?.controls || []
  const dynamic =
    typeof props.entry?.dynamicControls === 'function'
      ? props.entry.dynamicControls(props.options || {}, props.context || {})
      : []
  const merged = [...controls, ...dynamic].filter((c: any) => !blockKeys.has(c.key))
  return merged
})

watch(
  () => props.options,
  (next) => {
    const defaults = props.entry?.defaultOptions || {}
    local.value = { ...defaults, ...(next || {}) }
  },
  { immediate: true, deep: true },
)

const open = computed({
  get: () => !!props.open,
  set: (val: boolean) => emit('toggle', val),
})

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
function onMulti(key: string, value: any, event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  const current = Array.isArray(local.value[key]) ? [...local.value[key]] : []
  const next = new Set(current)
  if (checked) next.add(value)
  else next.delete(value)
  emit('change', key, Array.from(next))
}
function valueFor(key: string) {
  if (key === 'scale') {
    return local.value.scale ?? local.value.textSize
  }
  if (!key.includes('.')) return local.value[key]
  const parts = key.split('.')
  let cur: any = local.value
  for (const p of parts) {
    if (cur == null) return undefined
    cur = cur[p]
  }
  return cur
}
function paletteValue(key: string) {
  const raw = valueFor(key)
  if (Array.isArray(raw) && raw.length) return raw
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',').map((v: string) => v.trim()).filter(Boolean)
  }
  return defaultPalette.slice(0, 5)
}
function onPalette(key: string, idx: number, event: Event) {
  const value = (event.target as HTMLInputElement).value
  const arr = [...paletteValue(key)]
  arr[idx] = value
  emit('change', key, arr)
}
function addPalette(key: string) {
  const arr = [...paletteValue(key), '#cccccc']
  emit('change', key, arr)
}

const defaultPalette = ['#2563EB', '#F97316', '#10B981', '#A855F7', '#EC4899']
</script>

<style scoped>
.options-wrapper{
  position:relative;
}
.options-pop{
  position:absolute;
  bottom:calc(100% + 6px);
  right:0;
  top:auto;
  background:color-mix(in oklab, #111827, #1f2937 60%);
  border:1px solid color-mix(in oklab, #4b5563, transparent 20%);
  border-radius:8px;
  box-shadow:0 10px 22px rgba(0,0,0,0.22);
  padding:8px;
  min-width:200px;
  z-index:30;
  max-height:320px;
  overflow:auto;
}
.opt-row{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  margin-bottom:6px;
}
.opt-row:last-child{ margin-bottom:0; }
.opt-row--footer{
  justify-content:flex-end;
}
.link-btn{
  border:none;
  background:transparent;
  color:var(--brand,#2563eb);
  cursor:pointer;
  font-size:12px;
  text-decoration:underline;
}
.opt-row--footer{
  justify-content:flex-end;
}
.link-btn{
  border:none;
  background:transparent;
  color:var(--brand,#2563eb);
  cursor:pointer;
  font-size:12px;
  text-decoration:underline;
}
.opt-row label{
  font-size:12px;
  color:#e5e7eb;
}
.opt-row input[type=\"number\"],
.opt-row select,
.opt-row input[type=\"text\"]{
  width:100px;
  background:#0f172a;
  border:1px solid color-mix(in oklab, #4b5563, transparent 30%);
  color:#e5e7eb;
  border-radius:6px;
  padding:4px 6px;
}
.opt-row textarea{
  width:160px;
  background:#0f172a;
  border:1px solid color-mix(in oklab, #4b5563, transparent 30%);
  color:#e5e7eb;
  border-radius:6px;
  padding:6px;
}
.opt-section{
  margin-bottom:10px;
  border-bottom:1px solid color-mix(in oklab, #4b5563, transparent 25%);
  padding-bottom:6px;
}
.opt-section:last-child{
  border-bottom:none;
  padding-bottom:0;
  margin-bottom:0;
}
.opt-section__title{
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:0.04em;
  color:#9ca3af;
  margin-bottom:6px;
  font-weight:700;
}
.colorlist{
  display:flex;
  align-items:center;
  gap:6px;
  flex-wrap:wrap;
}
.colorlist__item input[type="color"]{
  width:38px;
  height:28px;
  padding:0;
  border:1px solid color-mix(in oklab, #4b5563, transparent 30%);
  background:#0f172a;
}
.multi{
  display:grid;
  gap:6px;
}
.multi__item{
  display:flex;
  align-items:center;
  gap:6px;
  font-size:13px;
}
</style>
