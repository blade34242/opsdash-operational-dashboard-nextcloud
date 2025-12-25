import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import TextBlockWidget from '../src/components/TextBlockWidget.vue'

describe('TextBlockWidget', () => {
  it('hides the header when showHeader is false', () => {
    const wrapper = mount(TextBlockWidget, {
      props: {
        title: 'Status',
        body: 'Body',
        showHeader: false,
      },
    })

    expect(wrapper.find('h3').exists()).toBe(false)
  })
})
