<template>
  <div
    id="opsdash-sidebar-pane-deck"
    class="sb-pane"
    role="tabpanel"
    aria-labelledby="opsdash-sidebar-tab-deck"
  >
    <div class="sb-title">Deck visibility</div>
    <p class="sb-description">
      Control whether the Deck tab is available and which filter is applied by default.
    </p>

    <div class="report-card">
      <div class="report-card__header">
        <div>
          <div class="report-card__title">Deck tab</div>
          <div class="report-card__subtitle">
            {{ localDeck.enabled ? 'Visible in dashboard' : 'Hidden for this user' }}
          </div>
        </div>
        <label class="switch">
          <input
            type="checkbox"
            :checked="localDeck.enabled"
            @change="updateDeck({ enabled: !localDeck.enabled })"
          />
          <span />
        </label>
      </div>

      <div class="report-form" :class="{ 'report-form--disabled': !localDeck.enabled }">
        <label class="report-field">
          <span>Default filter</span>
          <select
            :value="localDeck.defaultFilter"
            :disabled="!localDeck.enabled"
            @change="updateDeck({ defaultFilter: ($event.target as HTMLSelectElement).value as any })"
          >
            <option value="all">All cards</option>
            <option value="mine">My cards</option>
          </select>
        </label>

        <label class="report-field report-field--checkbox">
          <input
            type="checkbox"
            :checked="localDeck.filtersEnabled"
            :disabled="!localDeck.enabled"
            @change="updateDeck({ filtersEnabled: !localDeck.filtersEnabled })"
          />
          Enable filter buttons
        </label>
      </div>
    </div>

    <div class="report-actions">
      <button
        type="button"
        class="report-save"
        :disabled="saving || !hasChanges"
        @click="saveDeck"
      >
        {{ saving ? 'Saving…' : hasChanges ? 'Save Deck settings' : 'Saved' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { DeckFeatureSettings } from '../../services/reporting'

const props = defineProps<{
  deckSettings: DeckFeatureSettings
  saving: boolean
}>()

const emit = defineEmits<{
  (e: 'save-deck-settings', value: DeckFeatureSettings): void
}>()

const localDeck = ref<DeckFeatureSettings>(cloneDeck(props.deckSettings))

watch(
  () => props.deckSettings,
  (next) => {
    localDeck.value = cloneDeck(next)
  },
  { deep: true },
)

const hasChanges = computed(
  () => JSON.stringify(localDeck.value) !== JSON.stringify(props.deckSettings),
)

function updateDeck(patch: Partial<DeckFeatureSettings>) {
  localDeck.value = {
    ...localDeck.value,
    ...patch,
  }
}

function saveDeck() {
  emit('save-deck-settings', cloneDeck(localDeck.value))
}

function cloneDeck(value: DeckFeatureSettings): DeckFeatureSettings {
  return JSON.parse(JSON.stringify(value))
}
</script>

<style scoped>
.report-card {
  border: 1px solid var(--color-border-maxcontrast);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
  background: var(--color-main-background);
}
.report-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}
.report-card__title {
  font-weight: 600;
  font-size: 1rem;
}
.report-card__subtitle {
  font-size: 0.85rem;
  color: var(--color-text-maxcontrast);
}
.report-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.report-form--disabled {
  opacity: 0.6;
}
.report-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
}
.report-field select {
  border-radius: 8px;
  padding: 0.35rem 0.45rem;
  border: 1px solid var(--color-border);
}
.report-field--checkbox {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}
.report-actions {
  display: flex;
  justify-content: flex-end;
}
.report-save {
  border-radius: 999px;
  border: 1px solid var(--color-border-maxcontrast);
  padding: 0.35rem 0.9rem;
  background: var(--color-main-background);
  cursor: pointer;
}
.report-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.switch {
  position: relative;
  display: inline-block;
  width: 38px;
  height: 20px;
}
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.switch span {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-border);
  transition: 0.2s;
  border-radius: 999px;
}
.switch span:before {
  position: absolute;
  content: '';
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
}
.switch input:checked + span {
  background-color: var(--color-primary);
}
.switch input:checked + span:before {
  transform: translateX(18px);
}
</style>
