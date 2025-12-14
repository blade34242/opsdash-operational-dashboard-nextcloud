<template>
  <div
    v-if="open"
    class="add-menu"
    :style="{ left: x + 'px', top: y + 'px' }"
    role="menu"
  >
    <div class="add-menu__header">
      <div>
        <div class="add-menu__title">Add widget</div>
        <div class="add-menu__hint">Platz: Row {{ row + 1 }}, Col {{ col }}</div>
      </div>
      <button type="button" class="ghost sm close-btn" @click="$emit('close')" aria-label="Close add menu">✕</button>
    </div>
    <div class="add-menu__list">
      <button
        v-for="entry in widgetTypeList"
        :key="entry.type"
        type="button"
        class="add-btn"
        @click="$emit('confirm', entry.type)"
      >
        {{ entry.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean
  x: number
  y: number
  row: number
  col: number
  widgetTypeList: Array<{ type: string; label: string }>
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'confirm', type: string): void
}>()
</script>

<style scoped>
.add-menu{
  position:fixed;
  transform:translate(-4px, -4px);
  background:var(--card,#fff);
  border:1px solid var(--color-border,#e5e7eb);
  border-radius:10px;
  padding:10px 10px 12px;
  box-shadow:0 12px 32px rgba(0,0,0,0.15);
  z-index:60;
  min-width:200px;
}
.add-menu__header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  margin-bottom:8px;
}
.add-menu__title{
  font-weight:600;
}
.add-menu__hint{
  font-size:11px;
  color:var(--muted);
}
.add-menu__list{
  display:grid;
  grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));
  gap:6px;
}
.add-btn{
  border:1px solid var(--color-border,#d1d5db);
  background:color-mix(in oklab, var(--card,#fff), var(--color-primary,#2563EB) 8%);
  color:var(--fg,#0f172a);
  padding:8px 10px;
  border-radius:8px;
  font-weight:600;
  text-align:left;
  transition:background 120ms ease, transform 120ms ease, border-color 120ms ease;
}
.add-btn:hover{
  background:color-mix(in oklab, var(--card,#fff), var(--color-primary,#2563EB) 16%);
  border-color:color-mix(in oklab, var(--color-primary,#2563EB), #d1d5db 50%);
  transform:translateY(-1px);
}
.add-btn:active{
  transform:translateY(0);
}
.ghost{
  border:1px solid var(--color-border, #d1d5db);
  background:rgba(255,255,255,0.9);
  padding:2px 6px;
  border-radius:6px;
  font-size:12px;
  cursor:pointer;
}
</style>

