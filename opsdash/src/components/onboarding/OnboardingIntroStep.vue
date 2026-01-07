<template>
  <h3>Opsdash visualises your calendar time and keeps goals on track.</h3>
  <ul class="highlights">
    <li>Targets — stay aligned with your weekly/monthly goals.</li>
    <li>Balance — ensure your focus areas get the right attention.</li>
    <li>Notes — capture insights and the story behind the numbers.</li>
  </ul>
  <div v-if="hasExistingConfig" class="onboarding-mode">
    <p class="hint">Choose how to start.</p>
    <div class="mode-grid">
      <button
        type="button"
        class="mode-card"
        :class="{ active: profileMode === 'existing' }"
        @click="setProfileMode('existing')"
      >
        <strong>Edit current setup</strong>
        <span>Start from your existing calendars, targets, widgets, and theme.</span>
      </button>
      <button
        type="button"
        class="mode-card"
        :class="{ active: profileMode === 'new' }"
        @click="setProfileMode('new')"
      >
        <strong>Create new profile</strong>
        <span>Start with empty selections and build a fresh layout.</span>
      </button>
    </div>
  </div>
  <div v-if="hasExistingConfig" class="config-warning">
    <p>
      You already have a dashboard configuration. Save a profile backup of widgets/tabs, targets, deck, reporting, and theme
      before onboarding applies changes.
    </p>
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
  <p class="hint">You can change configuration later from the Sidebar.</p>
  <div
    v-if="snapshotNotice"
    class="snapshot-notice"
    :class="`snapshot-notice--${snapshotNotice.type}`"
    role="status"
  >
    {{ snapshotNotice.message }}
  </div>
</template>

<script setup lang="ts">
import { NcButton } from '@nextcloud/vue'

defineProps<{
  hasExistingConfig: boolean
  snapshotSaving: boolean
  saving: boolean
  snapshotNotice: { type: 'success' | 'error'; message: string } | null
  profileMode: 'existing' | 'new'
  setProfileMode: (mode: 'existing' | 'new') => void
  onSaveCurrentConfig: () => void
}>()
</script>
