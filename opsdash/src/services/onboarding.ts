import {
  createDefaultTargetsConfig,
  normalizeTargetsConfig,
  cloneTargetsConfig,
  type TargetsConfig,
} from './targets'

export const ONBOARDING_VERSION = 1

export interface CalendarSummary {
  id: string
  displayname: string
  color?: string
}

export interface StrategyDefinition {
  id: 'total_only' | 'total_plus_categories' | 'full_granular'
  title: string
  subtitle: string
  highlights: string[]
  layers: {
    total: boolean
    categories: boolean
    calendars: boolean
  }
  recommendedFor: string
}

export interface StrategyBuildResult {
  selected: string[]
  targetsConfig: TargetsConfig
  groups: Record<string, number>
  targetsWeek: Record<string, number>
  targetsMonth: Record<string, number>
}

const STRATEGIES: StrategyDefinition[] = [
  {
    id: 'total_only',
    title: 'Focused',
    subtitle: 'Keep it simple with one total goal',
    highlights: ['Single weekly/monthly target', 'Great for personal overview', 'Upgradable later'],
    layers: { total: true, categories: false, calendars: false },
    recommendedFor: 'Individuals tracking a single workload',
  },
  {
    id: 'total_plus_categories',
    title: 'Balanced',
    subtitle: 'Track balance across a few life areas',
    highlights: ['Total goal plus key categories', 'Automatic category summaries', 'Calendar grouping suggestions'],
    layers: { total: true, categories: true, calendars: false },
    recommendedFor: 'Work/life blend with a handful of focus areas',
  },
  {
    id: 'full_granular',
    title: 'Power',
    subtitle: 'Targets per category and calendar',
    highlights: ['Detailed per-calendar goals', 'Category dashboards & pacing', 'Best for multi-project oversight'],
    layers: { total: true, categories: true, calendars: true },
    recommendedFor: 'Power users managing several project calendars',
  },
]

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  work: ['work', 'focus', 'deep', 'project'],
  personal: ['personal', 'home', 'family', 'life'],
  recovery: ['recovery', 'wellness', 'rest', 'health'],
  hobby: ['hobby', 'learn', 'study', 'growth'],
  sport: ['sport', 'fitness', 'gym', 'run', 'ride'],
}

function pickCategoryId(
  label: string,
  categoryOrder: string[],
  keywords: Record<string, string[]>,
  index: number,
): string {
  const lower = label.toLowerCase()
  for (const id of categoryOrder) {
    const matches = keywords[id] || []
    if (matches.some((keyword) => lower.includes(keyword))) {
      return id
    }
  }
  return categoryOrder[index % categoryOrder.length]
}

function deriveMonthTargets(targetsWeek: Record<string, number>): Record<string, number> {
  const month: Record<string, number> = {}
  Object.entries(targetsWeek).forEach(([id, hours]) => {
    month[id] = Number((hours * 4).toFixed(2))
  })
  return month
}

export function getStrategyDefinitions(): StrategyDefinition[] {
  return STRATEGIES
}

export function buildStrategyResult(
  strategyId: StrategyDefinition['id'],
  calendars: CalendarSummary[],
  selectedInput: string[],
): StrategyBuildResult {
  const selected = selectedInput.length ? [...selectedInput] : calendars.map((c) => c.id)
  const baseConfig = normalizeTargetsConfig(createDefaultTargetsConfig())
  const groups: Record<string, number> = {}
  const targetsWeek: Record<string, number> = {}

  if (strategyId === 'total_plus_categories' || strategyId === 'full_granular') {
    const categoryOrder =
      strategyId === 'total_plus_categories'
        ? ['work', 'personal', 'recovery']
        : ['work', 'hobby', 'sport']
    const categoryDefaults =
      strategyId === 'total_plus_categories'
        ? [
            { id: 'work', label: 'Work', targetHours: 32, includeWeekend: false, paceMode: 'days_only' as const, groupId: 1 },
            { id: 'personal', label: 'Personal', targetHours: 8, includeWeekend: true, paceMode: 'days_only' as const, groupId: 2 },
            { id: 'recovery', label: 'Recovery', targetHours: 4, includeWeekend: true, paceMode: 'days_only' as const, groupId: 3 },
          ]
        : [
            { id: 'work', label: 'Work', targetHours: 32, includeWeekend: false, paceMode: 'days_only' as const, groupId: 1 },
            { id: 'hobby', label: 'Hobby', targetHours: 6, includeWeekend: true, paceMode: 'days_only' as const, groupId: 2 },
            { id: 'sport', label: 'Sport', targetHours: 4, includeWeekend: true, paceMode: 'days_only' as const, groupId: 3 },
          ]

    const assignment: Record<string, string> = {}
    let idx = 0
    calendars
      .filter((cal) => selected.includes(cal.id))
      .forEach((cal) => {
        assignment[cal.id] = pickCategoryId(cal.displayname, categoryOrder, CATEGORY_KEYWORDS, idx)
        idx += 1
      })

    const counts: Record<string, number> = {}
    Object.values(assignment).forEach((catId) => {
      counts[catId] = (counts[catId] ?? 0) + 1
    })

    const cfg = cloneTargetsConfig(baseConfig)
    cfg.totalHours = categoryDefaults.reduce((sum, cat) => sum + cat.targetHours, 0)
    cfg.categories = categoryDefaults.map((cat) => ({
      id: cat.id,
      label: cat.label,
      targetHours: cat.targetHours,
      includeWeekend: cat.includeWeekend,
      paceMode: cat.paceMode,
      groupIds: [cat.groupId],
    }))
    cfg.ui.showCategoryBlocks = true
    cfg.ui.showCategoryCharts = true
    cfg.ui.showCalendarCharts = strategyId === 'full_granular'
    cfg.includeZeroDaysInStats = false

    Object.entries(assignment).forEach(([calId, catId]) => {
      const cat = categoryDefaults.find((c) => c.id === catId)
      if (!cat) return
      groups[calId] = cat.groupId
      if (strategyId === 'full_granular' && cat.targetHours > 0) {
        const divisor = counts[catId] || 1
        const perCal = Number((cat.targetHours / divisor).toFixed(2))
        targetsWeek[calId] = perCal
      }
    })

    return {
      selected,
      targetsConfig: normalizeTargetsConfig(cfg),
      groups,
      targetsWeek,
      targetsMonth: deriveMonthTargets(targetsWeek),
    }
  }

  // total_only fallback
  const cfg = cloneTargetsConfig(baseConfig)
  cfg.totalHours = 40
  cfg.categories = []
  cfg.ui.showCategoryBlocks = false
  cfg.ui.showCategoryCharts = false
  cfg.ui.showCalendarCharts = false

  return {
    selected,
    targetsConfig: normalizeTargetsConfig(cfg),
    groups,
    targetsWeek,
    targetsMonth: {},
  }
}

