<template>
  <h3>Choose your tracking strategy</h3>
  <div class="strategy-grid">
    <button
      v-for="strategy in strategies"
      :key="strategy.id"
      type="button"
      class="intro-route-card intro-route-card--button strategy-route-card"
      :class="{ active: selectedStrategy === strategy.id }"
      @click="setSelectedStrategy(strategy.id)"
    >
      <h4>{{ strategy.title }}</h4>
      <p class="subtitle">{{ strategy.subtitle }}</p>
      <ul>
        <li v-for="point in strategy.highlights" :key="point">{{ point }}</li>
      </ul>
      <footer>Best for: {{ strategy.recommendedFor }}</footer>
    </button>
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
