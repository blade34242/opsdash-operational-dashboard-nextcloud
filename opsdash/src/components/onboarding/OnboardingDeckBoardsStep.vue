<template>
  <h3>Choose Deck boards</h3>
  <p class="hint">Select which Deck boards appear in Opsdash. You can change this later in Config &amp; Setup.</p>

  <article class="pref-card pref-card--deck">
    <h4>Deck cards</h4>
    <p class="pref-desc">Bring Deck boards into Opsdash. Cards remain read-only so you can focus on status.</p>
    <label class="toggle-row">
      <input
        type="checkbox"
        :checked="deckSettingsDraft.enabled"
        @change="setDeckEnabled(($event.target as HTMLInputElement).checked)"
      />
      <span>Enable Deck cards on dashboard</span>
    </label>
    <template v-if="deckSettingsDraft.enabled">
      <p class="pref-hint">Select which boards appear. Deck permissions still apply.</p>
      <div class="deck-board-list">
        <p v-if="deckBoardsLoading" class="deck-status">Loading Deck boards…</p>
        <p v-else-if="deckBoardsError" class="deck-status deck-status--error">{{ deckBoardsError }}</p>
        <template v-else>
          <p v-if="!deckBoards.length" class="deck-status">Open the Deck app to create a board.</p>
          <div v-else class="deck-board-options" role="list">
            <label v-for="board in deckBoards" :key="board.id" class="deck-board-option" role="listitem">
              <input
                type="checkbox"
                :checked="isDeckBoardVisible(board.id)"
                @change="toggleDeckBoard(board.id, ($event.target as HTMLInputElement).checked)"
              />
              <span>{{ board.title }}</span>
            </label>
          </div>
        </template>
      </div>
    </template>
  </article>
</template>

<script setup lang="ts">
import type { DeckFeatureSettings } from '../../services/reporting'

defineProps<{
  deckSettingsDraft: DeckFeatureSettings
  setDeckEnabled: (enabled: boolean) => void
  deckBoards: Array<{ id: number; title: string }>
  deckBoardsLoading: boolean
  deckBoardsError: string
  isDeckBoardVisible: (boardId: number) => boolean
  toggleDeckBoard: (boardId: number, enabled: boolean) => void
}>()
</script>
