import { ref, type Ref } from 'vue'

interface NotesDeps {
  range: Ref<'week' | 'month'>
  offset: Ref<number>
  route: (name: 'notes' | 'notesSave') => string
  getJson: (url: string, params: Record<string, unknown>) => Promise<any>
  postJson: (url: string, body: Record<string, unknown>) => Promise<any>
  notifySuccess: (message: string) => void
  notifyError: (message: string) => void
}

export function useNotes(deps: NotesDeps) {
  const notesPrev = ref('')
  const notesCurrDraft = ref('')
  const isSavingNote = ref(false)

  async function fetchNotes() {
    const response = await deps.getJson(deps.route('notes'), {
      range: deps.range.value,
      offset: deps.offset.value | 0,
    })
    notesPrev.value = String(response?.notes?.previous ?? '')
    notesCurrDraft.value = String(response?.notes?.current ?? '')
  }

  async function saveNotes() {
    try {
      isSavingNote.value = true
      await deps.postJson(deps.route('notesSave'), {
        range: deps.range.value,
        offset: deps.offset.value | 0,
        content: notesCurrDraft.value ?? '',
      })
      deps.notifySuccess('Notes saved')
      await fetchNotes()
    } catch (error) {
      console.error(error)
      deps.notifyError('Failed to save notes')
    } finally {
      isSavingNote.value = false
    }
  }

  return {
    notesPrev,
    notesCurrDraft,
    isSavingNote,
    fetchNotes,
    saveNotes,
  }
}
