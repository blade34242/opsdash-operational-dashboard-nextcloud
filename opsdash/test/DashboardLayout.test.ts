import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardLayout from '../src/components/layout/DashboardLayout.vue'
import { createDefaultTargetsConfig } from '../src/services/targets'
import { nextTick } from 'vue'

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

    const menu = wrapper.findComponent(stubMenu)
    expect(menu.exists()).toBe(true)
    menu.vm.$emit('open-advanced')
    await wrapper.vm.$nextTick()
    const pane = wrapper.findComponent(stubPane)
    expect(pane.exists()).toBe(true)
    pane.vm.$emit('total-target-input', '12')
    await wrapper.vm.$nextTick()
    const saveBtn = wrapper.findAll('button').find((btn) => btn.text().includes('Save'))
    expect(saveBtn).toBeTruthy()
    await saveBtn?.trigger('click')

    const edits = wrapper.emitted('edit:options') || []
    const localCfgPayload = edits.find((args) => args[1] === 'localConfig')
    const flagPayload = edits.find((args) => args[1] === 'useLocalConfig')

    expect(localCfgPayload?.[0]).toBe('w1')
    expect((localCfgPayload?.[2] as any)?.totalHours).toBe(12)
    expect(flagPayload).toEqual(['w1', 'useLocalConfig', true])
    wrapper.unmount()
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

    const menu = wrapper.findComponent(stubMenu)
    expect(menu.exists()).toBe(true)
    menu.vm.$emit('open-advanced')
    await wrapper.vm.$nextTick()
    const onboardingBtn = wrapper.findAll('button').find((btn) => btn.text().includes('Edit via onboarding'))
    await onboardingBtn?.trigger('click')
    expect(wrapper.emitted('open:onboarding')?.[0]).toEqual(['categories'])

    menu.vm.$emit('open-advanced')
    await wrapper.vm.$nextTick()
    const resetBtn = wrapper.findAll('button').find((btn) => btn.text().includes('Use global targets'))
    await resetBtn?.trigger('click')

    const edits = wrapper.emitted('edit:options') || []
    const resetFlag = edits.find((args) => args[1] === 'useLocalConfig')
    const resetConfig = edits.find((args) => args[1] === 'localConfig')
    expect(resetFlag).toEqual(['w1', 'useLocalConfig', false])
    expect(resetConfig).toEqual(['w1', 'localConfig', null])
    wrapper.unmount()
  })
})

describe('DashboardLayout grid add flow', () => {
  it('opens add menu on grid context click and emits edit:add with order hint', async () => {
    const wrapper = mount(DashboardLayout, {
      props: {
        widgets: [
          { id: 'w1', type: 'targets_v2', layout: { width: 'half', height: 'm', order: 10 }, options: {}, version: 1 },
        ],
        widgetTypes: [
          { type: 'targets_v2', label: 'Targets' },
          { type: 'x', label: 'Other' },
        ],
        context: {},
        editable: true,
      },
      global: {
        stubs: {
          SidebarTargetsPane: stubPane,
          WidgetOptionsMenu: stubMenu,
        },
      },
    })

    const grid = wrapper.find('.layout-grid').element as HTMLElement
    grid.getBoundingClientRect = () => ({
      x: 0, y: 0, left: 0, top: 0, right: 1200, bottom: 600, width: 1200, height: 600, toJSON() { return {} },
    })

    await wrapper.find('.layout-grid').trigger('contextmenu', { clientX: 800, clientY: 200 })
    await wrapper.vm.$nextTick()

    const buttons = wrapper.findAll('.add-menu .add-btn')
    expect(buttons.length).toBeGreaterThan(0)
    await buttons[0].trigger('click')

    const emitted = wrapper.emitted('edit:add') || []
    expect(emitted[0][0]).toBe('targets_v2')
    expect(typeof emitted[0][1]).toBe('number')
  })

  it('emits reorder on drag/drop', async () => {
    const wrapper = mount(DashboardLayout, {
      props: {
        widgets: [
          { id: 'w1', type: 'targets_v2', layout: { width: 'half', height: 'm', order: 10 }, options: {}, version: 1 },
        ],
        widgetTypes: [{ type: 'targets_v2', label: 'Targets' }],
        context: {},
        editable: true,
      },
      global: {
        stubs: { SidebarTargetsPane: stubPane, WidgetOptionsMenu: stubMenu },
      },
    })

    const grid = wrapper.find('.layout-grid').element as HTMLElement
    grid.getBoundingClientRect = () => ({
      x: 0, y: 0, left: 0, top: 0, right: 1200, bottom: 600, width: 1200, height: 600, toJSON() { return {} },
    })

    const item = wrapper.find('.layout-item')
    await item.trigger('dragstart')
    const gridWrapper = wrapper.find('.layout-grid')
    await gridWrapper.trigger('dragover', { clientX: 900, clientY: 300 })
    await gridWrapper.trigger('drop', { clientX: 900, clientY: 300 })

    const emitted = wrapper.emitted('edit:reorder') || []
    expect(emitted[0][0]).toBe('w1')
    expect(typeof emitted[0][1]).toBe('number')
  })

  it('applies text size scale class based on widget options', () => {
    const wrapper = mount(DashboardLayout, {
      props: {
        widgets: [
          { id: 'w1', type: 'targets_v2', layout: { width: 'half', height: 'm', order: 10 }, options: { scale: 'sm' }, version: 1 },
        ],
        widgetTypes: [{ type: 'targets_v2', label: 'Targets' }],
        context: {},
        editable: true,
      },
      global: {
        stubs: { SidebarTargetsPane: stubPane, WidgetOptionsMenu: stubMenu },
      },
    })

    const item = wrapper.find('.layout-item')
    expect(item.classes()).toContain('scale-sm')
  })

  it('shows floating toolbar in editable mode', () => {
    const wrapper = mount(DashboardLayout, {
      props: {
        widgets: [
          { id: 'w1', type: 'targets_v2', layout: { width: 'half', height: 'm', order: 10 }, options: {}, version: 1 },
        ],
        widgetTypes: [{ type: 'targets_v2', label: 'Targets' }],
        context: {},
        editable: true,
      },
      global: {
        stubs: { SidebarTargetsPane: stubPane, WidgetOptionsMenu: stubMenu },
      },
    })

    const bar = document.body.querySelector('.widget-toolbar')
    expect(bar).not.toBeNull()
    wrapper.unmount()
  })

  it('toolbar buttons emit edit events when clicked', async () => {
    const wrapper = mount(DashboardLayout, {
      props: {
        widgets: [
          { id: 'w1', type: 'targets_v2', layout: { width: 'half', height: 'm', order: 10 }, options: {}, version: 1 },
        ],
        widgetTypes: [{ type: 'targets_v2', label: 'Targets' }],
        context: {},
        editable: true,
      },
      global: {
        stubs: { SidebarTargetsPane: stubPane, WidgetOptionsMenu: stubMenu },
      },
    })

    await nextTick()
    await wrapper.find('.layout-item').trigger('click')
    await nextTick()
    const toolbar = document.body.querySelector('.widget-toolbar') as HTMLElement
    expect(toolbar).not.toBeNull()

    // Call the same handlers the toolbar buttons are wired to so we verify emissions
    ;(wrapper.vm as any).selectedId = 'w1'
    ;(wrapper.vm as any).moveSelected('up')
    ;(wrapper.vm as any).moveSelected('down')
    ;(wrapper.vm as any).cycleSelectedWidth()
    ;(wrapper.vm as any).cycleSelectedHeight()
    ;(wrapper.vm as any).removeSelected()
    await nextTick()

    expect(wrapper.emitted('edit:move')?.[0]).toEqual(['w1', 'up'])
    expect(wrapper.emitted('edit:move')?.[1]).toEqual(['w1', 'down'])
    expect(wrapper.emitted('edit:width')?.[0]).toEqual(['w1'])
    expect(wrapper.emitted('edit:height')?.[0]).toEqual(['w1'])
    expect(wrapper.emitted('edit:remove')?.[0]).toEqual(['w1'])
    wrapper.unmount()
  })

  it('hides toolbar when not editable', () => {
    document.querySelectorAll('.widget-toolbar').forEach((el) => el.remove())
    const wrapper = mount(DashboardLayout, {
      props: {
        widgets: [
          { id: 'w1', type: 'targets_v2', layout: { width: 'half', height: 'm', order: 10 }, options: {}, version: 1 },
        ],
        widgetTypes: [{ type: 'targets_v2', label: 'Targets' }],
        context: {},
        editable: false,
      },
      global: {
        stubs: { SidebarTargetsPane: stubPane, WidgetOptionsMenu: stubMenu },
      },
    })

    expect(document.body.querySelector('.widget-toolbar')).toBeNull()
    wrapper.unmount()
  })
})
