import { describe, it, expect } from 'vitest'
import { buildIndexTrend, computeIndexForShares } from '../src/services/balanceIndex'

describe('balanceIndex', () => {
  it('normalizes percentage shares and computes index', () => {
    const trend = buildIndexTrend({
      history: [
        { label: 'prev', offset: 2, categories: [{ id: 'a', share: 50 }, { id: 'b', share: 50 }] },
        { label: 'now', offset: 1, categories: [{ id: 'a', share: 60 }, { id: 'b', share: 40 }] },
      ],
      targetsConfig: { categories: [{ id: 'a', targetHours: 10 }, { id: 'b', targetHours: 10 }] },
      basis: 'category',
      lookback: 2,
    })
    const prev = trend.find((entry) => entry.label === 'prev')
    const now = trend.find((entry) => entry.label === 'now')
    expect(prev?.index).toBeCloseTo(1, 2)
    expect(now?.index).toBeCloseTo(0.9, 2)
  })

  it('handles fractional shares without renormalizing when sum <=1', () => {
    const index = computeIndexForShares({
      shares: { a: 0.6, b: 0.4 },
      targets: [{ id: 'a', targetHours: 5 }, { id: 'b', targetHours: 5 }],
      basis: 'category',
    })
    expect(index).toBeCloseTo(0.9, 2)
  })
})
