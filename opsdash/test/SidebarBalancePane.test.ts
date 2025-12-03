import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SidebarBalancePane from '../src/components/sidebar/SidebarBalancePane.vue'
import { createDefaultBalanceConfig } from '../src/services/targets'

vi.mock('@nextcloud/vue', () => ({}))

describe('SidebarBalancePane', () => {
  const baseBalance = createDefaultBalanceConfig()
  const forecastOptions = [
    { value: 'off', label: 'Off' },
    { value: 'total', label: 'Total' },
  ]

  function mountPane(overrides: Record<string, any> = {}) {
    return mount(SidebarBalancePane, {
      props: {
        balanceSettings: baseBalance,
        activityForecastMode: 'total',
        activityForecastOptions: forecastOptions,
        balanceThresholdMessages: { noticeAbove: null, noticeBelow: null, warnAbove: null, warnBelow: null, warnIndex: null },
        balanceLookbackMessage: null,
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
    expect(buttons[0].attributes('aria-label')?.toLowerCase()).toContain('help')
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')
    expect(wrapper.emitted('toggle-help')).toEqual([
      ['thresholds'],
      ['trend'],
    ])
  })

  it('emits set-lookback when lookback input changes', async () => {
    const wrapper = mountPane({ helpTrend: true })
    const inputs = wrapper.findAll('input[type="number"]')
    const lookbackInput = inputs[5]

    await lookbackInput.setValue('3')

    expect(wrapper.emitted('set-lookback')).toEqual([['3']])
  })

  it('emits set-index-basis and uses default options', async () => {
    const wrapper = mountPane()
    const selects = wrapper.findAll('select')
    const basisSelect = selects[1]

    await basisSelect.setValue('both')

    expect(wrapper.emitted('set-index-basis')).toEqual([['both']])
    const options = basisSelect.findAll('option').map((o) => o.text())
    expect(options).toContain('Disabled')
    expect(options).toContain('Total categories')
    expect(options).toContain('Total calendars')
    expect(options).toContain('Categories + calendars')
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
