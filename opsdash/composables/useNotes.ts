import { ref, type Ref } from 'vue'

type NotesHistoryEntry = {
  id: string
  label: string
  title: string
  content: string
  from?: string
  offset?: number
}

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
  const notesHistory = ref<NotesHistoryEntry[]>([])

  const buildHistoryLabel = (range: 'week' | 'month', from: string, offset: number) => {
    if (range === 'month') {
      const month = from ? from.slice(0, 7) : `-${offset}`
      return `Month of ${month}`
    }
    const day = from || `-${offset}`
    return `Week of ${day}`
  }

  const buildHistoryTitle = (range: 'week' | 'month', from: string) => {
    const prefix = range === 'month' ? 'Notes for month starting' : 'Notes for week starting'
    return from ? `${prefix} ${from}` : prefix
  }

  async function fetchNotes() {
    const response = await deps.getJson(deps.route('notes'), {
      range: deps.range.value,
      offset: deps.offset.value | 0,
    })
    notesPrev.value = String(response?.notes?.previous ?? '')
    notesCurrDraft.value = String(response?.notes?.current ?? '')
    const history = Array.isArray(response?.notes?.history) ? response.notes.history : []
    notesHistory.value = history
      .map((entry: any, idx: number) => {
        const offset = Number(entry?.offset ?? idx + 1)
        const from = String(entry?.from ?? '').trim()
        const content = String(entry?.content ?? '')
        if (!content.trim()) return null
        const label = buildHistoryLabel(deps.range.value, from, offset)
        const title = buildHistoryTitle(deps.range.value, from)
        return {
          id: `offset-${offset}-${from || idx}`,
          label,
          title,
          content,
          from: from || undefined,
          offset,
        }
      })
      .filter(Boolean) as NotesHistoryEntry[]
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
    notesHistory,
    fetchNotes,
    saveNotes,
  }
}
