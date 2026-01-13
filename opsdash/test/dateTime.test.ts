import { afterEach, describe, expect, it } from 'vitest'
import {
  dateTimeConfig,
  getFirstDayOfWeek,
  getUserLocale,
  getUserTimeZone,
  getWeekdayOrder,
  setUserDateTimeConfig,
} from '../src/services/dateTime'

const originalConfig = {
  locale: dateTimeConfig.locale,
  timeZone: dateTimeConfig.timeZone,
  firstDayOfWeek: dateTimeConfig.firstDayOfWeek,
}
const originalOc = (window as any).OC

afterEach(() => {
  dateTimeConfig.locale = originalConfig.locale
  dateTimeConfig.timeZone = originalConfig.timeZone
  dateTimeConfig.firstDayOfWeek = originalConfig.firstDayOfWeek
  if (typeof originalOc === 'undefined') {
    delete (window as any).OC
  } else {
    ;(window as any).OC = originalOc
  }
})

describe('dateTime config', () => {
  it('sets user date time config and normalizes first day', () => {
    setUserDateTimeConfig({
      locale: 'de',
      timeZone: 'Europe/Berlin',
      firstDayOfWeek: 8,
    })

    expect(getUserLocale()).toBe('de')
    expect(getUserTimeZone()).toBe('Europe/Berlin')
    expect(getFirstDayOfWeek()).toBe(1)
  })

  it('prefers canonical locale from OC', () => {
    dateTimeConfig.locale = ''
    ;(window as any).OC = {
      getCanonicalLocale: () => 'fr-CA',
      getLocale: () => 'fr',
      getLanguage: () => 'en',
    }

    expect(getUserLocale()).toBe('fr-CA')
  })

  it('uses OC first day of week when available', () => {
    dateTimeConfig.firstDayOfWeek = undefined
    ;(window as any).OC = {
      getFirstDayOfWeek: () => 6,
    }

    expect(getFirstDayOfWeek()).toBe(6)
  })

  it('orders weekdays from configured start', () => {
    dateTimeConfig.firstDayOfWeek = 1
    const order = getWeekdayOrder()
    expect(order[0]).toBe('Mon')
    expect(order[6]).toBe('Sun')
  })
})
