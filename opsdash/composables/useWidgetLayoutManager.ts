import { computed, ref, watch, type Ref } from 'vue'

import type { WidgetDefinition, WidgetHeight, WidgetSize } from '../src/services/widgetsRegistry'

export type WidgetRegistryEntry = {
  label?: string
  defaultLayout: WidgetDefinition['layout']
}

export function useWidgetLayoutManager(options: {
  storageKey: string
  widgetsRegistry: Record<string, WidgetRegistryEntry>
  createDefaultWidgets: () => WidgetDefinition[]
  normalizeWidgetLayout: (input: any, defaults: WidgetDefinition[]) => WidgetDefinition[]
  createDashboardPreset: (mode: 'quick' | 'standard' | 'pro') => WidgetDefinition[]
  dashboardMode: Ref<'quick' | 'standard' | 'pro'>
  deckEnabled: Ref<boolean>
  hasInitialLoad: Ref<boolean>
  queueSaveRef: Ref<null | ((silent?: boolean) => void)>
}) {
  const {
    storageKey,
    widgetsRegistry,
    createDefaultWidgets,
    normalizeWidgetLayout,
    createDashboardPreset,
    dashboardMode,
    deckEnabled,
    hasInitialLoad,
    queueSaveRef,
  } = options

  function loadWidgetLayout(): WidgetDefinition[] {
    try {
      if (typeof localStorage === 'undefined') return createDefaultWidgets()
      const raw = localStorage.getItem(storageKey)
      if (!raw) return createDefaultWidgets()
      const parsed = JSON.parse(raw)
      return normalizeWidgetLayout(parsed, createDefaultWidgets()).filter((w) => Boolean(widgetsRegistry[w.type]))
    } catch (err) {
      console.warn('[opsdash] widget layout load failed', err)
      return createDefaultWidgets()
    }
  }

  const layoutWidgets = ref<WidgetDefinition[]>(loadWidgetLayout())
  const widgetsDirty = ref(false)
  const isLayoutEditing = ref(false)
  const newWidgetType = ref('')

  function persistWidgets() {
    if (hasInitialLoad.value && widgetsDirty.value) {
      queueSaveRef.value?.(false)
      widgetsDirty.value = false
    }
  }

  watch(
    () => hasInitialLoad.value,
    (ready) => {
      if (ready && widgetsDirty.value) {
        persistWidgets()
      }
    },
  )

  watch(
    () => layoutWidgets.value,
    (next) => {
      try {
        if (typeof localStorage === 'undefined') return
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch (err) {
        console.warn('[opsdash] widget layout save failed', err)
      }
    },
    { deep: true },
  )

  const widgets = computed<WidgetDefinition[]>(() => {
    const defs = layoutWidgets.value
    if (!deckEnabled.value) {
      return defs.filter((w) => w.type !== 'deck')
    }
    return defs
  })

  const availableWidgetTypes = computed(() =>
    Object.keys(widgetsRegistry).map((type) => ({
      type,
      label: widgetsRegistry[type]?.label || type,
    })),
  )

  function applyDashboardPreset(mode: 'quick' | 'standard' | 'pro') {
    dashboardMode.value = mode
    layoutWidgets.value = createDashboardPreset(mode)
    widgetsDirty.value = true
    persistWidgets()
  }

  function updateWidget(id: string, updater: (w: WidgetDefinition) => WidgetDefinition) {
    layoutWidgets.value = layoutWidgets.value.map((w) =>
      w.id === id ? updater({ ...w, layout: { ...w.layout } }) : w,
    )
    widgetsDirty.value = true
    persistWidgets()
  }

  function cycleWidth(id: string) {
    const order: WidgetSize[] = ['quarter', 'half', 'full']
    updateWidget(id, (w) => {
      const idx = order.indexOf(w.layout.width as WidgetSize)
      const next = order[(idx + 1) % order.length]
      return { ...w, layout: { ...w.layout, width: next } }
    })
  }

  function cycleHeight(id: string) {
    const order: WidgetHeight[] = ['s', 'm', 'l', 'xl']
    updateWidget(id, (w) => {
      const idx = order.indexOf(w.layout.height as WidgetHeight)
      const next = order[(idx + 1) % order.length]
      return { ...w, layout: { ...w.layout, height: next } }
    })
  }

  function moveWidget(id: string, dir: 'up' | 'down') {
    const ordered = [...layoutWidgets.value].sort((a, b) => (a.layout.order || 0) - (b.layout.order || 0))
    const idx = ordered.findIndex((w) => w.id === id)
    if (idx < 0) return
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= ordered.length) return
    const currentOrder = ordered[idx].layout.order
    ordered[idx].layout.order = ordered[targetIdx].layout.order
    ordered[targetIdx].layout.order = currentOrder
    layoutWidgets.value = ordered
    widgetsDirty.value = true
    persistWidgets()
  }

  function removeWidget(id: string) {
    layoutWidgets.value = layoutWidgets.value.filter((w) => w.id !== id)
    widgetsDirty.value = true
    persistWidgets()
  }

  function addWidget(type: string) {
    const entry = widgetsRegistry[type]
    if (!entry) return
    const maxOrder = layoutWidgets.value.reduce((acc, w) => Math.max(acc, w.layout.order || 0), 0)
    const def: WidgetDefinition = {
      id: `widget-${type}-${Date.now()}`,
      type,
      options: {},
      layout: { ...entry.defaultLayout, order: maxOrder + 10 },
      version: 1,
    }
    layoutWidgets.value = [...layoutWidgets.value, def]
    newWidgetType.value = ''
    widgetsDirty.value = true
    persistWidgets()
  }

  function addWidgetAt(type: string, orderHint?: number) {
    const entry = widgetsRegistry[type]
    if (!entry) return
    const maxOrder = layoutWidgets.value.reduce((acc, w) => Math.max(acc, w.layout.order || 0), 0)
    let order = Number.isFinite(orderHint) ? Number(orderHint) : maxOrder + 10
    if (!Number.isFinite(order)) order = maxOrder + 10
    while (layoutWidgets.value.some((w) => w.layout.order === order)) {
      order += 0.1
    }
    const def: WidgetDefinition = {
      id: `widget-${type}-${Date.now()}`,
      type,
      options: {},
      layout: { ...entry.defaultLayout, order },
      version: 1,
    }
    layoutWidgets.value = [...layoutWidgets.value, def]
    widgetsDirty.value = true
    persistWidgets()
  }

  function reorderWidget(id: string, orderHint?: number | null) {
    if (!Number.isFinite(orderHint ?? NaN)) return
    const nextOrder = Number(orderHint)
    const items = layoutWidgets.value.map((w) =>
      w.id === id ? { ...w, layout: { ...w.layout, order: nextOrder } } : { ...w },
    )
    items.sort((a, b) => (a.layout.order || 0) - (b.layout.order || 0))
    layoutWidgets.value = items.map((w, idx) => ({
      ...w,
      layout: { ...w.layout, order: (idx + 1) * 10 },
    }))
    widgetsDirty.value = true
    persistWidgets()
  }

  function updateWidgetOptions(id: string, key: string, value: any) {
    layoutWidgets.value = layoutWidgets.value.map((w) => {
      if (w.id !== id) return w
      const opts = { ...(w.options || {}) }
      if (key.includes('.')) {
        const parts = key.split('.')
        const next = { ...opts }
        let cursor: any = next
        for (let i = 0; i < parts.length - 1; i += 1) {
          const p = parts[i]
          cursor[p] = { ...(cursor[p] || {}) }
          cursor = cursor[p]
        }
        cursor[parts[parts.length - 1]] = value
        return { ...w, options: next }
      }
      if (key === 'scale') {
        opts.scale = value
        if ('textSize' in opts) {
          delete (opts as any).textSize
        }
        return { ...w, options: opts }
      }
      opts[key] = value
      return { ...w, options: opts }
    })
    widgetsDirty.value = true
    persistWidgets()
  }

  function resetWidgets() {
    layoutWidgets.value = createDashboardPreset(dashboardMode.value)
    widgetsDirty.value = true
    persistWidgets()
  }

  return {
    layoutWidgets,
    widgetsDirty,
    isLayoutEditing,
    newWidgetType,
    widgets,
    availableWidgetTypes,
    persistWidgets,
    applyDashboardPreset,
    updateWidget,
    cycleWidth,
    cycleHeight,
    moveWidget,
    removeWidget,
    addWidget,
    addWidgetAt,
    reorderWidget,
    updateWidgetOptions,
    resetWidgets,
  }
}
