import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useDeckCards } from '../composables/useDeckCards'
import { fetchDeckCardsInRange, type DeckCardSummary } from '../src/services/deck'

vi.mock('../src/services/deck', () => ({
  fetchDeckCardsInRange: vi.fn(),
}))

const sampleCard: DeckCardSummary = {
  id: 42,
  title: 'Prep Ops sync',
  description: 'weekly check-in',
  boardId: 1,
  boardTitle: 'Ops',
  boardColor: '#2563EB',
  stackId: 9,
  stackTitle: 'Inbox',
  due: '2024-11-22T09:00:00.000Z',
  dueTs: Date.parse('2024-11-22T09:00:00.000Z'),
  archived: false,
  status: 'active',
  labels: [],
  assignees: [],
  match: 'due',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useDeckCards', () => {
  it('fetches cards when from/to range changes', async () => {
    const from = ref('')
    const to = ref('')
    const notify = vi.fn()
    ;(fetchDeckCardsInRange as unknown as vi.Mock).mockResolvedValue([sampleCard])
    const deck = useDeckCards({ from, to, notifyError: notify })

    from.value = '2024-11-18T00:00:00.000Z'
    to.value = '2024-11-25T00:00:00.000Z'
    await deck.refreshDeck()

    expect(fetchDeckCardsInRange).toHaveBeenCalledWith({
      from: '2024-11-18T00:00:00.000Z',
      to: '2024-11-25T00:00:00.000Z',
    })
    expect(deck.deckCards.value).toEqual([sampleCard])
    expect(deck.deckLastFetchedAt.value).not.toBeNull()
    expect(notify).not.toHaveBeenCalled()
  })

  it('surfaces errors via notifyError and clears cards', async () => {
    const from = ref('')
    const to = ref('')
    const notify = vi.fn()
    ;(fetchDeckCardsInRange as unknown as vi.Mock).mockRejectedValue(new Error('deck missing'))
    const deck = useDeckCards({ from, to, notifyError: notify })

    from.value = '2024-11-18T00:00:00.000Z'
    to.value = '2024-11-25T00:00:00.000Z'
    await deck.refreshDeck()

    expect(deck.deckCards.value).toEqual([])
    expect(deck.deckError.value).toBeTruthy()
    expect(notify).toHaveBeenCalled()
  })

  it('skips fetching when range is incomplete', async () => {
    const from = ref('')
    const to = ref('')
    const notify = vi.fn()
    const deck = useDeckCards({ from, to, notifyError: notify })

    await deck.refreshDeck()
    expect(fetchDeckCardsInRange).not.toHaveBeenCalled()
    expect(deck.deckCards.value).toEqual([])
  })

  it('serves cached data for the same range until forced', async () => {
    const from = ref('2024-11-18T00:00:00.000Z')
    const to = ref('2024-11-25T00:00:00.000Z')
    ;(fetchDeckCardsInRange as unknown as vi.Mock).mockResolvedValue([sampleCard])
    const deck = useDeckCards({ from, to })

    await deck.refreshDeck()
    expect(deck.deckCards.value).toEqual([sampleCard])
    expect(fetchDeckCardsInRange).toHaveBeenCalledTimes(1)

    ;(fetchDeckCardsInRange as unknown as vi.Mock).mockResolvedValue([])
    await deck.refreshDeck()
    expect(deck.deckCards.value).toEqual([sampleCard])
    expect(fetchDeckCardsInRange).toHaveBeenCalledTimes(1)

    await deck.refreshDeck(true)
    expect(fetchDeckCardsInRange).toHaveBeenCalledTimes(2)
  })

  it('ignores out-of-order responses by sequence guard', async () => {
    const from = ref('2024-11-18T00:00:00.000Z')
    const to = ref('2024-11-25T00:00:00.000Z')

    let resolveFirst: (value: DeckCardSummary[]) => void
    const firstPromise = new Promise<DeckCardSummary[]>((resolve) => {
      resolveFirst = resolve
    })

    ;(fetchDeckCardsInRange as unknown as vi.Mock)
      .mockImplementationOnce(() => firstPromise)
      .mockImplementationOnce(() => Promise.resolve([{ ...sampleCard, id: 100 }]))

    const deck = useDeckCards({ from, to })

    const first = deck.refreshDeck(true) // seq 1 (pending)
    const second = deck.refreshDeck(true) // seq 2

    await second
    resolveFirst!([{ ...sampleCard, id: 99 }])
    await first

    expect(deck.deckCards.value).toEqual([{ ...sampleCard, id: 100 }])
    expect(fetchDeckCardsInRange).toHaveBeenCalledTimes(2)
  })
})
