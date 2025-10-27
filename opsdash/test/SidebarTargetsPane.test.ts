import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import SidebarTargetsPane from '../src/components/sidebar/SidebarTargetsPane.vue'
import { createDefaultTargetsConfig } from '../src/services/targets'

vi.mock('@nextcloud/vue', () => ({
  NcButton: {
    name: 'NcButton',
    inheritAttrs: false,
    setup(_props: unknown, { slots, attrs }) {
      return () => h('button', { type: 'button', ...attrs }, slots.default ? slots.default() : [])
    },
  },
}))

describe('SidebarTargetsPane', () => {
  const baseConfig = createDefaultTargetsConfig()

  it('emits total-target-input when value changes', async () => {
    const wrapper = mount(SidebarTargetsPane, {
      props: {
        targets: baseConfig,
        categoryOptions: [],
        totalTargetMessage: null,
        allDayHoursMessage: null,
        categoryTargetMessages: {},
        paceThresholdMessages: { onTrack: null, atRisk: null },
        forecastMomentumMessage: null,
        forecastPaddingMessage: null,
        canAddCategory: true,
      },
    })

    const totalField = wrapper.findAll('.field').find((field) => field.find('span.label')?.text() === 'Total target (h)')
    expect(totalField).toBeTruthy()
    await totalField!.find('input').setValue('60')
    expect(wrapper.emitted('total-target-input')).toEqual([[ '60' ]])
  })

  it('emits set-all-day-hours when value changes', async () => {
    const wrapper = mount(SidebarTargetsPane, {
      props: {
        targets: baseConfig,
        categoryOptions: [],
        totalTargetMessage: null,
        allDayHoursMessage: null,
        categoryTargetMessages: {},
        paceThresholdMessages: { onTrack: null, atRisk: null },
        forecastMomentumMessage: null,
        forecastPaddingMessage: null,
        canAddCategory: true,
      },
    })

    const allDayField = wrapper.findAll('.field').find((field) => field.find('span.label')?.text() === 'All-day event (h per day)')
    expect(allDayField).toBeTruthy()
    await allDayField!.find('input').setValue('6')

    expect(wrapper.emitted('set-all-day-hours')).toEqual([[ '6' ]])
  })

  it('emits set-category-target when category target is edited', async () => {
    const wrapper = mount(SidebarTargetsPane, {
      props: {
        targets: baseConfig,
        categoryOptions: [{ id: 'work', label: 'Work', targetHours: 10, includeWeekend: false }],
        totalTargetMessage: null,
        allDayHoursMessage: null,
        categoryTargetMessages: {},
        paceThresholdMessages: { onTrack: null, atRisk: null },
        forecastMomentumMessage: null,
        forecastPaddingMessage: null,
        canAddCategory: true,
      },
    })

    const catInput = wrapper.find('.cat-fields input[type="number"]')
    await catInput.setValue('12')

    expect(wrapper.emitted('set-category-target')).toEqual([[{ id: 'work', value: '12' }]])
  })

  it('disables remove button when only one category', () => {
    const wrapper = mount(SidebarTargetsPane, {
      props: {
        targets: baseConfig,
        categoryOptions: [{ id: 'work', label: 'Work', targetHours: 10, includeWeekend: false }],
        totalTargetMessage: null,
        allDayHoursMessage: null,
        categoryTargetMessages: {},
        paceThresholdMessages: { onTrack: null, atRisk: null },
        forecastMomentumMessage: null,
        forecastPaddingMessage: null,
        canAddCategory: false,
      },
    })

    const removeButton = wrapper.get('button.remove-cat')
    expect(removeButton.attributes('disabled')).toBeDefined()
  })
})
