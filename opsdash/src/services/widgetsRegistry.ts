import TimeSummaryCard from '../components/TimeSummaryCard.vue'
import TimeTargetsCard from '../components/TimeTargetsCard.vue'
import BalanceOverviewCard from '../components/BalanceOverviewCard.vue'
import ActivityScheduleCard from '../components/ActivityScheduleCard.vue'
import DayOffTrendCard from '../components/DayOffTrendCard.vue'
import CategoryMixTrendCard from '../components/CategoryMixTrendCard.vue'
import DeckSummaryCard from '../components/DeckSummaryCard.vue'
import NotesPanel from '../components/NotesPanel.vue'
import NoteSnippetWidget from '../components/NoteSnippetWidget.vue'
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
  dynamicControls?: (options: Record<string, any>) => Array<{
    key: string
    label: string
    type: 'select' | 'number' | 'toggle' | 'text' | 'textarea'
    options?: Array<{ value: any; label: string }>
  }>
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

type TextPresetKey =
  | ''
  | 'targets'
  | 'activity'
  | 'balance'
  | 'mix'
  | 'dayoff'
  | 'deck'
  | 'notes'

export const widgetsRegistry: Record<string, RegistryEntry> = {
  time_summary: {
    component: TimeSummaryCard,
    defaultLayout: { width: 'half', height: 's', order: 10 },
    label: 'Time Summary (old)',
    configurable: true,
    controls: [
      { key: 'showHeader', label: 'Show header', type: 'toggle' },
      { key: 'showTopCategory', label: 'Show top category', type: 'toggle' },
      { key: 'showWorkdayStats', label: 'Show workday stats', type: 'toggle' },
      { key: 'showWeekendStats', label: 'Show weekend stats', type: 'toggle' },
      { key: 'customTitle', label: 'Custom title', type: 'text' },
    ],
    buildProps: (_def, ctx) => ({
      summary: ctx.summary,
      mode: 'active',
      config: ctx.targetsConfig?.timeSummary,
      showHeader: _def.options?.showHeader !== false,
      showTopCategory: _def.options?.showTopCategory !== false,
      showWorkdayStats: _def.options?.showWorkdayStats !== false,
      showWeekendStats: _def.options?.showWeekendStats !== false,
      title: _def.options?.customTitle,
    }),
  },
  targets: {
    component: TimeTargetsCard,
    defaultLayout: { width: 'half', height: 'm', order: 20 },
    label: 'Targets (old)',
    configurable: true,
    controls: [
      { key: 'showHeader', label: 'Show header', type: 'toggle' },
      { key: 'showLegend', label: 'Show legend', type: 'toggle' },
      { key: 'showDelta', label: 'Show delta', type: 'toggle' },
      { key: 'showForecast', label: 'Show forecast', type: 'toggle' },
      { key: 'showToday', label: 'Show today overlay', type: 'toggle' },
      { key: 'customTitle', label: 'Custom title', type: 'text' },
      { key: 'customFooter', label: 'Custom footnote', type: 'textarea' },
    ],
    buildProps: (def, ctx) => ({
      summary: ctx.targetsSummary ?? ctx.summary,
      config: ctx.targetsConfig,
      groups: def.props?.groups ?? ctx.groups,
      showHeader: def.options?.showHeader !== false,
      showLegend: def.options?.showLegend !== false,
      showDelta: def.options?.showDelta !== false,
      showForecast: def.options?.showForecast !== false,
      showToday: def.options?.showToday !== false,
      title: def.options?.customTitle,
      footer: def.options?.customFooter,
    }),
  },
  balance: {
    component: BalanceOverviewCard,
    defaultLayout: { width: 'half', height: 'm', order: 30 },
    label: 'Balance (old)',
    configurable: true,
    controls: [
      { key: 'showHeader', label: 'Show header', type: 'toggle' },
      { key: 'showTrend', label: 'Show trend history', type: 'toggle' },
      { key: 'showRelations', label: 'Show relations', type: 'toggle' },
      { key: 'showWarnings', label: 'Show warnings', type: 'toggle' },
      { key: 'customTitle', label: 'Custom title', type: 'text' },
      { key: 'customFooter', label: 'Custom footnote', type: 'textarea' },
    ],
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
      showHeader: _def.options?.showHeader !== false,
      showTrend: _def.options?.showTrend !== false,
      showRelations: _def.options?.showRelations !== false,
      showWarnings: _def.options?.showWarnings !== false,
      title: _def.options?.customTitle,
      footer: _def.options?.customFooter,
    }),
  },
  activity: {
    component: ActivityScheduleCard,
    defaultLayout: { width: 'half', height: 'm', order: 40 },
    label: 'Activity (old)',
    configurable: true,
    controls: [
      { key: 'showHeader', label: 'Show header', type: 'toggle' },
      { key: 'showBadges', label: 'Show badges', type: 'toggle' },
      { key: 'showTrends', label: 'Show trend tiles', type: 'toggle' },
      { key: 'showMeta', label: 'Show meta rows', type: 'toggle' },
      { key: 'customTitle', label: 'Custom title', type: 'text' },
    ],
    buildProps: (_def, ctx) => ({
      summary: ctx.activitySummary,
      config: ctx.activityConfig,
      dayOffTrend: ctx.activityDayOffTrend,
      trendUnit: ctx.activityTrendUnit,
      dayOffLookback: ctx.activityDayOffLookback,
      rangeLabel: ctx.rangeLabel,
      rangeMode: ctx.rangeMode,
      showHeader: _def.options?.showHeader !== false,
      showBadges: _def.options?.showBadges !== false,
      showTrends: _def.options?.showTrends !== false,
      showMeta: _def.options?.showMeta !== false,
      title: _def.options?.customTitle,
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
      { key: 'showHeader', label: 'Show header', type: 'toggle' },
      { key: 'showBadges', label: 'Show badges', type: 'toggle' },
      { key: 'customTitle', label: 'Custom title', type: 'text' },
    ],
    buildProps: (_def, ctx) => ({
      trend: ctx.activityDayOffTrend,
      unit: _def.options?.unit ?? ctx.activityTrendUnit,
      lookback: _def.options?.lookback ?? ctx.activityDayOffLookback,
      showHeader: _def.options?.showHeader !== false,
      showBadges: _def.options?.showBadges !== false,
      title: _def.options?.customTitle,
    }),
  },
  deck: {
    component: DeckSummaryCard,
    defaultLayout: { width: 'half', height: 's', order: 50 },
    label: 'Deck (old)',
    configurable: true,
    controls: [
      { key: 'showHeader', label: 'Show header', type: 'toggle' },
      { key: 'showBadges', label: 'Show board badges', type: 'toggle' },
      { key: 'showTicker', label: 'Show ticker', type: 'toggle' },
      { key: 'showEmpty', label: 'Show empty states', type: 'toggle' },
      { key: 'customTitle', label: 'Custom title', type: 'text' },
    ],
    buildProps: (_def, ctx) => ({
      buckets: ctx.deckBuckets,
      rangeLabel: ctx.deckRangeLabel,
      loading: ctx.deckLoading,
      error: ctx.deckError,
      ticker: ctx.deckTicker,
      showBoardBadges: _def.options?.showBadges ?? ctx.deckShowBoardBadges,
      showHeader: _def.options?.showHeader !== false,
      showTicker: _def.options?.showTicker !== false,
      showEmpty: _def.options?.showEmpty !== false,
      title: _def.options?.customTitle,
    }),
  },
  notes: {
    component: NotesPanel,
    defaultLayout: { width: 'half', height: 's', order: 60 },
    label: 'Notes (old)',
    configurable: true,
    controls: [
      { key: 'showPrev', label: 'Show previous note', type: 'toggle' },
      { key: 'showLabels', label: 'Show labels', type: 'toggle' },
      { key: 'mode', label: 'Mode', type: 'select', options: [{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }] },
      { key: 'customTitle', label: 'Custom title', type: 'text' },
    ],
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
      mode: def.options?.mode ?? def.props?.mode ?? 'week',
      showPrev: def.options?.showPrev !== false,
      showLabels: def.options?.showLabels !== false,
      title: def.options?.customTitle,
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
      { key: 'showHeader', label: 'Show header', type: 'toggle' },
      { key: 'customTitle', label: 'Custom title', type: 'text' },
    ],
    buildProps: (_def, ctx) => ({
      overview: ctx.balanceOverview,
      rangeMode: ctx.rangeMode,
      lookbackWeeks: _def.options?.lookbackWeeks ?? ctx.lookbackWeeks,
      showBadge: _def.options?.showBadge ?? true,
      showHeader: _def.options?.showHeader !== false,
      title: _def.options?.customTitle,
    }),
  },
  text_block: {
    component: TextBlockWidget,
    defaultLayout: { width: 'quarter', height: 's', order: 65 },
    label: 'Text label',
    configurable: true,
    controls: [
      {
        key: 'preset',
        label: 'Source',
        type: 'select',
        options: [
          { value: '', label: 'Custom' },
          { value: 'targets', label: 'Targets' },
          { value: 'activity', label: 'Activity & Schedule' },
          { value: 'balance', label: 'Balance' },
          { value: 'mix', label: 'Category mix' },
          { value: 'dayoff', label: 'Days off trend' },
          { value: 'deck', label: 'Deck' },
          { value: 'notes', label: 'Notes' },
        ],
      },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'body', label: 'Body', type: 'textarea' },
      { key: 'include', label: 'Include all labels', type: 'toggle' },
    ],
    buildProps: (def, ctx) => ({
      title: resolvePreset(def.options?.preset as TextPresetKey).title ?? def.options?.title ?? '',
      body: resolvePreset(def.options?.preset as TextPresetKey).body ?? def.options?.body ?? '',
      items: collectPresetItems(def.options?.preset as TextPresetKey, def.options || {}, ctx),
      textSize: def.options?.textSize ?? 'md',
      dense: !!def.options?.dense,
    }),
    dynamicControls: (options: Record<string, any>) => {
      if (options?.preset !== 'activity') return []
      return [
        { key: 'weekendShare', label: 'Weekend share', type: 'toggle' },
        { key: 'eveningShare', label: 'Evening share', type: 'toggle' },
        { key: 'earliestLatest', label: 'Earliest/Late times', type: 'toggle' },
        { key: 'overlaps', label: 'Overlaps', type: 'toggle' },
        { key: 'longest', label: 'Longest session', type: 'toggle' },
        { key: 'lastDayOff', label: 'Last day off', type: 'toggle' },
      ]
    },
  },
  note_snippet: {
    component: NoteSnippetWidget,
    defaultLayout: { width: 'quarter', height: 's', order: 68 },
    label: 'Notes snippet',
    configurable: true,
    buildProps: (_def, ctx) => ({
      notesCurr: ctx.notesCurr ?? '',
      notesPrev: ctx.notesPrev ?? '',
    }),
  },
}

function resolvePreset(key?: TextPresetKey): { title?: string; body?: string } {
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

function collectPresetItems(key?: TextPresetKey, options: Record<string, any> = {}, ctx?: WidgetRenderContext) {
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
