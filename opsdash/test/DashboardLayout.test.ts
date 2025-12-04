import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardLayout from '../src/components/layout/DashboardLayout.vue'
import { createDefaultTargetsConfig } from '../src/services/targets'

vi.mock('../src/services/widgetsRegistry', () => {
  const component = { template: '<div class="widget-stub"></div>' }
  return {
    mapWidgetToComponent: (def: any) => ({ component, props: {}, layout: def.layout, type: def.type }),
    widgetsRegistry: {
      targets_v2: {
        configurable: true,
        defaultOptions: {},
        buildProps: () => ({}),
      },
    },
  }
})

const stubPane = {
  template: `<div class="pane"><button class="set-total" @click="$emit('total-target-input', '12')">set</button></div>`,
  props: [
    'targets',
    'categoryOptions',
    'totalTargetMessage',
    'allDayHoursMessage',
    'categoryTargetMessages',
    'paceThresholdMessages',
    'forecastMomentumMessage',
    'forecastPaddingMessage',
    'canAddCategory',
    'colorPalette',
  ],
}

const stubMenu = {
  template: `<button class="open-adv" @click="$emit('open-advanced')">open</button>`,
  props: ['entry', 'options', 'open', 'showAdvanced'],
  emits: ['toggle', 'open-advanced', 'change'],
}

describe('DashboardLayout advanced targets overlay', () => {
  it('emits local targets config when saved', async () => {
    const targetsConfig = createDefaultTargetsConfig()
    const wrapper = mount(DashboardLayout, {
      props: {
        widgets: [
          {
            id: 'w1',
            type: 'targets_v2',
            layout: { width: 'full', height: 'm', order: 1 },
            options: {},
            version: 1,
          },
        ],
        context: { targetsConfig },
        editable: true,
      },
      global: {
        stubs: {
          SidebarTargetsPane: stubPane,
          WidgetOptionsMenu: stubMenu,
        },
        mocks: {
          // mapWidgetToComponent uses the registry entry; fall back to default mapping
        },
      },
    })

    await wrapper.find('.open-adv').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.set-total').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.ghost.primary').trigger('click')

    const edits = wrapper.emitted('edit:options') || []
    const localCfgPayload = edits.find((args) => args[1] === 'localConfig')
    const flagPayload = edits.find((args) => args[1] === 'useLocalConfig')

    expect(localCfgPayload?.[0]).toBe('w1')
    expect((localCfgPayload?.[2] as any)?.totalHours).toBe(12)
    expect(flagPayload).toEqual(['w1', 'useLocalConfig', true])
  })

  it('can reset to global and open onboarding from overlay actions', async () => {
    const targetsConfig = createDefaultTargetsConfig()
    const wrapper = mount(DashboardLayout, {
      props: {
        widgets: [
          {
            id: 'w1',
            type: 'targets_v2',
            layout: { width: 'full', height: 'm', order: 1 },
            options: { useLocalConfig: true, localConfig: targetsConfig },
            version: 1,
          },
        ],
        context: { targetsConfig },
        editable: true,
      },
      global: {
        stubs: {
          SidebarTargetsPane: stubPane,
          WidgetOptionsMenu: stubMenu,
        },
      },
    })

    await wrapper.find('.open-adv').trigger('click')
    await wrapper.vm.$nextTick()
    const buttons = wrapper.findAll('button')
    const onboardingBtn = buttons.find((btn) => btn.text().includes('Edit via onboarding'))
    await onboardingBtn?.trigger('click')
    expect(wrapper.emitted('open:onboarding')?.[0]).toEqual(['categories'])

    await wrapper.find('.open-adv').trigger('click')
    await wrapper.vm.$nextTick()
    const buttonsAfter = wrapper.findAll('button')
    const resetBtn = buttonsAfter.find((btn) => btn.text().includes('Use global targets'))
    await resetBtn?.trigger('click')

    const edits = wrapper.emitted('edit:options') || []
    const resetFlag = edits.find((args) => args[1] === 'useLocalConfig')
    const resetConfig = edits.find((args) => args[1] === 'localConfig')
    expect(resetFlag).toEqual(['w1', 'useLocalConfig', false])
    expect(resetConfig).toEqual(['w1', 'localConfig', null])
  })
})
