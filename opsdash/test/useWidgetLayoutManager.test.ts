import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick, ref } from 'vue'

import { useWidgetLayoutManager } from '../composables/useWidgetLayoutManager'

describe('useWidgetLayoutManager', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('persists dirty widgets after initial load completes', async () => {
    const queueSave = vi.fn()
    const hasInitialLoad = ref(false)

    const manager = useWidgetLayoutManager({
      storageKey: 'opsdash.widgets.test',
      widgetsRegistry: {
        test_widget: {
          label: 'Test Widget',
          defaultLayout: { width: 'half', height: 'm', order: 10 },
        },
      },
      createDefaultWidgets: () => [],
      normalizeWidgetLayout: (input, fallback) => (Array.isArray(input) ? input : fallback),
      createDashboardPreset: () => [],
      dashboardMode: ref('standard'),
      deckEnabled: ref(true),
      hasInitialLoad,
      queueSaveRef: ref(queueSave),
    })

    manager.addWidget('test_widget')
    expect(queueSave).not.toHaveBeenCalled()

    hasInitialLoad.value = true
    await nextTick()

    expect(queueSave).toHaveBeenCalledWith(false)
  })
})
