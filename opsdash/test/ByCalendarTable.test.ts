import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ByCalendarTable from '../src/components/tables/ByCalendarTable.vue'

const n2 = (v: any) => Number(v ?? 0).toFixed(2)

describe('ByCalendarTable', () => {
  it('renders today overlay with chip when todayHours are provided', () => {
    const wrapper = mount(ByCalendarTable, {
      props: {
        rows: [
          { calendar: 'Cal A', total_hours: 5, events_count: 2, id: 'cal-a' },
        ],
        targets: { 'cal-a': 10 },
        todayHours: { 'cal-a': 2 },
        n2,
      },
    })

    const overlay = wrapper.find('.progress-today')
    expect(overlay.exists()).toBe(true)
    const chip = wrapper.find('.progress-chip')
    expect(chip.exists()).toBe(true)
    expect(chip.text()).toContain('2.00h')
  })

  it('omits today overlay when no todayHours are provided', () => {
    const wrapper = mount(ByCalendarTable, {
      props: {
        rows: [
          { calendar: 'Cal A', total_hours: 5, events_count: 2, id: 'cal-a' },
        ],
        targets: { 'cal-a': 10 },
        todayHours: { 'cal-a': 0 },
        n2,
      },
    })

    expect(wrapper.find('.progress-today').exists()).toBe(false)
  })

  it('renders empty row message when a group has no calendars', () => {
    const wrapper = mount(ByCalendarTable, {
      props: {
        rows: [],
        groups: [
          { id: 'empty', label: 'Empty group', summary: null, rows: [] },
        ],
        n2,
      },
    })

    const emptyRow = wrapper.find('.empty-row .empty')
    expect(emptyRow.exists()).toBe(true)
    expect(emptyRow.text()).toContain('No calendars assigned')
  })
})
