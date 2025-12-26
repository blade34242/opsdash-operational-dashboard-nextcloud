import { describe, expect, it } from 'vitest'

import { createDefaultWidgetTabs, normalizeWidgetTabs } from '../src/services/widgetsRegistry'

describe('normalizeWidgetTabs', () => {
  it('cleans and clamps incoming widget payloads', () => {
    const fallback = createDefaultWidgetTabs('standard')
    const result = normalizeWidgetTabs([
      { type: 'note_editor', layout: { width: 'giant', height: 'x', order: 'oops' }, options: 'not-an-object' },
      { type: '', layout: {} },
    ], fallback)

    expect(result.tabs).toHaveLength(1)
    const widget = result.tabs[0].widgets[0]
    expect(widget.type).toBe('note_editor')
    expect(widget.layout.width).toBe('full')
    expect(widget.layout.height).toBe('m')
    expect(widget.layout.order).toBe(0)
    expect(widget.options).toEqual({})
    expect(widget.id).toBeTruthy()
  })

  it('normalizes tabbed layouts with a valid default', () => {
    const fallback = createDefaultWidgetTabs('standard')
    const result = normalizeWidgetTabs({
      tabs: [
        {
          id: 'tab-a',
          label: 'Alpha',
          widgets: [
            { type: 'note_editor', layout: { width: 'half', height: 'm', order: 1 }, options: {} },
          ],
        },
      ],
      defaultTabId: 'tab-a',
    }, fallback)

    expect(result.defaultTabId).toBe('tab-a')
    expect(result.tabs).toHaveLength(1)
    expect(result.tabs[0].id).toBe('tab-a')
    expect(result.tabs[0].widgets[0].type).toBe('note_editor')
  })
})
