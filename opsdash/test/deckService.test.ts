import { afterEach, describe, expect, it, vi } from 'vitest'
import deckFixture from './fixtures/deck-week.json'
import { fetchDeckCardsInRange } from '../src/services/deck'

function createResponse(payload: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
  } as Response
}

describe('deck service', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('collects cards inside the requested range', async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const target = String(url)
      if (target.includes('/apps/deck/api/v1/boards?')) {
        return createResponse(deckFixture.ocs)
      }
      if (target.includes('/apps/deck/api/v1/boards/10/stacks')) {
        return createResponse(deckFixture.stacks['10'])
      }
      throw new Error(`Unexpected url ${target}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const cards = await fetchDeckCardsInRange({
      from: '2024-11-18T00:00:00.000Z',
      to: '2024-11-25T00:00:00.000Z',
    })

    expect(cards).toHaveLength(2)
    const dueCard = cards.find((card) => card.title === 'Prep sprint')
    const archivedCard = cards.find((card) => card.title === 'Close tickets')
    expect(dueCard).toMatchObject({
      match: 'due',
      labels: [{ title: 'Ops' }],
    })
    expect(archivedCard).toMatchObject({
      match: 'completed',
      status: 'archived',
    })
  })

  it('returns empty array when Deck endpoints are unavailable', async () => {
    const fetchMock = vi.fn(async () => createResponse({ message: 'missing' }, 404))
    vi.stubGlobal('fetch', fetchMock)

    const cards = await fetchDeckCardsInRange({
      from: '2024-11-18T00:00:00.000Z',
      to: '2024-11-25T00:00:00.000Z',
    })

    expect(cards).toEqual([])
  })
})
