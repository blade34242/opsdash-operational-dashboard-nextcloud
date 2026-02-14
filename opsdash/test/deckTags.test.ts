import { describe, it, expect } from 'vitest'
import { buildDeckTagKey, buildDeckTagOptions, cardHasTag } from '../src/services/deckTags'

describe('deckTags', () => {
  it('builds stable tag keys', () => {
    expect(buildDeckTagKey({ id: 12, title: 'Urgent' })).toBe('tag_12')
    expect(buildDeckTagKey({ title: 'Needs Review' })).toBe('tag_needs-review')
    expect(buildDeckTagKey({ title: '' })).toBeNull()
  })

  it('counts tags per card and de-dupes duplicates', () => {
    const cards: any[] = [
      {
        id: 1,
        labels: [{ id: 1, title: 'Urgent' }, { id: 1, title: 'Urgent' }],
      },
      {
        id: 2,
        labels: [{ id: 1, title: 'Urgent' }, { id: 2, title: 'Backlog' }],
      },
    ]
    const options = buildDeckTagOptions(cards)
    const urgent = options.find((opt) => opt.value === 'tag_1')
    const backlog = options.find((opt) => opt.value === 'tag_2')
    expect(urgent?.count).toBe(2)
    expect(backlog?.count).toBe(1)
  })

  it('matches cards by tag key', () => {
    const card: any = {
      id: 3,
      labels: [{ id: 5, title: 'In progress' }],
    }
    expect(cardHasTag(card, 'tag_5')).toBe(true)
    expect(cardHasTag(card, 'tag_missing')).toBe(false)
  })

  it('prefers label id when present', () => {
    const options = buildDeckTagOptions([
      { id: 1, labels: [{ id: 99, title: 'Same' }] },
      { id: 2, labels: [{ id: 99, title: 'Same' }] },
    ] as any)
    const tag = options.find((opt) => opt.label === 'Same')
    expect(tag?.value).toBe('tag_99')
  })

  it('adds board context for duplicate label names with different ids', () => {
    const options = buildDeckTagOptions([
      {
        id: 1,
        boardTitle: 'Opsdash Product Delivery',
        boardColor: '#2563EB',
        labels: [{ id: 11, title: 'Ops' }],
      },
      {
        id: 2,
        boardTitle: 'Opsdash Release Train',
        boardColor: '#F97316',
        labels: [{ id: 22, title: 'Ops' }],
      },
    ] as any)
    const ops = options.filter((opt) => opt.label === 'Ops')
    expect(ops).toHaveLength(2)
    expect(ops.every((opt) => opt.duplicateLabel)).toBe(true)
    expect(ops.map((opt) => opt.contextLabel).sort()).toEqual([
      'Opsdash Product Delivery',
      'Opsdash Release Train',
    ])
  })
})
