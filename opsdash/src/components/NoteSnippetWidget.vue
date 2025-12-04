<template>
  <div class="text-card" :style="cardStyle">
    <h3>{{ titleText }}</h3>
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
}>()

const snippet = computed(() => {
  const curr = (props.notesCurr || '').trim()
  if (curr) return curr
  const prev = (props.notesPrev || '').trim()
  return prev || ''
})

const titleText = computed(() => props.title || 'Note')
const cardStyle = computed(() => ({ background: props.cardBg || undefined }))
</script>

<style scoped>
.text-card{
  background: var(--card, #fff);
  border:1px solid var(--color-border, #d1d5db);
  border-radius:10px;
  padding:12px;
  color:var(--fg, #0f172a);
  line-height:1.4;
}
.text-card h3{
  margin:0 0 6px 0;
  font-size:1em;
}
.text-card .body{
  margin:0;
  white-space:pre-wrap;
  font-size:0.95em;
}
.text-card .body.empty{
  color:var(--muted);
}
</style>
