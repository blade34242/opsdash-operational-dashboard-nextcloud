import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SidebarActivityPane from '../src/components/sidebar/SidebarActivityPane.vue'

vi.mock('@nextcloud/vue', () => ({}))

describe('SidebarActivityPane', () => {
  const toggles: Array<[keyof ReturnType<typeof defaultActivitySettings>, string]> = [
    ['showWeekendShare', 'Weekend share'],
    ['showEveningShare', 'Evening share'],
  ]

  function defaultActivitySettings() {
    return {
      showWeekendShare: true,
      showEveningShare: true,
      showEarliestLatest: true,
      showOverlaps: true,
      showLongestSession: true,
      showLastDayOff: true,
      showHint: true,
    }
  }

  it('emits toggle-option when checkbox toggled', async () => {
    const wrapper = mount(SidebarActivityPane, {
      props: {
        activitySettings: defaultActivitySettings(),
        activityToggles: toggles,
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
        helpOpen: false,
      },
    })

    await wrapper.get('button.info-button').trigger('click')
    expect(wrapper.emitted('toggle-help')).toEqual([[]])
  })
})
