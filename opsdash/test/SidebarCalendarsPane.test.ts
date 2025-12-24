import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import SidebarCalendarsPane from '../src/components/sidebar/SidebarCalendarsPane.vue'

vi.mock('@nextcloud/vue', () => ({
  NcButton: {
    name: 'NcButton',
    inheritAttrs: false,
    setup(_props: unknown, { slots, attrs }) {
      return () => h('button', { type: 'button', ...attrs }, slots.default ? slots.default() : [])
    },
  },
}))

describe('SidebarCalendarsPane', () => {
  const baseProps = {
    range: 'week',
    isLoading: false,
    categoryOptions: [],
    calendarTargetMessages: {},
    calendarCategoryId: () => '',
    getTarget: () => '',
    activityForecastMode: 'off',
    activityForecastOptions: [{ value: 'off', label: 'Off' }],
    balanceLookback: 4,
    balanceLookbackMessage: null,
  } as const

  it('emits toggle-calendar when calendar card is clicked', async () => {
    const wrapper = mount(SidebarCalendarsPane, {
      props: {
        ...baseProps,
        calendars: [{ id: 'cal-1', displayname: 'Calendar 1', color: '#123456' }],
        selected: [],
        getTarget: () => 0,
      },
    })

    await wrapper.get('.cal-card-head').trigger('click')
    expect(wrapper.emitted('toggle-calendar')).toEqual([[ 'cal-1' ]])
  })

  it('emits set-category when category dropdown changes', async () => {
    const wrapper = mount(SidebarCalendarsPane, {
      props: {
        ...baseProps,
        calendars: [{ id: 'cal-1', displayname: 'Calendar 1' }],
        selected: ['cal-1'],
        categoryOptions: [{ id: 'work', label: 'Work' }],
        getTarget: () => 0,
      },
    })

    const select = wrapper.get('.cal-fields select')
    await select.setValue('work')

    expect(wrapper.emitted('set-category')).toEqual([[{ id: 'cal-1', category: 'work' }]])
  })

  it('validates target input and emits event when value is valid', async () => {
    const wrapper = mount(SidebarCalendarsPane, {
      props: {
        ...baseProps,
        calendars: [{ id: 'cal-1', displayname: 'Calendar 1' }],
        selected: ['cal-1'],
        getTarget: () => 2,
      },
    })

    const input = wrapper.get('.target-input')
    await input.setValue('3')

    expect(wrapper.emitted('target-input')).toEqual([[{ id: 'cal-1', value: '3' }]])
  })

  it('toggles the shortcuts popover on button click', async () => {
    const wrapper = mount(SidebarCalendarsPane, {
      props: {
        ...baseProps,
        calendars: [],
        selected: [],
        getTarget: () => 0,
      },
    })

    const buttons = wrapper.findAll('button')
    await buttons[1].trigger('click')
    expect(wrapper.find('.shortcuts-pop').exists()).toBe(true)
    await buttons[1].trigger('click')
    expect(wrapper.find('.shortcuts-pop').exists()).toBe(false)
  })
})
