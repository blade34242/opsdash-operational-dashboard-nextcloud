<template>
  <div class="sidebar-dock" :class="{ open: isOpen }">
    <button class="dock-toggle" @click="toggle" :aria-expanded="isOpen" aria-controls="opsdash-sidebar">
      <span v-if="isOpen">⟨</span>
      <span v-else>⟩</span>
    </button>
    <transition name="slide">
      <aside v-if="isOpen" id="opsdash-sidebar" class="sidebar-panel">
        <Sidebar
          v-bind="sidebarProps"
          @load="$emit('load')"
          @update:range="$emit('update:range', $event)"
          @update:offset="$emit('update:offset', $event)"
          @select-all="$emit('select-all', $event)"
          @toggle-calendar="$emit('toggle-calendar', $event)"
          @set-group="$emit('set-group', $event)"
          @set-target="$emit('set-target', $event)"
          @update:notes="$emit('update:notes', $event)"
          @save-notes="$emit('save-notes')"
          @update:targets-config="$emit('update:targets-config', $event)"
        />
      </aside>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import Sidebar from './Sidebar.vue'

const props = defineProps({
  calendars: { type: Array, required: true },
  selected: { type: Array, required: true },
  groupsById: { type: Object, required: true },
  isLoading: { type: Boolean, required: true },
  range: { type: String, required: true },
  offset: { type: Number, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  targetsWeek: { type: Object, required: true },
  targetsMonth: { type: Object, required: true },
  targetsConfig: { type: Object, required: true },
  notesPrev: { type: String, required: true },
  notesCurrDraft: { type: String, required: true },
  notesLabelPrev: { type: String, required: true },
  notesLabelCurr: { type: String, required: true },
  notesLabelPrevTitle: { type: String, required: true },
  notesLabelCurrTitle: { type: String, required: true },
  isSavingNote: { type: Boolean, required: true },
})

defineEmits([
  'load',
  'update:range',
  'update:offset',
  'select-all',
  'toggle-calendar',
  'set-group',
  'set-target',
  'update:notes',
  'save-notes',
  'update:targets-config',
])

const STORAGE_KEY = 'opsdash.sidebarOpen'
const CSS_VAR = '--opsdash-sidebar-pad'
const PAD_OPEN = '360px'
const PAD_CLOSED = '48px'

const initialOpen = (() => {
  if (typeof window === 'undefined') return true
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return raw == null ? true : raw === '1'
})()

const isOpen = ref(initialOpen)

function toggle(){
  isOpen.value = !isOpen.value
}

function syncPadding(open: boolean){
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty(CSS_VAR, open ? PAD_OPEN : PAD_CLOSED)
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, open ? '1' : '0')
  }
}

onMounted(() => {
  syncPadding(isOpen.value)
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.documentElement.style.removeProperty(CSS_VAR)
  }
})

const sidebarProps = computed(() => ({
  calendars: props.calendars,
  selected: props.selected,
  groupsById: props.groupsById,
  isLoading: props.isLoading,
  range: props.range,
  offset: props.offset,
  from: props.from,
  to: props.to,
  targetsWeek: props.targetsWeek,
  targetsMonth: props.targetsMonth,
  targetsConfig: props.targetsConfig,
  notesPrev: props.notesPrev,
  notesCurrDraft: props.notesCurrDraft,
  notesLabelPrev: props.notesLabelPrev,
  notesLabelCurr: props.notesLabelCurr,
  notesLabelPrevTitle: props.notesLabelPrevTitle,
  notesLabelCurrTitle: props.notesLabelCurrTitle,
  isSavingNote: props.isSavingNote,
}))

watch(isOpen, (open) => {
  syncPadding(open)
})
</script>

<style scoped>
.sidebar-dock{
  position:absolute;
  top:12px;
  left:16px;
  height:calc(100% - 24px);
  display:flex;
  align-items:flex-start;
  z-index:15;
  pointer-events:none;
}
.sidebar-dock .dock-toggle,
.sidebar-dock .sidebar-panel{ pointer-events:auto; }
.dock-toggle{
  position:absolute;
  top:16px;
  left:16px;
  width:32px;
  height:32px;
  border-radius:50%;
  border:1px solid var(--line);
  background:var(--card);
  color:var(--fg);
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
  box-shadow:0 6px 20px rgba(15,23,42,.18);
  transition:transform .2s ease, left .25s ease;
}
.sidebar-dock.open .dock-toggle{ left:336px; }
.dock-toggle:hover{ transform:translateX(2px) }
.sidebar-panel{
  width:320px;
  max-width:calc(100vw - 60px);
  height:100%;
  background:var(--card);
  border-right:1px solid var(--line);
  box-shadow:8px 0 32px rgba(15,23,42,.18);
  border-radius:16px;
  overflow:auto;
}
.slide-enter-active,
.slide-leave-active{ transition:transform .25s ease, opacity .2s ease }
.slide-enter-from,
.slide-leave-to{ transform:translateX(-24px); opacity:0 }
</style>
