import { computed, type Ref } from 'vue'

export function useNotesLabels(range: Ref<'week' | 'month'>) {
  const notesLabelPrev = computed(() => (range.value === 'month' ? 'Last month' : 'Last week'))
  const notesLabelCurr = computed(() => (range.value === 'month' ? 'This month' : 'This week'))
  const notesLabelPrevTitle = computed(() =>
    range.value === 'month' ? 'Notes for previous month' : 'Notes for previous week',
  )
  const notesLabelCurrTitle = computed(() =>
    range.value === 'month' ? 'Notes for current month' : 'Notes for current week',
  )

  return {
    notesLabelPrev,
    notesLabelCurr,
    notesLabelPrevTitle,
    notesLabelCurrTitle,
  }
}
