import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

import { useNotes } from '../composables/useNotes'
import notesFixture from './fixtures-v2/notes-week.json'
import notesMonthQa from './fixtures-v2/notes-month-qa.json'
import notesWeekOffset from './fixtures-v2/notes-week-offset1.json'

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
    expect(notes.notesHistory.value.length).toBe(2)
    expect(notes.notesHistory.value[0].content).toBe('Closed out Q3 targets')

    notes.notesCurrDraft.value = 'Updated'
    await notes.saveNotes()

    expect(postJson).toHaveBeenCalledWith('/notes/save', expect.objectContaining({ content: 'Updated' }))
    expect(notifySuccess).toHaveBeenCalledWith('Notes saved')
    expect(getJson).toHaveBeenCalledTimes(2)
  })

  it('replays month fixture with QA user notes', async () => {
    const range = ref<'week' | 'month'>('month')
    const offset = ref(1)
    const getJson = vi.fn().mockResolvedValue(notesMonthQa)
    const postJson = vi.fn()
    const notifySuccess = vi.fn()
    const notifyError = vi.fn()

    const notes = useNotes({
      range,
      offset,
      route: () => '/notes',
      getJson,
      postJson,
      notifySuccess,
      notifyError,
    })

    await notes.fetchNotes()
    expect(notes.notesCurrDraft.value).toBe(notesMonthQa.notes.current)
    expect(notes.notesPrev.value).toBe(notesMonthQa.notes.previous)
  })

  it('replays previous week fixture without persisting', async () => {
    const range = ref<'week' | 'month'>('week')
    const offset = ref(-1)
    const getJson = vi.fn().mockResolvedValue(notesWeekOffset)
    const postJson = vi.fn()
    const notifySuccess = vi.fn()
    const notifyError = vi.fn()

    const notes = useNotes({
      range,
      offset,
      route: () => '/notes',
      getJson,
      postJson,
      notifySuccess,
      notifyError,
    })

    await notes.fetchNotes()
    expect(notes.notesPrev.value).toBe(notesWeekOffset.notes.previous)
    expect(notes.notesCurrDraft.value).toBe(notesWeekOffset.notes.current)
  })

  it('ignores stale notes responses when requests overlap', async () => {
    const range = ref<'week' | 'month'>('week')
    const offset = ref(0)
    let resolveFirst: ((value: any) => void) | undefined
    let resolveSecond: ((value: any) => void) | undefined
    const firstResponse = new Promise<any>((resolve) => { resolveFirst = resolve })
    const secondResponse = new Promise<any>((resolve) => { resolveSecond = resolve })
    const getJson = vi.fn()
      .mockReturnValueOnce(firstResponse)
      .mockReturnValueOnce(secondResponse)
    const postJson = vi.fn()
    const notifySuccess = vi.fn()
    const notifyError = vi.fn()

    const notes = useNotes({
      range,
      offset,
      route: () => '/notes',
      getJson,
      postJson,
      notifySuccess,
      notifyError,
    })

    const firstRequest = notes.fetchNotes()
    offset.value = 1
    const secondRequest = notes.fetchNotes()

    resolveSecond?.(notesWeekOffset)
    await secondRequest
    resolveFirst?.(notesFixture)
    await firstRequest

    expect(notes.notesPrev.value).toBe(notesWeekOffset.notes.previous)
    expect(notes.notesCurrDraft.value).toBe(notesWeekOffset.notes.current)
    expect(getJson).toHaveBeenNthCalledWith(1, '/notes', { range: 'week', offset: 0 })
    expect(getJson).toHaveBeenNthCalledWith(2, '/notes', { range: 'week', offset: 1 })
  })
})
