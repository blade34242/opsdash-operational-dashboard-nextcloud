<template>
  <div class="text-card">
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
  items?: Array<{ key: string; label?: string; value?: string }>
}>()
const title = computed(() => props.title ?? '')
const body = computed(() => props.body ?? '')
const items = computed(() => props.items ?? [])
</script>

<style scoped>
.text-card{
  background: var(--card, #fff);
  border:1px solid var(--color-border, #d1d5db);
  border-radius:calc(10px * var(--widget-space, 1));
  padding:var(--widget-pad, 14px);
  color:var(--fg, #0f172a);
  line-height:calc(1.4 * var(--widget-density, 1));
  font-size:var(--widget-font, 14px);
}
.text-card h3{
  margin:0 0 calc(6px * var(--widget-space, 1)) 0;
  font-size:calc(1.1em * var(--widget-scale, 1));
}
.text-card .body{
  margin:0;
  white-space:pre-wrap;
}
.line{
  display:flex;
  align-items:center;
  gap:calc(8px * var(--widget-space, 1));
  font-size:inherit;
  line-height:calc(1.3 * var(--widget-density, 1));
}
.line + .line{ margin-top:calc(4px * var(--widget-space, 1)); }
.line .label{
  flex:1;
  color: var(--muted);
}
.line .value{
  text-align:right;
  font-variant-numeric: tabular-nums;
  font-weight:600;
  font-size: inherit;
}
</style>
