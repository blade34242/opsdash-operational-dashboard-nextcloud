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
    previous: ctx.notesPrev ?? '',
    history: ctx.notesHistory ?? [],
    modelValue: ctx.notesCurr ?? '',
    prevLabel: ctx.notesLabelPrev || 'Previous',
    currLabel: ctx.notesLabelCurr || 'Current',
    prevTitle: ctx.notesLabelPrevTitle || '',
    currTitle: ctx.notesLabelCurrTitle || '',
    saving: ctx.isSavingNote ?? false,
    title: buildTitle(baseTitle, def.options?.titlePrefix),
    showHeader: def.options?.showHeader !== false,
    cardBg: def.options?.cardBg,
    onSave: ctx.onSaveNote,
    onUpdateModelValue: ctx.onUpdateNotes,
  }),
}
