import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SidebarNotesPane from '../src/components/sidebar/SidebarNotesPane.vue'

vi.mock('../src/components/NotesPanel.vue', () => ({
  default: {
    name: 'NotesPanel',
    props: ['previous', 'modelValue', 'prevLabel', 'currLabel', 'prevTitle', 'currTitle', 'saving'],
    emits: ['update:modelValue', 'save'],
    template: '<textarea @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
}))

describe('SidebarNotesPane', () => {
  it('forwards updates and save events', async () => {
    const wrapper = mount(SidebarNotesPane, {
      props: {
        previous: 'old note',
        modelValue: 'draft',
        prevLabel: 'Previous',
        currLabel: 'Current',
        prevTitle: 'Prev notes',
        currTitle: 'This period',
        saving: false,
      },
    })

    await wrapper.get('textarea').setValue('updated')
    expect(wrapper.emitted('update:modelValue')).toEqual([[ 'updated' ]])

    wrapper.getComponent({ name: 'NotesPanel' }).vm.$emit('save')
    expect(wrapper.emitted('save')).toBeTruthy()
  })
})
