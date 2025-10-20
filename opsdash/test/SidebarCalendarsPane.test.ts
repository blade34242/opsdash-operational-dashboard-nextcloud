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
  it('emits select-all when action buttons are clicked', async () => {
    const wrapper = mount(SidebarCalendarsPane, {
      props: {
        calendars: [],
        selected: [],
        range: 'week',
        isLoading: false,
        categoryOptions: [],
        calendarTargetMessages: {},
        calendarCategoryId: () => '',
        getTarget: () => '',
      },
    })

    await wrapper.get('button:nth-of-type(1)').trigger('click')
    await wrapper.get('button:nth-of-type(2)').trigger('click')

    const events = wrapper.emitted('select-all') ?? []
    expect(events[0]).toEqual([true])
    expect(events[1]).toEqual([false])
  })

  it('emits toggle-calendar when calendar card is clicked', async () => {
    const wrapper = mount(SidebarCalendarsPane, {
      props: {
        calendars: [{ id: 'cal-1', displayname: 'Calendar 1', color: '#123456' }],
        selected: [],
        range: 'week',
        isLoading: false,
        categoryOptions: [],
        calendarTargetMessages: {},
        calendarCategoryId: () => '',
        getTarget: () => 0,
      },
    })

    await wrapper.get('.cal-card-head').trigger('click')
    expect(wrapper.emitted('toggle-calendar')).toEqual([[ 'cal-1' ]])
  })

  it('emits set-category when category dropdown changes', async () => {
    const wrapper = mount(SidebarCalendarsPane, {
      props: {
        calendars: [{ id: 'cal-1', displayname: 'Calendar 1' }],
        selected: ['cal-1'],
        range: 'week',
        isLoading: false,
        categoryOptions: [{ id: 'work', label: 'Work' }],
        calendarTargetMessages: {},
        calendarCategoryId: () => '',
        getTarget: () => 0,
      },
    })

    const select = wrapper.get('select')
    await select.setValue('work')

    expect(wrapper.emitted('set-category')).toEqual([[{ id: 'cal-1', category: 'work' }]])
  })

  it('validates target input and emits event when value is valid', async () => {
    const wrapper = mount(SidebarCalendarsPane, {
      props: {
        calendars: [{ id: 'cal-1', displayname: 'Calendar 1' }],
        selected: ['cal-1'],
        range: 'week',
        isLoading: false,
        categoryOptions: [],
        calendarTargetMessages: {},
        calendarCategoryId: () => '',
        getTarget: () => 2,
      },
    })

    const input = wrapper.get('input[type="number"]')
    await input.setValue('3')

    expect(wrapper.emitted('target-input')).toEqual([[{ id: 'cal-1', value: '3' }]])
  })
})
