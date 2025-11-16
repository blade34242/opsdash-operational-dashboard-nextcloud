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

  <div class="deck-board-section">
    <div class="report-card__header deck-board-header">
      <div>
        <div class="report-card__title">Boards</div>
        <div class="report-card__subtitle">Choose which Deck boards appear in Opsdash</div>
      </div>
      <button
        type="button"
        class="report-save"
        :disabled="boardsLoading"
        @click="loadBoards"
      >
        {{ boardsLoading ? 'Loading…' : 'Refresh boards' }}
      </button>
    </div>
    <p v-if="boardsError" class="report-error">{{ boardsError }}</p>
    <p v-else-if="boardsLoading" class="section-hint">Fetching Deck boards…</p>
    <div v-else class="deck-board-list">
      <p v-if="!boards.length" class="section-hint">No Deck boards detected. Open Deck first to create one.</p>
      <label
        v-for="board in boards"
        :key="board.id"
        class="report-field report-field--checkbox deck-board-checkbox"
      >
        <input
          type="checkbox"
          :checked="isBoardVisible(board.id)"
          :disabled="!localDeck.enabled"
          @change="toggleBoard(board.id, ($event.target as HTMLInputElement).checked)"
        />
        <span>{{ board.title }}</span>
      </label>
    </div>
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
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { DeckFeatureSettings } from '../../services/reporting'
import { fetchDeckBoardsMeta } from '../../services/deck'

const props = defineProps<{
  deckSettings: DeckFeatureSettings
  saving: boolean
}>()

const emit = defineEmits<{
  (e: 'save-deck-settings', value: DeckFeatureSettings): void
}>()

const localDeck = ref<DeckFeatureSettings>(cloneDeck(props.deckSettings))
const boards = ref<Array<{ id: number; title: string }>>([])
const boardsLoading = ref(false)
const boardsError = ref('')

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

async function loadBoards() {
  boardsLoading.value = true
  boardsError.value = ''
  const hasOcGlobal = typeof window !== 'undefined' && typeof (window as any).OC !== 'undefined'
  if (!hasOcGlobal) {
    boardsLoading.value = false
    boards.value = []
    return
  }
  try {
    const list = await fetchDeckBoardsMeta()
    boards.value = list
      .map((entry) => ({
        id: Number(entry?.id ?? 0),
        title: String(entry?.title ?? 'Untitled board'),
      }))
      .filter((entry) => Number.isInteger(entry.id) && entry.id > 0)
  } catch (error) {
    console.error(error)
    boardsError.value = 'Unable to load Deck boards. Open Deck to create one.'
    boards.value = []
  } finally {
    boardsLoading.value = false
  }
}

onMounted(() => {
  loadBoards().catch((error) => {
    console.error(error)
  })
})

function updateDeck(patch: Partial<DeckFeatureSettings>) {
  localDeck.value = {
    ...localDeck.value,
    ...patch,
  }
}

function saveDeck() {
  emit('save-deck-settings', cloneDeck(localDeck.value))
}

function isBoardVisible(boardId: number) {
  const hidden = localDeck.value.hiddenBoards || []
  return !hidden.includes(boardId)
}

function toggleBoard(boardId: number, visible: boolean) {
  const current = new Set(localDeck.value.hiddenBoards || [])
  if (visible) {
    current.delete(boardId)
  } else {
    current.add(boardId)
  }
  updateDeck({ hiddenBoards: Array.from(current).sort((a, b) => a - b) })
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
.deck-board-section {
  margin-top: 1rem;
  border-top: 1px solid var(--color-border-maxcontrast);
  padding-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.deck-board-header {
  align-items: center;
}
.deck-board-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.deck-board-checkbox {
  margin: 0;
}
.report-error {
  color: var(--color-error, #dc2626);
  font-size: 0.85rem;
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
