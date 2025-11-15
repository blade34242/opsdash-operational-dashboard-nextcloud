import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import Sidebar from '../src/components/Sidebar.vue'
import { createDefaultTargetsConfig } from '../src/services/targets'
import { createDefaultReportingConfig, createDefaultDeckSettings } from '../src/services/reporting'

vi.mock('@nextcloud/vue', () => {
  const buttonStub = {
    name: 'NcButton',
    inheritAttrs: false,
    setup(_props: unknown, { slots, attrs }) {
      return () => h('button', { type: 'button', ...attrs }, slots.default ? slots.default() : [])
    },
  }

  const navigationStub = {
    name: 'NcAppNavigation',
    setup(_props: unknown, { slots }) {
      return () => h('nav', {}, slots.default ? slots.default() : [])
    },
  }

  const checkboxStub = {
    name: 'NcCheckboxRadioSwitch',
    props: {
      checked: { type: Boolean, default: false },
    },
    emits: ['update:checked'],
    setup(props, { slots, emit, attrs }) {
      const toggle = () => {
        emit('update:checked', !props.checked)
      }
      return () =>
        h(
          'label',
          {
            ...attrs,
            onClick: (event: MouseEvent) => {
              event.preventDefault()
              toggle()
            },
          },
          slots.default ? slots.default() : [],
        )
    },
  }

  return {
    NcAppNavigation: navigationStub,
    NcButton: buttonStub,
    NcCheckboxRadioSwitch: checkboxStub,
  }
})

vi.mock('../src/components/NotesPanel.vue', () => ({
  default: { name: 'NotesPanel', template: '<div />' },
}))

function mountSidebar() {
  const targetsConfig = createDefaultTargetsConfig()
  const reportingConfig = createDefaultReportingConfig()
  const deckSettings = createDefaultDeckSettings()
  return mount(Sidebar, {
    props: {
      calendars: [],
      selected: [],
      groupsById: {},
      isLoading: false,
      range: 'week',
      offset: 0,
      from: '2025-03-03',
      to: '2025-03-09',
      targetsWeek: {},
      targetsMonth: {},
      notesPrev: '',
      notesCurrDraft: '',
      notesLabelPrev: '',
      notesLabelCurr: '',
      notesLabelPrevTitle: '',
      notesLabelCurrTitle: '',
      isSavingNote: false,
      targetsConfig,
      activeDayMode: 'active',
      navToggleLabel: 'Toggle sidebar',
      navToggleIcon: '⟨',
      presets: [],
      presetsLoading: false,
      presetSaving: false,
      presetApplying: false,
      presetWarnings: [],
      themePreference: 'auto',
      effectiveTheme: 'light',
      systemTheme: 'light',
      reportingConfig,
      deckSettings,
      reportingSaving: false,
    },
  })
}

describe('Sidebar tabs', () => {
  it('defaults to the calendars tab', () => {
    const wrapper = mountSidebar()
    expect(wrapper.get('#opsdash-sidebar-tab-calendars').classes()).toContain('active')
    expect(wrapper.get('#opsdash-sidebar-pane-calendars').exists()).toBe(true)
  })

  it('switches to summary tab when clicked', async () => {
    const wrapper = mountSidebar()
    await wrapper.get('#opsdash-sidebar-tab-summary').trigger('click')

    expect(wrapper.get('#opsdash-sidebar-tab-summary').classes()).toContain('active')
    expect(wrapper.find('#opsdash-sidebar-pane-calendars').exists()).toBe(false)
    expect(wrapper.get('#opsdash-sidebar-pane-summary').exists()).toBe(true)
  })

  it('switches back to targets tab', async () => {
    const wrapper = mountSidebar()
    await wrapper.get('#opsdash-sidebar-tab-summary').trigger('click')
    await wrapper.get('#opsdash-sidebar-tab-targets').trigger('click')

    expect(wrapper.get('#opsdash-sidebar-tab-targets').classes()).toContain('active')
    expect(wrapper.get('#opsdash-sidebar-pane-targets').exists()).toBe(true)
    expect(wrapper.find('#opsdash-sidebar-pane-summary').exists()).toBe(false)
  })
})
