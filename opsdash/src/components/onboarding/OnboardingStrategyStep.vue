<template>
  <h3>Choose your tracking strategy</h3>
  <p class="hint">Strategy controls how detailed your targets are. Layout comes in the next step.</p>
  <div class="strategy-grid">
    <article
      v-for="strategy in strategies"
      :key="strategy.id"
      class="strategy-card"
      :class="{ active: selectedStrategy === strategy.id }"
      @click="setSelectedStrategy(strategy.id)"
    >
      <h4>{{ strategy.title }}</h4>
      <p class="subtitle">{{ strategy.subtitle }}</p>
      <ul>
        <li v-for="point in strategy.highlights" :key="point">{{ point }}</li>
      </ul>
      <footer>Best for: {{ strategy.recommendedFor }}</footer>
    </article>
  </div>
  <p class="hint">Calendar + Categories includes the Targets step. Calendar Goals uses per-calendar targets in the Calendars step.</p>
</template>

<script setup lang="ts">
import type { StrategyDefinition } from '../../services/onboarding'

defineProps<{
  strategies: Array<{
    id: StrategyDefinition['id']
    title: string
    subtitle: string
    highlights: string[]
    recommendedFor: string
  }>
  selectedStrategy: StrategyDefinition['id']
  setSelectedStrategy: (id: StrategyDefinition['id']) => void
}>()
</script>
