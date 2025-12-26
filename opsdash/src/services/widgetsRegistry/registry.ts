export * from './types'

import type { DashboardMode, RegistryEntry, WidgetDefinition, WidgetHeight, WidgetRenderContext, WidgetSize, WidgetTab, WidgetTabsState } from './types'

import { activityEntry } from './widgets/activity'
import { balanceEntry } from './widgets/balance'
import { balanceIndexEntry } from './widgets/balance_index'
import { categoryMixTrendEntry } from './widgets/category_mix_trend'
import { chartDowEntry } from './widgets/chart_dow'
import { chartHodEntry } from './widgets/chart_hod'
import { chartPerDayEntry } from './widgets/chart_per_day'
import { chartPieEntry } from './widgets/chart_pie'
import { chartStackedEntry } from './widgets/chart_stacked'
import { calendarTableEntry } from './widgets/calendar_table'
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
  chart_pie: chartPieEntry,
  chart_stacked: chartStackedEntry,
  chart_per_day: chartPerDayEntry,
  chart_dow: chartDowEntry,
  chart_hod: chartHodEntry,
  calendar_table: calendarTableEntry,
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

export function createDefaultWidgetTabs(mode: DashboardMode): WidgetTabsState {
  const tabs: WidgetTab[] = [
    {
      id: 'tab-1',
      label: 'Overview',
      widgets: createDashboardPreset(mode),
    },
  ]
  return { tabs, defaultTabId: tabs[0].id }
}

export function normalizeWidgetTabs(raw: any, fallback: WidgetTabsState): WidgetTabsState {
  if (Array.isArray(raw)) {
    const widgets = normalizeWidgetLayout(raw, fallback.tabs[0]?.widgets || createDefaultWidgets())
    const tabId = fallback.tabs[0]?.id || 'tab-1'
    return {
      tabs: [{ id: tabId, label: fallback.tabs[0]?.label || 'Overview', widgets }],
      defaultTabId: tabId,
    }
  }
  if (!raw || typeof raw !== 'object') return fallback

  const inputTabs = Array.isArray((raw as any).tabs) ? (raw as any).tabs : []
  const fallbackTabs = fallback.tabs || []
  const cleanedTabs: WidgetTab[] = inputTabs.map((tab: any, idx: number) => {
    const id = String(tab?.id ?? '').trim() || `tab-${idx + 1}`
    const labelRaw = String(tab?.label ?? '').trim()
    const label = labelRaw ? labelRaw.slice(0, 48) : `Tab ${idx + 1}`
    const fallbackWidgets = fallbackTabs[idx]?.widgets || fallbackTabs[0]?.widgets || createDefaultWidgets()
    const widgets = normalizeWidgetLayout(tab?.widgets, fallbackWidgets)
    return { id, label, widgets }
  })

  const tabs = cleanedTabs.length ? cleanedTabs : fallbackTabs
  const defaultTabIdRaw = String((raw as any).defaultTabId ?? (raw as any).defaultTab ?? (raw as any).active ?? '')
  const defaultTabId = tabs.some((tab) => tab.id === defaultTabIdRaw)
    ? defaultTabIdRaw
    : (tabs[0]?.id || 'tab-1')
  return { tabs, defaultTabId }
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
      cloneWidget('targets_v2', {
        showForecast: true,
        showPace: true,
        useLocalConfig: false,
        localConfig: null,
        showCategoryBlocks: true,
      }, { width: 'half', height: 'xl', order: 10 }),
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
      }, { width: 'half', height: 'xl', order: 30 }),
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
      }, { width: 'half', height: 'm', order: 40 }),
      cloneWidget('dayoff_trend', {}, { width: 'half', height: 's', order: 50 }),
      cloneWidget('category_mix_trend', {
        lookbackWeeks: 4,
        density: 'normal',
        labelMode: 'period',
        colorMode: 'hybrid',
        squareCells: false,
        showHeader: true,
        showBadge: true,
      }, { width: 'full', height: 'l', order: 55 }),
      cloneWidget('calendar_table', {}, { width: 'full', height: 'l', order: 56 }),
      cloneWidget('chart_pie', { scope: 'calendar', showLegend: true, showLabels: true }, { width: 'half', height: 'm', order: 57 }),
      cloneWidget('chart_stacked', { scope: 'calendar', showLegend: true, showLabels: false }, { width: 'full', height: 'l', order: 58 }),
      cloneWidget('chart_per_day', { scope: 'calendar', showLabels: false }, { width: 'half', height: 'm', order: 59 }),
      cloneWidget('chart_dow', { scope: 'calendar', showLabels: true }, { width: 'half', height: 'm', order: 59.5 }),
      cloneWidget('chart_hod', { showHint: false }, { width: 'full', height: 'l', order: 59.8 }),
      cloneWidget('deck_cards', {
        allowMine: true,
        includeArchived: true,
        includeCompleted: true,
        autoScroll: true,
        intervalSeconds: 5,
        showCount: true,
        filters: [
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
        ],
        defaultFilter: 'open_all',
        mineMode: 'assignee',
      }, { width: 'half', height: 'xl', order: 60 }),
      cloneWidget('note_editor', {}, { width: 'half', height: 'l', order: 70 }),
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
    cloneWidget('calendar_table', {}, { width: 'full', height: 'l', order: 55 }),
    cloneWidget('chart_pie', { scope: 'calendar', showLegend: true, showLabels: true }, { width: 'half', height: 'm', order: 56 }),
    cloneWidget('chart_stacked', { scope: 'calendar', showLegend: true, showLabels: false }, { width: 'full', height: 'l', order: 57 }),
    cloneWidget('chart_per_day', { scope: 'calendar', showLabels: false }, { width: 'half', height: 'm', order: 58 }),
    cloneWidget('chart_dow', { scope: 'calendar', showLabels: true }, { width: 'half', height: 'm', order: 58.5 }),
    cloneWidget('chart_hod', { showHint: false }, { width: 'full', height: 'l', order: 59 }),
  ]
}
