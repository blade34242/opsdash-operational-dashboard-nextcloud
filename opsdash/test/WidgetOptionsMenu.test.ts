import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import WidgetOptionsMenu from '../src/components/layout/WidgetOptionsMenu.vue'

describe('WidgetOptionsMenu', () => {
  const entry = {
    controls: [
      { key: 'customToggle', label: 'Custom toggle', type: 'toggle' },
      { key: 'cardBg', label: 'Card background', type: 'color' }, // duplicate should be deduped
    ],
  }

  it('shows core layout controls and widget controls without duplicate cardBg', async () => {
    const wrapper = mount(WidgetOptionsMenu, {
      props: {
        entry,
        options: {},
        open: true,
      },
    })

    const sections = wrapper.findAll('.opt-section')
    expect(sections.length).toBe(2) // layout/title + widget options

    const labels = wrapper.findAll('label').map((n) => n.text())
    expect(labels).toContain('Title prefix')
    expect(labels).toContain('Card background')
    expect(labels).toContain('Scale')
    expect(labels).toContain('Dense mode')
    expect(labels.filter((l) => l === 'Card background').length).toBe(1)
    expect(labels).toContain('Custom toggle')

    const scaleSelect = wrapper.find('#opt-scale')
    const scaleOptions = scaleSelect.findAll('option').map((opt) => opt.text())
    expect(scaleOptions).toContain('Extra large')
  })
})
