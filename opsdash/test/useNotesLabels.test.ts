import { describe, it, expect } from 'vitest'
import { ref } from 'vue'

import { useNotesLabels } from '../composables/useNotesLabels'

describe('useNotesLabels', () => {
  it('returns week/month labels', () => {
    const range = ref<'week' | 'month'>('week')
    const labels = useNotesLabels(range)
    expect(labels.notesLabelPrev.value).toBe('Last week')
    range.value = 'month'
    expect(labels.notesLabelPrev.value).toBe('Last month')
    expect(labels.notesLabelCurrTitle.value).toBe('Notes for current month')
  })
})
