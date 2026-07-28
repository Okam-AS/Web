import {
  SCHEDULE_HAS_SHIFTS,
  SCHEDULE_NEVER_PUBLISHED,
  SCHEDULE_NONE_IN_WINDOW,
  SCHEDULE_NONE_UNVERIFIED,
  SCHEDULE_UNKNOWN,
  businessDateKey,
  crossesMidnight,
  formatBusinessDate,
  formatMinutes,
  formatShiftRange,
  formatWallClock,
  groupByBusinessDate,
  paidMinutes,
  scheduleState,
  scheduleStateMessageKey,
  timeZoneIsKnown
} from '~/utils/workforce-me/shift-view'

const shift = over => Object.assign({
  staffMemberId: '30000000-0000-0000-0000-000000000002',
  storeId: 90001,
  timeZoneId: 'Europe/Oslo',
  publicationId: 'p1',
  publicationNumber: 1,
  publishedAtUtc: '2026-07-20T08:00:00Z',
  shiftAssignmentId: 'a1',
  roleId: null,
  roleName: 'Kokk',
  startsUtc: '2026-07-06T05:00:00Z',
  endsUtc: '2026-07-06T13:00:00Z',
  localBusinessDate: '2026-07-06T00:00:00',
  startOffsetMinutes: 120,
  endOffsetMinutes: 120,
  paidBreakMinutes: 0,
  unpaidBreakMinutes: 30,
  note: null
}, over || {})

describe('"nothing published yet" and "nothing this period" are different sentences', () => {
  // #33 returns an empty list for both, because a draft schedule is never disclosed to a worker. The
  // inbox is the only worker-visible evidence that a publication ever named them.
  test('no shifts and no publication ever received means nothing has been published to you', () => {
    expect(scheduleState({ loaded: true, items: [], publications: 0 })).toBe(SCHEDULE_NEVER_PUBLISHED)
  })

  test('no shifts but publications received means you are not on this period', () => {
    expect(scheduleState({ loaded: true, items: [], publications: 3 })).toBe(SCHEDULE_NONE_IN_WINDOW)
  })

  test('the two states carry different sentences', () => {
    expect(scheduleStateMessageKey(SCHEDULE_NEVER_PUBLISHED))
      .not.toBe(scheduleStateMessageKey(SCHEDULE_NONE_IN_WINDOW))
  })

  test('an unknown inbox licenses neither sentence', () => {
    // Picking the friendlier one would assert something we have no evidence for.
    expect(scheduleState({ loaded: true, items: [], publications: null })).toBe(SCHEDULE_NONE_UNVERIFIED)
    expect(scheduleState({ loaded: true, items: [] })).toBe(SCHEDULE_NONE_UNVERIFIED)
  })

  test('a failed or pending schedule read is unknown, never empty', () => {
    expect(scheduleState({ loaded: false, items: null, publications: 0 })).toBe(SCHEDULE_UNKNOWN)
    expect(scheduleState({ loaded: true, items: null, publications: 0 })).toBe(SCHEDULE_UNKNOWN)
    expect(scheduleState({})).toBe(SCHEDULE_UNKNOWN)
    expect(scheduleState(null)).toBe(SCHEDULE_UNKNOWN)
  })

  test('shifts present is has-shifts and carries no empty sentence', () => {
    expect(scheduleState({ loaded: true, items: [shift()], publications: 0 })).toBe(SCHEDULE_HAS_SHIFTS)
    expect(scheduleStateMessageKey(SCHEDULE_HAS_SHIFTS)).toBe('')
  })

  test('all four empty/unknown states have distinct sentences', () => {
    const keys = [
      SCHEDULE_UNKNOWN, SCHEDULE_NEVER_PUBLISHED, SCHEDULE_NONE_IN_WINDOW, SCHEDULE_NONE_UNVERIFIED
    ].map(scheduleStateMessageKey)
    expect(new Set(keys).size).toBe(4)
    keys.forEach(key => expect(key).not.toBe(''))
  })
})

describe('business-date grouping', () => {
  test('the key is the date portion of localBusinessDate, taken as a string', () => {
    // localBusinessDate has no zone designator; parsing it would place it in the browser's zone and
    // can move it a day, relabelling a whole group.
    expect(businessDateKey(shift())).toBe('2026-07-06')
    expect(businessDateKey({ localBusinessDate: '2026-12-31T00:00:00' })).toBe('2026-12-31')
    expect(businessDateKey({})).toBe('')
  })

  test('shifts group by business date in server order', () => {
    const items = [
      shift({ shiftAssignmentId: 'a1', localBusinessDate: '2026-07-06T00:00:00' }),
      shift({ shiftAssignmentId: 'a2', localBusinessDate: '2026-07-06T00:00:00' }),
      shift({ shiftAssignmentId: 'a3', localBusinessDate: '2026-07-07T00:00:00' })
    ]
    const groups = groupByBusinessDate(items)
    expect(groups.map(g => g.key)).toEqual(['2026-07-06', '2026-07-07'])
    expect(groups[0].items.map(i => i.shiftAssignmentId)).toEqual(['a1', 'a2'])
    expect(groups[1].items.length).toBe(1)
  })

  test('a not-loaded list groups to null, not to an empty list', () => {
    expect(groupByBusinessDate(null)).toBeNull()
    expect(groupByBusinessDate([])).toEqual([])
  })

  test('the date label reads the key at UTC midnight so it cannot slip a day', () => {
    expect(formatBusinessDate('2026-07-06', 'nb-NO')).toContain('6')
    expect(formatBusinessDate('', 'nb-NO')).toBe('')
  })
})

describe('times are the store wall clock, not the phone', () => {
  test('a UTC instant renders in the store zone', () => {
    // 05:00Z on 6 July is 07:00 in Europe/Oslo (CEST).
    expect(formatWallClock('2026-07-06T05:00:00Z', 'Europe/Oslo', 'nb-NO')).toBe('07:00')
  })

  test('the same instant renders differently in a different store zone', () => {
    expect(formatWallClock('2026-07-06T05:00:00Z', 'UTC', 'nb-NO')).toBe('05:00')
  })

  test('a shift range uses the item zone on both ends', () => {
    expect(formatShiftRange(shift(), 'nb-NO')).toBe('07:00–15:00')
  })

  test('an unusable zone is reported rather than silently swapped for the browser zone', () => {
    expect(timeZoneIsKnown('Europe/Oslo')).toBe(true)
    expect(timeZoneIsKnown(null)).toBe(false)
    expect(timeZoneIsKnown('')).toBe(false)
    expect(timeZoneIsKnown('Not/AZone')).toBe(false)
    // It still renders something (UTC) instead of throwing or blanking the shift.
    expect(formatWallClock('2026-07-06T05:00:00Z', 'Not/AZone', 'nb-NO')).toBe('05:00')
  })

  test('an absent or unparseable instant renders as nothing', () => {
    expect(formatWallClock(null, 'Europe/Oslo', 'nb-NO')).toBe('')
    expect(formatWallClock('not-a-date', 'Europe/Oslo', 'nb-NO')).toBe('')
    expect(formatShiftRange(null, 'nb-NO')).toBe('')
  })

  test('a shift crossing midnight in the store zone is flagged', () => {
    const overnight = shift({ startsUtc: '2026-07-06T20:00:00Z', endsUtc: '2026-07-06T23:30:00Z' })
    // 22:00 -> 01:30 Oslo, so it crosses.
    expect(crossesMidnight(overnight, 'en-CA')).toBe(true)
    expect(crossesMidnight(shift(), 'en-CA')).toBe(false)
    expect(crossesMidnight(null, 'en-CA')).toBe(false)
  })
})

describe('paid time is a duration, never a wage', () => {
  test('paid minutes are the shift length less the unpaid break', () => {
    expect(paidMinutes(shift())).toBe(450)
  })

  test('a missing unpaid break counts as none rather than as unknown', () => {
    expect(paidMinutes(shift({ unpaidBreakMinutes: undefined }))).toBe(480)
  })

  test('an unknown duration is null so the caller renders nothing at all', () => {
    // Rule: never render 0 for unknown.
    expect(paidMinutes(shift({ startsUtc: null }))).toBeNull()
    expect(paidMinutes(shift({ endsUtc: 'not-a-date' }))).toBeNull()
    expect(paidMinutes(null)).toBeNull()
    expect(formatMinutes(null)).toBe('')
    expect(formatMinutes(undefined)).toBe('')
  })

  test('a break longer than the shift floors at zero rather than going negative', () => {
    expect(paidMinutes(shift({ unpaidBreakMinutes: 600 }))).toBe(0)
  })

  test('durations format as hours and minutes', () => {
    expect(formatMinutes(450)).toBe('7t 30m')
    expect(formatMinutes(480)).toBe('8t')
    expect(formatMinutes(45)).toBe('45m')
    expect(formatMinutes(0)).toBe('0m')
  })
})
