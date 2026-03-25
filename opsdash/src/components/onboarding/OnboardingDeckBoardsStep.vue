<template>
  <h3>Select Deck boards to include</h3>

  <article class="pref-card pref-card--deck deck-step-card">
    <label class="toggle-row">
      <input
        type="checkbox"
        :checked="deckSettingsDraft.enabled"
        @change="setDeckEnabled(($event.target as HTMLInputElement).checked)"
      />
      <span>Show Deck in this setup</span>
    </label>
    <template v-if="deckSettingsDraft.enabled">
      <div v-if="deckBoards.length && !deckBoardsLoading && !deckBoardsError" class="selection-step-toolbar">
        <span class="selection-step-toolbar__meta">{{ visibleBoardCount }} of {{ deckBoards.length }} boards selected</span>
        <div class="selection-step-toolbar__actions">
          <button type="button" class="ghost-btn" :disabled="allBoardsSelected" @click="selectAllBoards">Select all</button>
          <button type="button" class="ghost-btn" :disabled="visibleBoardCount === 0" @click="deselectAllBoards">Deselect all</button>
        </div>
      </div>
      <div class="deck-board-list deck-board-list--scroll">
        <p v-if="deckBoardsLoading" class="deck-status">Loading Deck boards…</p>
        <p v-else-if="deckBoardsError" class="deck-status deck-status--error">{{ deckBoardsError }}</p>
        <template v-else>
          <p v-if="!deckBoards.length" class="deck-status">No boards yet.</p>
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
import { computed } from 'vue'
import type { DeckFeatureSettings } from '../../services/reporting'

const props = defineProps<{
  deckSettingsDraft: DeckFeatureSettings
  setDeckEnabled: (enabled: boolean) => void
  deckBoards: Array<{ id: number; title: string }>
  deckBoardsLoading: boolean
  deckBoardsError: string
  isDeckBoardVisible: (boardId: number) => boolean
  toggleDeckBoard: (boardId: number, enabled: boolean) => void
}>()

const visibleBoardCount = computed(() => props.deckBoards.filter((board) => props.isDeckBoardVisible(board.id)).length)
const allBoardsSelected = computed(() => props.deckBoards.length > 0 && visibleBoardCount.value === props.deckBoards.length)

function selectAllBoards() {
  for (const board of props.deckBoards) {
    if (!props.isDeckBoardVisible(board.id)) {
      props.toggleDeckBoard(board.id, true)
    }
  }
}

function deselectAllBoards() {
  for (const board of props.deckBoards) {
    if (props.isDeckBoardVisible(board.id)) {
      props.toggleDeckBoard(board.id, false)
    }
  }
}
</script>
