import { defineAsyncComponent } from 'vue'

const DeckSummaryCard = defineAsyncComponent(() =>
  import('../../../components/DeckSummaryCard.vue').then((m) => m.default),
)

import { buildTitle } from '../helpers'
import type { RegistryEntry } from '../types'

const baseTitle = 'Deck summary'

export const deckEntry: RegistryEntry = {
  component: DeckSummaryCard,
  defaultLayout: { width: 'half', height: 's', order: 50 },
  label: 'Deck (old)',
  baseTitle,
  configurable: true,
  controls: [
    { key: 'showBadges', label: 'Show board badges', type: 'toggle' },
    { key: 'showTicker', label: 'Show ticker', type: 'toggle' },
    { key: 'showEmpty', label: 'Show empty states', type: 'toggle' },
  ],
  buildProps: (def, ctx) => ({
    buckets: ctx.deckBuckets,
    rangeLabel: ctx.deckRangeLabel,
    loading: ctx.deckLoading,
    error: ctx.deckError,
    ticker: ctx.deckTicker,
    activeFilter: ctx.deckFilter,
    onFilter: ctx.onDeckFilter,
    showBoardBadges: def.options?.showBadges ?? ctx.deckShowBoardBadges,
    showHeader: def.options?.showHeader !== false,
    showTicker: def.options?.showTicker !== false,
    showEmpty: def.options?.showEmpty !== false,
    title: buildTitle(baseTitle, def.options?.titlePrefix),
    cardBg: def.options?.cardBg,
  }),
}
