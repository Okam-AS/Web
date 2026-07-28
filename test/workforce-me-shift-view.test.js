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

// THE WIRE SHAPE, NOT A CONVENIENT ONE. #33's instants are column-loaded, so EF materialises them
// `DateTimeKind.Unspecified` and Newtonsoft's default `RoundtripKind` serialises them BARE — no `Z`.
// These fixtures carry no `Z` for exactly that reason, and they match the manager lane's fixtures
// (`test/workforce-external-commitments.test.js`) rather than contradicting them. An earlier version
// of this file used `Z` throughout: every assertion below passed while the page was rendering every
// shift time off by the viewer's UTC offset, because a `Z` string is the one shape the bug cannot
// reach. Do not "tidy" these back to `Z`.
const shift = over => Object.assign({
  staffMemberId: '30000000-0000-0000-0000-000000000002',
  storeId: 90001,
  timeZoneId: 'Europe/Oslo',
  publicationId: 'p1',
  publicationNumber: 1,
  publishedAtUtc: '2026-07-20T08:00:00',
  shiftAssignmentId: 'a1',
  roleId: null,
  roleName: 'Kokk',
  startsUtc: '2026-07-06T05:00:00',
  endsUtc: '2026-07-06T13:00:00',
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

describe('the wire is bare, and a bare stamp is UTC', () => {
  // These are the assertions that fail on a `new Date(raw)` parser. They only fail under a non-UTC
  // TZ: run the suite with TZ=Europe/Oslo. Under TZ=UTC a broken parser and a correct one agree.
  test('a bare stamp is read as UTC, not as the browser zone', () => {
    // 06:00 UTC is 08:00 in Oslo (CEST). Read as browser-local on an Oslo phone it would be 04:00
    // UTC and render "06:00" — the server's own digits handed back as if they were a wall clock.
    expect(formatWallClock('2026-07-28T06:00:00', 'Europe/Oslo', 'nb-NO')).toBe('08:00')
    expect(formatWallClock('2026-07-28T06:00:00', 'UTC', 'nb-NO')).toBe('06:00')
  })

  test('a bare stamp and its Z-suffixed twin are the same instant', () => {
    // The surface emits BOTH shapes: column-loaded stamps bare, server-computed ones with a `Z`.
    // Neither may be favoured, and the two must never disagree.
    expect(formatWallClock('2026-07-28T06:00:00', 'Europe/Oslo', 'nb-NO'))
      .toBe(formatWallClock('2026-07-28T06:00:00Z', 'Europe/Oslo', 'nb-NO'))
  })

  test('an explicit offset is honoured rather than being re-stamped as UTC', () => {
    // 08:00+02:00 is 06:00 UTC, so it is 08:00 in Oslo — not 10:00.
    expect(formatWallClock('2026-07-28T08:00:00+02:00', 'Europe/Oslo', 'nb-NO')).toBe('08:00')
  })
})

describe('times are the store wall clock, not the phone', () => {
  test('a UTC instant renders in the store zone', () => {
    // 05:00Z on 6 July is 07:00 in Europe/Oslo (CEST).
    expect(formatWallClock('2026-07-06T05:00:00', 'Europe/Oslo', 'nb-NO')).toBe('07:00')
  })

  test('the same instant renders differently in a different store zone', () => {
    expect(formatWallClock('2026-07-06T05:00:00', 'UTC', 'nb-NO')).toBe('05:00')
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
    expect(formatWallClock('2026-07-06T05:00:00', 'Not/AZone', 'nb-NO')).toBe('05:00')
  })

  test('an absent or unparseable instant renders as nothing', () => {
    expect(formatWallClock(null, 'Europe/Oslo', 'nb-NO')).toBe('')
    expect(formatWallClock('not-a-date', 'Europe/Oslo', 'nb-NO')).toBe('')
    expect(formatShiftRange(null, 'nb-NO')).toBe('')
  })

  test('a shift crossing midnight in the store zone is flagged', () => {
    const overnight = shift({ startsUtc: '2026-07-06T20:00:00', endsUtc: '2026-07-06T23:30:00' })
    // 22:00 -> 01:30 Oslo, so it crosses.
    expect(crossesMidnight(overnight, 'en-CA')).toBe(true)
    expect(crossesMidnight(shift(), 'en-CA')).toBe(false)
    expect(crossesMidnight(null, 'en-CA')).toBe(false)
  })

  test('the overnight flag follows the store day, not the browser day', () => {
    // 23:00Z on the 28th is 01:00 Oslo on the 29th, and 01:00Z on the 29th is 03:00 Oslo the same
    // day: one Oslo day, no crossing. Parsed as browser-local on an Oslo phone the two stamps sit on
    // different calendar dates and the card would flag an overnight that does not exist.
    expect(crossesMidnight({
      startsUtc: '2026-07-28T23:00:00', endsUtc: '2026-07-29T01:00:00', timeZoneId: 'Europe/Oslo'
    }, 'en-CA')).toBe(false)

    // The mirror image: 20:00Z (22:00 Oslo) to 23:30Z (01:30 Oslo the next day) really does cross,
    // and a browser-local parse would miss it because both stamps fall on the 28th.
    expect(crossesMidnight({
      startsUtc: '2026-07-28T20:00:00', endsUtc: '2026-07-28T23:30:00', timeZoneId: 'Europe/Oslo'
    }, 'en-CA')).toBe(true)
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

  test('the duration survives the autumn fall-back, where a local misparse does not cancel', () => {
    // Misparsing both ends as browser-local usually cancels in the subtraction — the same offset is
    // added to each end — which is why this function looked correct for so long. It does NOT cancel
    // when the local reading straddles a DST transition, because the two ends then sit at different
    // offsets and the error is the size of the shift, not zero.
    //
    // Oslo returns to CET at 03:00 CEST on 25 October 2026, so local 02:00–02:59 happens twice. A
    // 60-minute shift at 02:30–03:30 UTC, read as Oslo local, spans the repeated hour and measures
    // 120 minutes. An hour of paid time that nobody worked is not a rounding difference.
    expect(paidMinutes({
      startsUtc: '2026-10-25T02:30:00', endsUtc: '2026-10-25T03:30:00', unpaidBreakMinutes: 0
    })).toBe(60)

    // The spring gap does NOT break the same way, and that is worth pinning rather than assuming.
    // Oslo jumps 02:00 -> 03:00 on 29 March 2026, so local 02:30 never happens; V8 resolves the
    // nonexistent time forward, both ends end up at the same offset, and the error cancels — the old
    // parser returned the right 60 here too. Only the fold breaks the cancellation. This case is a
    // guard, not a discriminator, and is kept so nobody "fixes" the fold by special-casing March.
    expect(paidMinutes({
      startsUtc: '2026-03-29T01:30:00', endsUtc: '2026-03-29T02:30:00', unpaidBreakMinutes: 0
    })).toBe(60)

    // A whole shift spanning the fold is 8h30m of real clock. The old parser reported 9h30m.
    expect(paidMinutes({
      startsUtc: '2026-10-25T00:00:00', endsUtc: '2026-10-25T08:30:00', unpaidBreakMinutes: 0
    })).toBe(510)
  })

  test('durations format as hours and minutes', () => {
    expect(formatMinutes(450)).toBe('7t 30m')
    expect(formatMinutes(480)).toBe('8t')
    expect(formatMinutes(45)).toBe('45m')
    expect(formatMinutes(0)).toBe('0m')
  })
})
