import { afterEach, describe, expect, it, vi } from 'vitest'
import { daysUntil, formatDateRange, formatMoney, initials, tripLength } from './format'
import { statusLabel } from './trips'

// Intl puts a narrow no-break space between the symbol and the number; compare on plain spaces
const plain = (text) => text.replace(/\s/g, ' ')

describe('formatMoney', () => {
  it('rounds to whole units by default', () => {
    expect(plain(formatMoney(1234.56, 'ZAR'))).toBe('R 1 235')
  })

  it('keeps cents when exact', () => {
    expect(plain(formatMoney(33.33, 'ZAR', { exact: true }))).toBe('R 33,33')
    expect(plain(formatMoney(40, 'ZAR', { exact: true }))).toBe('R 40')
  })

  it('treats bad input as zero', () => {
    expect(plain(formatMoney(undefined, 'USD'))).toBe('US$0')
  })
})

describe('dates', () => {
  it('counts trip days inclusively', () => {
    expect(tripLength('2030-03-01', '2030-03-03')).toBe(3)
    expect(tripLength('2030-03-01', '2030-03-01')).toBe(1)
  })

  it('reads date-only strings as local dates, not UTC', () => {
    expect(formatDateRange('2030-03-01', '2030-03-03')).toBe('1 Mar - 3 Mar 2030')
  })
})

describe('trip status', () => {
  afterEach(() => vi.useRealTimers())

  it('describes upcoming, current and finished trips', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2030-03-01T10:00:00'))
    expect(daysUntil('2030-03-11')).toBe(10)
    expect(statusLabel({ start_date: '2030-03-11', end_date: '2030-03-12' })).toBe('In 10 days')
    expect(statusLabel({ start_date: '2030-03-02', end_date: '2030-03-04' })).toBe('Tomorrow')
    expect(statusLabel({ start_date: '2030-02-27', end_date: '2030-03-02' })).toBe('Happening now')
    expect(statusLabel({ start_date: '2030-02-20', end_date: '2030-02-22' })).toBe('Completed')
  })
})

describe('initials', () => {
  it('uses the first letters of first and last name', () => {
    expect(initials({ first_name: 'lerato', last_name: 'Dlamini' })).toBe('LD')
    expect(initials(null)).toBe('')
  })
})
