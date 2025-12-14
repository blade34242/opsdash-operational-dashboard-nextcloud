import { defineAsyncComponent } from 'vue'

const TimeTargetsCard = defineAsyncComponent(() =>
  import('../../../components/TimeTargetsCard.vue').then((m) => m.default),
)

import { buildTitle } from '../helpers'
import type { RegistryEntry } from '../types'

const baseTitle = 'Targets'

export const targetsEntry: RegistryEntry = {
  component: TimeTargetsCard,
  defaultLayout: { width: 'half', height: 'm', order: 20 },
  label: 'Targets (old)',
  baseTitle,
  configurable: true,
  controls: [
    { key: 'showHeader', label: 'Show header', type: 'toggle' },
    { key: 'showLegend', label: 'Show legend', type: 'toggle' },
    { key: 'showDelta', label: 'Show delta', type: 'toggle' },
    { key: 'showForecast', label: 'Show forecast', type: 'toggle' },
    { key: 'showPace', label: 'Show pace line', type: 'toggle' },
    { key: 'showToday', label: 'Show today overlay', type: 'toggle' },
  ],
  buildProps: (def, ctx) => ({
    summary: ctx.targetsSummary ?? ctx.summary,
    config: ctx.targetsConfig,
    groups: def.props?.groups ?? ctx.groups,
    showHeader: def.options?.showHeader !== false,
    showLegend: def.options?.showLegend !== false,
    showDelta: def.options?.showDelta !== false,
    showForecast: def.options?.showForecast !== false,
    showPace: def.options?.showPace !== false,
    showToday: def.options?.showToday !== false,
    title: buildTitle(baseTitle, def.options?.titlePrefix),
    cardBg: def.options?.cardBg,
  }),
}
