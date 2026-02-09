import { defineAsyncComponent } from 'vue'

const CategoryMixTrendCard = defineAsyncComponent(() =>
  import('../../../components/widgets/cards/CategoryMixTrendCard.vue').then((m) => m.default),
)

import { buildTitle } from '../helpers'
import type { RegistryEntry } from '../types'

const baseTitle = 'Category Mix Trend'

export const categoryMixTrendEntry: RegistryEntry = {
  component: CategoryMixTrendCard,
  defaultLayout: { width: 'half', height: 'm', order: 47 },
  label: 'Category Mix Trend',
  baseTitle,
  defaultOptions: {
    density: 'normal',
    labelMode: 'period',
    colorMode: 'hybrid',
    squareCells: false,
    showHeader: true,
    showBadge: true,
  },
  configurable: true,
  controls: [
    {
      key: 'density',
      label: 'Density',
      type: 'select',
      options: [
        { value: 'normal', label: 'Normal' },
        { value: 'dense', label: 'Dense' },
      ],
    },
    { key: 'squareCells', label: 'Square cells', type: 'toggle' },
    {
      key: 'labelMode',
      label: 'History label',
      type: 'select',
      options: [
        { value: 'period', label: 'Week/Month' },
        { value: 'date', label: 'Date range' },
        { value: 'compact', label: 'Compact (W-4)' },
        { value: 'offset', label: 'Offset only' },
        { value: 'label', label: 'Use server label' },
      ],
    },
    {
      key: 'colorMode',
      label: 'Color mode',
      type: 'select',
      options: [
        { value: 'hybrid', label: 'Hybrid (share + trend)' },
        { value: 'share', label: 'Share heatmap' },
        { value: 'trend', label: 'Trend only' },
      ],
    },
    { key: 'shareLowColor', label: 'Share low', type: 'color' },
    { key: 'shareHighColor', label: 'Share high', type: 'color' },
    { key: 'showBadge', label: 'Show badge', type: 'toggle' },
    { key: 'toneLowColor', label: 'Low color', type: 'color' },
    { key: 'toneHighColor', label: 'High color', type: 'color' },
  ],
  buildProps: (def, ctx) => ({
    overview: ctx.balanceOverview,
    rangeMode: ctx.rangeMode,
    rangeLabel: ctx.rangeLabel,
    from: ctx.from,
    to: ctx.to,
    lookbackWeeks: Math.max(1, Math.min(4, Number(ctx.lookbackWeeks) || 3)),
    showBadge: def.options?.showBadge ?? true,
    showHeader: def.options?.showHeader !== false,
    density: def.options?.density,
    labelMode: def.options?.labelMode,
    squareCells: def.options?.squareCells === true,
    colorMode: def.options?.colorMode,
    title: buildTitle(baseTitle, def.options?.titlePrefix),
    cardBg: def.options?.cardBg,
    toneLowColor: def.options?.toneLowColor,
    toneHighColor: def.options?.toneHighColor,
    shareLowColor: def.options?.shareLowColor,
    shareHighColor: def.options?.shareHighColor,
  }),
}
