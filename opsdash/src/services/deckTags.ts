import type { DeckCardSummary } from './deck'

type DeckLabel = {
  id?: number
  title?: string
}

export type DeckTagOption = {
  value: string
  label: string
  count: number
  contextLabel?: string
  contextColor?: string
  duplicateLabel?: boolean
}

export function buildDeckTagKey(label: DeckLabel): string | null {
  const title = typeof label.title === 'string' ? label.title.trim() : ''
  if (!title) return null
  const id = label.id != null ? String(label.id).trim() : ''
  const base = id || slugify(title)
  if (!base) return null
  return `tag_${base}`
}

export function buildDeckTagOptions(cards: DeckCardSummary[]): DeckTagOption[] {
  const counts = new Map<string, {
    label: string
    count: number
    boardTitle: string
    boardColor: string
  }>()
  cards.forEach((card) => {
    const seen = new Set<string>()
    const labels = Array.isArray(card.labels) ? card.labels : []
    const boardTitle = String(card.boardTitle || '').trim()
    const boardColor = normalizeColor(card.boardColor)
    labels.forEach((label) => {
      const key = buildDeckTagKey(label)
      const title = typeof label.title === 'string' ? label.title.trim() : ''
      if (!key || !title || seen.has(key)) return
      seen.add(key)
      const entry = counts.get(key) || { label: title, count: 0, boardTitle, boardColor }
      entry.count += 1
      counts.set(key, entry)
    })
  })
  const entries = Array.from(counts.entries())
    .map(([value, data]) => ({ value, ...data }))
  const byLabel = new Map<string, number>()
  entries.forEach((entry) => {
    const key = entry.label.toLowerCase()
    byLabel.set(key, (byLabel.get(key) || 0) + 1)
  })
  return entries
    .map((entry) => {
      const duplicateLabel = (byLabel.get(entry.label.toLowerCase()) || 0) > 1
      return {
        value: entry.value,
        label: entry.label,
        count: entry.count,
        duplicateLabel,
        contextLabel: duplicateLabel ? entry.boardTitle : undefined,
        contextColor: duplicateLabel ? entry.boardColor : undefined,
      }
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

export function cardHasTag(card: DeckCardSummary, tagKey: string): boolean {
  const labels = Array.isArray(card.labels) ? card.labels : []
  return labels.some((label) => buildDeckTagKey(label) === tagKey)
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function normalizeColor(value?: string | null): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('#')) return trimmed
  if (/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(trimmed)) return `#${trimmed}`
  return ''
}
