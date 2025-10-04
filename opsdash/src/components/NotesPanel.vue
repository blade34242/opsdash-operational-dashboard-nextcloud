<template>
  <div class="notes-section">
    <div class="hint" :title="prevTitle">{{ prevLabel }}</div>
    <textarea :value="previous" readonly rows="4" class="notes-textarea"></textarea>
    <div class="hint" :title="currTitle">{{ currLabel }}</div>
    <textarea :value="modelValue" @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
              rows="4" class="notes-textarea" placeholder="Write your notes…"></textarea>
    <div class="notes-actions">
      <NcButton type="tertiary" :disabled="saving" @click="$emit('save')">Save</NcButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NcButton } from '@nextcloud/vue'
defineProps<{ previous: string; modelValue: string; prevLabel: string; currLabel: string; prevTitle: string; currTitle: string; saving: boolean }>()
defineEmits(['update:modelValue','save'])
</script>

