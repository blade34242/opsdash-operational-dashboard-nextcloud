import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import SidebarProfilesPane from '../src/components/sidebar/SidebarProfilesPane.vue'

vi.mock('@nextcloud/vue', () => {
  const buttonStub = {
    name: 'NcButton',
    inheritAttrs: false,
    setup(_props: unknown, { slots, attrs }) {
      return () => h('button', { type: 'button', ...attrs }, slots.default ? slots.default() : [])
    },
  }

  return { NcButton: buttonStub }
})

describe('SidebarProfilesPane', () => {
  it('emits save/load/delete actions', async () => {
    const originalConfirm = globalThis.confirm
    globalThis.confirm = () => true

    const wrapper = mount(SidebarProfilesPane, {
      props: {
        presets: [{ name: 'Focus', selectedCount: 1, calendarCount: 2 }],
        isLoading: false,
        isSaving: false,
        isApplying: false,
        warnings: [],
      },
    })

    await wrapper.get('input#preset-name').setValue('My profile')
    await wrapper.get('button.preset-save').trigger('click')
    expect(wrapper.emitted('save')).toEqual([[ 'My profile' ]])

    const buttons = wrapper.findAll('button')
    const loadButton = buttons.find((button) => button.text().trim() === 'Load')
    const deleteButton = buttons.find((button) => button.text().trim() === 'Delete')
    expect(loadButton).toBeTruthy()
    expect(deleteButton).toBeTruthy()

    await loadButton!.trigger('click')
    expect(wrapper.emitted('load')).toEqual([[ 'Focus' ]])

    await deleteButton!.trigger('click')
    expect(wrapper.emitted('delete')).toEqual([[ 'Focus' ]])

    globalThis.confirm = originalConfirm
  })

  it('shows warnings and can clear them', async () => {
    const wrapper = mount(SidebarProfilesPane, {
      props: {
        presets: [],
        isLoading: false,
        isSaving: false,
        isApplying: false,
        warnings: ['Something went wrong'],
      },
    })

    expect(wrapper.text()).toContain('Something went wrong')
    await wrapper.get('button.preset-clear').trigger('click')
    expect(wrapper.emitted('clear-warnings')).toEqual([[]])
  })
})
