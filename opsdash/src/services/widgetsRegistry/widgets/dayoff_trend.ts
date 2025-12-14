import DayOffTrendCard from '../../../components/DayOffTrendCard.vue'

import { buildTitle } from '../helpers'
import type { RegistryEntry } from '../types'

const baseTitle = 'Days off trend'

export const dayOffTrendEntry: RegistryEntry = {
  component: DayOffTrendCard,
  defaultLayout: { width: 'quarter', height: 's', order: 45 },
  label: 'Days off trend',
  baseTitle,
  configurable: true,
  controls: [
    { key: 'lookback', label: 'Lookback (periods)', type: 'number', min: 1, max: 12, step: 1 },
    {
      key: 'unit',
      label: 'Unit',
      type: 'select',
      options: [
        { value: 'wk', label: 'Weeks' },
        { value: 'mo', label: 'Months' },
      ],
    },
    { key: 'showHeader', label: 'Show header', type: 'toggle' },
    { key: 'showBadges', label: 'Show badges', type: 'toggle' },
    { key: 'toneLowColor', label: 'Low color', type: 'color' },
    { key: 'toneHighColor', label: 'High color', type: 'color' },
  ],
  buildProps: (def, ctx) => ({
    trend: ctx.activityDayOffTrend,
    unit: def.options?.unit ?? ctx.activityTrendUnit,
    lookback: def.options?.lookback ?? ctx.activityDayOffLookback,
    showHeader: def.options?.showHeader !== false,
    showBadges: def.options?.showBadges !== false,
    title: buildTitle(baseTitle, def.options?.titlePrefix),
    cardBg: def.options?.cardBg,
    toneLowColor: def.options?.toneLowColor,
    toneHighColor: def.options?.toneHighColor,
  }),
}

