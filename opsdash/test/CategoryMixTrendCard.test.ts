import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import CategoryMixTrendCard from '../src/components/widgets/cards/CategoryMixTrendCard.vue'

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

  it('shows oldest-first by default and supports reverse-order toggle', () => {
    const props = {
      overview: {
        categories: [
          { id: 'work', label: 'Work', share: 30 },
        ],
        trend: {
          history: [
            { offset: 1, label: '-1', categories: [{ id: 'work', label: 'Work', share: 50 }] },
            { offset: 2, label: '-2', categories: [{ id: 'work', label: 'Work', share: 60 }] },
          ],
        },
      },
      rangeMode: 'week' as const,
      lookbackWeeks: 2,
      labelMode: 'offset' as const,
    }

    const normal = mount(CategoryMixTrendCard, { props })
    expect(normal.findAll('.mix-column-label').map((node) => node.text()).slice(1)).toEqual([
      '-2',
      '-1',
      'Current',
    ])

    const reversed = mount(CategoryMixTrendCard, {
      props: { ...props, reverseOrder: true },
    })
    expect(reversed.findAll('.mix-column-label').map((node) => node.text()).slice(1)).toEqual([
      'Current',
      '-1',
      '-2',
    ])
  })
})
