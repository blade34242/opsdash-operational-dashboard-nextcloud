<template>
  <div
    ref="gridEl"
    class="layout-grid"
    :class="{ 'show-guides': editable }"
    @click="onGridClick"
    @contextmenu.prevent="onGridContext"
    @dragover.prevent="onGridDragOver"
    @drop.prevent="onGridDrop"
  >
    <div
      v-for="item in ordered"
      :key="item.id"
      class="layout-item"
      :class="[
        widthClass(item.layout.width),
        heightClass(item.layout.height),
        textClass(item.options?.textSize),
        textScaleClass(item.options?.textSize),
        {
          'is-editable': editable,
          'is-dense': item.options?.dense,
          'is-selected': editable && selectedId === item.id,
          'is-dragging': editable && draggingId === item.id,
        },
      ]"
      :draggable="editable"
      @click.stop="emit('select', item.id)"
      @dragstart="onDragStart(item.id)"
      @dragend="onDragEnd"
    >
      <component :is="item.component" v-bind="item.props" />
    </div>
  </div>

  <DashboardAddMenu
    :open="editable && addMenu.open"
    :x="addMenu.x"
    :y="addMenu.y"
    :row="addMenu.row"
    :col="addMenu.col"
    :widget-type-list="widgetTypeList"
    @close="closeAddMenu"
    @confirm="confirmAdd"
  />
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import DashboardAddMenu from './DashboardAddMenu.vue'

const props = defineProps<{
  ordered: Array<{ id: string; component: any; props: any; layout: any; type: string; options: any }>
  editable?: boolean
  selectedId?: string | null
  widgetTypeList?: Array<{ type: string; label: string }>
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'add', type: string, orderHint?: number): void
  (e: 'reorder', id: string, orderHint?: number | null): void
}>()

const gridEl = ref<HTMLElement | null>(null)
const draggingId = ref<string | null>(null)
const dragOrderHint = ref<number | null>(null)
const addMenu = reactive<{ open: boolean; x: number; y: number; row: number; col: number }>({
  open: false,
  x: 0,
  y: 0,
  row: 0,
  col: 0,
})

const widgetTypeList = computed(() => props.widgetTypeList || [])

const layoutRows = computed(() => {
  const rows: Array<{ items: Array<{ id: string; layout: any; type: string; options: any; span: number; start: number }> }> = []
  let current: { items: Array<any>; col: number; remaining: number } = { items: [], col: 1, remaining: 4 }
  const pushRow = () => {
    if (current.items.length) rows.push({ items: current.items })
    current = { items: [], col: 1, remaining: 4 }
  }
  props.ordered.forEach((item) => {
    const span = widthToSpan(item.layout.width)
    if (span > current.remaining) {
      pushRow()
    }
    const start = current.col
    current.items.push({ ...item, span, start })
    current.col += span
    current.remaining -= span
  })
  pushRow()
  return rows
})

const rowHeights = computed(() => {
  const map: Record<string, number> = { s: 140, m: 220, l: 320 }
  const heights = layoutRows.value.map((row) => {
    const maxHeight = row.items.reduce((acc, item) => Math.max(acc, map[item.layout.height] || map.m), map.m)
    return maxHeight
  })
  heights.push(200)
  return heights
})

function widthClass(width: string) {
  switch (width) {
    case 'quarter': return 'w-quarter'
    case 'half': return 'w-half'
    default: return 'w-full'
  }
}

function widthToSpan(width: string) {
  if (width === 'quarter') return 1
  if (width === 'half') return 2
  return 4
}

function heightClass(height: string) {
  switch (height) {
    case 's': return 'h-s'
    case 'l': return 'h-l'
    default: return 'h-m'
  }
}

function textClass(size?: string) {
  if (size === 'sm') return 'text-sm'
  if (size === 'lg') return 'text-lg'
  return 'text-md'
}

function textScaleClass(size?: string) {
  if (size === 'sm') return 'text-scale-sm'
  if (size === 'lg') return 'text-scale-lg'
  return 'text-scale-md'
}

function gridPositionFromEvent(evt: MouseEvent) {
  const el = gridEl.value
  if (!el) return { row: 0, col: 1 }
  const rect = el.getBoundingClientRect()
  const gap = 12
  const effectiveWidth = rect.width - gap * 3
  const colWidth = effectiveWidth / 4
  const offsetX = Math.max(0, Math.min(rect.width, evt.clientX - rect.left))
  const col = Math.min(3, Math.max(0, Math.floor(offsetX / (colWidth + gap)))) + 1

  const heights = rowHeights.value
  const offsetY = Math.max(0, Math.min(rect.height + 400, evt.clientY - rect.top))
  let acc = 0
  let row = 0
  for (let i = 0; i < heights.length; i++) {
    const h = heights[i]
    if (offsetY <= acc + h) {
      row = i
      break
    }
    acc += h + gap
    row = i
  }
  return { row, col }
}

function orderForCell(row: number, col: number) {
  const rows = layoutRows.value
  const currentRow = rows[row] || rows[rows.length - 1] || { items: [] }
  const before = [...(currentRow.items || [])].filter((it) => it.start < col).sort((a, b) => a.start - b.start).pop()
  const after = [...(currentRow.items || [])].filter((it) => it.start >= col).sort((a, b) => a.start - b.start)[0]
  if (before && after) return (before.layout.order + after.layout.order) / 2
  if (before) return (before.layout.order || 0) + 5
  if (after) return (after.layout.order || 0) - 5
  const prevRow = rows[row - 1] || rows[rows.length - 1]
  if (prevRow && prevRow.items.length) {
    const last = prevRow.items[prevRow.items.length - 1]
    return (last.layout.order || 0) + 10
  }
  return ((rows[0]?.items?.[0]?.layout?.order ?? 0) || 0) - 10
}

function openAddMenuAt(evt: MouseEvent) {
  if (!props.editable || !widgetTypeList.value.length) return
  const { row, col } = gridPositionFromEvent(evt)
  addMenu.open = true
  addMenu.x = evt.clientX
  addMenu.y = evt.clientY
  addMenu.row = row
  addMenu.col = col
}

function onGridClick(evt: MouseEvent) {
  if (!props.editable) return
  if ((evt.target as HTMLElement).closest('.layout-item')) return
  openAddMenuAt(evt)
}

function onGridContext(evt: MouseEvent) {
  if (!props.editable) return
  if ((evt.target as HTMLElement).closest('.layout-item')) return
  openAddMenuAt(evt)
}

function onGridDragOver(evt: DragEvent) {
  if (!props.editable || !draggingId.value) return
  const { row, col } = gridPositionFromEvent(evt as any)
  dragOrderHint.value = orderForCell(row, col)
}

function onGridDrop() {
  if (!props.editable || !draggingId.value) return
  const id = draggingId.value
  const hint = dragOrderHint.value ?? undefined
  draggingId.value = null
  dragOrderHint.value = null
  emit('reorder', id, hint)
}

function closeAddMenu() {
  addMenu.open = false
}

function confirmAdd(type: string) {
  const orderHint = orderForCell(addMenu.row, addMenu.col)
  emit('add', type, orderHint)
  closeAddMenu()
}

function onDragStart(id: string) {
  if (!props.editable) return
  draggingId.value = id
  dragOrderHint.value = null
  closeAddMenu()
}

function onDragEnd() {
  draggingId.value = null
  dragOrderHint.value = null
}
</script>

<style scoped>
.layout-grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:12px;
  width:100%;
  position:relative;
}
.layout-grid.show-guides{
  background-image:
    linear-gradient(to right, rgba(148,163,184,0.15) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px);
  background-size: calc((100% - 36px) / 4) 100%, 100% 48px;
  background-position: 0 0, 0 0;
}
.layout-grid.show-guides::after{
  content:'';
  position:absolute;
  inset:0;
  pointer-events:none;
}
.layout-item{
  min-width:0;
  position:relative;
  display:flex;
  padding:0;
  cursor:grab;
}
.layout-item > *{
  flex:1 1 auto;
}
.w-quarter{ grid-column: span 1; }
.w-half{ grid-column: span 2; }
.w-full{ grid-column: span 4; }
.h-s > *{ min-height:140px; }
.h-m > *{ min-height:220px; }
.h-l > *{ min-height:320px; }
.is-editable{
  outline:1px dashed rgba(107,114,128,0.5);
  border-radius:10px;
}
.is-selected{
  outline:2px solid var(--color-primary,#2563EB);
}
.is-dragging{
  opacity:0.6;
}
.text-sm{ font-size:12px; line-height:1.2; }
.text-md{ font-size:14px; line-height:1.35; }
.text-lg{ font-size:18px; line-height:1.5; }
.is-dense{ line-height:1.2; }
@media (max-width: 1024px){
  .w-quarter{ grid-column: span 2; }
  .w-half{ grid-column: span 2; }
  .w-full{ grid-column: span 4; }
}
@media (max-width: 768px){
  .w-quarter,.w-half,.w-full{ grid-column: span 4; }
}
</style>

