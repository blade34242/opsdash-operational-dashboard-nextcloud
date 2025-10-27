import { formatHours, round2 } from './math'
import type { PaceInfo, TargetsProgress } from './progress'
import type { TargetsConfig } from './config'

interface ComputeForecastArgs {
  config: TargetsConfig
  totalProgress: TargetsProgress
  dailyHours: Map<string, number>
  pace: PaceInfo
}

export function computeForecast(args: ComputeForecastArgs) {
  const elapsedRatio = args.pace.totalEligible > 0 ? args.pace.elapsedEligible / args.pace.totalEligible : 0
  const linear = elapsedRatio > 0 ? args.totalProgress.actualHours / elapsedRatio : args.totalProgress.actualHours
  const remainingDays = Math.max(0, Math.ceil(args.pace.daysLeft))
  const averageLastN = computeMomentumRate(args.dailyHours, args.config.forecast.momentumLastNDays)
  const momentum = args.totalProgress.actualHours + averageLastN * remainingDays
  const low = Math.max(0, Math.min(linear, momentum) - args.config.forecast.padding)
  const high = Math.max(linear, momentum) + args.config.forecast.padding
  const primaryMethod: 'linear' | 'momentum' = args.config.forecast.methodPrimary === 'momentum' ? 'momentum' : 'linear'
  const primaryValue = primaryMethod === 'momentum' ? momentum : linear
  const bandLow = Math.max(0, primaryValue - args.config.forecast.padding)
  const bandHigh = Math.max(0, primaryValue + args.config.forecast.padding)
  const label = primaryMethod === 'momentum' ? 'Momentum' : 'Linear'

  return {
    linear: round2(linear),
    momentum: round2(momentum),
    low: round2(Math.max(0, low)),
    high: round2(Math.max(0, high)),
    text: `${label} ±${formatHours(args.config.forecast.padding)}h ≈ ${formatHours(bandLow)}–${formatHours(bandHigh)} h`,
    primaryMethod,
    primary: round2(primaryValue),
    bandLow: round2(bandLow),
    bandHigh: round2(bandHigh),
  }
}

export function computeMomentumRate(dailyHours: Map<string, number>, lastN: number): number {
  if (lastN <= 0) return 0
  const entries = Array.from(dailyHours.entries())
  if (!entries.length) return 0
  entries.sort((a, b) => a[0].localeCompare(b[0]))
  const recent = entries.slice(-lastN)
  const sum = recent.reduce((acc, [, hours]) => acc + Math.max(0, hours || 0), 0)
  return recent.length ? sum / recent.length : 0
}
