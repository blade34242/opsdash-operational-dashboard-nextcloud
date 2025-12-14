import { defineAsyncComponent } from 'vue'

const ActivityScheduleCard = defineAsyncComponent(() =>
  import('../../../components/ActivityScheduleCard.vue').then((m) => m.default),
)

import { buildTitle } from '../helpers'
import type { RegistryEntry } from '../types'

const baseTitle = 'Activity & Schedule'

export const activityEntry: RegistryEntry = {
  component: ActivityScheduleCard,
  defaultLayout: { width: 'half', height: 'm', order: 40 },
  label: 'Activity (old)',
  baseTitle,
  configurable: true,
  controls: [
    { key: 'showHeader', label: 'Show header', type: 'toggle' },
    { key: 'showBadges', label: 'Show badges', type: 'toggle' },
    { key: 'showTrends', label: 'Show trend tiles', type: 'toggle' },
    { key: 'showMeta', label: 'Show meta rows', type: 'toggle' },
  ],
  buildProps: (def, ctx) => ({
    summary: ctx.activitySummary,
    config: ctx.activityConfig,
    dayOffTrend: ctx.activityDayOffTrend,
    trendUnit: ctx.activityTrendUnit,
    dayOffLookback: ctx.activityDayOffLookback,
    rangeLabel: ctx.rangeLabel,
    rangeMode: ctx.rangeMode,
    showHeader: def.options?.showHeader !== false,
    showBadges: def.options?.showBadges !== false,
    showTrends: def.options?.showTrends !== false,
    showMeta: def.options?.showMeta !== false,
    title: buildTitle(baseTitle, def.options?.titlePrefix),
    cardBg: def.options?.cardBg,
  }),
}
