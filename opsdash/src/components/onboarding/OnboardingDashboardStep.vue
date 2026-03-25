<template>
  <h3>Choose dashboard layout</h3>
  <div class="strategy-grid dashboard-preset-grid">
    <button
      v-for="mode in dashboardPresets"
      :key="mode.id"
      type="button"
      class="intro-route-card intro-route-card--button dashboard-preset-card"
      :class="{ active: dashboardMode === mode.id }"
      @click="setDashboardMode(mode.id)"
      @dblclick="onContinue"
    >
      <div class="dashboard-thumb" :class="`dashboard-thumb--${mode.id}`">
        <div class="dashboard-tab-strip">
          <span class="dashboard-tab dashboard-tab--wide is-active"></span>
          <template v-if="mode.id === 'pro'">
            <span class="dashboard-tab dashboard-tab--medium"></span>
            <span class="dashboard-tab dashboard-tab--short"></span>
            <span class="dashboard-tab dashboard-tab--tiny"></span>
          </template>
        </div>

        <template v-if="mode.id === 'quick'">
          <div class="dashboard-thumb-row dashboard-thumb-row--1">
            <span class="dashboard-block dashboard-block--tall"></span>
          </div>
          <div class="dashboard-thumb-row dashboard-thumb-row--2">
            <span class="dashboard-block"></span>
            <span class="dashboard-block"></span>
          </div>
        </template>

        <template v-else-if="mode.id === 'standard'">
          <div class="dashboard-thumb-row dashboard-thumb-row--2">
            <span class="dashboard-block dashboard-block--tall dashboard-block--soft"></span>
            <span class="dashboard-block dashboard-block--tall"></span>
          </div>
          <div class="dashboard-thumb-row dashboard-thumb-row--3">
            <span class="dashboard-block dashboard-block--warm"></span>
            <span class="dashboard-block dashboard-block--ok"></span>
            <span class="dashboard-block"></span>
          </div>
          <div class="dashboard-thumb-row dashboard-thumb-row--2">
            <span class="dashboard-block dashboard-block--soft"></span>
            <span class="dashboard-block"></span>
          </div>
        </template>

        <template v-else>
          <div class="dashboard-thumb-row dashboard-thumb-row--3">
            <span class="dashboard-block dashboard-block--tall dashboard-block--soft"></span>
            <span class="dashboard-block dashboard-block--tall dashboard-block--warm"></span>
            <span class="dashboard-block dashboard-block--tall dashboard-block--ok"></span>
          </div>
          <div class="dashboard-thumb-row dashboard-thumb-row--3">
            <span class="dashboard-block"></span>
            <span class="dashboard-block"></span>
            <span class="dashboard-block"></span>
          </div>
          <div class="dashboard-thumb-row dashboard-thumb-row--2">
            <span class="dashboard-block dashboard-block--soft"></span>
            <span class="dashboard-block dashboard-block--warm"></span>
          </div>
        </template>
      </div>
      <h4>{{ mode.title }}</h4>
      <p class="subtitle">{{ mode.subtitle }}</p>
      <div class="mini-row">
        <span class="pill">{{ mode.widgets }}</span>
        <span class="pill">{{ mode.badge }}</span>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  dashboardMode: 'quick' | 'standard' | 'pro'
  setDashboardMode: (mode: 'quick' | 'standard' | 'pro') => void
  onContinue: () => void
  dashboardPresets: Array<{
    id: 'quick' | 'standard' | 'pro'
    title: string
    subtitle: string
    description: string
    badge: string
    widgets: string
  }>
}>()
</script>
