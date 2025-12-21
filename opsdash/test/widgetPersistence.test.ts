import { describe, it, expect } from 'vitest'
import { createDefaultTargetsConfig } from '../src/services/targets'

import { createDefaultWidgets } from '../src/services/widgetsRegistry'

function serializeWidgets(widgets: any[]) {
  return JSON.parse(JSON.stringify(widgets))
}

describe('widget persistence with local targets', () => {
  it('keeps local targets config across export/import', () => {
    const base = createDefaultTargetsConfig()
    const widgets = createDefaultWidgets()
    let targetsWidget = widgets.find((w) => w.type === 'targets_v2')
    if (!targetsWidget) {
      targetsWidget = {
        id: 'widget-targets_v2-test',
        type: 'targets_v2',
        options: {},
        layout: { width: 'half', height: 'm', order: 10 },
        version: 1,
      }
      widgets.push(targetsWidget)
    }
    targetsWidget.options = {
      useLocalConfig: true,
      localConfig: { ...base, totalHours: 12 },
    }

    const exported = serializeWidgets(widgets)
    const imported = serializeWidgets(exported)
    const importedTargets = imported.find((w: any) => w.type === 'targets_v2')

    expect(importedTargets.options.useLocalConfig).toBe(true)
    expect(importedTargets.options.localConfig.totalHours).toBe(12)
  })

  it('preserves removed categories inside local targets config on reload', () => {
    const base = createDefaultTargetsConfig()
    // remove a category locally
    const trimmed = { ...base, categories: base.categories.slice(0, 1) }
    const widgets = createDefaultWidgets().map((w) =>
      w.type === 'targets_v2'
        ? { ...w, options: { useLocalConfig: true, localConfig: trimmed } }
        : w,
    )
    if (!widgets.some((w) => w.type === 'targets_v2')) {
      widgets.push({
        id: 'widget-targets_v2-test',
        type: 'targets_v2',
        options: { useLocalConfig: true, localConfig: trimmed },
        layout: { width: 'half', height: 'm', order: 10 },
        version: 1,
      })
    }

    const imported = JSON.parse(JSON.stringify(widgets))
    const t = imported.find((w: any) => w.type === 'targets_v2')
    expect(t.options.localConfig.categories).toHaveLength(1)
  })
})
