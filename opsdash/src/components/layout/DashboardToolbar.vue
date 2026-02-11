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
                :checked="optionValue('showHeader') !== false"
                @change="$emit('edit-options', selectedItem.id, 'showHeader', ($event.target as HTMLInputElement).checked)"
              />
              <span>Show title</span>
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
.ghost {
  border: 1px solid var(--tb-btn-border, #cbd5e1);
  background: var(--tb-btn-bg, #ffffff);
  color: var(--tb-btn-fg, #0f172a);
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease, color 140ms ease;
}

.ghost:hover {
  background: var(--tb-btn-hover-bg, #f8fafc);
  border-color: var(--tb-btn-hover-border, #94a3b8);
}

.ghost.danger {
  color: var(--tb-danger, #b91c1c);
  border-color: color-mix(in oklab, var(--tb-danger, #b91c1c), transparent 55%);
}

.widget-toolbar-layer {
  position:fixed;
  inset:auto 24px 10px calc(24px + var(--opsdash-nav-offset, 0px));
  pointer-events:none;
  z-index:2147480000;
  display:flex;
  align-items:flex-end;
  justify-content:center;
  padding:0;
  background: none;
}
.widget-toolbar {
  --tb-bg: linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.97) 100%);
  --tb-border: color-mix(in oklab, #2563eb, #cbd5e1 68%);
  --tb-shadow: 0 10px 24px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(37, 99, 235, 0.12);
  --tb-hover-bg: linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(241,245,249,0.99) 100%);
  --tb-hover-shadow: 0 12px 28px rgba(15, 23, 42, 0.24), 0 0 0 1px rgba(37, 99, 235, 0.18);
  --tb-fg: #0f172a;
  --tb-muted: #475569;
  --tb-input-bg: color-mix(in oklab, #ffffff, #f8fafc 70%);
  --tb-input-border: color-mix(in oklab, #94a3b8, transparent 36%);
  --tb-input-fg: #0f172a;
  --tb-btn-bg: color-mix(in oklab, #ffffff, #f8fafc 48%);
  --tb-btn-border: color-mix(in oklab, #94a3b8, transparent 30%);
  --tb-btn-fg: #0f172a;
  --tb-btn-hover-bg: color-mix(in oklab, #dbeafe, #ffffff 72%);
  --tb-btn-hover-border: color-mix(in oklab, #2563eb, transparent 48%);
  pointer-events: auto;
  position: relative;
  margin-top: 0;
  padding: 7px 10px;
  border: 1px solid var(--tb-border);
  background: var(--tb-bg);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  box-shadow: var(--tb-shadow);
  max-width:1200px;
  width:min(100%, 1200px);
  opacity:1;
  z-index:2147480001;
  backdrop-filter: blur(6px);
  transition: background 140ms ease, box-shadow 140ms ease, transform 140ms ease;
}

:global(body.opsdash-theme-dark .widget-toolbar) {
  --tb-bg: linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(2,6,23,0.98) 100%);
  --tb-border: color-mix(in oklab, #2563eb, transparent 30%);
  --tb-shadow: 0 10px 24px rgba(2, 6, 23, 0.62), 0 0 0 1px rgba(59, 130, 246, 0.2);
  --tb-hover-bg: linear-gradient(180deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.98) 100%);
  --tb-hover-shadow: 0 12px 28px rgba(2, 6, 23, 0.66), 0 0 0 1px rgba(59, 130, 246, 0.26);
  --tb-fg: #e5e7eb;
  --tb-muted: #94a3b8;
  --tb-input-bg: color-mix(in oklab, #0f172a, #111827 70%);
  --tb-input-border: color-mix(in oklab, #475569, transparent 28%);
  --tb-input-fg: #e2e8f0;
  --tb-btn-bg: color-mix(in oklab, #111827, #1f2937 80%);
  --tb-btn-border: color-mix(in oklab, #4b5563, transparent 35%);
  --tb-btn-fg: #f1f5f9;
  --tb-btn-hover-bg: color-mix(in oklab, #2563EB, #111827 85%);
  --tb-btn-hover-border: color-mix(in oklab, #2563EB, transparent 50%);
}

.widget-toolbar:hover {
  background: var(--tb-hover-bg);
  box-shadow: var(--tb-hover-shadow);
}

.toolbar-title {
  font-weight:600;
  font-size:13px;
  color: var(--tb-fg);
}

.toolbar-actions {
  display:flex;
  gap:6px;
  flex-wrap:wrap;
  align-items:center;
}

.toolbar-quick {
  display:flex;
  gap:6px;
  flex-wrap:wrap;
  align-items:center;
}

.toolbar-field {
  display:flex;
  align-items:center;
  gap:6px;
  font-size:12px;
  color: var(--tb-fg);
}

.toolbar-field span {
  opacity: 0.82;
  color: var(--tb-muted);
}
.toolbar-field input[type="text"],
.toolbar-field select {
  border-radius: 6px;
  border: 1px solid var(--tb-input-border);
  background: var(--tb-input-bg);
  color: var(--tb-input-fg);
  padding: 3px 6px;
  font-size: 12px;
  min-width: 88px;
}

.toolbar-field input[type="color"] {
  width: 26px;
  height: 20px;
  padding: 0;
  border: 1px solid var(--tb-input-border);
  border-radius: 6px;
  background: transparent;
}

.toolbar-field--toggle {
  gap: 4px;
}

.widget-toolbar .ghost {
  padding: 5px 8px;
  font-size: 12px;
}

.widget-toolbar .ghost:hover {
  background: var(--tb-btn-hover-bg);
  border-color: var(--tb-btn-hover-border);
}
</style>
