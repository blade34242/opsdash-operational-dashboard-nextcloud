export type TargetsMode = 'days_only' | 'time_aware'

export interface TargetCategoryConfig {
  id: string
  label: string
  targetHours: number
  includeWeekend: boolean
  paceMode?: TargetsMode
  groupIds?: number[]
}

export interface TargetsConfig {
  totalHours: number
  categories: TargetCategoryConfig[]
  pace: {
    includeWeekendTotal: boolean
    mode: TargetsMode
    thresholds: { onTrack: number; atRisk: number }
  }
  forecast: {
    methodPrimary: 'linear'
    momentumLastNDays: number
    padding: number
  }
  ui: {
    showTotalDelta: boolean
    showNeedPerDay: boolean
    showCategoryBlocks: boolean
    badges: boolean
    includeWeekendToggle: boolean
  }
  includeZeroDaysInStats: boolean
}

export interface TargetsProgress {
  id: string
  label: string
  actualHours: number
  targetHours: number
  percent: number
  deltaHours: number
  remainingHours: number
  needPerDay: number
  daysLeft: number
  calendarPercent: number
  gap: number
  status: 'on_track' | 'at_risk' | 'behind' | 'done' | 'none'
  statusLabel: string
  includeWeekend: boolean
  paceMode: TargetsMode
}

export interface TargetsSummary {
  total: TargetsProgress
  categories: TargetsProgress[]
  forecast: {
    linear: number
    momentum: number
    low: number
    high: number
    text: string
  }
}

export interface BuildTargetsSummaryInput {
  config: TargetsConfig
  stats: any
  byDay: any[]
  byCal: any[]
  groupsById: Record<string, number>
  range: 'week' | 'month'
  from: string
  to: string
}

const DAY_MS = 24 * 60 * 60 * 1000

export function createDefaultTargetsConfig(): TargetsConfig {
  return {
    totalHours: 48,
    categories: [
      { id: 'work', label: 'Work', targetHours: 32, includeWeekend: false, paceMode: 'days_only', groupIds: [1] },
      { id: 'hobby', label: 'Hobby', targetHours: 6, includeWeekend: true, paceMode: 'days_only', groupIds: [2] },
      { id: 'sport', label: 'Sport', targetHours: 4, includeWeekend: true, paceMode: 'days_only', groupIds: [3] },
    ],
    pace: {
      includeWeekendTotal: true,
      mode: 'days_only',
      thresholds: { onTrack: -2, atRisk: -10 },
    },
    forecast: {
      methodPrimary: 'linear',
      momentumLastNDays: 2,
      padding: 1.5,
    },
    ui: {
      showTotalDelta: true,
      showNeedPerDay: true,
      showCategoryBlocks: true,
      badges: true,
      includeWeekendToggle: true,
    },
    includeZeroDaysInStats: false,
  }
}

export function buildTargetsSummary(input: BuildTargetsSummaryInput): TargetsSummary {
  const cfg = normalizeTargetsConfig(input.config)
  const start = parseDate(input.from)
  const end = parseDate(input.to)
  const dailyHours = buildDailyMap(input.byDay)

  const totalActual = Number(input.stats?.total_hours ?? 0)
  const totalTarget = cfg.totalHours || 0
  const totalPace = computePaceInfo({
    includeWeekend: cfg.pace.includeWeekendTotal,
    mode: cfg.pace.mode,
    includeZeroDays: cfg.includeZeroDaysInStats,
    start,
    end,
    dailyHours,
  })

  const totalProgress = makeProgress({
    id: 'total',
    label: 'Total',
    actual: totalActual,
    target: totalTarget,
    pace: totalPace,
    thresholds: cfg.pace.thresholds,
    includeWeekend: cfg.pace.includeWeekendTotal,
    paceMode: cfg.pace.mode,
  })

  const categories = cfg.categories.map((cat) => {
    const actual = computeCategoryActual(cat, input.byCal, input.groupsById)
    const paceMode = cat.paceMode || cfg.pace.mode
    const pace = computePaceInfo({
      includeWeekend: cat.includeWeekend,
      mode: paceMode,
      includeZeroDays: cfg.includeZeroDaysInStats,
      start,
      end,
      dailyHours,
    })
    return makeProgress({
      id: cat.id,
      label: cat.label,
      actual,
      target: cat.targetHours,
      pace,
      thresholds: cfg.pace.thresholds,
      includeWeekend: cat.includeWeekend,
      paceMode,
    })
  })

  const forecast = computeForecast({
    config: cfg,
    totalProgress,
    dailyHours,
    pace: totalPace,
  })

  return {
    total: totalProgress,
    categories,
    forecast,
  }
}

export function normalizeTargetsConfig(cfg: TargetsConfig): TargetsConfig {
  const clone: TargetsConfig = JSON.parse(JSON.stringify(cfg || {}))
  if (!Array.isArray(clone.categories)) {
    clone.categories = []
  }
  clone.categories = clone.categories.map((cat) => ({
    id: cat.id || cryptoLike(cat.label || 'cat'),
    label: cat.label || 'Category',
    targetHours: Number(cat.targetHours) || 0,
    includeWeekend: !!cat.includeWeekend,
    paceMode: cat.paceMode === 'time_aware' ? 'time_aware' : 'days_only',
    groupIds: Array.isArray(cat.groupIds) ? cat.groupIds.filter((n) => Number.isFinite(n)).map((n) => Number(n)) : [],
  }))
  clone.totalHours = Number(clone.totalHours) || 0
  clone.pace = clone.pace || { includeWeekendTotal: true, mode: 'days_only', thresholds: { onTrack: -2, atRisk: -10 } }
  clone.pace.mode = clone.pace.mode === 'time_aware' ? 'time_aware' : 'days_only'
  clone.pace.includeWeekendTotal = !!clone.pace.includeWeekendTotal
  clone.pace.thresholds = clone.pace.thresholds || { onTrack: -2, atRisk: -10 }
  clone.pace.thresholds.onTrack = Number(clone.pace.thresholds.onTrack) || 0
  clone.pace.thresholds.atRisk = Number(clone.pace.thresholds.atRisk) || 0
  clone.forecast = clone.forecast || { methodPrimary: 'linear', momentumLastNDays: 2, padding: 1.5 }
  clone.forecast.methodPrimary = 'linear'
  clone.forecast.momentumLastNDays = Math.max(1, Math.round(Number(clone.forecast.momentumLastNDays) || 1))
  clone.forecast.padding = Math.max(0, Number(clone.forecast.padding) || 0)
  clone.ui = clone.ui || { showTotalDelta: true, showNeedPerDay: true, showCategoryBlocks: true, badges: true, includeWeekendToggle: true }
  clone.includeZeroDaysInStats = !!clone.includeZeroDaysInStats
  return clone
}

function computeCategoryActual(cat: TargetCategoryConfig, byCal: any[], groupsById: Record<string, number>): number {
  if (!Array.isArray(byCal)) return 0
  const groups = Array.isArray(cat.groupIds) && cat.groupIds.length ? new Set(cat.groupIds) : null
  let sum = 0
  for (const row of byCal) {
    const hours = Number(row?.total_hours ?? row?.hours ?? 0)
    if (!isFinite(hours) || hours <= 0) continue
    const id = String(row?.id ?? row?.calendar ?? '')
    const group = Number(row?.group ?? row?.group_id ?? groupsById?.[id] ?? 0)
    if (groups && !groups.has(group)) continue
    sum += hours
  }
  return sum
}

function makeProgress(opts: {
  id: string
  label: string
  actual: number
  target: number
  pace: PaceInfo
  thresholds: { onTrack: number; atRisk: number }
  includeWeekend: boolean
  paceMode: TargetsMode
}): TargetsProgress {
  const target = Math.max(0, opts.target || 0)
  const actual = Math.max(0, opts.actual || 0)
  const percent = target > 0 ? clampPct((actual / target) * 100) : 0
  const remaining = target - actual
  const delta = actual - target
  const needPerDay = opts.pace.daysLeft > 0 ? Math.max(0, remaining) / opts.pace.daysLeft : 0
  const gap = percent - opts.pace.calendarPercent
  const status = resolveStatus({ percent, target, gap, thresholds: opts.thresholds })
  return {
    id: opts.id,
    label: opts.label,
    actualHours: round2(actual),
    targetHours: round2(target),
    percent,
    deltaHours: round2(delta),
    remainingHours: round2(Math.max(0, remaining)),
    needPerDay: round2(needPerDay),
    daysLeft: Math.max(0, Math.ceil(opts.pace.daysLeft)),
    calendarPercent: clampPct(opts.pace.calendarPercent),
    gap: round2(gap),
    status,
    statusLabel: statusLabel(status),
    includeWeekend: opts.includeWeekend,
    paceMode: opts.paceMode,
  }
}

function resolveStatus(args: { percent: number; target: number; gap: number; thresholds: { onTrack: number; atRisk: number } }): TargetsProgress['status'] {
  if (args.target <= 0) return 'none'
  if (args.percent >= 100) return 'done'
  if (args.gap >= args.thresholds.onTrack) return 'on_track'
  if (args.gap >= args.thresholds.atRisk) return 'at_risk'
  return 'behind'
}

function statusLabel(status: TargetsProgress['status']): string {
  switch (status) {
    case 'on_track': return 'On Track'
    case 'at_risk': return 'At Risk'
    case 'behind': return 'Behind'
    case 'done': return 'Done'
    default: return '—'
  }
}

interface PaceInfo {
  totalEligible: number
  elapsedEligible: number
  daysLeft: number
  calendarPercent: number
}

function computePaceInfo(opts: {
  includeWeekend: boolean
  mode: TargetsMode
  includeZeroDays: boolean
  start: Date | null
  end: Date | null
  dailyHours: Map<string, number>
}): PaceInfo {
  const { start, end } = opts
  if (!start || !end) {
    return { totalEligible: 0, elapsedEligible: 0, daysLeft: 0, calendarPercent: 0 }
  }
  const today = truncateDay(new Date())
  const startKey = dayKey(start)
  const endKey = dayKey(end)
  const totalEligibleDates = listDates(start, end).filter((date) => opts.includeWeekend || !isWeekend(date))
  const totalEligible = totalEligibleDates.length

  if (totalEligible === 0) {
    return { totalEligible: 0, elapsedEligible: 0, daysLeft: 0, calendarPercent: 0 }
  }

  if (dayKey(today) > endKey) {
    return { totalEligible, elapsedEligible: totalEligible, daysLeft: 0, calendarPercent: 100 }
  }
  if (dayKey(today) < startKey) {
    return { totalEligible, elapsedEligible: 0, daysLeft: totalEligible, calendarPercent: 0 }
  }

  let elapsed = 0
  for (const date of totalEligibleDates) {
    const key = dayKey(date)
    const hours = dailyHours.get(key) ?? 0
    if (!opts.includeZeroDays && hours <= 0 && key !== dayKey(today)) {
      continue
    }
    if (key < dayKey(today)) {
      elapsed += 1
    } else if (key === dayKey(today)) {
      if (opts.mode === 'time_aware') {
        const now = new Date()
        const msElapsed = Math.min(now.getTime(), date.getTime() + DAY_MS) - date.getTime()
        const frac = Math.max(0, Math.min(1, msElapsed / DAY_MS))
        if (opts.includeZeroDays || hours > 0 || frac > 0) {
          elapsed += frac
        }
      } else if (opts.includeZeroDays || hours > 0) {
        elapsed += 1
      }
    }
  }

  const calendarPercent = clampPct((elapsed / totalEligible) * 100)
  const daysLeft = Math.max(0, totalEligible - elapsed)
  return { totalEligible, elapsedEligible: elapsed, daysLeft, calendarPercent }
}

function computeForecast(opts: {
  config: TargetsConfig
  totalProgress: TargetsProgress
  dailyHours: Map<string, number>
  pace: PaceInfo
}): TargetsSummary['forecast'] {
  const elapsedRatio = opts.pace.totalEligible > 0 ? opts.pace.elapsedEligible / opts.pace.totalEligible : 0
  const linear = elapsedRatio > 0 ? opts.totalProgress.actualHours / elapsedRatio : opts.totalProgress.actualHours
  const remainingDays = Math.max(0, Math.ceil(opts.pace.daysLeft))
  const averageLastN = computeMomentumRate(opts.dailyHours, opts.config.forecast.momentumLastNDays)
  const momentum = opts.totalProgress.actualHours + averageLastN * remainingDays
  const low = Math.max(0, Math.min(linear, momentum) - opts.config.forecast.padding)
  const high = Math.max(linear, momentum) + opts.config.forecast.padding
  return {
    linear: round2(linear),
    momentum: round2(momentum),
    low: round2(Math.max(0, low)),
    high: round2(Math.max(0, high)),
    text: `~${formatHours(low)}–${formatHours(high)} h`,
  }
}

function computeMomentumRate(dailyHours: Map<string, number>, lastN: number): number {
  if (lastN <= 0) return 0
  const entries = Array.from(dailyHours.entries())
  if (!entries.length) return 0
  entries.sort((a, b) => a[0].localeCompare(b[0]))
  const recent = entries.slice(-lastN)
  const sum = recent.reduce((acc, [, hours]) => acc + Math.max(0, hours || 0), 0)
  return recent.length ? sum / recent.length : 0
}

function buildDailyMap(rows: any[]): Map<string, number> {
  const map = new Map<string, number>()
  if (!Array.isArray(rows)) return map
  for (const row of rows) {
    const key = String(row?.date ?? row?.day ?? '')
    if (!key) continue
    const hours = Number(row?.total_hours ?? row?.hours ?? 0)
    if (!isFinite(hours)) continue
    map.set(key, hours)
  }
  return map
}

function listDates(start: Date, end: Date): Date[] {
  const out: Date[] = []
  let cur = truncateDay(start)
  const endTime = truncateDay(end).getTime()
  while (cur.getTime() <= endTime) {
    out.push(new Date(cur))
    cur = new Date(cur.getTime() + DAY_MS)
  }
  return out
}

function parseDate(str: string): Date | null {
  if (!str) return null
  const parts = str.split('-').map((n) => Number(n))
  if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n))) return null
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
  if (Number.isNaN(date.getTime())) return null
  return truncateDay(date)
}

function truncateDay(date: Date): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay()
  return day === 0 || day === 6
}

function clampPct(value: number): number {
  if (!isFinite(value)) return 0
  return Math.max(0, Math.min(999, Number(value.toFixed(2))))
}

function round2(value: number): number {
  if (!isFinite(value)) return 0
  return Number(value.toFixed(2))
}

function formatHours(value: number): string {
  if (!isFinite(value)) return '0'
  const rounded = round2(Math.max(0, value))
  if (Math.abs(rounded - Math.round(rounded)) < 0.05) {
    return Math.round(rounded).toString()
  }
  return rounded.toFixed(1)
}

function cryptoLike(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  return `cat-${Math.abs(hash)}`
}
