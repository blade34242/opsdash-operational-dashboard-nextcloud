<template>
  <div class="layout-grid">
    <div
      v-for="item in ordered"
      :key="item.id"
      class="layout-item"
      :class="[
        widthClass(item.layout.width),
        heightClass(item.layout.height),
        textClass(item.options?.textSize),
        { 'is-editable': editable, 'is-dense': item.options?.dense },
      ]"
    >
      <div v-if="editable" class="edit-bar">
        <div class="edit-left">
          <button type="button" class="ghost" title="Move earlier" @click="$emit('edit:move', item.id, 'up')">←</button>
          <button type="button" class="ghost" title="Move later" @click="$emit('edit:move', item.id, 'down')">→</button>
        </div>
        <div class="edit-right">
          <button type="button" class="ghost" title="Cycle width" @click="$emit('edit:width', item.id)">{{ widthLabel(item.layout.width) }}</button>
          <button type="button" class="ghost" title="Cycle height" @click="$emit('edit:height', item.id)">{{ heightLabel(item.layout.height) }}</button>
          <WidgetOptionsMenu
            v-if="isConfigurable(item.type)"
            :entry="registryEntry(item.type)"
            :options="item.options"
            :open="openOptionsId === item.id"
            @toggle="toggleOptions(item.id, $event)"
            @change="(key,value)=>$emit('edit:options', item.id, key, value)"
          />
          <button type="button" class="ghost danger" title="Remove widget" @click="$emit('edit:remove', item.id)">✕</button>
        </div>
      </div>
      <component :is="item.component" v-bind="item.props" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { WidgetDefinition, WidgetRenderContext } from '../../services/widgetsRegistry'
import { mapWidgetToComponent, widgetsRegistry } from '../../services/widgetsRegistry'
import WidgetOptionsMenu from './WidgetOptionsMenu.vue'

const props = defineProps<{
  widgets: WidgetDefinition[]
  context: WidgetRenderContext
  editable?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit:width', id: string): void
  (e: 'edit:height', id: string): void
  (e: 'edit:remove', id: string): void
  (e: 'edit:move', id: string, dir: 'up' | 'down'): void
  (e: 'edit:options', id: string, key: string, value: any): void
}>()

const openOptionsId = ref<string | null>(null)

const ordered = computed(() => {
  return (props.widgets || [])
    .slice()
    .sort((a, b) => (a.layout.order || 0) - (b.layout.order || 0))
    .map((def) => {
      const mapped = mapWidgetToComponent(def, props.context)
      if (!mapped) return null
      const options = def.options || {}
      return { ...mapped, id: def.id, layout: def.layout, type: def.type, options }
    })
    .filter(Boolean) as Array<{ id: string; component: any; props: any; layout: any; type: string; options: any }>
})

function widthClass(width: string) {
  switch (width) {
    case 'quarter': return 'w-quarter'
    case 'half': return 'w-half'
    default: return 'w-full'
  }
}

function heightClass(height: string) {
  switch (height) {
    case 's': return 'h-s'
    case 'l': return 'h-l'
    default: return 'h-m'
  }
}

function widthLabel(width: string) {
  if (width === 'quarter') return '¼'
  if (width === 'half') return '½'
  return '1×'
}

function heightLabel(height: string) {
  if (height === 's') return 'S'
  if (height === 'l') return 'L'
  return 'M'
}

function textClass(size?: string) {
  if (size === 'sm') return 'text-sm'
  if (size === 'lg') return 'text-lg'
  return 'text-md'
}

function registryEntry(type: string) {
  return widgetsRegistry[type]
}

function isConfigurable(type: string) {
  return Boolean(widgetsRegistry[type]?.configurable)
}

function toggleOptions(id: string, nextOpen: boolean) {
  openOptionsId.value = nextOpen ? id : null
}
</script>

<style scoped>
.layout-grid{
  display:grid;
  grid-template-columns:repeat(12,1fr);
  gap:12px;
  width:100%;
}
.layout-item{
  min-width:0;
  position:relative;
  display:flex;
}
.layout-item > *{
  flex:1 1 auto;
}
.w-quarter{ grid-column: span 3; }
.w-half{ grid-column: span 6; }
.w-full{ grid-column: span 12; }
.h-s > *{ min-height:140px; }
.h-m > *{ min-height:220px; }
.h-l > *{ min-height:320px; }
.edit-bar{
  position:absolute;
  top:6px;
  right:8px;
  left:8px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:6px;
  z-index:3;
  pointer-events:none;
}
.edit-bar .edit-left,
.edit-bar .edit-right{
  display:flex;
  gap:4px;
  align-items:center;
  pointer-events:auto;
}
.ghost{
  border:1px solid var(--color-border, #d1d5db);
  background:rgba(255,255,255,0.9);
  padding:2px 6px;
  border-radius:6px;
  font-size:12px;
  cursor:pointer;
}
.ghost.danger{ color:#b91c1c; border-color:#fca5a5; }
.is-editable{
  outline:1px dashed rgba(107,114,128,0.5);
  border-radius:10px;
}
.text-sm{ font-size:12px; }
.text-md{ font-size:14px; }
.text-lg{ font-size:16px; }
.is-dense{ line-height:1.35; }
@media (max-width: 1024px){
  .w-quarter{ grid-column: span 6; }
}
@media (max-width: 768px){
  .w-quarter,.w-half,.w-full{ grid-column: span 12; }
}
</style>
