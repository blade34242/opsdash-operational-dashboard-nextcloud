import { describe, it, expect } from 'vitest'
import { useDetailsToggle } from '../composables/useDetailsToggle'

describe('useDetailsToggle', () => {
  it('toggles detail index', () => {
    const { detailsIndex, toggle } = useDetailsToggle()
    expect(detailsIndex.value).toBeNull()
    toggle(1)
    expect(detailsIndex.value).toBe(1)
    toggle(1)
    expect(detailsIndex.value).toBeNull()
  })
})
