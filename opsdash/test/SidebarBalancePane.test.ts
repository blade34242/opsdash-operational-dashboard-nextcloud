import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SidebarBalancePane from '../src/components/sidebar/SidebarBalancePane.vue'
import { createDefaultBalanceConfig, createDefaultActivityCardConfig } from '../src/services/targets'

vi.mock('@nextcloud/vue', () => ({}))

describe('SidebarBalancePane', () => {
  const baseBalance = createDefaultBalanceConfig()
  const baseActivity = createDefaultActivityCardConfig()
  const activityToggles: Array<[keyof typeof baseActivity, string]> = [
    ['showWeekendShare', 'Weekend share'],
    ['showDayOffTrend', 'Days off trend'],
  ]
  const forecastOptions = [
    { value: 'off', label: 'Off' },
    { value: 'total', label: 'Total' },
  ]

  function mountPane(overrides: Record<string, any> = {}) {
    return mount(SidebarBalancePane, {
      props: {
        balanceSettings: baseBalance,
        activitySettings: baseActivity,
        activityToggles,
        activityForecastMode: 'total',
        activityForecastOptions: forecastOptions,
        balanceThresholdMessages: { noticeAbove: null, noticeBelow: null, warnAbove: null, warnBelow: null, warnIndex: null },
        balanceLookbackMessage: null,
        helpActivity: false,
        helpThresholds: false,
        helpTrend: false,
        helpDisplay: false,
        ...overrides,
      },
    })
  }

  it('emits set-threshold when input changes', async () => {
    const wrapper = mountPane()
    const inputs = wrapper.findAll('input[type="number"]')
    await inputs[0].setValue('0.8')

    expect(wrapper.emitted('set-threshold')).toEqual([[{ key: 'noticeAbove', value: '0.8' }]])
  })

  it('emits toggle-help for sections', async () => {
    const wrapper = mountPane()
    const buttons = wrapper.findAll('button.info-button')
    await buttons[0].trigger('click')
    expect(wrapper.emitted('toggle-help')).toEqual([['activity']])
  })

  it('emits set-ui-toggle when toggles change', async () => {
    const wrapper = mountPane({ helpDisplay: true })
    const input = wrapper.find('.single-toggle input[type="checkbox"]')
    await input.setValue(true)
    await input.setValue(false)

    const events = wrapper.emitted('set-ui-toggle') || []
    expect(events[events.length - 1]).toEqual([{ key: 'showNotes', value: false }])
  })
})
