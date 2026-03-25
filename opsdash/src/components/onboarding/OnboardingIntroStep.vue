<template>
  <div class="intro-step">
    <div class="intro-visual">
      <div class="intro-visual__tabs">
        <span>Month</span>
        <span class="is-active">Week</span>
      </div>
      <div class="intro-visual__copy">
        <strong>Turn raw calendar time</strong>
        <strong>into something you can</strong>
        <strong class="accent">steer.</strong>
      </div>
      <div class="intro-visual__card">
        <div class="intro-visual__eyebrow">
          <span>Balance index</span>
          <span class="intro-visual__status">Good</span>
        </div>
        <div class="intro-visual__score">
          <strong>74</strong>
          <span>/100</span>
        </div>
        <p>Enough focus time, moderate meeting load.</p>
        <div class="intro-visual__bar"><span></span></div>
        <div class="intro-visual__stats">
          <div><span>Meetings</span><strong>18h</strong></div>
          <div><span>Focus</span><strong>22h</strong></div>
          <div><span>Rest</span><strong>6h</strong></div>
        </div>
      </div>
    </div>

    <div v-if="hasExistingConfig" class="intro-route-grid intro-route-grid--three">
      <button
        type="button"
        class="intro-route-card intro-route-card--button"
        :class="{ active: introChoice === 'quick' }"
        @click="setIntroChoice('quick')"
        @dblclick="onContinue"
      >
        <h4>Quick setup</h4>
        <p>Use the recommended setup and land on a ready dashboard.</p>
      </button>
      <button
        type="button"
        class="intro-route-card intro-route-card--button"
        :class="{ active: introChoice === 'existing' }"
        @click="setIntroChoice('existing')"
        @dblclick="onContinue"
      >
        <h4>Change current setup</h4>
        <p>Keep the existing setup as the base and update it instead of starting over.</p>
      </button>
      <button
        type="button"
        class="intro-route-card intro-route-card--button"
        :class="{ active: introChoice === 'new' }"
        @click="setIntroChoice('new')"
        @dblclick="onContinue"
      >
        <h4>Set it up myself</h4>
        <p>Go through the full step flow and decide everything manually.</p>
      </button>
    </div>

    <div v-else class="intro-route-grid intro-route-grid--two">
      <button
        type="button"
        class="intro-route-card intro-route-card--button"
        :class="{ active: introChoice === 'quick' }"
        @click="setIntroChoice('quick')"
        @dblclick="onContinue"
      >
        <h4>Quick setup</h4>
        <p>Use the recommended setup and land on a ready dashboard.</p>
      </button>
      <button
        type="button"
        class="intro-route-card intro-route-card--button"
        :class="{ active: introChoice === 'new' }"
        @click="setIntroChoice('new')"
        @dblclick="onContinue"
      >
        <h4>Set it up myself</h4>
        <p>Go through the full step flow and decide everything manually.</p>
      </button>
    </div>

    <div v-if="hasExistingConfig" class="config-warning">
      <p>Change current setup is the default for existing configs. Save a profile first if you want a clean restore point before replacing anything.</p>
      <div class="config-warning__actions">
        <NcButton
          type="tertiary"
          size="small"
          :disabled="snapshotSaving || saving"
          :aria-busy="snapshotSaving"
          @click="onSaveCurrentConfig"
        >
          Save current setup as profile
        </NcButton>
      </div>
      <div
        v-if="snapshotNotice"
        class="snapshot-notice"
        :class="`snapshot-notice--${snapshotNotice.type}`"
        role="status"
      >
        {{ snapshotNotice.message }}
      </div>
    </div>

    <p class="hint">
      {{ hasExistingConfig ? 'Quick setup can replace the current setup automatically. Manual setup keeps the full step-by-step flow.' : 'Quick setup finishes everything automatically. Manual setup opens the full step-by-step flow.' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { NcButton } from '@nextcloud/vue'

defineProps<{
  hasExistingConfig: boolean
  snapshotSaving: boolean
  saving: boolean
  snapshotNotice: { type: 'success' | 'error'; message: string } | null
  introChoice: 'quick' | 'existing' | 'new'
  profileMode: 'existing' | 'new'
  setIntroChoice: (choice: 'quick' | 'existing' | 'new') => void
  setProfileMode: (mode: 'existing' | 'new') => void
  onContinue: () => void
  onSaveCurrentConfig: () => void
}>()
</script>
