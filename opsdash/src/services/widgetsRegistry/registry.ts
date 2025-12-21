export * from './types'

import type { DashboardMode, RegistryEntry, WidgetDefinition, WidgetHeight, WidgetRenderContext, WidgetSize } from './types'

import { activityEntry } from './widgets/activity'
import { balanceEntry } from './widgets/balance'
import { balanceIndexEntry } from './widgets/balance_index'
import { categoryMixTrendEntry } from './widgets/category_mix_trend'
import { dayOffTrendEntry } from './widgets/dayoff_trend'
import { deckEntry } from './widgets/deck'
import { deckCardsEntry } from './widgets/deck_cards'
import { noteEditorEntry } from './widgets/note_editor'
import { noteSnippetEntry } from './widgets/note_snippet'
import { notesEntry } from './widgets/notes'
import { targetsEntry } from './widgets/targets'
import { targetsV2Entry } from './widgets/targets_v2'
import { textBlockEntry } from './widgets/text_block'
import { timeSummaryEntry } from './widgets/time_summary'
import { timeSummaryV2Entry } from './widgets/time_summary_v2'

export const widgetsRegistry: Record<string, RegistryEntry> = {
  time_summary: timeSummaryEntry,
  time_summary_v2: timeSummaryV2Entry,
  targets: targetsEntry,
  targets_v2: targetsV2Entry,
  balance: balanceEntry,
  balance_index: balanceIndexEntry,
  activity: activityEntry,
  dayoff_trend: dayOffTrendEntry,
  category_mix_trend: categoryMixTrendEntry,
  deck: deckEntry,
  deck_cards: deckCardsEntry,
  notes: notesEntry,
  text_block: textBlockEntry,
  note_snippet: noteSnippetEntry,
  note_editor: noteEditorEntry,
}

/**
 * Normalizes a raw widgets payload coming from storage or server.
 */
export function normalizeWidgetLayout(raw: any, fallback: WidgetDefinition[]): WidgetDefinition[] {
  if (!Array.isArray(raw)) return fallback
  const cleaned: WidgetDefinition[] = []
  raw.forEach((item: any, idx: number) => {
    const type = String(item?.type ?? '')
    if (!type) return
    const entry = widgetsRegistry[type]
    const id = String(item?.id ?? '') || `widget-${type}-${idx + 1}`
    const layout = item?.layout ?? {}
    const width: WidgetSize =
      layout.width === 'quarter' || layout.width === 'half' ? layout.width : 'full'
    const height: WidgetHeight =
      layout.height === 's' || layout.height === 'l' || layout.height === 'xl' ? layout.height : 'm'
    const order = Number(layout.order ?? 0)
    const baseOptions = entry?.defaultOptions || {}
    const options = {
      ...baseOptions,
      ...(item?.options && typeof item.options === 'object' ? item.options : {}),
    }
    if (options.scale == null && options.textSize != null) {
      options.scale = options.textSize
      delete options.textSize
    }
    cleaned.push({
      id,
      type,
      options,
      layout: { width, height, order: Number.isFinite(order) ? order : 0 },
      version: Number(item?.version ?? 1) || 1,
    })
  })
  return cleaned.length ? cleaned : fallback
}

export function createDefaultWidgets(): WidgetDefinition[] {
  return createDashboardPreset('standard')
}

export function mapWidgetToComponent(def: WidgetDefinition, ctx: WidgetRenderContext) {
  const entry = widgetsRegistry[def.type]
  if (!entry) return null
  const props = entry.buildProps(def, ctx) || {}
  return { component: entry.component, props }
}

function cloneWidget(type: string, options: Record<string, any> = {}, layout?: Partial<WidgetDefinition['layout']>): WidgetDefinition {
  const entry = widgetsRegistry[type]
  const defaultLayout = entry?.defaultLayout ?? { width: 'half', height: 's', order: 50 }
  const defaultOptions = entry?.defaultOptions || {}
  return {
    id: `widget-${type}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    options: { ...defaultOptions, ...(options || {}) },
    layout: { ...defaultLayout, ...(layout || {}) },
    version: 1,
  }
}

export function createDashboardPreset(mode: DashboardMode): WidgetDefinition[] {
  if (mode === 'quick') {
    return [
      cloneWidget('balance', { scale: 'lg' }, { width: 'full', height: 'xl', order: 5 }),
      cloneWidget('activity', {}, { width: 'full', height: 'l', order: 10.1 }),
      cloneWidget('time_summary_v2', {
        showTotal: true,
        showAverage: true,
        showMedian: true,
        showBusiest: true,
        showWorkday: true,
        showWeekend: true,
        showWeekendShare: true,
        showCalendarSummary: true,
        showTopCategory: true,
        showBalance: true,
        mode: 'active',
        scale: 'xl',
      }, { width: 'full', height: 'xl', order: 12.55 }),
      cloneWidget('targets', {}, { width: 'full', height: 'xl', order: 15 }),
    ]
  }
  if (mode === 'pro') {
    return [
      cloneWidget('time_summary_v2'),
      cloneWidget('targets_v2'),
      cloneWidget('balance'),
      cloneWidget('activity'),
      cloneWidget('dayoff_trend', { showHeader: true, showBadges: true }),
      cloneWidget('category_mix_trend', { showHeader: true }),
      cloneWidget('deck_cards', { autoScroll: true, intervalSeconds: 5 }),
      cloneWidget('deck', { showTicker: true }),
      cloneWidget('notes'),
      cloneWidget('text_block', { preset: 'targets' }),
    ]
  }
  return [
    cloneWidget('targets', {
      showForecast: true,
      showHeader: false,
      showLegend: true,
      showDelta: true,
      showPace: true,
      showToday: true,
      scale: 'lg',
    }, { width: 'half', height: 'l', order: 10 }),
    cloneWidget('time_summary_v2', {
      showTotal: true,
      showAverage: true,
      showMedian: true,
      showBusiest: true,
      showWorkday: true,
      showWeekend: true,
      showWeekendShare: true,
      showCalendarSummary: true,
      showTopCategory: true,
      showBalance: true,
      mode: 'active',
      scale: 'md',
    }, { width: 'half', height: 'xl', order: 20 }),
    cloneWidget('balance_index', {
      showTrend: true,
      showMessages: true,
      showConfig: false,
      indexBasis: 'category',
      noticeAbove: 0.15,
      noticeBelow: 0.15,
      warnAbove: 0.3,
      warnBelow: 0.3,
      warnIndex: 0.6,
      lookbackWeeks: 4,
      messageDensity: 'normal',
      trendColor: '#2563EB',
      showCurrent: true,
      labelMode: 'period',
      reverseTrend: false,
    }, { width: 'half', height: 'm', order: 30 }),
    cloneWidget('dayoff_trend', {}, { width: 'half', height: 's', order: 40 }),
    cloneWidget('category_mix_trend', {
      lookbackWeeks: 4,
      density: 'normal',
      labelMode: 'period',
      colorMode: 'hybrid',
      squareCells: false,
      showHeader: true,
      showBadge: true,
    }, { width: 'full', height: 'l', order: 50 }),
  ]
}
