import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import CategoryMixTrendCard from '../src/components/CategoryMixTrendCard.vue'

describe('CategoryMixTrendCard', () => {
  it('applies custom tone colors', () => {
    const wrapper = mount(CategoryMixTrendCard, {
      props: {
        overview: {
          categories: [
            { id: 'work', label: 'Work', share: 10 },
            { id: 'hobby', label: 'Hobby', share: 40 },
          ],
          trend: {
            history: [
              { offset: 1, label: '-1', categories: [{ id: 'work', label: 'Work', share: 80 }] },
            ],
          },
        },
        rangeMode: 'week',
        lookbackWeeks: 1,
        toneLowColor: '#111111',
        toneHighColor: '#eeeeee',
        colorMode: 'trend',
      },
    })
    const cells = wrapper.findAll('.mix-cell').map((c) => c.element as HTMLElement)
    expect(cells.length).toBeGreaterThan(1)
    expect(cells.some((el) => el.style.getPropertyValue('--mix-bg').includes('#111111'))).toBe(true)
  })
})
