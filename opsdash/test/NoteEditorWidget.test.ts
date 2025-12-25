import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import NoteEditorWidget from '../src/components/NoteEditorWidget.vue'

describe('NoteEditorWidget', () => {
  it('hides the title when showHeader is false', () => {
    const wrapper = mount(NoteEditorWidget, {
      props: {
        previous: 'Prev',
        modelValue: 'Curr',
        showHeader: false,
        title: 'Notes',
        saving: false,
      },
    })

    expect(wrapper.find('.title').exists()).toBe(false)
  })

  it('renders the provided title when showHeader is true', () => {
    const wrapper = mount(NoteEditorWidget, {
      props: {
        previous: 'Prev',
        modelValue: 'Curr',
        showHeader: true,
        title: 'Sprint Notes',
        saving: false,
      },
    })

    expect(wrapper.find('.title').text()).toBe('Sprint Notes')
  })
})
