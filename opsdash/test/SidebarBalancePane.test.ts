import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SidebarBalancePane from '../src/components/sidebar/SidebarBalancePane.vue'
import { createDefaultBalanceConfig } from '../src/services/targets'

vi.mock('@nextcloud/vue', () => ({}))

describe('SidebarBalancePane', () => {
  const baseBalance = createDefaultBalanceConfig()

  function mountPane(overrides: Record<string, any> = {}) {
    return mount(SidebarBalancePane, {
      props: {
        balanceSettings: baseBalance,
        balanceThresholdMessages: { noticeMaxShare: null, warnMaxShare: null, warnIndex: null },
        balanceLookbackMessage: null,
        balanceUiPrecisionMessages: { roundPercent: null, roundRatio: null },
        roundingOptions: [0, 1, 2],
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

    expect(wrapper.emitted('set-threshold')).toEqual([[{ key: 'noticeMaxShare', value: '0.8' }]])
  })

  it('emits toggle-help for sections', async () => {
    const wrapper = mountPane()
    const buttons = wrapper.findAll('button.info-button')
    await buttons[0].trigger('click')
    expect(wrapper.emitted('toggle-help')).toEqual([[ 'all' ]])
  })

  it('emits set-ui-toggle when toggles change', async () => {
    const wrapper = mountPane({ helpDisplay: true })
    const toggles = wrapper.findAll('input[type="checkbox"]')
    await toggles[0].setValue(false)

    expect(wrapper.emitted('set-ui-toggle')).toEqual([[{ key: 'showInsights', value: false }]])
  })
})
