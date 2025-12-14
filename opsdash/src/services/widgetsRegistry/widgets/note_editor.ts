import NoteEditorWidget from '../../../components/NoteEditorWidget.vue'

import { buildTitle } from '../helpers'
import type { RegistryEntry } from '../types'

const baseTitle = 'Notes'

export const noteEditorEntry: RegistryEntry = {
  component: NoteEditorWidget,
  defaultLayout: { width: 'half', height: 'm', order: 69 },
  label: 'Notes editor',
  baseTitle,
  configurable: true,
  controls: [
    { key: 'prevLabel', label: 'Prev label', type: 'text' },
    { key: 'currLabel', label: 'Current label', type: 'text' },
  ],
  buildProps: (def, ctx) => ({
    title: buildTitle(baseTitle, def.options?.titlePrefix),
    cardBg: def.options?.cardBg,
    prevLabel: def.options?.prevLabel || (ctx.notesLabelPrev ?? 'Previous'),
    currLabel: def.options?.currLabel || (ctx.notesLabelCurr ?? 'Current'),
    previous: ctx.notesPrev ?? '',
    modelValue: ctx.notesCurr ?? '',
    saving: ctx.isSavingNote ?? false,
    onSave: ctx.onSaveNote,
    onUpdateModelValue: ctx.onUpdateNotes,
  }),
}

