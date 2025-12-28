import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import Sidebar from '../src/components/Sidebar.vue'

vi.mock('@nextcloud/vue', () => {
  const buttonStub = {
    name: 'NcButton',
    inheritAttrs: false,
    setup(_props: unknown, { slots, attrs }) {
      return () => h('button', { type: 'button', ...attrs }, slots.default ? slots.default() : [])
    },
  }

  const navigationStub = {
    name: 'NcAppNavigation',
    setup(_props: unknown, { slots }) {
      return () => h('nav', {}, slots.default ? slots.default() : [])
    },
  }

  const checkboxStub = {
    name: 'NcCheckboxRadioSwitch',
    props: {
      checked: { type: Boolean, default: false },
    },
    emits: ['update:checked'],
    setup(props, { slots, emit, attrs }) {
      const toggle = () => {
        emit('update:checked', !props.checked)
      }
      return () =>
        h(
          'label',
          {
            ...attrs,
            onClick: (event: MouseEvent) => {
              event.preventDefault()
              toggle()
            },
          },
          slots.default ? slots.default() : [],
        )
    },
  }

  return {
    NcAppNavigation: navigationStub,
    NcButton: buttonStub,
    NcCheckboxRadioSwitch: checkboxStub,
  }
})

function mountSidebar() {
  return mount(Sidebar, {
    props: {
      isLoading: false,
      range: 'week',
      offset: 0,
      from: '2025-03-03',
      to: '2025-03-09',
      navToggleLabel: 'Toggle sidebar',
      navToggleIcon: '⟨',
      presets: [],
      presetsLoading: false,
      presetSaving: false,
      presetApplying: false,
      presetWarnings: [],
    },
  })
}

describe('Sidebar rangebar', () => {
  it('emits refresh and navigation events', async () => {
    const wrapper = mountSidebar()
    await wrapper.get('button.sidebar-action-btn').trigger('click')
    expect(wrapper.emitted('load')).toEqual([[]])

    const navButtons = wrapper.findAll('button.nav-btn')
    await navButtons[0].trigger('click')
    await navButtons[1].trigger('click')

    expect(wrapper.emitted('update:offset')).toEqual([[ -1 ], [ 1 ]])
  })

  it('emits range changes', async () => {
    const wrapper = mountSidebar()
    const monthToggle = wrapper.findAll('label').find((label) => label.text() === 'Month')
    expect(monthToggle).toBeTruthy()
    await monthToggle!.trigger('click')
    expect(wrapper.emitted('update:range')).toEqual([[ 'month' ]])
  })

  it('emits toggle nav', async () => {
    const wrapper = mountSidebar()
    await wrapper.get('button.sidebar-toggle-btn').trigger('click')
    expect(wrapper.emitted('toggle-nav')).toEqual([[]])
  })
})
