<template>
  <h3>Dashboard preset</h3>
  <p class="hint">Pick how much you want to see by default. You can change widgets later.</p>
  <div class="strategy-grid">
    <article
      v-for="mode in dashboardPresets"
      :key="mode.id"
      class="strategy-card"
      :class="{ active: dashboardMode === mode.id }"
      @click="setDashboardMode(mode.id)"
    >
      <h4>{{ mode.title }}</h4>
      <p class="subtitle">{{ mode.subtitle }}</p>
      <ul>
        <li v-for="point in mode.highlights" :key="point">{{ point }}</li>
      </ul>
      <footer>Widgets: {{ mode.widgets }}</footer>
    </article>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  dashboardMode: 'quick' | 'standard' | 'pro'
  setDashboardMode: (mode: 'quick' | 'standard' | 'pro') => void
  dashboardPresets: Array<{
    id: 'quick' | 'standard' | 'pro'
    title: string
    subtitle: string
    highlights: string[]
    widgets: string
  }>
}>()
</script>

