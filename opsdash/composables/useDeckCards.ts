import { ref, watch, type Ref } from 'vue'
import { fetchDeckCardsInRange, type DeckCardSummary } from '../src/services/deck'

interface UseDeckCardsOptions {
  from: Ref<string>
  to: Ref<string>
  notifyError?: (message: string) => void
}

export function useDeckCards(options: UseDeckCardsOptions) {
  const deckCards = ref<DeckCardSummary[]>([])
  const deckLoading = ref(false)
  const deckError = ref('')
  const deckLastFetchedAt = ref<string | null>(null)
  let requestSeq = 0
  const cache = new Map<string, { cards: DeckCardSummary[]; fetchedAt: string }>()
  let lastRangeKey = ''

  function rangeKey(from: string, to: string) {
    return `${from}::${to}`
  }

  async function refreshDeck(force = false) {
    const from = (options.from.value || '').trim()
    const to = (options.to.value || '').trim()
    if (!from || !to) {
      deckCards.value = []
      deckError.value = ''
      deckLoading.value = false
      deckLastFetchedAt.value = null
      lastRangeKey = ''
      return
    }
    const key = rangeKey(from, to)
    if (!force && cache.has(key)) {
      const cached = cache.get(key)!
      deckCards.value = cached.cards
      deckLastFetchedAt.value = cached.fetchedAt
      deckError.value = ''
      deckLoading.value = false
      lastRangeKey = key
      return
    }

    const seq = ++requestSeq
    deckLoading.value = true
    deckError.value = ''
    try {
      const data = await fetchDeckCardsInRange({ from, to })
      if (seq === requestSeq) {
        const fetchedAt = new Date().toISOString()
        deckCards.value = data
        deckLastFetchedAt.value = fetchedAt
        cache.set(key, { cards: data, fetchedAt })
        lastRangeKey = key
      }
    } catch (error) {
      if (seq === requestSeq) {
        deckCards.value = []
        deckError.value = error instanceof Error ? error.message : 'deck_fetch_failed'
        if (options.notifyError) {
          options.notifyError('Unable to fetch Deck cards. Check the Deck app or try again.')
        }
      }
    } finally {
      if (seq === requestSeq) {
        deckLoading.value = false
      }
    }
  }

  watch(
    () => [options.from.value, options.to.value],
    ([nextFrom, nextTo], [prevFrom, prevTo]) => {
      if (!nextFrom || !nextTo) {
        deckCards.value = []
        return
      }
      if (nextFrom === prevFrom && nextTo === prevTo) {
        return
      }
      refreshDeck()
    },
  )

  return {
    deckCards,
    deckLoading,
    deckError,
    deckLastFetchedAt,
    refreshDeck,
  }
}
