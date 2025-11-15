interface DeckBoardMeta {
  id: number
  title: string
  color?: string
}

interface DeckApiBoard {
  id?: number
  title?: string
  color?: string
}

interface DeckApiStack {
  id?: number
  title?: string
  cards?: DeckApiCard[]
}

interface DeckApiCard {
  id?: number
  title?: string
  description?: string
  duedate?: string | number | null
  done?: string | null
  archived?: boolean
  stackId?: number
  labels?: DeckApiLabel[]
  assignedUsers?: DeckApiAssignee[]
}

interface DeckApiLabel {
  id?: number
  title?: string
  color?: string
}

interface DeckApiAssignee {
  id?: number
  type?: number | string
  participant?: DeckApiParticipant
}

interface DeckApiParticipant {
  uid?: string
  displayname?: string
  participant?: string
  id?: string | number
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
}

export interface DeckRangeRequest {
  from: string
  to: string
  includeArchived?: boolean
  includeCompleted?: boolean
}

class DeckHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string,
  ) {
    super(message)
  }
}

export async function fetchDeckCardsInRange(request: DeckRangeRequest): Promise<DeckCardSummary[]> {
  const fromTs = Date.parse(request.from)
  const toTs = Date.parse(request.to)
  if (!Number.isFinite(fromTs) || !Number.isFinite(toTs) || fromTs > toTs) {
    return []
  }
  const includeCompleted = request.includeCompleted !== false
  const includeArchived = request.includeArchived !== false

  let boardsPayload: any
  try {
    boardsPayload = await requestJson(buildDeckUrl('/apps/deck/api/v1/boards', { details: 0 }))
  } catch (error) {
    if (isDeckUnavailable(error)) {
      return []
    }
    throw error
  }
  const boards = normalizeBoards(boardsPayload)
  if (boards.length === 0) {
    return []
  }

  const boardMeta = new Map<number, DeckBoardMeta>()
  boards.forEach((board) => {
    if (board.id == null) return
    boardMeta.set(board.id, {
      id: board.id,
      title: board.title || `Board ${board.id}`,
      color: normalizeColor(board.color),
    })
  })

  const cards: DeckCardSummary[] = []
  for (const board of boards) {
    if (board.id == null) continue
    let stacksPayload: any
    try {
      stacksPayload = await requestJson(buildDeckUrl(`/apps/deck/api/v1/boards/${board.id}/stacks`))
    } catch (error) {
      if (isDeckUnavailable(error)) {
        continue
      }
      throw error
    }
    const stacks = normalizeStacks(stacksPayload)
    for (const stack of stacks) {
      if (stack.cards == null || stack.id == null) continue
      const stackTitle = stack.title || `Stack ${stack.id}`
      for (const rawCard of stack.cards) {
        const normalized = normalizeCard(rawCard, boardMeta.get(board.id), {
          stackId: stack.id,
          stackTitle,
        })
        if (!normalized) continue
        if (normalized.status === 'archived' && !includeArchived) {
          continue
        }
        const dueOk = normalized.dueTs != null && inRange(normalized.dueTs, fromTs, toTs)
        const doneOk =
          includeCompleted && normalized.doneTs != null && inRange(normalized.doneTs, fromTs, toTs)
        const isCompleted = normalized.status !== 'active'
        const completionMatch = includeCompleted && (doneOk || (isCompleted && dueOk))
        const dueMatch = dueOk && !completionMatch
        if (!dueMatch && !completionMatch) continue
        cards.push({
          ...normalized,
          match: completionMatch ? 'completed' : 'due',
        })
      }
    }
  }

  return cards.sort((a, b) => {
    const aTs = a.match === 'due' ? a.dueTs ?? 0 : a.doneTs ?? a.dueTs ?? 0
    const bTs = b.match === 'due' ? b.dueTs ?? 0 : b.doneTs ?? b.dueTs ?? 0
    if (aTs !== bTs) return aTs - bTs
    if (a.boardId !== b.boardId) return a.boardId - b.boardId
    return a.id - b.id
  })
}

function normalizeBoards(payload: any): DeckApiBoard[] {
  if (Array.isArray(payload)) {
    return payload
  }
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) {
      return payload.data
    }
    if (payload.ocs && Array.isArray(payload.ocs.data)) {
      return payload.ocs.data
    }
  }
  return []
}

function normalizeStacks(payload: any): DeckApiStack[] {
  if (Array.isArray(payload)) {
    return payload
  }
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) {
      return payload.data
    }
    if (payload.ocs && Array.isArray(payload.ocs.data)) {
      return payload.ocs.data
    }
  }
  return []
}

function normalizeCard(
  card: DeckApiCard,
  board?: DeckBoardMeta,
  stack?: { stackId: number; stackTitle: string },
): DeckCardSummary | null {
  if (!card || typeof card !== 'object' || card.id == null || !stack) {
    return null
  }
  const dueTs = toTimestamp(card.duedate)
  const doneTs = toTimestamp(card.done)
  const boardId = card.boardId || board?.id
  if (boardId == null) {
    return null
  }
  const status: DeckCardStatus = card.archived ? 'archived' : doneTs != null ? 'done' : 'active'
  const boardTitle = board?.title || `Board ${boardId}`

  return {
    id: card.id,
    title: card.title || `Card ${card.id}`,
    description: card.description || '',
    boardId,
    boardTitle,
    boardColor: board?.color,
    stackTitle: stack.stackTitle,
    stackId: stack.stackId,
    due: dueTs != null ? new Date(dueTs).toISOString() : undefined,
    dueTs: dueTs ?? undefined,
    done: doneTs != null ? new Date(doneTs).toISOString() : undefined,
    doneTs: doneTs ?? undefined,
    archived: Boolean(card.archived),
    status,
    labels: Array.isArray(card.labels)
      ? card.labels
          .filter((label): label is DeckApiLabel => Boolean(label && typeof label === 'object'))
          .map((label) => ({
            id: label.id,
            title: label.title || `Label ${label.id ?? ''}`.trim(),
            color: normalizeColor(label.color),
          }))
      : [],
    assignees: Array.isArray(card.assignedUsers)
      ? card.assignedUsers.map((user) => normalizeAssignee(user)).filter(Boolean)
      : [],
    match: 'due',
  }
}

function normalizeAssignee(
  user: DeckApiAssignee | undefined | null,
): { id?: number; uid?: string; displayName?: string } | null {
  if (!user) return null
  const participant = user.participant
  if (participant && typeof participant === 'object') {
    const uid = typeof participant.uid === 'string' ? participant.uid : undefined
    const displayName =
      typeof participant.displayname === 'string' ? participant.displayname : undefined
    if (uid || displayName) {
      return { id: user.id, uid, displayName }
    }
  }
  if (typeof participant === 'string') {
    return { id: user.id, uid: participant }
  }
  return null
}

function toTimestamp(input: unknown): number | null {
  if (typeof input === 'number' && Number.isFinite(input)) {
    if (input > 1e12) {
      return Math.trunc(input)
    }
    return input * 1000
  }
  if (typeof input === 'string' && input.trim() !== '') {
    const parsed = Date.parse(input)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function inRange(value: number, from: number, to: number): boolean {
  return value >= from && value <= to
}

function normalizeColor(color?: string): string | undefined {
  if (!color || typeof color !== 'string') {
    return undefined
  }
  const trimmed = color.trim()
  if (trimmed === '') {
    return undefined
  }
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`
}

async function requestJson(url: string): Promise<any> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'OCS-APIREQUEST': 'true',
  }
  const rt = getRequestToken()
  if (rt) {
    headers.requesttoken = rt
  }
  const res = await fetch(url, { credentials: 'same-origin', headers })
  const text = await res.text()
  if (!res.ok) {
    throw new DeckHttpError(`Deck request failed (${res.status})`, res.status, text)
  }
  return text ? JSON.parse(text) : null
}

function buildDeckUrl(path: string, params?: Record<string, any>): string {
  const relative = path.startsWith('/') ? path : `/${path}`
  const query = params ? qs(params) : ''
  const w: any = typeof window !== 'undefined' ? window : {}
  if (w.OC && typeof w.OC.generateUrl === 'function') {
    const generated = w.OC.generateUrl(relative)
    return query ? `${generated}?${query}` : generated
  }
  const root =
    (w.OC && (w.OC.webroot || w.OC.getRootPath?.())) || w._oc_webroot || ''
  if (!root) {
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

function isDeckUnavailable(error: unknown): boolean {
  return error instanceof DeckHttpError && (error.status === 404 || error.status === 401 || error.status === 503)
}
