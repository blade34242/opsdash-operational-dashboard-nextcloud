export type ReportingSchedule = 'week' | 'month' | 'both'
export type ReportingInterim = 'none' | 'midweek' | 'daily'
export type ReportingReminder = 'none' | '1d' | '2d'

export interface ReportingConfig {
  enabled: boolean
  schedule: ReportingSchedule
  interim: ReportingInterim
  reminderLead: ReportingReminder
  alertOnRisk: boolean
  riskThreshold: number // 0-1
  notifyEmail: boolean
  notifyNotification: boolean
}

export type DeckFilterMode =
  | 'all'
  | 'mine'
  | 'open_all'
  | 'open_mine'
  | 'done_all'
  | 'done_mine'
  | 'archived_all'
  | 'archived_mine'
  | 'created_today_all'
  | 'created_today_mine'
  | 'created_range_all'
  | 'created_range_mine'
  | 'created_today_all'
  | 'created_today_mine'
  | 'created_range_all'
  | 'created_range_mine'

export type DeckMineMode = 'assignee' | 'creator' | 'both'

export interface DeckTickerSettings {
  autoScroll: boolean
  intervalSeconds: number
  showBoardBadges: boolean
}

export interface DeckFeatureSettings {
  enabled: boolean
  filtersEnabled: boolean
  defaultFilter: DeckFilterMode
  hiddenBoards: number[]
  mineMode: DeckMineMode
  solvedIncludesArchived: boolean
  ticker: DeckTickerSettings
}

export function createDefaultReportingConfig(): ReportingConfig {
  return {
    enabled: false,
    schedule: 'both',
    interim: 'none',
    reminderLead: '1d',
    alertOnRisk: true,
    riskThreshold: 0.85,
    notifyEmail: true,
    notifyNotification: true,
  }
}

export function normalizeReportingConfig(input: any, fallback?: ReportingConfig): ReportingConfig {
  const base = fallback ?? createDefaultReportingConfig()
  if (!input || typeof input !== 'object') {
    return { ...base }
  }
  const schedule: ReportingSchedule =
    input.schedule === 'week' || input.schedule === 'month' ? input.schedule : 'both'
  const interim: ReportingInterim =
    input.interim === 'midweek' || input.interim === 'daily' ? input.interim : 'none'
  const reminder: ReportingReminder =
    input.reminderLead === '1d' || input.reminderLead === '2d' ? input.reminderLead : 'none'
  const thresholdRaw = Number(input.riskThreshold)
  const riskThreshold =
    Number.isFinite(thresholdRaw) && thresholdRaw >= 0 && thresholdRaw <= 1
      ? thresholdRaw
      : base.riskThreshold
  return {
    enabled: Boolean(input.enabled),
    schedule,
    interim,
    reminderLead: reminder,
    alertOnRisk: input.alertOnRisk !== false,
    riskThreshold,
    notifyEmail: input.notifyEmail !== false,
    notifyNotification: Boolean(input.notifyNotification),
  }
}

export function createDefaultDeckSettings(): DeckFeatureSettings {
  return {
    enabled: true,
    filtersEnabled: true,
    defaultFilter: 'all',
    hiddenBoards: [],
    mineMode: 'assignee',
    solvedIncludesArchived: true,
    ticker: {
      autoScroll: true,
      intervalSeconds: 5,
      showBoardBadges: true,
    },
  }
}

export function normalizeDeckSettings(input: any, fallback?: DeckFeatureSettings): DeckFeatureSettings {
  const base = fallback ?? createDefaultDeckSettings()
  if (!input || typeof input !== 'object') {
    return { ...base }
  }
  const allowedFilters: DeckFilterMode[] = [
    'all',
    'mine',
    'open_all',
    'open_mine',
    'done_all',
    'done_mine',
    'archived_all',
    'archived_mine',
  ]
  const defaultFilter: DeckFilterMode = allowedFilters.includes(input.defaultFilter)
    ? (input.defaultFilter as DeckFilterMode)
    : 'all'
  const mineMode: DeckMineMode =
    input.mineMode === 'creator' || input.mineMode === 'both' ? input.mineMode : 'assignee'
  const solvedIncludesArchived = input.solvedIncludesArchived !== false
  const ticker = {
    autoScroll: input.ticker?.autoScroll !== false,
    intervalSeconds: clampInterval(input.ticker?.intervalSeconds, base.ticker.intervalSeconds),
    showBoardBadges: input.ticker?.showBoardBadges !== false,
  }
  const hiddenBoards = Array.isArray(input.hiddenBoards)
    ? Array.from(
        new Set(
          input.hiddenBoards
            .map((value: any) => Number(value))
            .filter((value: number) => Number.isInteger(value) && value > 0),
        ),
      )
    : base.hiddenBoards.slice()
  return {
    enabled: input.enabled !== false,
    filtersEnabled: input.filtersEnabled !== false,
    defaultFilter,
    hiddenBoards,
    mineMode,
    solvedIncludesArchived,
    ticker,
  }
}

function clampInterval(value: unknown, fallback: number): number {
  const raw = Number(value)
  if (!Number.isFinite(raw)) return fallback
  return Math.min(10, Math.max(3, Math.trunc(raw)))
}
