import { describe, it, expect } from 'vitest'
import { buildIndexTrend, computeIndexForShares } from '../src/services/balanceIndex'

describe('balanceIndex', () => {
  it('normalizes percentage shares and computes index', () => {
    const trend = buildIndexTrend({
      history: [
        // oldest first; newest last to match buildIndexTrend heuristic
        { label: 'prev', categories: [{ id: 'a', share: 50 }, { id: 'b', share: 50 }] },
        { label: 'now', categories: [{ id: 'a', share: 60 }, { id: 'b', share: 40 }] },
      ],
      targetsConfig: { categories: [{ id: 'a', targetHours: 10 }, { id: 'b', targetHours: 10 }] },
      basis: 'category',
      lookback: 2,
    })
    expect(trend[0].index).toBeCloseTo(0.9, 2)
    expect(trend[1].index).toBeCloseTo(1, 2)
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
