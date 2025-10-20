import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import SidebarSummaryPane from '../src/components/sidebar/SidebarSummaryPane.vue'

vi.mock('@nextcloud/vue', () => ({
  NcCheckboxRadioSwitch: {
    name: 'NcCheckboxRadioSwitch',
    props: { checked: { type: Boolean, default: false } },
    emits: ['update:checked'],
    setup(props, { emit, slots, attrs }) {
      return () =>
        h(
          'button',
          {
            type: 'button',
            ...attrs,
            onClick: () => emit('update:checked', !props.checked),
          },
          slots.default ? slots.default() : [],
        )
    },
  },
}))

describe('SidebarSummaryPane', () => {
  const summaryOptions = {
    showTotal: true,
    showAverage: false,
    showMedian: true,
    showBusiest: false,
    showWorkday: true,
    showWeekend: true,
    showWeekendShare: true,
    showCalendarSummary: true,
    showTopCategory: false,
    showBalance: true,
  }

  it('emits update:activeMode when toggles clicked', async () => {
    const wrapper = mount(SidebarSummaryPane, {
      props: {
        summaryOptions,
        activeDayMode: 'active',
      },
    })

    const buttons = wrapper.findAll('button')
    await buttons[1].trigger('click')

    expect(wrapper.emitted('update:activeMode')).toEqual([[ 'all' ]])
  })

  it('emits toggle-option when checkbox changes', async () => {
    const wrapper = mount(SidebarSummaryPane, {
      props: {
        summaryOptions,
        activeDayMode: 'active',
      },
    })

    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.setValue(false)

    expect(wrapper.emitted('toggle-option')).toEqual([[{ key: 'showTotal', value: false }]])
  })
})
