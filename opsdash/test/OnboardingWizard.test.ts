import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import OnboardingWizard from '../src/components/onboarding/OnboardingWizard.vue'

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
      snapshotNotice: { type: 'success', message: 'Profile saved' },
    })
    const notice = wrapper.find('.snapshot-notice')
    expect(notice.exists()).toBe(true)
    expect(notice.text()).toContain('Profile saved')
  })

  it('honors startStep and allows jumping via step pills', async () => {
    const wrapper = mountWizard({
      startStep: 'goals',
      initialStrategy: 'full_granular',
    })
    const arrows = wrapper.findAll('.step-arrow')
    const labels = arrows.map((p) => p.text())
    expect(labels.some((label) => label.includes('Goals'))).toBe(true)
    const goalsArrow = arrows.find((p) => p.text().includes('Goals'))
    expect(goalsArrow?.classes()).toContain('current')

    const calendarsArrow = arrows.find((p) => p.text().includes('Calendars'))
    await calendarsArrow?.trigger('click')
    expect(calendarsArrow?.classes()).toContain('current')
  })

  it('shows global trend lookback choices in preferences after opening the editor', async () => {
    const wrapper = mountWizard({
      startStep: 'preferences',
      initialTargetsConfig: { balanceTrendLookback: 5 },
    })
    const lookbackRow = wrapper.findAll('.field-row').find((row) => row.text().includes('Trend lookback'))
    const openButton = lookbackRow?.findAll('button').find((button) => button.text().includes('Choose'))
    await openButton?.trigger('click')

    const editor = wrapper.find('.editor-card')
    expect(editor.exists()).toBe(true)
    expect(editor.text()).toContain('Open trend lookback selection')
    expect(editor.text()).toContain('5 weeks')
  })

  it('uses a dedicated deck boards step', () => {
    const wrapper = mountWizard({
      startStep: 'deck',
    })
    expect(wrapper.find('.step-arrow.current').text()).toContain('Deck')
    expect(wrapper.text()).toContain('Choose Deck boards')
  })

  it('completes quick setup from intro with the default onboarding payload', async () => {
    const wrapper = mountWizard({
      hasExistingConfig: false,
      initialSelection: [],
    })

    const quickCard = wrapper.findAll('.intro-route-card').find((card) => card.text().includes('Quick setup'))
    await quickCard?.trigger('click')
    const continueButton = wrapper.findAll('button').find((button) => button.text().includes('Continue'))
    await continueButton?.trigger('click')

    const complete = wrapper.emitted('complete')
    expect(complete).toBeTruthy()
    expect(complete?.[0]?.[0]?.strategy).toBe('total_plus_categories')
    expect(complete?.[0]?.[0]?.dashboardMode).toBe('standard')
    expect(complete?.[0]?.[0]?.selected).toEqual(['cal-1'])
  })

  it('renders the new onboarding step order', () => {
    const wrapper = mountWizard()
    const labels = wrapper.findAll('.step-arrow__label').map((node) => node.text())
    expect(labels).toEqual(['Intro', 'Strategy', 'Calendars', 'Deck', 'Goals', 'Preferences', 'Dashboard', 'Review'])
  })
})
