import { describe, expect, it, afterEach } from 'vitest'
import { readCurrentUserId } from '../src/services/currentUser'

const originalOc = (window as any).OC
const originalFallback = (window as any)._oc_current_user

afterEach(() => {
  if (typeof originalOc === 'undefined') {
    delete (window as any).OC
  } else {
    ;(window as any).OC = originalOc
  }
  if (typeof originalFallback === 'undefined') {
    delete (window as any)._oc_current_user
  } else {
    ;(window as any)._oc_current_user = originalFallback
  }
})

describe('readCurrentUserId', () => {
  it('returns string from getCurrentUser', () => {
    ;(window as any).OC = {
      getCurrentUser: () => 'user-1',
    }
    expect(readCurrentUserId()).toBe('user-1')
  })

  it('returns uid from object response', () => {
    ;(window as any).OC = {
      getCurrentUser: () => ({ uid: 'user-2' }),
    }
    expect(readCurrentUserId()).toBe('user-2')
  })

  it('falls back to direct OC fields on error', () => {
    ;(window as any).OC = {
      getCurrentUser: () => {
        throw new Error('boom')
      },
      currentUser: 'user-3',
    }
    expect(readCurrentUserId()).toBe('user-3')
  })

  it('uses window fallback when OC is missing', () => {
    delete (window as any).OC
    ;(window as any)._oc_current_user = 'user-4'
    expect(readCurrentUserId()).toBe('user-4')
  })
})
