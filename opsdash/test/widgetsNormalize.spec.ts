import { describe, expect, it } from 'vitest'

import { createDefaultWidgets, normalizeWidgetLayout } from '../src/services/widgetsRegistry'

describe('normalizeWidgetLayout', () => {
  it('cleans and clamps incoming widget payloads', () => {
    const fallback = createDefaultWidgets().slice(0, 1)
    const result = normalizeWidgetLayout([
      { type: 'note_editor', layout: { width: 'giant', height: 'x', order: 'oops' }, options: 'not-an-object' },
      { type: '', layout: {} },
    ], fallback)

    expect(result).toHaveLength(1)
    const widget = result[0]
    expect(widget.type).toBe('note_editor')
    expect(widget.layout.width).toBe('full')
    expect(widget.layout.height).toBe('m')
    expect(widget.layout.order).toBe(0)
    expect(widget.options).toEqual({})
    expect(widget.id).toBeTruthy()
  })
})
