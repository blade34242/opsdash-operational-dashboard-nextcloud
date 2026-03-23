<template>
  <h3>Choose Deck boards</h3>
  <p class="hint">Keep Deck visible in this setup, then choose which boards should appear. You can change it later.</p>

  <article class="pref-card pref-card--deck deck-step-card">
    <h4>Deck in this setup</h4>
    <p class="pref-desc">Opsdash can show Deck cards as a read-only planning surface. If you turn this off, the first setup skips Deck widgets.</p>
    <label class="toggle-row">
      <input
        type="checkbox"
        :checked="deckSettingsDraft.enabled"
        @change="setDeckEnabled(($event.target as HTMLInputElement).checked)"
      />
      <span>Show Deck in this setup</span>
    </label>
    <template v-if="deckSettingsDraft.enabled">
      <p class="pref-hint">Select which boards appear. Board rows use the same selected / not selected language as calendars.</p>
      <div class="deck-board-list deck-board-list--scroll">
        <p v-if="deckBoardsLoading" class="deck-status">Loading Deck boards…</p>
        <p v-else-if="deckBoardsError" class="deck-status deck-status--error">{{ deckBoardsError }}</p>
        <template v-else>
          <p v-if="!deckBoards.length" class="deck-status">No boards yet. Create boards in Deck later and revisit this step when you need them.</p>
          <div v-else class="deck-board-options deck-board-options--list" role="list">
            <label v-for="board in deckBoards" :key="board.id" class="deck-board-option deck-board-option--row" role="listitem">
              <input
                class="list-checkbox"
                type="checkbox"
                :checked="isDeckBoardVisible(board.id)"
                @change="toggleDeckBoard(board.id, ($event.target as HTMLInputElement).checked)"
              />
              <span class="dot"></span>
              <span>{{ board.title }}</span>
              <span class="calendar-item__state">{{ isDeckBoardVisible(board.id) ? 'selected' : 'not selected' }}</span>
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
