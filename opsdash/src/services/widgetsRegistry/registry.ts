export * from './types'

import type { DashboardMode, RegistryEntry, WidgetDefinition, WidgetHeight, WidgetRenderContext, WidgetSize, WidgetTab, WidgetTabsState } from './types'

import { balanceIndexEntry } from './widgets/balance_index'
import { categoryMixTrendEntry } from './widgets/category_mix_trend'
import { chartDowEntry } from './widgets/chart_dow'
import { chartHodEntry } from './widgets/chart_hod'
import { chartPerDayEntry } from './widgets/chart_per_day'
import { chartPieEntry } from './widgets/chart_pie'
import { chartStackedEntry } from './widgets/chart_stacked'
import { calendarTableEntry } from './widgets/calendar_table'
import { dayOffTrendEntry } from './widgets/dayoff_trend'
import { deckCardsEntry } from './widgets/deck_cards'
import { noteEditorEntry } from './widgets/note_editor'
import { noteSnippetEntry } from './widgets/note_snippet'
import { targetsV2Entry } from './widgets/targets_v2'
import { timeSummaryV2Entry } from './widgets/time_summary_v2'
import { createDefaultWidgetTabs as createDefaultWidgetTabsFromDefaults, getWidgetPreset } from '../widgetDefaults'

export const widgetsRegistry: Record<string, RegistryEntry> = {
  time_summary_v2: timeSummaryV2Entry,
  targets_v2: targetsV2Entry,
  balance_index: balanceIndexEntry,
  dayoff_trend: dayOffTrendEntry,
  category_mix_trend: categoryMixTrendEntry,
  chart_pie: chartPieEntry,
  chart_stacked: chartStackedEntry,
  chart_per_day: chartPerDayEntry,
  chart_dow: chartDowEntry,
  chart_hod: chartHodEntry,
  calendar_table: calendarTableEntry,
  deck_cards: deckCardsEntry,
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
    if (!entry) return
    const id = String(item?.id ?? '') || `widget-${type}-${idx + 1}`
    const layout = item?.layout ?? {}
    const width: WidgetSize =
      layout.width === 'quarter' || layout.width === 'half' ? layout.width : 'full'
    const height: WidgetHeight =
      layout.height === 's' || layout.height === 'l' || layout.height === 'xl' ? layout.height : 'm'
    const order = Number(layout.order ?? 0)
    const baseOptions = entry.defaultOptions || {}
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
  return createDefaultWidgetTabsFromDefaults(mode)
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

function resolveWidgetLoading(def: WidgetDefinition, ctx: WidgetRenderContext) {
  const baseLoading = ctx.hasInitialLoad === false || !!ctx.isLoading
  if (def.type === 'deck_cards') {
    return baseLoading || !!ctx.deckLoading
  }
  return baseLoading
}

export function mapWidgetToComponent(def: WidgetDefinition, ctx: WidgetRenderContext) {
  const entry = widgetsRegistry[def.type]
  if (!entry) return null
  const props = entry.buildProps(def, ctx) || {}
  const loading = resolveWidgetLoading(def, ctx)
  return { component: entry.component, props, loading }
}

export function createDashboardPreset(mode: DashboardMode): WidgetDefinition[] {
  return getWidgetPreset(mode)
}
