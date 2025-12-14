<template>
  <h3>Review your setup</h3>
  <div class="review-grid">
    <div>
      <h5>Strategy</h5>
      <p>{{ strategyTitle }}</p>
    </div>
    <div>
      <h5>Calendars</h5>
      <ul>
        <li v-for="cal in selectedCalendars" :key="cal.id">{{ cal.displayname }}</li>
      </ul>
    </div>
    <div>
      <h5>Targets preview</h5>
      <template v-if="draftTargetsCategories.length">
        <ul>
          <li v-for="cat in draftTargetsCategories" :key="cat.id">{{ cat.label }} — {{ cat.targetHours }} h</li>
        </ul>
        <p class="hint">Total weekly target: {{ categoryTotalHours.toFixed(1) }} h</p>
      </template>
      <template v-else>
        <p>Total target: {{ draftTotalHours }} h per week</p>
      </template>
    </div>
    <div>
      <h5>Deck tab</h5>
      <p>{{ deckReviewSummary }}</p>
      <ul v-if="deckEnabled && deckVisibleBoards.length">
        <li v-for="board in deckVisibleBoards.slice(0, 3)" :key="board.id">{{ board.title }}</li>
        <li v-if="deckVisibleBoards.length > 3">+{{ deckVisibleBoards.length - 3 }} more</li>
      </ul>
    </div>
    <div>
      <h5>Reporting</h5>
      <p>{{ reportingEnabled ? reportingSummary : 'Recap disabled' }}</p>
    </div>
    <div>
      <h5>Activity card</h5>
      <p>{{ showDayOffTrend ? 'Days-off heatmap enabled' : 'Heatmap hidden' }}</p>
    </div>
  </div>
  <p class="hint">You can fine-tune categories, goals, and pacing once the dashboard loads.</p>
</template>

<script setup lang="ts">
defineProps<{
  strategyTitle: string
  selectedCalendars: Array<{ id: string; displayname: string }>
  draftTargetsCategories: Array<{ id: string; label: string; targetHours: number }>
  draftTotalHours: number
  categoryTotalHours: number
  deckReviewSummary: string
  deckEnabled: boolean
  deckVisibleBoards: Array<{ id: number; title: string }>
  reportingEnabled: boolean
  reportingSummary: string
  showDayOffTrend: boolean
}>()
</script>

