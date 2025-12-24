<template>
  <Teleport to="body">
    <div v-if="editable" class="widget-toolbar-layer">
      <div class="widget-toolbar">
        <div class="toolbar-title">
          <template v-if="selectedItem">{{ selectedItemTitle }}</template>
          <template v-else>Click a widget to edit</template>
        </div>
        <div class="toolbar-actions" v-if="selectedItem">
          <button type="button" class="ghost" title="Move earlier" @click="$emit('move', 'up')">←</button>
          <button type="button" class="ghost" title="Move later" @click="$emit('move', 'down')">→</button>
          <button type="button" class="ghost" title="Cycle width" @click="$emit('cycle-width')">{{ widthLabel(selectedItem.layout.width) }}</button>
          <button type="button" class="ghost" title="Cycle height" @click="$emit('cycle-height')">{{ heightLabel(selectedItem.layout.height) }}</button>
          <div class="toolbar-quick">
            <label class="toolbar-field">
              <span>Title</span>
              <input
                type="text"
                :value="optionValue('titlePrefix') || ''"
                placeholder="Prefix"
                @input="$emit('edit-options', selectedItem.id, 'titlePrefix', ($event.target as HTMLInputElement).value)"
              />
            </label>
            <label class="toolbar-field">
              <span>Card</span>
              <input
                type="color"
                :value="optionValue('cardBg') || '#ffffff'"
                @input="$emit('edit-options', selectedItem.id, 'cardBg', ($event.target as HTMLInputElement).value)"
              />
            </label>
            <label class="toolbar-field">
              <span>Scale</span>
              <select
                :value="optionValue('scale') || 'md'"
                @change="$emit('edit-options', selectedItem.id, 'scale', ($event.target as HTMLSelectElement).value)"
              >
                <option value="sm">Small</option>
                <option value="md">Normal</option>
                <option value="lg">Large</option>
                <option value="xl">Extra large</option>
              </select>
            </label>
            <label class="toolbar-field toolbar-field--toggle">
              <input
                type="checkbox"
                :checked="!!optionValue('dense')"
                @change="$emit('edit-options', selectedItem.id, 'dense', ($event.target as HTMLInputElement).checked)"
              />
              <span>Dense</span>
            </label>
          </div>
          <WidgetOptionsMenu
            v-if="selectedItem && isConfigurable(selectedItem.type)"
            :entry="registryEntry(selectedItem.type)"
            :options="selectedItem.options"
            :open="openOptionsId === selectedItem.id"
            :show-advanced="selectedItem.type === 'targets_v2'"
            :context="context"
            @toggle="(nextOpen) => $emit('toggle-options', selectedItem.id, nextOpen)"
            @open-advanced="$emit('open-advanced', selectedItem.id)"
            @change="(key,value)=>$emit('edit-options', selectedItem.id, key, value)"
          />
          <button
            v-if="presetLabel"
            type="button"
            class="ghost"
            title="Reset widgets to preset"
            @click="$emit('reset-preset')"
          >
            Reset {{ presetLabel }}
          </button>
          <button type="button" class="ghost danger" title="Remove widget" @click="$emit('remove')">✕</button>
        </div>
        <div class="toolbar-actions" v-else>
          <button type="button" class="ghost" @click="$emit('select-first')">Select first widget</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WidgetOptionsMenu from './WidgetOptionsMenu.vue'
import { widgetsRegistry, type WidgetRenderContext } from '../../services/widgetsRegistry'

const props = defineProps<{
  editable?: boolean
  selectedItem: null | { id: string; layout: any; type: string; options: any; props: any }
  openOptionsId: string | null
  presetLabel?: string | null
  context: WidgetRenderContext
}>()

defineEmits<{
  (e: 'select-first'): void
  (e: 'move', dir: 'up' | 'down'): void
  (e: 'cycle-width'): void
  (e: 'cycle-height'): void
  (e: 'remove'): void
  (e: 'reset-preset'): void
  (e: 'toggle-options', id: string, nextOpen: boolean): void
  (e: 'open-advanced', id: string): void
  (e: 'edit-options', id: string, key: string, value: any): void
}>()

const selectedItemTitle = computed(() => {
  const title = (props.selectedItem?.props as any)?.title || ''
  if (title) return title
  const registry = props.selectedItem ? widgetsRegistry[props.selectedItem.type] : null
  return registry?.label || props.selectedItem?.type || 'Widget'
})

function optionValue(key: string) {
  return props.selectedItem?.options?.[key]
}

function registryEntry(type: string) {
  return widgetsRegistry[type]
}

function isConfigurable(type: string) {
  return Boolean(widgetsRegistry[type]?.configurable)
}

function widthLabel(width: string) {
  if (width === 'quarter') return '¼'
  if (width === 'half') return '½'
  return '1×'
}

function heightLabel(height: string) {
  if (height === 's') return 'S'
  if (height === 'l') return 'L'
  if (height === 'xl') return 'XL'
  return 'M'
}
</script>

<style scoped>
.ghost{
  border:1px solid var(--color-border, #d1d5db);
  background:rgba(255,255,255,0.9);
  padding:2px 6px;
  border-radius:6px;
  font-size:12px;
  cursor:pointer;
}
.ghost.danger{ color:#b91c1c; border-color:#fca5a5; }
.widget-toolbar-layer{
  position:fixed;
  inset:0;
  pointer-events:none;
  z-index:2147480000;
  display:flex;
  align-items:flex-end;
  justify-content:stretch;
  padding:0 16px 12px calc(16px + var(--opsdash-nav-offset, 0px));
  background: none;
}
.widget-toolbar{
  pointer-events:auto;
  position:relative;
  margin-top:0;
  padding:7px 9px;
  border:1px solid rgba(59,130,246,0.55);
  background:#0b1222;
  border:1px solid color-mix(in oklab, var(--color-primary,#2563eb), transparent 20%);
  background:linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(2,6,23,0.98) 100%);
  border-radius:8px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:6px;
  box-shadow:0 8px 20px rgba(15,23,42,0.55), 0 0 0 1px rgba(59,130,246,0.18);
  max-width:none;
  width:100%;
  opacity:1;
  z-index:2147480001;
  backdrop-filter: blur(6px);
  transition: background 140ms ease, box-shadow 140ms ease, transform 140ms ease;
}
.widget-toolbar:hover{
  background:linear-gradient(180deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.98) 100%);
  box-shadow:0 10px 24px rgba(15,23,42,0.6), 0 0 0 1px rgba(59,130,246,0.25);
}
.toolbar-title{
  font-weight:600;
  color:#e5e7eb;
}
.toolbar-actions{
  display:flex;
  gap:6px;
  flex-wrap:wrap;
  align-items:center;
}
.toolbar-quick{
  display:flex;
  gap:6px;
  flex-wrap:wrap;
  align-items:center;
}
.toolbar-field{
  display:flex;
  align-items:center;
  gap:6px;
  font-size:11px;
  color:#e5e7eb;
}
.toolbar-field span{
  opacity:0.75;
}
.toolbar-field input[type="text"],
.toolbar-field select{
  border-radius:6px;
  border:1px solid color-mix(in oklab, #4b5563, transparent 35%);
  background:color-mix(in oklab, #0f172a, #111827 70%);
  color:#e2e8f0;
  padding:2px 6px;
  font-size:11px;
  min-width:84px;
}
.toolbar-field input[type="color"]{
  width:26px;
  height:22px;
  padding:0;
  border:1px solid color-mix(in oklab, #4b5563, transparent 35%);
  border-radius:6px;
  background:transparent;
}
.toolbar-field--toggle{
  gap:4px;
}
.widget-toolbar .ghost{
  padding:4px 6px;
  font-size:12px;
  background:#0f172a;
  border-color:#4b5563;
  background:color-mix(in oklab, #111827, #1f2937 80%);
  border-color:color-mix(in oklab, #4b5563, transparent 35%);
  color:#f1f5f9;
}
.widget-toolbar .ghost:hover{
  background:#1e3a8a;
  border-color:#2563eb;
  background:color-mix(in oklab, #2563EB, #111827 85%);
  border-color:color-mix(in oklab, #2563EB, transparent 50%);
}
</style>
