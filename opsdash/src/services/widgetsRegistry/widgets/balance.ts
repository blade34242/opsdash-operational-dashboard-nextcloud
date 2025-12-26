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
  defaultOptions: {
    lookbackWeeks: 3,
  },
  controls: [
    { key: 'showTrend', label: 'Show trend history', type: 'toggle' },
    { key: 'showRelations', label: 'Show relations', type: 'toggle' },
    { key: 'showWarnings', label: 'Show warnings', type: 'toggle' },
    { key: 'lookbackWeeks', label: 'Trend lookback (weeks)', type: 'number', min: 1, max: 6, step: 1 },
  ],
  buildProps: (def, ctx) => ({
    overview: ctx.balanceOverview,
    rangeLabel: ctx.rangeLabel,
    rangeMode: ctx.rangeMode,
    lookbackWeeks: def.options?.lookbackWeeks ?? ctx.lookbackWeeks ?? 3,
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
