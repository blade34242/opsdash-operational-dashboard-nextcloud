import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import NoteSnippetWidget from '../src/components/widgets/notes/NoteSnippetWidget.vue'

describe('NoteSnippetWidget', () => {
  it('hides the header when showHeader is false', () => {
    const wrapper = mount(NoteSnippetWidget, {
      props: {
        notesCurr: 'Current note',
        title: 'Snippet',
        showHeader: false,
      },
    })

    expect(wrapper.find('h3').exists()).toBe(false)
  })
})
