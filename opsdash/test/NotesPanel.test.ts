import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import NotesPanel from '../src/components/NotesPanel.vue'

describe('NotesPanel', () => {
  it('renders read-only previous notes and editable current notes', async () => {
    const wrapper = mount(NotesPanel, {
      props: {
        previous: 'Last week shipped onboarding',
        modelValue: 'Plan next sprint',
        prevLabel: 'Last week',
        currLabel: 'This week',
        prevTitle: 'Notes for previous week',
        currTitle: 'Notes for current week',
        saving: false,
      },
    })

    const textareas = wrapper.findAll('textarea')
    expect(textareas).toHaveLength(2)
    expect(textareas[0].attributes('readonly')).toBeDefined()
    expect(textareas[0].element.value).toBe('Last week shipped onboarding')
    expect(textareas[1].attributes('readonly')).toBeUndefined()
    await textareas[1].setValue('Updated plan')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Updated plan'])
  })

  it('emits save when button clicked', async () => {
    const wrapper = mount(NotesPanel, {
      props: {
        previous: '',
        modelValue: '',
        prevLabel: 'Last month',
        currLabel: 'This month',
        prevTitle: '',
        currTitle: '',
        saving: false,
      },
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('save')).toBeTruthy()
  })

  it('hides the header when showHeader is false', () => {
    const wrapper = mount(NotesPanel, {
      props: {
        previous: '',
        modelValue: '',
        prevLabel: 'Prev',
        currLabel: 'Curr',
        prevTitle: '',
        currTitle: '',
        saving: false,
        title: 'Notes',
        showHeader: false,
      },
    })
    expect(wrapper.find('.notes-header').exists()).toBe(false)
  })
})
