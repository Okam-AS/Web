import {
  offsetMinutesAt,
  zonedMidnightToUtc,
  weekRange,
  isoWeekNumber,
  parseApiInstant,
  businessDateKey
} from '~/utils/workforce/week-range'

const OSLO = 'Europe/Oslo'

describe('offsetMinutesAt', () => {
  test('resolves the offset at the instant, not the offset now', () => {
    expect(offsetMinutesAt(OSLO, new Date('2026-01-15T12:00:00Z'))).toBe(60)
    expect(offsetMinutesAt(OSLO, new Date('2026-07-15T12:00:00Z'))).toBe(120)
  })
})

describe('zonedMidnightToUtc', () => {
  test('winter midnight is 23:00 UTC the day before', () => {
    expect(zonedMidnightToUtc(OSLO, 2026, 1, 12).toISOString()).toBe('2026-01-11T23:00:00.000Z')
  })

  test('summer midnight is 22:00 UTC the day before', () => {
    expect(zonedMidnightToUtc(OSLO, 2026, 7, 27).toISOString()).toBe('2026-07-26T22:00:00.000Z')
  })

  test('the day after a spring-forward keeps its own offset', () => {
    // Norway springs forward on 2026-03-29. The 30th is already CEST.
    expect(zonedMidnightToUtc(OSLO, 2026, 3, 30).toISOString()).toBe('2026-03-29T22:00:00.000Z')
    expect(zonedMidnightToUtc(OSLO, 2026, 3, 29).toISOString()).toBe('2026-03-28T23:00:00.000Z')
  })
})

describe('weekRange', () => {
  test('starts on Monday and spans exactly seven store-local dates', () => {
    const week = weekRange(OSLO, new Date('2026-07-30T09:00:00Z'))
    expect(week.days.map(d => d.isoDate)).toEqual([
      '2026-07-27', '2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02'
    ])
    expect(week.startUtc.toISOString()).toBe('2026-07-26T22:00:00.000Z')
    expect(week.endUtc.toISOString()).toBe('2026-08-02T22:00:00.000Z')
  })

  test('a Monday anchor stays on its own week', () => {
    const week = weekRange(OSLO, new Date('2026-07-27T09:00:00Z'))
    expect(week.days[0].isoDate).toBe('2026-07-27')
  })

  test('a Sunday anchor belongs to the week that started six days earlier', () => {
    const week = weekRange(OSLO, new Date('2026-08-02T09:00:00Z'))
    expect(week.days[0].isoDate).toBe('2026-07-27')
  })

  test('weekOffset steps whole weeks', () => {
    const week = weekRange(OSLO, new Date('2026-07-30T09:00:00Z'), -1)
    expect(week.days[0].isoDate).toBe('2026-07-20')
  })

  // The reason this module exists: the week containing a DST change is 167 hours long, so a range
  // built from "start plus 7 * 24h" would end an hour off and clip or overrun a day column.
  test('the DST-change week still holds seven days and real local midnights', () => {
    const week = weekRange(OSLO, new Date('2026-03-25T09:00:00Z'))
    expect(week.days.map(d => d.isoDate)).toEqual([
      '2026-03-23', '2026-03-24', '2026-03-25', '2026-03-26', '2026-03-27', '2026-03-28', '2026-03-29'
    ])
    expect(week.startUtc.toISOString()).toBe('2026-03-22T23:00:00.000Z')
    expect(week.endUtc.toISOString()).toBe('2026-03-29T22:00:00.000Z')
    expect(week.endUtc.getTime() - week.startUtc.getTime()).toBe(167 * 3600000)
  })

  test('the week is the STORE week, not the viewer or UTC week', () => {
    // 2026-08-02T22:30Z is Sunday in UTC but already Monday 00:30 in Oslo, so the store's week is
    // the one beginning 3 August — a UTC reading would show the week that just ended.
    const week = weekRange(OSLO, new Date('2026-08-02T22:30:00Z'))
    expect(week.days[0].isoDate).toBe('2026-08-03')
  })
})

describe('isoWeekNumber', () => {
  test('a mid-year week', () => {
    expect(isoWeekNumber(2026, 7, 27)).toEqual({ week: 31, year: 2026 })
  })

  test('1 January can belong to the previous ISO year', () => {
    expect(isoWeekNumber(2027, 1, 1)).toEqual({ week: 53, year: 2026 })
  })

  test('late December can belong to the next ISO year', () => {
    expect(isoWeekNumber(2025, 12, 29)).toEqual({ week: 1, year: 2026 })
  })
})

describe('parseApiInstant', () => {
  test('a bare API stamp is read as UTC, not as browser-local', () => {
    expect(parseApiInstant('2026-07-28T06:00:00').toISOString()).toBe('2026-07-28T06:00:00.000Z')
  })

  test('an explicit Z is honoured', () => {
    expect(parseApiInstant('2026-07-28T06:00:00Z').toISOString()).toBe('2026-07-28T06:00:00.000Z')
  })

  test('missing or unparseable input is null, never a silent epoch', () => {
    expect(parseApiInstant(null)).toBeNull()
    expect(parseApiInstant('')).toBeNull()
    expect(parseApiInstant('not a date')).toBeNull()
  })
})

describe('businessDateKey', () => {
  test('takes the date part of an API DateTime', () => {
    expect(businessDateKey('2026-07-28T00:00:00')).toBe('2026-07-28')
  })

  test('an absent business date is null, not today', () => {
    expect(businessDateKey(undefined)).toBeNull()
  })
})
