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

describe('Sidebar calendar projection + lookback', () => {
  it('clamps lookback weeks and emits warning message', async () => {
    const wrapper = mountSidebar()
    const pane = wrapper.get('#opsdash-sidebar-pane-calendars')
    const lookbackField = pane.findAll('label.field').find((label) =>
      label.text().includes('Trend lookback'),
    )
    expect(lookbackField).toBeTruthy()
    const lookbackInput = lookbackField!.get('input')

    await lookbackInput.setValue('-1')
    await wrapper.vm.$nextTick()

    expect(pane.text()).toContain('Adjusted to allowed value')
    const events = wrapper.emitted('update:targets-config') ?? []
    const latestConfig = events.at(-1)?.[0]
    expect(latestConfig?.balance?.trend?.lookbackWeeks).toBe(1)

    await lookbackInput.setValue('1')
    await wrapper.vm.$nextTick()

    const middleConfig = wrapper.emitted('update:targets-config')?.at(-1)?.[0]
    expect(middleConfig?.balance?.trend?.lookbackWeeks).toBe(1)

    await lookbackInput.setValue('4')
    await wrapper.vm.$nextTick()

    const updatedConfig = wrapper.emitted('update:targets-config')?.at(-1)?.[0]
    expect(updatedConfig?.balance?.trend?.lookbackWeeks).toBe(4)
  })

  it('caps lookback above max and warns the user', async () => {
    const wrapper = mountSidebar()
    const pane = wrapper.get('#opsdash-sidebar-pane-calendars')
    const lookbackField = pane.findAll('label.field').find((label) =>
      label.text().includes('Trend lookback'),
    )
    expect(lookbackField).toBeTruthy()
    const lookbackInput = lookbackField!.get('input')

    await lookbackInput.setValue('5')
    await wrapper.vm.$nextTick()

    expect(pane.text()).toContain('Adjusted to allowed value')
    const latestConfig = wrapper.emitted('update:targets-config')?.at(-1)?.[0]
    expect(latestConfig?.balance?.trend?.lookbackWeeks).toBe(4)
  })

  it('updates activity projection selection', async () => {
    const wrapper = mountSidebar()
    const pane = wrapper.get('#opsdash-sidebar-pane-calendars')
    const projectionField = pane.findAll('label.field').find((label) =>
      label.text().includes('Projection mode'),
    )
    expect(projectionField).toBeTruthy()
    const projectionSelect = projectionField!.get('select')

    await projectionSelect.setValue('calendar')
    await wrapper.vm.$nextTick()

    const latestConfig = wrapper.emitted('update:targets-config')?.at(-1)?.[0]
    expect(latestConfig?.activityCard?.forecastMode).toBe('calendar')
  })
})
