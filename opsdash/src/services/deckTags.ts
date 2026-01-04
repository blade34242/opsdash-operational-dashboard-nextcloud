import type { DeckCardSummary } from './deck'

type DeckLabel = {
  id?: number
  title?: string
}

export type DeckTagOption = {
  value: string
  label: string
  count: number
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
  const counts = new Map<string, { label: string; count: number }>()
  cards.forEach((card) => {
    const seen = new Set<string>()
    const labels = Array.isArray(card.labels) ? card.labels : []
    labels.forEach((label) => {
      const key = buildDeckTagKey(label)
      const title = typeof label.title === 'string' ? label.title.trim() : ''
      if (!key || !title || seen.has(key)) return
      seen.add(key)
      const entry = counts.get(key) || { label: title, count: 0 }
      entry.count += 1
      counts.set(key, entry)
    })
  })
  return Array.from(counts.entries())
    .map(([value, data]) => ({ value, label: data.label, count: data.count }))
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
