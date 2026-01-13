import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import Sidebar from '../src/components/sidebar/Sidebar.vue'

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

describe('Sidebar onboarding links', () => {
  it('emits rerun onboarding when clicking the main button', async () => {
    const wrapper = mountSidebar()
    await wrapper.get('button.rerun-btn').trigger('click')
    expect(wrapper.emitted('rerun-onboarding')).toEqual([[]])
  })

  it('emits rerun onboarding with a step', async () => {
    const wrapper = mountSidebar()
    const calendars = wrapper.findAll('button.link').find((btn) => btn.text() === 'Calendars')
    expect(calendars).toBeTruthy()
    await calendars!.trigger('click')
    expect(wrapper.emitted('rerun-onboarding')).toEqual([[ 'calendars' ]])
  })
})
