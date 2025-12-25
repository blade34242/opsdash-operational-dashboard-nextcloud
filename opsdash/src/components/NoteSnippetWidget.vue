<template>
  <div class="text-card" :style="cardStyle">
    <h3 v-if="showHeader">{{ titleText }}</h3>
    <p class="body" v-if="snippet">{{ snippet }}</p>
    <p class="body empty" v-else>—</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  notesCurr?: string
  notesPrev?: string
  title?: string
  cardBg?: string | null
  showHeader?: boolean
}>()

const snippet = computed(() => {
  const curr = (props.notesCurr || '').trim()
  if (curr) return curr
  const prev = (props.notesPrev || '').trim()
  return prev || ''
})

const titleText = computed(() => props.title || 'Note')
const cardStyle = computed(() => ({ background: props.cardBg || undefined }))
const showHeader = computed(() => props.showHeader !== false)
</script>

<style scoped>
.text-card{
  background: var(--card, #fff);
  border:1px solid var(--color-border, #d1d5db);
  border-radius:calc(10px * var(--widget-space, 1));
  padding:var(--widget-pad, 12px);
  color:var(--fg, #0f172a);
  line-height:calc(1.4 * var(--widget-density, 1));
  font-size:var(--widget-font, 14px);
}
.text-card h3{
  margin:0 0 calc(6px * var(--widget-space, 1)) 0;
  font-size:calc(1em * var(--widget-scale, 1));
}
.text-card .body{
  margin:0;
  white-space:pre-wrap;
  font-size:calc(0.95em * var(--widget-scale, 1));
}
.text-card .body.empty{
  color:var(--muted);
}
</style>
