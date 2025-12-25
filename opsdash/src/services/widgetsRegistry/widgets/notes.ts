import { defineAsyncComponent } from 'vue'

const NotesPanel = defineAsyncComponent(() =>
  import('../../../components/NotesPanel.vue').then((m) => m.default),
)

import { buildTitle } from '../helpers'
import type { RegistryEntry } from '../types'

const baseTitle = 'Notes'

export const notesEntry: RegistryEntry = {
  component: NotesPanel,
  defaultLayout: { width: 'half', height: 's', order: 60 },
  label: 'Notes (old)',
  baseTitle,
  configurable: true,
  controls: [
    { key: 'showPrev', label: 'Show previous note', type: 'toggle' },
    { key: 'showLabels', label: 'Show labels', type: 'toggle' },
    { key: 'mode', label: 'Mode', type: 'select', options: [{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }] },
  ],
  buildProps: (def, ctx) => ({
    notesPrev: ctx.notesPrev,
    notesCurrDraft: ctx.notesCurr,
    notesLabelPrev: ctx.notesLabelPrev,
    notesLabelCurr: ctx.notesLabelCurr,
    notesLabelPrevTitle: ctx.notesLabelPrevTitle,
    notesLabelCurrTitle: ctx.notesLabelCurrTitle,
    isSaving: ctx.isSavingNote,
    onSave: ctx.onSaveNote,
    onUpdateNotes: ctx.onUpdateNotes,
    mode: def.options?.mode ?? def.props?.mode ?? 'week',
    showPrev: def.options?.showPrev !== false,
    showLabels: def.options?.showLabels !== false,
    title: buildTitle(baseTitle, def.options?.titlePrefix),
    showHeader: def.options?.showHeader !== false,
    cardBg: def.options?.cardBg,
  }),
}
