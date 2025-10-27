import { ref } from 'vue'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { useDashboardSelection } from '../composables/useDashboardSelection'
import { createDefaultTargetsConfig } from '../src/services/targets'

function setup(range: 'week' | 'month' = 'week') {
  const calendars = ref<Array<{ id: string }>>([
    { id: 'cal-1' },
    { id: 'cal-2' },
  ])
  const selected = ref<string[]>(['cal-1'])
  const groupsById = ref<Record<string, number>>({ 'cal-1': 3 })
  const targetsWeek = ref<Record<string, number>>({})
  const targetsMonth = ref<Record<string, number>>({})
  const targetsConfig = ref(createDefaultTargetsConfig())
  const rangeRef = ref<'week' | 'month'>(range)
  const queueSave = vi.fn()
  const userChangedSelection = ref(false)

  const selection = useDashboardSelection({
    calendars,
    selected,
    groupsById,
    targetsWeek,
    targetsMonth,
    targetsConfig,
    range: rangeRef,
    queueSave,
    userChangedSelection,
  })

  return {
    calendars,
    selected,
    groupsById,
    targetsWeek,
    targetsMonth,
    targetsConfig,
    range: rangeRef,
    queueSave,
    userChangedSelection,
    ...selection,
  }
}

describe('useDashboardSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('toggles calendar selection and queues save', () => {
    const { toggleCalendar, selected, queueSave, userChangedSelection } = setup()

    toggleCalendar('cal-2')

    expect(selected.value).toEqual(['cal-1', 'cal-2'])
    expect(userChangedSelection.value).toBe(true)
    expect(queueSave).toHaveBeenCalledTimes(1)
    expect(queueSave).toHaveBeenCalledWith()

    toggleCalendar('cal-1')
    expect(selected.value).toEqual(['cal-2'])
    expect(queueSave).toHaveBeenCalledTimes(2)
  })

  it('sets group with clamping and persists without reload', () => {
    const { setGroup, groupsById, queueSave } = setup()

    setGroup('cal-1', 12.6)
    expect(groupsById.value['cal-1']).toBe(9)
    expect(queueSave).toHaveBeenCalledWith(false)

    setGroup('cal-new', -3)
    expect(groupsById.value['cal-new']).toBe(0)
    expect(queueSave).toHaveBeenCalledTimes(2)
  })

  it('updates weekly target and mirrors to month', () => {
    const { setTarget, targetsWeek, targetsMonth, queueSave } = setup('week')

    setTarget('cal-1', 10.234)
    expect(targetsWeek.value['cal-1']).toBe(10.23)
    expect(targetsMonth.value['cal-1']).toBe(40.92)
    expect(queueSave).toHaveBeenCalledWith(false)
  })

  it('updates monthly target and mirrors to week', () => {
    const { setTarget, targetsWeek, targetsMonth, queueSave } = setup('month')

    setTarget('cal-1', 80)
    expect(targetsMonth.value['cal-1']).toBe(80)
    expect(targetsWeek.value['cal-1']).toBe(20)
    expect(queueSave).toHaveBeenCalledWith(false)
  })

  it('normalises targets config and persists', () => {
    const { updateTargetsConfig, targetsConfig, queueSave } = setup()
    const next = createDefaultTargetsConfig()
    next.totalHours = 200
    next.categories[0].label = '  custom  '

    updateTargetsConfig(next)

    expect(targetsConfig.value.totalHours).toBe(200)
    expect(targetsConfig.value.categories[0].label).toBe('custom')
    expect(queueSave).toHaveBeenCalledWith(false)
  })

  it('selectAll toggles full selection without persisting immediately', () => {
    const { selectAll, selected, calendars, queueSave } = setup()

    selectAll(true)
    expect(selected.value).toEqual(calendars.value.map((c) => c.id))
    expect(queueSave).not.toHaveBeenCalled()

    selectAll(false)
    expect(selected.value).toEqual([])
  })
})
