import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchDeckBoardsMeta, fetchDeckCardsInRange } from '../src/services/deck'

const originalFetch = globalThis.fetch
const originalOc = (window as any).OC

beforeEach(() => {
  ;(window as any).OC = {
    generateUrl: (path: string) => `/index.php${path}`,
    requestToken: 'token-123',
  }
})

afterEach(() => {
  if (originalFetch) {
    globalThis.fetch = originalFetch
  } else {
    // @ts-expect-error cleanup
    delete globalThis.fetch
  }
  ;(window as any).OC = originalOc
  vi.restoreAllMocks()
})

describe('deck service', () => {
  it('fetches boards from opsdash endpoint', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          ok: true,
          boards: [{ id: 1, title: 'Ops', color: '#2563EB' }],
        }),
    })
    globalThis.fetch = fetchSpy as any

    const boards = await fetchDeckBoardsMeta()

    expect(fetchSpy).toHaveBeenCalledWith(
      '/index.php/apps/opsdash/overview/deck/boards',
      expect.objectContaining({ credentials: 'same-origin' }),
    )
    expect(boards).toEqual([{ id: 1, title: 'Ops', color: '#2563EB' }])
  })

  it('fetches cards with include flags', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          ok: true,
          cards: [{ id: 10, title: 'Card', boardId: 1, boardTitle: 'Ops', stackId: 2, stackTitle: 'Inbox', archived: false, status: 'active', labels: [], assignees: [], match: 'due' }],
        }),
    })
    globalThis.fetch = fetchSpy as any

    const cards = await fetchDeckCardsInRange({
      from: '2024-11-01T00:00:00.000Z',
      to: '2024-11-30T23:59:59.000Z',
      includeArchived: false,
      includeCompleted: true,
    })

    expect(fetchSpy).toHaveBeenCalled()
    const calledUrl = fetchSpy.mock.calls[0]?.[0] as string
    expect(calledUrl).toContain('/index.php/apps/opsdash/overview/deck/cards')
    expect(calledUrl).toContain('includeArchived=0')
    expect(calledUrl).toContain('includeCompleted=1')
    expect(cards.length).toBe(1)
  })

  it('skips invalid ranges', async () => {
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy as any

    const cards = await fetchDeckCardsInRange({
      from: 'invalid',
      to: '2024-11-30T23:59:59.000Z',
    })

    expect(cards).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
