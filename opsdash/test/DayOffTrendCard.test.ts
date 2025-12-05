import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import DayOffTrendCard from '../src/components/DayOffTrendCard.vue'

describe('DayOffTrendCard', () => {
  it('applies custom tone colors', () => {
    const wrapper = mount(DayOffTrendCard, {
      props: {
        trend: [
          { offset: 0, label: 'This week', from: '', to: '', totalDays: 7, daysOff: 1, daysWorked: 6 },
          { offset: 1, label: '-1 wk', from: '', to: '', totalDays: 7, daysOff: 4, daysWorked: 3 },
        ],
        toneLowColor: '#000000',
        toneHighColor: '#ffffff',
      },
    })
    const tiles = wrapper.findAll('.dayoff-tile')
    expect(tiles.length).toBeGreaterThan(0)
    expect((tiles[0].element as HTMLElement).style.background).toContain('rgb(0, 0, 0)')
    expect((tiles[0].element as HTMLElement).style.color).toContain('rgb(255, 255, 255)')
  })
})
