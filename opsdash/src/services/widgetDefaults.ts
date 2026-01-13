import type { DashboardMode, WidgetDefinition, WidgetTabsState } from './widgetsRegistry/types'

export type WidgetPresets = Record<DashboardMode, WidgetDefinition[]>

let cachedPresets: WidgetPresets | null = null

export function setWidgetPresets(input: unknown): void {
  const normalized = normalizeWidgetPresets(input)
  if (normalized) {
    cachedPresets = normalized
  }
}

export function getWidgetPresets(): WidgetPresets | null {
  return cachedPresets
}

export function getWidgetPreset(mode: DashboardMode): WidgetDefinition[] {
  const presets = cachedPresets
  if (!presets) return []
  const list = presets[mode] || []
  return cloneWidgets(list)
}

export function createDefaultWidgetTabs(mode: DashboardMode): WidgetTabsState {
  const widgets = getWidgetPreset(mode)
  return {
    tabs: [{ id: 'tab-1', label: 'Overview', widgets }],
    defaultTabId: 'tab-1',
  }
}

function normalizeWidgetPresets(input: unknown): WidgetPresets | null {
  if (!input || typeof input !== 'object') return null
  const obj = input as Record<string, unknown>
  const modes: DashboardMode[] = ['quick', 'standard', 'pro']
  const result = {} as WidgetPresets
  for (const mode of modes) {
    const list = obj[mode]
    result[mode] = Array.isArray(list) ? (list as WidgetDefinition[]) : []
  }
  return result
}

function cloneWidgets(list: WidgetDefinition[]): WidgetDefinition[] {
  return JSON.parse(JSON.stringify(list || [])) as WidgetDefinition[]
}
