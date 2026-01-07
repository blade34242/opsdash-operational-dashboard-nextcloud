import { buildTargetsSummary, createEmptyTargetsSummary, convertWeekToMonth } from '../targets'

import type { WidgetRenderContext } from './types'

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
    'due_all',
    'due_mine',
    'due_today_all',
    'due_today_mine',
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
    case 'due_all': return 'Due · All'
    case 'due_mine': return 'Due · Mine'
    case 'due_today_all': return 'Due today · All'
    case 'due_today_mine': return 'Due today · Mine'
    case 'created_today_all': return 'Created today · All'
    case 'created_today_mine': return 'Created today · Mine'
    case 'created_range_all': return 'Created this range · All'
    case 'created_range_mine': return 'Created this range · Mine'
    default: return key
  }
}
