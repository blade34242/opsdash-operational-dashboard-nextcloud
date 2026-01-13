interface DeckBoardMeta {
  id: number
  title: string
  color?: string
}

export type DeckCardMatch = 'due' | 'completed'
export type DeckCardStatus = 'active' | 'done' | 'archived'

export interface DeckCardSummary {
  id: number
  title: string
  description?: string
  boardId: number
  boardTitle: string
  boardColor?: string
  stackTitle: string
  stackId: number
  due?: string
  dueTs?: number
  done?: string
  doneTs?: number
  archived: boolean
  status: DeckCardStatus
  labels: { id?: number; title: string; color?: string }[]
  assignees: { id?: number; uid?: string; displayName?: string }[]
  match: DeckCardMatch
  created?: string
  createdTs?: number
  createdBy?: string
  createdByDisplay?: string
  doneBy?: string
  doneByDisplay?: string
}

export interface DeckRangeRequest {
  from: string
  to: string
  includeArchived?: boolean
  includeCompleted?: boolean
}

interface DeckBoardsResponse {
  ok?: boolean
  boards?: DeckBoardMeta[]
}

interface DeckCardsResponse {
  ok?: boolean
  cards?: DeckCardSummary[]
  message?: string
}

export async function fetchDeckCardsInRange(request: DeckRangeRequest): Promise<DeckCardSummary[]> {
  const fromTs = Date.parse(request.from)
  const toTs = Date.parse(request.to)
  if (!Number.isFinite(fromTs) || !Number.isFinite(toTs) || fromTs > toTs) {
    return []
  }
  const includeCompleted = request.includeCompleted !== false
  const includeArchived = request.includeArchived !== false

  const payload = await requestJson(
    buildOpsdashUrl('/apps/opsdash/overview/deck/cards', {
      from: request.from,
      to: request.to,
      includeArchived: includeArchived ? 1 : 0,
      includeCompleted: includeCompleted ? 1 : 0,
    }),
  )
  const response = payload as DeckCardsResponse
  if (response && response.ok === false) {
    throw new Error(response.message || 'deck_fetch_failed')
  }
  const cards = Array.isArray(response?.cards) ? response.cards : []
  return cards
}

export async function fetchDeckBoardsMeta(): Promise<DeckBoardMeta[]> {
  const payload = await requestJson(buildOpsdashUrl('/apps/opsdash/overview/deck/boards'))
  const response = payload as DeckBoardsResponse
  if (response && response.ok === false) {
    return []
  }
  return Array.isArray(response?.boards) ? response.boards : []
}

async function requestJson(url: string): Promise<any> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  const rt = getRequestToken()
  if (rt) {
    headers.requesttoken = rt
  }
  const res = await fetch(url, { credentials: 'same-origin', headers })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Deck request failed (${res.status})`)
  }
  return text ? JSON.parse(text) : null
}

function buildOpsdashUrl(path: string, params?: Record<string, any>): string {
  const relative = path.startsWith('/') ? path : `/${path}`
  const query = params ? qs(params) : ''
  const w: any = typeof window !== 'undefined' ? window : {}
  if (w.OC && typeof w.OC.generateUrl === 'function') {
    const generated = w.OC.generateUrl(relative)
    return query ? `${generated}?${query}` : generated
  }
  const root =
    (w.OC && (w.OC.webroot || w.OC.getRootPath?.())) || w._oc_webroot || ''
  const origin = typeof w.location?.origin === 'string' ? w.location.origin : ''
  if (!root) {
    if (origin) {
      return query ? `${origin}${relative}?${query}` : `${origin}${relative}`
    }
    return query ? `${relative}?${query}` : relative
  }
  return query ? `${root}${relative}?${query}` : `${root}${relative}`
}

function qs(params: Record<string, any>): string {
  const url = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    url.append(key, String(value))
  })
  return url.toString()
}

function getRequestToken(): string | undefined {
  const w: any = typeof window !== 'undefined' ? window : {}
  const token = w.OC?.requestToken || w.oc_requesttoken
  return typeof token === 'string' ? token : undefined
}
