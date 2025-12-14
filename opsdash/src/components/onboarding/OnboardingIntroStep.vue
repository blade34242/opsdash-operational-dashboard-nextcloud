<template>
  <h3>Opsdash visualises your calendar time and keeps goals on track.</h3>
  <ul class="highlights">
    <li>Targets — stay aligned with your weekly/monthly goals.</li>
    <li>Balance — ensure your focus areas get the right attention.</li>
    <li>Notes — capture insights and the story behind the numbers.</li>
  </ul>
  <div v-if="hasExistingConfig" class="config-warning">
    <p>
      You already have a dashboard configuration. Saving a preset now keeps a backup before onboarding applies new values.
    </p>
    <NcButton
      type="tertiary"
      size="small"
      :disabled="snapshotSaving || saving"
      :aria-busy="snapshotSaving"
      @click="onSaveCurrentConfig"
    >
      Save current setup as preset
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
  onSaveCurrentConfig: () => void
}>()
</script>

