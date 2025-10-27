import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SidebarActivityPane from '../src/components/sidebar/SidebarActivityPane.vue'
import { createDefaultActivityCardConfig, type ActivityCardConfig } from '../src/services/targets'

vi.mock('@nextcloud/vue', () => ({}))

describe('SidebarActivityPane', () => {
  const toggles: Array<[keyof ActivityCardConfig, string]> = [
    ['showWeekendShare', 'Weekend share'],
    ['showEveningShare', 'Evening share'],
  ]

  const forecastOptions = [
    { value: 'off', label: 'Off' },
    { value: 'total', label: 'Total' },
  ] as const

  function defaultActivitySettings(): ActivityCardConfig {
    return createDefaultActivityCardConfig()
  }

  it('emits toggle-option when checkbox toggled', async () => {
    const wrapper = mount(SidebarActivityPane, {
      props: {
        activitySettings: defaultActivitySettings(),
        activityToggles: toggles,
        forecastMode: 'total',
        forecastOptions,
        helpOpen: false,
      },
    })

    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.setValue(false)

    expect(wrapper.emitted('toggle-option')).toEqual([[{ key: 'showWeekendShare', value: false }]])
  })

  it('emits toggle-help when help button clicked', async () => {
    const wrapper = mount(SidebarActivityPane, {
      props: {
        activitySettings: defaultActivitySettings(),
        activityToggles: toggles,
        forecastMode: 'total',
        forecastOptions,
        helpOpen: false,
      },
    })

    await wrapper.get('button.info-button').trigger('click')
    expect(wrapper.emitted('toggle-help')).toEqual([[]])
  })
})
