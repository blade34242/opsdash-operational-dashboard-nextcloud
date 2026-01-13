import { defineAsyncComponent } from 'vue'

const DayOffTrendCard = defineAsyncComponent(() =>
  import('../../../components/widgets/cards/DayOffTrendCard.vue').then((m) => m.default),
)

import { buildTitle } from '../helpers'
import type { RegistryEntry } from '../types'

const baseTitle = 'Time Off Trend'

export const dayOffTrendEntry: RegistryEntry = {
  component: DayOffTrendCard,
  defaultLayout: { width: 'quarter', height: 's', order: 45 },
  label: 'Time Off Trend',
  baseTitle,
  configurable: true,
  defaultOptions: {
    lookback: 3,
    showBadges: true,
    labelMode: 'period',
    toneLowColor: '#dc2626',
    toneHighColor: '#16a34a',
  },
  controls: [
    { key: 'lookback', label: 'Lookback (periods)', type: 'number', min: 1, max: 6, step: 1 },
    { key: 'showBadges', label: 'Show badges', type: 'toggle' },
    {
      key: 'labelMode',
      label: 'Trend label',
      type: 'select',
      options: [
        { value: 'date', label: 'Date range' },
        { value: 'period', label: 'Week/Month' },
        { value: 'offset', label: 'Offset only' },
      ],
    },
    { key: 'toneLowColor', label: 'Low color', type: 'color' },
    { key: 'toneHighColor', label: 'High color', type: 'color' },
  ],
  buildProps: (def, ctx) => ({
    trend: ctx.activityDayOffTrend,
    unit: ctx.activityTrendUnit ?? 'wk',
    lookback: def.options?.lookback ?? ctx.activityDayOffLookback ?? 3,
    showHeader: def.options?.showHeader !== false,
    showBadges: def.options?.showBadges !== false,
    labelMode: def.options?.labelMode,
    title: buildTitle(baseTitle, def.options?.titlePrefix),
    cardBg: def.options?.cardBg,
    toneLowColor: def.options?.toneLowColor,
    toneHighColor: def.options?.toneHighColor,
  }),
}
