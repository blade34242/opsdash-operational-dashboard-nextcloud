<template>
  <h3>Select a starting strategy</h3>
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

