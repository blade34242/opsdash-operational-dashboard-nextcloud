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

export type DeckFilterMode = 'all' | 'mine'

export interface DeckFeatureSettings {
  enabled: boolean
  filtersEnabled: boolean
  defaultFilter: DeckFilterMode
  hiddenBoards: number[]
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
  }
}

export function normalizeDeckSettings(input: any, fallback?: DeckFeatureSettings): DeckFeatureSettings {
  const base = fallback ?? createDefaultDeckSettings()
  if (!input || typeof input !== 'object') {
    return { ...base }
  }
  const defaultFilter: DeckFilterMode = input.defaultFilter === 'mine' ? 'mine' : 'all'
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
  }
}
