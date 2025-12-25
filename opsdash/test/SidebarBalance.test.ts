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

describe('Sidebar calendar pane', () => {
  it('no longer exposes projection or trend lookback controls', () => {
    const wrapper = mountSidebar()
    const pane = wrapper.get('#opsdash-sidebar-pane-calendars')
    const labels = pane.findAll('label.field').map((label) => label.text())
    expect(labels.some((label) => label.includes('Projection mode'))).toBe(false)
    expect(labels.some((label) => label.includes('Trend lookback'))).toBe(false)
  })
})
