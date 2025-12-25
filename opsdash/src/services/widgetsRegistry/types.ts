export type WidgetSize = 'quarter' | 'half' | 'full'
export type WidgetHeight = 's' | 'm' | 'l' | 'xl'
export type DashboardMode = 'quick' | 'standard' | 'pro'

export interface WidgetDefinition {
  id: string
  type: string
  props?: Record<string, any>
  options?: Record<string, any>
  layout: {
    width: WidgetSize
    height: WidgetHeight
    order: number
  }
  locked?: boolean
  version: number
}

export interface WidgetRenderContext {
  summary?: any
  activeDayMode?: 'active' | 'all'
  targetsSummary?: any
  targetsConfig?: any
  stats?: any
  byDay?: any[]
  byCal?: any[]
  groupsById?: Record<string, number>
  groups?: any
  balanceOverview?: any
  balanceConfig?: any
  rangeLabel?: string
  rangeMode?: string
  offset?: number
  from?: string
  to?: string
  lookbackWeeks?: number
  balanceNote?: string
  activitySummary?: any
  activityConfig?: any
  activityDayOffTrend?: any
  activityTrendUnit?: string
  activityDayOffLookback?: number
  deckBuckets?: any
  deckRangeLabel?: string
  deckLoading?: boolean
  deckError?: string | null
  deckTicker?: any
  deckFilter?: any
  onDeckFilter?: (filter: any) => void
  deckShowBoardBadges?: boolean
  deckCards?: any[]
  deckBoards?: Array<{ id: number; title: string; color?: string }>
  uid?: string
  deckUrl?: string
  notesPrev?: string
  notesCurr?: string
  notesHistory?: Array<{ id: string; label: string; title: string; content: string }>
  notesLabelPrev?: string
  notesLabelCurr?: string
  notesLabelPrevTitle?: string
  notesLabelCurrTitle?: string
  isSavingNote?: boolean
  onSaveNote?: () => void
  onUpdateNotes?: (val: string) => void
  isLayoutEditing?: boolean
  onUpdateWidgetOptions?: (id: string, key: string, value: any) => void
}

export type WidgetRenderer = (def: WidgetDefinition, ctx: WidgetRenderContext) => any

export interface RegistryEntry {
  component: any
  buildProps: WidgetRenderer
  defaultLayout: WidgetDefinition['layout']
  label?: string
  baseTitle?: string
  defaultOptions?: Record<string, any>
  configurable?: boolean
  dynamicControls?: (options: Record<string, any>) => Array<{
    key: string
    label: string
    type: 'select' | 'number' | 'toggle' | 'text' | 'textarea' | 'color' | 'multiselect'
    options?: Array<{ value: any; label: string }>
  }>
  controls?: Array<{
    key: string
    label: string
    type: 'select' | 'number' | 'toggle' | 'text' | 'textarea' | 'color' | 'multiselect'
    min?: number
    max?: number
    step?: number
    options?: Array<{ value: any; label: string }>
  }>
}

export type TextPresetKey =
  | ''
  | 'targets'
  | 'activity'
  | 'balance'
  | 'mix'
  | 'dayoff'
  | 'deck'
  | 'notes'
