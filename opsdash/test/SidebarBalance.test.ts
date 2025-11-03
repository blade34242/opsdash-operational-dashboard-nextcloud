import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import Sidebar from '../src/components/Sidebar.vue'
import { createDefaultTargetsConfig } from '../src/services/targets'

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
    },
  })
}

describe('Sidebar balance controls', () => {
  it('shows error message for invalid threshold input and keeps config unchanged', async () => {
    const wrapper = mountSidebar()
    await wrapper.get('#opsdash-sidebar-tab-balance').trigger('click')
    const pane = wrapper.get('#opsdash-sidebar-pane-balance')
    const inputs = pane.findAll('input[type="number"]')
    const noticeInput = inputs[0]

    await noticeInput.setValue('') // invalid -> error
    await wrapper.vm.$nextTick()

    expect(pane.text()).toContain('Enter a number')
    expect(wrapper.emitted('update:targets-config')).toBeUndefined()

    await noticeInput.setValue('0.7')
    await wrapper.vm.$nextTick()

    const events = wrapper.emitted('update:targets-config') ?? []
    expect(events.length).toBeGreaterThan(0)
    const latestConfig = events.at(-1)?.[0]
    expect(latestConfig?.balance?.thresholds?.noticeMaxShare).toBe(0.7)
    expect(pane.text()).not.toContain('Enter a number')
  })

  it('clamps lookback weeks and emits warning message', async () => {
    const wrapper = mountSidebar()
    await wrapper.get('#opsdash-sidebar-tab-balance').trigger('click')
    const pane = wrapper.get('#opsdash-sidebar-pane-balance')
    const inputs = pane.findAll('input[type="number"]')
    const lookbackInput = inputs[3]

    await lookbackInput.setValue('0')
    await wrapper.vm.$nextTick()

    expect(pane.text()).toContain('Adjusted to allowed value')
    const events = wrapper.emitted('update:targets-config') ?? []
    const latestConfig = events.at(-1)?.[0]
    expect(latestConfig?.balance?.trend?.lookbackWeeks).toBe(1)

    await lookbackInput.setValue('5')
    await wrapper.vm.$nextTick()

    const updatedConfig = wrapper.emitted('update:targets-config')?.at(-1)?.[0]
    expect(updatedConfig?.balance?.trend?.lookbackWeeks).toBe(5)
  })
})
