import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

import { useNotes } from '../composables/useNotes'
import notesFixture from './fixtures/notes-week.json'

describe('useNotes', () => {
  it('fetches and saves notes', async () => {
    const range = ref<'week' | 'month'>('week')
    const offset = ref(0)
    const getJson = vi.fn().mockResolvedValue(notesFixture)
    const postJson = vi.fn().mockResolvedValue({ ok: true })
    const notifySuccess = vi.fn()
    const notifyError = vi.fn()

    const notes = useNotes({
      range,
      offset,
      route: (name) => (name === 'notes' ? '/notes' : '/notes/save'),
      getJson,
      postJson,
      notifySuccess,
      notifyError,
    })

    await notes.fetchNotes()
    expect(notes.notesPrev.value).toBe(notesFixture.notes.previous)
    expect(notes.notesCurrDraft.value).toBe(notesFixture.notes.current)

    notes.notesCurrDraft.value = 'Updated'
    await notes.saveNotes()

    expect(postJson).toHaveBeenCalledWith('/notes/save', expect.objectContaining({ content: 'Updated' }))
    expect(notifySuccess).toHaveBeenCalledWith('Notes saved')
    expect(getJson).toHaveBeenCalledTimes(2)
  })
})
