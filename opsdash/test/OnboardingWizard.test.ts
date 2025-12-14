import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import OnboardingWizard from '../src/components/OnboardingWizard.vue'

function mountWizard(overrides: Record<string, any> = {}) {
  return mount(OnboardingWizard, {
    props: {
      visible: true,
      calendars: [{ id: 'cal-1', displayname: 'Primary', color: '#ff0000' }],
      initialSelection: ['cal-1'],
      initialStrategy: 'total_only',
      onboardingVersion: 1,
      saving: false,
      closable: true,
      initialThemePreference: 'auto',
      systemTheme: 'light',
      initialAllDayHours: 8,
      initialTotalHours: 40,
      hasExistingConfig: true,
      snapshotSaving: false,
      snapshotNotice: null,
      ...overrides,
    },
  })
}

describe('OnboardingWizard', () => {
  it('locks body scroll while visible', async () => {
    const wrapper = mountWizard()
    expect(document.body.classList.contains('opsdash-onboarding-lock')).toBe(true)
    expect(document.body.dataset.opsdashOnboarding).toBe('1')

    await wrapper.setProps({ visible: false })
    expect(document.body.classList.contains('opsdash-onboarding-lock')).toBe(false)
    expect(document.body.dataset.opsdashOnboarding).toBeUndefined()

    wrapper.unmount()
    expect(document.body.classList.contains('opsdash-onboarding-lock')).toBe(false)
  })

  it('disables the snapshot button while saving', async () => {
    const wrapper = mountWizard({ snapshotSaving: true })
    const button = wrapper.find('.config-warning button')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('renders snapshot notices when provided', () => {
    const wrapper = mountWizard({
      snapshotNotice: { type: 'success', message: 'Preset saved' },
    })
    const notice = wrapper.find('.snapshot-notice')
    expect(notice.exists()).toBe(true)
    expect(notice.text()).toContain('Preset saved')
  })

  it('honors startStep and allows jumping via step pills', async () => {
    const wrapper = mountWizard({
      startStep: 'categories',
      initialStrategy: 'total_plus_categories',
    })
    const pills = wrapper.findAll('.step-pill')
    const labels = pills.map((p) => p.text())
    expect(labels).toContain('Targets')
    const targetsPill = pills.find((p) => p.text() === 'Targets')
    expect(targetsPill?.classes()).toContain('active')

    const calendarsPill = pills.find((p) => p.text() === 'Calendars')
    await calendarsPill?.trigger('click')
    expect(calendarsPill?.classes()).toContain('active')
  })
})
