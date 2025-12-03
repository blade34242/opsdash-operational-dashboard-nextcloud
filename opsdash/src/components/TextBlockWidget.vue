<template>
  <div class="text-card" :class="[`text-${size}`, { dense }]">
    <h3 v-if="title">{{ title }}</h3>
    <p v-if="body" class="body">{{ body }}</p>
    <template v-if="items.length">
      <div v-for="item in items" :key="item.key" class="line">
        <span class="label" v-if="item.label">{{ item.label }}</span>
        <span class="value" v-if="item.value">{{ item.value }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title?: string
  body?: string
  textSize?: 'sm' | 'md' | 'lg'
  dense?: boolean
  items?: Array<{ key: string; label?: string; value?: string }>
}>()

const size = computed(() => props.textSize ?? 'md')
const dense = computed(() => props.dense ?? false)
const title = computed(() => props.title ?? '')
const body = computed(() => props.body ?? '')
const items = computed(() => props.items ?? [])
</script>

<style scoped>
.text-card{
  background: var(--card, #fff);
  border:1px solid var(--color-border, #d1d5db);
  border-radius:10px;
  padding:14px;
  color:var(--fg, #0f172a);
  line-height:1.5;
}
.text-card h3{
  margin:0 0 6px 0;
  font-size:16px;
}
.text-card .body{
  margin:0;
  white-space:pre-wrap;
}
.line{
  display:flex;
  gap:6px;
  font-size:inherit;
  line-height:1.4;
}
.line + .line{ margin-top:4px; }
.line .label{ color: var(--muted); }
.text-card.text-sm{ font-size:12px; }
.text-card.text-md{ font-size:14px; }
.text-card.text-lg{ font-size:16px; }
.text-card.dense{ padding:10px; line-height:1.35; }
</style>
