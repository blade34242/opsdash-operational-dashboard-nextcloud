import CategoryMixTrendCard from '../../../components/CategoryMixTrendCard.vue'

import { buildTitle } from '../helpers'
import type { RegistryEntry } from '../types'

const baseTitle = 'Category mix trend'

export const categoryMixTrendEntry: RegistryEntry = {
  component: CategoryMixTrendCard,
  defaultLayout: { width: 'half', height: 'm', order: 47 },
  label: 'Category mix trend',
  baseTitle,
  configurable: true,
  controls: [
    { key: 'lookbackWeeks', label: 'Lookback (weeks)', type: 'number', min: 1, max: 4, step: 1 },
    { key: 'showHeader', label: 'Show header', type: 'toggle' },
    { key: 'toneLowColor', label: 'Low color', type: 'color' },
    { key: 'toneHighColor', label: 'High color', type: 'color' },
  ],
  buildProps: (def, ctx) => ({
    overview: ctx.balanceOverview,
    rangeMode: ctx.rangeMode,
    lookbackWeeks: def.options?.lookbackWeeks ?? ctx.lookbackWeeks,
    showBadge: def.options?.showBadge ?? true,
    showHeader: def.options?.showHeader !== false,
    title: buildTitle(baseTitle, def.options?.titlePrefix),
    cardBg: def.options?.cardBg,
    toneLowColor: def.options?.toneLowColor,
    toneHighColor: def.options?.toneHighColor,
  }),
}

