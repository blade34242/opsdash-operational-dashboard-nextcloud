import TimeSummaryCard from '../components/TimeSummaryCard.vue'
import TimeTargetsCard from '../components/TimeTargetsCard.vue'
import BalanceOverviewCard from '../components/BalanceOverviewCard.vue'
import ActivityScheduleCard from '../components/ActivityScheduleCard.vue'
import DayOffTrendCard from '../components/DayOffTrendCard.vue'
import CategoryMixTrendCard from '../components/CategoryMixTrendCard.vue'
import DeckSummaryCard from '../components/DeckSummaryCard.vue'
import NotesPanel from '../components/NotesPanel.vue'
import TextBlockWidget from '../components/TextBlockWidget.vue'

export type WidgetSize = 'quarter' | 'half' | 'full'
export type WidgetHeight = 's' | 'm' | 'l'

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
  targetsSummary?: any
  targetsConfig?: any
  groups?: any
  balanceOverview?: any
  balanceConfig?: any
  rangeLabel?: string
  rangeMode?: string
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
  deckShowBoardBadges?: boolean
  notesPrev?: string
  notesCurr?: string
  notesLabelPrev?: string
  notesLabelCurr?: string
  notesLabelPrevTitle?: string
  notesLabelCurrTitle?: string
  isSavingNote?: boolean
  onSaveNote?: () => void
  onUpdateNotes?: (val: string) => void
}

type WidgetRenderer = (def: WidgetDefinition, ctx: WidgetRenderContext) => any

interface RegistryEntry {
  component: any
  buildProps: WidgetRenderer
  defaultLayout: WidgetDefinition['layout']
  label?: string
  configurable?: boolean
  controls?: Array<{
    key: string
    label: string
    type: 'select' | 'number' | 'toggle' | 'text' | 'textarea'
    min?: number
    max?: number
    step?: number
    options?: Array<{ value: any; label: string }>
  }>
}

export const widgetsRegistry: Record<string, RegistryEntry> = {
  time_summary: {
    component: TimeSummaryCard,
    defaultLayout: { width: 'half', height: 's', order: 10 },
    label: 'Time Summary (old)',
    configurable: true,
    buildProps: (_def, ctx) => ({
      summary: ctx.summary,
      mode: 'active',
      config: ctx.targetsConfig?.timeSummary,
    }),
  },
  targets: {
    component: TimeTargetsCard,
    defaultLayout: { width: 'half', height: 'm', order: 20 },
    label: 'Targets (old)',
    configurable: true,
    buildProps: (def, ctx) => ({
      summary: ctx.targetsSummary ?? ctx.summary,
      config: ctx.targetsConfig,
      groups: def.props?.groups ?? ctx.groups,
    }),
  },
  balance: {
    component: BalanceOverviewCard,
    defaultLayout: { width: 'half', height: 'm', order: 30 },
    label: 'Balance (old)',
    configurable: true,
    buildProps: (_def, ctx) => ({
      overview: ctx.balanceOverview,
      rangeLabel: ctx.rangeLabel,
      rangeMode: ctx.rangeMode,
      lookbackWeeks: ctx.lookbackWeeks,
      config: ctx.balanceConfig ?? { showNotes: false },
      note: ctx.balanceNote,
      activitySummary: ctx.activitySummary,
      activityConfig: ctx.activityConfig,
      activityDayOffTrend: ctx.activityDayOffTrend,
      activityTrendUnit: ctx.activityTrendUnit,
      activityDayOffLookback: ctx.activityDayOffLookback,
    }),
  },
  activity: {
    component: ActivityScheduleCard,
    defaultLayout: { width: 'half', height: 'm', order: 40 },
    label: 'Activity (old)',
    configurable: true,
    buildProps: (_def, ctx) => ({
      summary: ctx.activitySummary,
      config: ctx.activityConfig,
      dayOffTrend: ctx.activityDayOffTrend,
      trendUnit: ctx.activityTrendUnit,
      dayOffLookback: ctx.activityDayOffLookback,
      rangeLabel: ctx.rangeLabel,
      rangeMode: ctx.rangeMode,
    }),
  },
  dayoff_trend: {
    component: DayOffTrendCard,
    defaultLayout: { width: 'quarter', height: 's', order: 45 },
    label: 'Days off trend',
    configurable: true,
    controls: [
      { key: 'lookback', label: 'Lookback (periods)', type: 'number', min: 1, max: 12, step: 1 },
      {
        key: 'unit',
        label: 'Unit',
        type: 'select',
        options: [
          { value: 'wk', label: 'Weeks' },
          { value: 'mo', label: 'Months' },
        ],
      },
    ],
    buildProps: (_def, ctx) => ({
      trend: ctx.activityDayOffTrend,
      unit: _def.options?.unit ?? ctx.activityTrendUnit,
      lookback: _def.options?.lookback ?? ctx.activityDayOffLookback,
    }),
  },
  deck: {
    component: DeckSummaryCard,
    defaultLayout: { width: 'half', height: 's', order: 50 },
    label: 'Deck (old)',
    configurable: true,
    buildProps: (_def, ctx) => ({
      buckets: ctx.deckBuckets,
      rangeLabel: ctx.deckRangeLabel,
      loading: ctx.deckLoading,
      error: ctx.deckError,
      ticker: ctx.deckTicker,
      showBoardBadges: ctx.deckShowBoardBadges,
    }),
  },
  notes: {
    component: NotesPanel,
    defaultLayout: { width: 'half', height: 's', order: 60 },
    label: 'Notes (old)',
    configurable: true,
    buildProps: (def, ctx) => ({
      notesPrev: ctx.notesPrev,
      notesCurrDraft: ctx.notesCurr,
      notesLabelPrev: ctx.notesLabelPrev,
      notesLabelCurr: ctx.notesLabelCurr,
      notesLabelPrevTitle: ctx.notesLabelPrevTitle,
      notesLabelCurrTitle: ctx.notesLabelCurrTitle,
      isSaving: ctx.isSavingNote,
      onSave: ctx.onSaveNote,
      onUpdateNotes: ctx.onUpdateNotes,
      mode: def.props?.mode ?? 'week',
    }),
  },
  category_mix_trend: {
    component: CategoryMixTrendCard,
    defaultLayout: { width: 'half', height: 'm', order: 47 },
    label: 'Category mix trend',
    configurable: true,
    controls: [
      { key: 'lookbackWeeks', label: 'Lookback (weeks)', type: 'number', min: 1, max: 4, step: 1 },
      { key: 'showBadge', label: 'Show badge', type: 'toggle' },
    ],
    buildProps: (_def, ctx) => ({
      overview: ctx.balanceOverview,
      rangeMode: ctx.rangeMode,
      lookbackWeeks: _def.options?.lookbackWeeks ?? ctx.lookbackWeeks,
      showBadge: _def.options?.showBadge ?? true,
    }),
  },
  text_block: {
    component: TextBlockWidget,
    defaultLayout: { width: 'quarter', height: 's', order: 65 },
    label: 'Text',
    configurable: true,
    controls: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'body', label: 'Body', type: 'textarea' },
    ],
    buildProps: (def) => ({
      title: def.options?.title ?? '',
      body: def.options?.body ?? '',
      textSize: def.options?.textSize ?? 'md',
      dense: !!def.options?.dense,
    }),
  },
}

export function createDefaultWidgets(): WidgetDefinition[] {
  return [
    {
      id: 'widget-time-summary',
      type: 'time_summary',
      layout: widgetsRegistry.time_summary.defaultLayout,
      version: 1,
    },
    {
      id: 'widget-targets',
      type: 'targets',
      layout: widgetsRegistry.targets.defaultLayout,
      version: 1,
    },
    {
      id: 'widget-balance',
      type: 'balance',
      layout: widgetsRegistry.balance.defaultLayout,
      version: 1,
    },
    {
      id: 'widget-activity',
      type: 'activity',
      layout: widgetsRegistry.activity.defaultLayout,
      version: 1,
    },
    {
      id: 'widget-dayoff-trend',
      type: 'dayoff_trend',
      layout: widgetsRegistry.dayoff_trend.defaultLayout,
      version: 1,
    },
    {
      id: 'widget-category-mix-trend',
      type: 'category_mix_trend',
      layout: widgetsRegistry.category_mix_trend.defaultLayout,
      version: 1,
    },
    {
      id: 'widget-deck',
      type: 'deck',
      layout: widgetsRegistry.deck.defaultLayout,
      version: 1,
    },
    {
      id: 'widget-notes',
      type: 'notes',
      layout: widgetsRegistry.notes.defaultLayout,
      version: 1,
    },
  ]
}

export function mapWidgetToComponent(def: WidgetDefinition, ctx: WidgetRenderContext) {
  const entry = widgetsRegistry[def.type]
  if (!entry) return null
  const props = entry.buildProps(def, ctx) || {}
  return { component: entry.component, props }
}
