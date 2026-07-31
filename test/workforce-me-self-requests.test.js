import {
  INVALID_DATES,
  INVALID_NO_ZONE,
  INVALID_ORDER,
  INVALID_WINDOW,
  SELF_ALREADY_DECIDED,
  SELF_DISABLED,
  SELF_ERROR,
  SELF_FORBIDDEN,
  SELF_GONE,
  SELF_INVALID,
  VALID,
  blankRules,
  buildAvailabilityRequest,
  buildTimeOffRequest,
  classifySelfFailure,
  clockOf,
  hiddenRuleCount,
  isOpenRequest,
  minuteOfDay,
  parseIsoDate,
  rulesFromResponse
} from '~/utils/workforce-me/self-requests'

const OSLO = 'Europe/Oslo'

// THE test in this file. The server derives a request's LOCAL business dates from the instants sent,
// so a wrong conversion does not fail — it files the request on the wrong days. These are meaningful
// only in a zone that is not UTC; run the suite with TZ=Europe/Oslo.
describe('a picked calendar date becomes the instant the server will read it back as', () => {
  test('a summer range starts at local midnight and ends inside the last local day', () => {
    const built = buildTimeOffRequest({ timeZoneId: OSLO, fromDate: '2026-08-01', toDate: '2026-08-03' })

    expect(built.error).toBe(VALID)
    // Oslo is UTC+2 in August: local 1 Aug 00:00 is 31 Jul 22:00 UTC.
    expect(built.body.startsUtc).toBe('2026-07-31T22:00:00')
    // One minute before local midnight of 4 Aug, so the server's `LocalEndDate` is 3 Aug — the day
    // the worker actually asked for. Naive midnight would have stored 4 Aug.
    expect(built.body.endsUtc).toBe('2026-08-03T21:59:00')
  })

  test('a winter range uses the winter offset, not a remembered summer one', () => {
    const built = buildTimeOffRequest({ timeZoneId: OSLO, fromDate: '2026-01-05', toDate: '2026-01-05' })

    // UTC+1 in January.
    expect(built.body.startsUtc).toBe('2026-01-04T23:00:00')
    expect(built.body.endsUtc).toBe('2026-01-05T22:59:00')
  })

  test('a range across the spring DST change keeps both ends on real local midnight', () => {
    // Norway springs forward on 29 March 2026.
    const built = buildTimeOffRequest({ timeZoneId: OSLO, fromDate: '2026-03-28', toDate: '2026-03-30' })

    expect(built.body.startsUtc).toBe('2026-03-27T23:00:00')
    expect(built.body.endsUtc).toBe('2026-03-30T21:59:00')
  })

  test('nothing is sent without a zone: the dates cannot be placed', () => {
    expect(buildTimeOffRequest({ timeZoneId: null, fromDate: '2026-08-01', toDate: '2026-08-03' }).error)
      .toBe(INVALID_NO_ZONE)
  })

  test('a single day is a legal range', () => {
    const built = buildTimeOffRequest({ timeZoneId: OSLO, fromDate: '2026-08-01', toDate: '2026-08-01' })
    expect(built.error).toBe(VALID)
  })

  test('an end before the start is refused before anything is sent', () => {
    expect(buildTimeOffRequest({ timeZoneId: OSLO, fromDate: '2026-08-05', toDate: '2026-08-01' }).error)
      .toBe(INVALID_ORDER)
  })

  test('a missing or impossible date is refused rather than rolled into the next month', () => {
    expect(buildTimeOffRequest({ timeZoneId: OSLO, fromDate: '', toDate: '2026-08-01' }).error).toBe(INVALID_DATES)
    expect(parseIsoDate('2026-02-31')).toBeNull()
    expect(parseIsoDate('2026-02-28')).toEqual({ year: 2026, month: 2, day: 28 })
  })

  test('the visibility default is managers-only, and an unknown value never reaches the wire', () => {
    const managers = buildTimeOffRequest({ timeZoneId: OSLO, fromDate: '2026-08-01', toDate: '2026-08-01' })
    expect(managers.body.visibility).toBe('Managers')

    const junk = buildTimeOffRequest({
      timeZoneId: OSLO, fromDate: '2026-08-01', toDate: '2026-08-01', visibility: 'Everyone'
    })
    expect(junk.body.visibility).toBe('Managers')
  })

  test('the instants carry no zone designator, so the server relabel means what it says', () => {
    const built = buildTimeOffRequest({ timeZoneId: OSLO, fromDate: '2026-08-01', toDate: '2026-08-01' })
    expect(built.body.startsUtc).not.toContain('Z')
    expect(built.body.endsUtc).not.toMatch(/[+-]\d{2}:\d{2}$/)
  })
})

describe('the availability payload is always the whole week', () => {
  const week = () => blankRules()

  test('only enabled days are sent, and a disabled one is a deliberate absence', () => {
    const rules = week()
    rules[0].enabled = true
    rules[0].start = '08:00'
    rules[0].end = '16:00'

    const built = buildAvailabilityRequest({ timeZoneId: OSLO, rules, exceptions: [] })
    expect(built.error).toBe(VALID)
    expect(built.body.rules).toHaveLength(1)
    expect(built.body.rules[0]).toMatchObject({
      dayOfWeek: 1, startMinuteOfDay: 480, endMinuteOfDay: 960, kind: 'Available'
    })
  })

  // The server reads `default(DateTime)` as "now". Inventing a browser clock here would put this
  // machine's idea of the moment into a column the server otherwise owns.
  test('the effective-from is left at the server default rather than a client clock', () => {
    const rules = week()
    rules[0].enabled = true
    const built = buildAvailabilityRequest({ timeZoneId: OSLO, rules, exceptions: [] })
    expect(built.body.rules[0].effectiveFromUtc).toBe('0001-01-01T00:00:00')
    expect(built.body.rules[0].effectiveToUtc).toBeNull()
  })

  test('a window that does not start before it ends names the day it refused', () => {
    const rules = week()
    rules[2].enabled = true
    rules[2].start = '18:00'
    rules[2].end = '09:00'

    const built = buildAvailabilityRequest({ timeZoneId: OSLO, rules, exceptions: [] })
    expect(built.error).toBe(INVALID_WINDOW)
    expect(built.dayOfWeek).toBe(3)
  })

  test('an exception with no times is the whole local day', () => {
    const built = buildAvailabilityRequest({
      timeZoneId: OSLO,
      rules: [],
      exceptions: [{ date: '2026-08-01', start: '', end: '', kind: 'Unavailable', note: 'ferie' }]
    })

    expect(built.error).toBe(VALID)
    expect(built.body.exceptions[0].startsUtc).toBe('2026-07-31T22:00:00')
    expect(built.body.exceptions[0].endsUtc).toBe('2026-08-01T22:00:00')
    expect(built.body.exceptions[0].note).toBe('ferie')
  })

  test('an exception with times is that window of the local day', () => {
    const built = buildAvailabilityRequest({
      timeZoneId: OSLO,
      rules: [],
      exceptions: [{ date: '2026-08-01', start: '17:00', end: '23:00', kind: 'Unavailable' }]
    })

    expect(built.body.exceptions[0].startsUtc).toBe('2026-08-01T15:00:00')
    expect(built.body.exceptions[0].endsUtc).toBe('2026-08-01T21:00:00')
  })

  test('nothing is built without a zone', () => {
    expect(buildAvailabilityRequest({ timeZoneId: null, rules: week(), exceptions: [] }).error)
      .toBe(INVALID_NO_ZONE)
  })
})

describe('clock and week helpers', () => {
  test('a clock time round-trips through minutes', () => {
    expect(minuteOfDay('08:30')).toBe(510)
    expect(clockOf(510)).toBe('08:30')
    expect(minuteOfDay('24:00')).toBe(1440)
  })

  test('a malformed clock time is null, never zero', () => {
    expect(minuteOfDay('8')).toBeNull()
    expect(minuteOfDay('25:00')).toBeNull()
    expect(minuteOfDay('08:99')).toBeNull()
    expect(minuteOfDay('')).toBeNull()
  })

  test('the response reloads into the seven rows, Monday first', () => {
    const rows = rulesFromResponse({
      rules: [{ dayOfWeek: 3, kind: 'Preferred', startMinuteOfDay: 600, endMinuteOfDay: 1080 }]
    })

    expect(rows.map(r => r.dayOfWeek)).toEqual([1, 2, 3, 4, 5, 6, 0])
    expect(rows[2]).toMatchObject({ enabled: true, kind: 'Preferred', start: '10:00', end: '18:00' })
    expect(rows[0].enabled).toBe(false)
  })

  // The form holds one window per day; the server can hold several. Saving replaces them, so the
  // count is surfaced rather than the extra windows disappearing without a word.
  test('extra windows on one day are counted, and the earliest is the one shown', () => {
    const response = {
      rules: [
        { dayOfWeek: 1, kind: 'Available', startMinuteOfDay: 960, endMinuteOfDay: 1200 },
        { dayOfWeek: 1, kind: 'Available', startMinuteOfDay: 480, endMinuteOfDay: 720 }
      ]
    }
    expect(hiddenRuleCount(response)).toBe(1)
    expect(rulesFromResponse(response)[0].start).toBe('08:00')
  })
})

describe('a refused self-service write is read on the code', () => {
  test('each modelled code maps to its own outcome', () => {
    expect(classifySelfFailure({ code: 'workforce.invalid-time-off' })).toBe(SELF_INVALID)
    expect(classifySelfFailure({ code: 'workforce.invalid-availability' })).toBe(SELF_INVALID)
    expect(classifySelfFailure({ code: 'workforce.request-not-decidable' })).toBe(SELF_ALREADY_DECIDED)
    expect(classifySelfFailure({ code: 'workforce.module-disabled' })).toBe(SELF_DISABLED)
    expect(classifySelfFailure({ code: 'workforce.flag-disabled-read-only' })).toBe(SELF_DISABLED)
    expect(classifySelfFailure({ code: 'workforce.forbidden' })).toBe(SELF_FORBIDDEN)
    expect(classifySelfFailure({ code: 'workforce.not-found' })).toBe(SELF_GONE)
  })

  test('an unmodelled code is an error rather than a guess', () => {
    expect(classifySelfFailure({ code: 'workforce.something-new', status: 409 })).toBe(SELF_ERROR)
    expect(classifySelfFailure(null)).toBe(SELF_ERROR)
  })

  test('withdrawal is offered only while the request is still open', () => {
    expect(isOpenRequest({ status: 'Submitted' })).toBe(true)
    expect(isOpenRequest({ status: 'UnderReview' })).toBe(true)
    expect(isOpenRequest({ status: 'Approved' })).toBe(false)
    expect(isOpenRequest({ status: 'Withdrawn' })).toBe(false)
  })
})
