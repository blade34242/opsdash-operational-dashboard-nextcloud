import { buildTargetsSummary, createEmptyTargetsSummary, convertWeekToMonth } from '../targets'

import type { TextPresetKey, WidgetRenderContext } from './types'

export const BASE_COLORS = ['#2563EB', '#F97316', '#10B981', '#A855F7', '#EC4899', '#14B8A6', '#F59E0B', '#6366F1', '#0EA5E9', '#65A30D']

export function copyConfigForRange(config: any, rangeMode?: string) {
  const cfg = JSON.parse(JSON.stringify(config || {}))
  if (rangeMode === 'month') {
    cfg.totalHours = convertWeekToMonth(cfg.totalHours ?? 0)
    cfg.categories = (cfg.categories || []).map((cat: any) => ({
      ...cat,
      targetHours: convertWeekToMonth(cat.targetHours ?? 0),
    }))
  }
  return cfg
}

export function attachUi(cfg: any) {
  return {
    ...cfg,
    ui: { ...(cfg?.ui ?? {}) },
  }
}

export function safeBuildTargetsSummary(config: any, ctx: WidgetRenderContext) {
  try {
    return buildTargetsSummary({
      config,
      stats: ctx.stats,
      byDay: ctx.byDay || [],
      byCal: ctx.byCal || [],
      groupsById: ctx.groupsById || {},
      range: ctx.rangeMode === 'month' ? 'month' : 'week',
      from: ctx.from || '',
      to: ctx.to || '',
    })
  } catch (err) {
    console.error('[opsdash] targets widget local summary failed', err)
    return createEmptyTargetsSummary(config)
  }
}

export function buildTitle(base: string, prefix?: string | null) {
  if (!prefix) return base
  const trimmed = String(prefix).trim()
  if (!trimmed) return base
  return `${trimmed} · ${base}`
}

export function numberOr(primary?: any, override?: any) {
  if (override !== undefined && override !== null && override !== '') {
    const num = Number(override)
    if (Number.isFinite(num)) return num
  }
  const num = Number(primary)
  return Number.isFinite(num) ? num : undefined
}

export function resolvePreset(key?: TextPresetKey): { title?: string; body?: string } {
  switch (key) {
    case 'targets': return { title: 'Targets' }
    case 'activity': return { title: 'Activity & Schedule' }
    case 'balance': return { title: 'Balance' }
    case 'mix': return { title: 'Category mix trend' }
    case 'dayoff': return { title: 'Days off trend' }
    case 'deck': return { title: 'Deck summary' }
    case 'notes': return { title: 'Notes' }
    default: return {}
  }
}

export function collectPresetItems(key?: TextPresetKey, options: Record<string, any> = {}, ctx?: WidgetRenderContext) {
  if (!key) return []
  if (key === 'activity') {
    const summary: any = ctx?.activitySummary || {}
    const fmtPct = (v: any) => `${Number(v ?? 0).toFixed(1)}%`
    const fmtTime = (a: any, b?: any) => [a, b].filter(Boolean).join(' / ')
    const fmtHours = (v: any) => `${Number(v ?? 0).toFixed(1)}h`
    const fmtDate = (v: any) => (v ? String(v) : '—')
    const map = [
      { opt: 'weekendShare', key: 'weekend', label: 'Weekend share', value: fmtPct(summary.weekendShare) },
      { opt: 'eveningShare', key: 'evening', label: 'Evening share', value: fmtPct(summary.eveningShare) },
      { opt: 'earliestLatest', key: 'earliest', label: 'Earliest/Late times', value: fmtTime(summary.typicalStart, summary.typicalEnd) },
      { opt: 'overlaps', key: 'overlaps', label: 'Overlaps', value: String(summary.overlapEvents ?? '—') },
      { opt: 'longest', key: 'longest', label: 'Longest session', value: fmtHours(summary.longestSession) },
      { opt: 'lastDayOff', key: 'lastDayOff', label: 'Last day off', value: fmtDate(summary.lastDayOff) },
    ]
    return map.filter((m) => options[m.opt] !== false)
  }
  const itemsByKey: Record<TextPresetKey, Array<{ key: string; label?: string; value?: string }>> = {
    '': [],
    targets: [
      { key: 'status', label: 'Status', value: 'Pace / Delta / Forecast' },
      { key: 'today', label: 'Today', value: 'Today overlay' },
      { key: 'legend', label: 'Legend', value: 'Category breakdown' },
    ],
    activity: [], // handled above
    balance: [
      { key: 'index', label: 'Index', value: 'Balance index value' },
      { key: 'trend', label: 'Trend', value: 'Trend history/heat' },
      { key: 'notes', label: 'Notes', value: 'Pinned notes snippet' },
    ],
    mix: [
      { key: 'badge', label: 'Badge', value: 'Balance badge' },
      { key: 'history', label: 'History', value: 'Category mix tiles' },
    ],
    dayoff: [
      { key: 'header', label: 'Trend header', value: 'Period lookback' },
      { key: 'tiles', label: 'Trend tiles', value: 'Days off per week' },
    ],
    deck: [
      { key: 'header', label: 'Deck header', value: 'Range + Ticker' },
      { key: 'buckets', label: 'Buckets', value: 'Open/Done/Archived counts' },
      { key: 'empty', label: 'Empty states', value: 'No cards' },
    ],
    notes: [
      { key: 'labels', label: 'Labels', value: 'Prev/Current labels' },
      { key: 'content', label: 'Content', value: 'Prev/Current note texts' },
    ],
  }
  const list = itemsByKey[key] || []
  if (options.include) return list
  return list.length ? [list[0]] : []
}

export function parseBoardIds(input: any): Array<number> {
  if (Array.isArray(input)) {
    return Array.from(
      new Set(
        input
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    )
  }
  if (typeof input === 'string') {
    return parseBoardIds(input.split(','))
  }
  return []
}

export function parseFilters(input: any): string[] {
  if (Array.isArray(input)) {
    return input.map((f) => String(f).trim()).filter(Boolean)
  }
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean)
  }
  return [
    'open_all',
    'open_mine',
    'done_all',
    'done_mine',
    'archived_all',
    'archived_mine',
    'created_today_all',
    'created_today_mine',
  ]
}

export function prettyFilterLabel(key: string): string {
  switch (key) {
    case 'all': return 'All cards'
    case 'mine': return 'Mine (any status)'
    case 'open_all': return 'Open · All'
    case 'open_mine': return 'Open · Mine'
    case 'done_all': return 'Done · All'
    case 'done_mine': return 'Done · Mine'
    case 'archived_all': return 'Archived · All'
    case 'archived_mine': return 'Archived · Mine'
    case 'created_today_all': return 'Created today · All'
    case 'created_today_mine': return 'Created today · Mine'
    case 'created_range_all': return 'Created this range · All'
    case 'created_range_mine': return 'Created this range · Mine'
    default: return key
  }
}

