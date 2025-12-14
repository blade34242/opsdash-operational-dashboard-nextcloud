import { defineAsyncComponent } from 'vue'

const TimeSummaryCard = defineAsyncComponent(() =>
  import('../../../components/TimeSummaryCard.vue').then((m) => m.default),
)

import { buildTitle } from '../helpers'
import type { RegistryEntry } from '../types'

const baseTitle = 'Time Summary'

export const timeSummaryEntry: RegistryEntry = {
  component: TimeSummaryCard,
  defaultLayout: { width: 'half', height: 's', order: 10 },
  label: 'Time Summary (old)',
  baseTitle,
  configurable: true,
  controls: [
    { key: 'showHeader', label: 'Show header', type: 'toggle' },
    { key: 'showTopCategory', label: 'Show top category', type: 'toggle' },
    { key: 'showWorkdayStats', label: 'Show workday stats', type: 'toggle' },
    { key: 'showWeekendStats', label: 'Show weekend stats', type: 'toggle' },
  ],
  buildProps: (def, ctx) => ({
    summary: ctx.summary,
    mode: 'active',
    config: ctx.targetsConfig?.timeSummary,
    showHeader: def.options?.showHeader !== false,
    showTopCategory: def.options?.showTopCategory !== false,
    showWorkdayStats: def.options?.showWorkdayStats !== false,
    showWeekendStats: def.options?.showWeekendStats !== false,
    title: buildTitle(baseTitle, def.options?.titlePrefix),
    cardBg: def.options?.cardBg,
  }),
}
