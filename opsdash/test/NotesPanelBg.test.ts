import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import NotesPanel from '../src/components/NotesPanel.vue'

describe('NotesPanel background', () => {
  it('applies background color', () => {
    const wrapper = mount(NotesPanel, {
      props: {
        previous: 'old',
        modelValue: 'new',
        prevLabel: 'Prev',
        currLabel: 'Curr',
        prevTitle: '',
        currTitle: '',
        saving: false,
        cardBg: '#abc',
      },
    })

    expect(wrapper.find('.notes-section').attributes('style')).toContain('background')
  })
})
