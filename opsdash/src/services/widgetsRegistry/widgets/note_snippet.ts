import NoteSnippetWidget from '../../../components/NoteSnippetWidget.vue'

import { buildTitle } from '../helpers'
import type { RegistryEntry } from '../types'

const baseTitle = 'Note'

export const noteSnippetEntry: RegistryEntry = {
  component: NoteSnippetWidget,
  defaultLayout: { width: 'quarter', height: 's', order: 68 },
  label: 'Notes snippet',
  baseTitle,
  configurable: true,
  controls: [],
  buildProps: (def, ctx) => ({
    notesCurr: ctx.notesCurr ?? '',
    notesPrev: ctx.notesPrev ?? '',
    title: buildTitle(baseTitle, def.options?.titlePrefix),
    cardBg: def.options?.cardBg,
  }),
}

