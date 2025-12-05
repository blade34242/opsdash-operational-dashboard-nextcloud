import { createDefaultBalanceConfig, type BalanceConfig } from './targets/config'

/**
 * Compute balance index for a single period given shares by id and targets config/basis.
 * Index = 1 - max(|actual - expected|). Basis can be category/calendar/both.
 */
export function computeIndexForShares(opts: {
  shares: Record<string, number>
  targets: BalanceConfig['categories']
  basis?: BalanceConfig['index']['basis']
}): number {
  const basis = opts.basis || 'category'
  if (basis === 'off') return 0
  const targetMap: Record<string, number> = {}
  const totalTarget = opts.targets?.length
    ? opts.targets.reduce((acc, cat) => acc + (cat.targetHours ?? 0), 0)
    : 0
  if (basis !== 'calendar' && totalTarget > 0) {
    opts.targets.forEach((cat) => {
      const pct = (cat.targetHours ?? 0) / totalTarget
      targetMap[cat.id] = pct
    })
  }

  const keys = new Set<string>()
  Object.keys(opts.shares || {}).forEach((k) => keys.add(k))
  Object.keys(targetMap).forEach((k) => keys.add(k))

  if (keys.size === 0) return 0

  let maxDeviation = 0
  keys.forEach((key) => {
    const actual = Number(opts.shares?.[key] ?? 0)
    const expected = basis === 'calendar' ? (1 / keys.size) : (targetMap[key] ?? 0)
    const dev = Math.abs(actual - expected)
    if (dev > maxDeviation) maxDeviation = dev
  })

  const index = 1 - maxDeviation
  return Math.max(0, Math.min(1, Number(index.toFixed(2))))
}

/**
 * Build trend points from history and targets config.
 */
export function buildIndexTrend(options: {
  history: Array<{ label?: string; categories?: Array<{ id: string; share: number }> }> | undefined
  targetsConfig: { categories: Array<{ id: string; targetHours: number }> }
  basis?: BalanceConfig['index']['basis']
  lookback: number
  currentIndex?: number
}) {
  const history = Array.isArray(options.history) ? options.history : []
  const lookback = Math.max(1, Math.min(options.lookback || 4, 52))
  const targets = options.targetsConfig?.categories || []
  const entries = history.slice(0, lookback).slice()
  const points = entries.map((entry, idx) => {
    const shares: Record<string, number> = {}
    if (Array.isArray(entry.categories)) {
      entry.categories.forEach((cat: any) => {
        shares[String(cat.id)] = Number(cat.share ?? 0)
      })
    }
    const values = Object.values(shares)
    const maxShare = values.length ? Math.max(...values) : 0
    const totalShare = values.reduce((a, b) => a + b, 0)
    // If backend provides percentages (0–100), normalize to 0–1.
    if (maxShare > 1 || totalShare > 1.5) {
      Object.keys(shares).forEach((k) => {
        shares[k] = shares[k] / 100
      })
    }
    // Guard against totals >1 by normalizing proportions.
    const totalAfter = Object.values(shares).reduce((a, b) => a + b, 0)
    if (totalAfter > 1.0001 && totalAfter > 0) {
      Object.keys(shares).forEach((k) => {
        shares[k] = shares[k] / totalAfter
      })
    }
    const index = computeIndexForShares({ shares, targets, basis: options.basis })
    return {
      index,
      label: entry.label || '',
      offset: idx, // temporary
    }
  })
  // Ensure newest item is offset 0. If backend is oldest-first, reverse; if newest-first, keep.
  // Heuristic: assume last item is newest; reverse to make last -> first.
  points.reverse()
  points.forEach((pt, idx) => { pt.offset = idx })

  // Inject current index if provided and missing at offset 0.
  if (typeof options.currentIndex === 'number') {
    if (!points.length || Math.abs((points[0].index ?? 0) - options.currentIndex) > 0.0001) {
      points.unshift({ index: options.currentIndex, label: 'Current', offset: 0 })
      points.forEach((pt, idx) => { pt.offset = idx })
    } else {
      points[0].index = options.currentIndex
    }
  }
  return points.slice(0, lookback)
}

export function defaultBalanceConfig(): BalanceConfig {
  return createDefaultBalanceConfig()
}
