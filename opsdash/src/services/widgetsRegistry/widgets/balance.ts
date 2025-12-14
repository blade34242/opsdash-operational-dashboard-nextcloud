import { defineAsyncComponent } from 'vue'

const BalanceOverviewCard = defineAsyncComponent(() =>
  import('../../../components/BalanceOverviewCard.vue').then((m) => m.default),
)

import { buildTitle } from '../helpers'
import type { RegistryEntry } from '../types'

const baseTitle = 'Activity & Balance'

export const balanceEntry: RegistryEntry = {
  component: BalanceOverviewCard,
  defaultLayout: { width: 'half', height: 'm', order: 30 },
  label: 'Balance (old)',
  baseTitle,
  configurable: true,
  controls: [
    { key: 'showHeader', label: 'Show header', type: 'toggle' },
    { key: 'showTrend', label: 'Show trend history', type: 'toggle' },
    { key: 'showRelations', label: 'Show relations', type: 'toggle' },
    { key: 'showWarnings', label: 'Show warnings', type: 'toggle' },
  ],
  buildProps: (def, ctx) => ({
    overview: ctx.balanceOverview,
    rangeLabel: ctx.rangeLabel,
    rangeMode: ctx.rangeMode,
    lookbackWeeks: ctx.lookbackWeeks,
    config: ctx.balanceConfig ?? { showNotes: false },
    note: ctx.balanceNote,
    activitySummary: ctx.activitySummary,
    activityConfig: ctx.activityConfig,
    activityDayOffTrend: ctx.activityDayOffTrend,
    activityTrendUnit: ctx.activityTrendUnit,
    activityDayOffLookback: ctx.activityDayOffLookback,
    showHeader: def.options?.showHeader !== false,
    showTrend: def.options?.showTrend !== false,
    showRelations: def.options?.showRelations !== false,
    showWarnings: def.options?.showWarnings !== false,
    title: buildTitle(baseTitle, def.options?.titlePrefix),
    cardBg: def.options?.cardBg,
  }),
}
