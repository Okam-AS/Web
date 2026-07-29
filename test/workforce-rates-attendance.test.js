import {
  ATTENDANCE_EMPTY,
  ATTENDANCE_LISTED,
  ATTENDANCE_UNKNOWN,
  buildAttendance,
  formatMinutes
} from '~/utils/workforce-rates/attendance-view'

// These tests are meaningful only under a non-UTC TZ — run the suite with TZ=Europe/Oslo.

const row = over => Object.assign({
  staffMemberId: 'sm-1',
  displayName: 'Ida Berg',
  // A column-loaded `DateTime` at local midnight: EF returns `Unspecified` and it serialises BARE.
  localBusinessDate: '2026-09-01T00:00:00',
  plannedMinutes: 450,
  actualMinutes: 465,
  paidBreakMinutes: 15,
  unpaidBreakMinutes: 30,
  varianceMinutes: 15,
  missingPunch: false,
  openSessionCount: 0,
  pendingAdjustmentCount: 0,
  approvedAdjustmentCount: 0,
  rejectedAdjustmentCount: 0,
  locked: false
}, over)

const response = (rows, over) => Object.assign({
  storeId: 42,
  fromUtc: '2026-08-30T22:00:00',
  toUtc: '2026-09-06T22:00:00',
  timeZoneId: 'Europe/Oslo',
  asOfUtc: '2026-09-03T11:04:00Z',
  rows
}, over)

describe('buildAttendance — honest state', () => {
  test('a failed read is UNKNOWN and never claims nobody worked', () => {
    expect(buildAttendance(null).state).toBe(ATTENDANCE_UNKNOWN)
    expect(buildAttendance({}).state).toBe(ATTENDANCE_UNKNOWN)
    expect(buildAttendance({ rows: null }).state).toBe(ATTENDANCE_UNKNOWN)
    expect(buildAttendance(null).rows).toEqual([])
  })

  // POSITIVE CONTROL: the server's real "nothing here" answer must reach a DIFFERENT state.
  test('an answered read with no rows is EMPTY, which is a different claim', () => {
    const empty = buildAttendance(response([]))
    expect(empty.state).toBe(ATTENDANCE_EMPTY)
    expect(empty.state).not.toBe(ATTENDANCE_UNKNOWN)
  })

  test('an answered read with rows is LISTED', () => {
    expect(buildAttendance(response([row()])).state).toBe(ATTENDANCE_LISTED)
  })
})

describe('buildAttendance — the business day', () => {
  // `localBusinessDate` arrives BARE. `new Date(bare)` reads it as browser-local, and east of UTC
  // the resulting ISO day is the day BEFORE — every row would be filed under the wrong date.
  test('the day is sliced off the wire, and the browser-local reading is provably different', () => {
    const [built] = buildAttendance(response([row({ localBusinessDate: '2026-03-01T00:00:00' })])).rows

    expect(built.businessDate).toBe('2026-03-01')

    // THE MUTATION CHECK: the naive conversion really does name a different day under this TZ.
    expect(new Date('2026-03-01T00:00:00').toISOString().slice(0, 10)).toBe('2026-02-28')
    expect(built.businessDate).not.toBe(new Date('2026-03-01T00:00:00').toISOString().slice(0, 10))
  })

  test('a missing business day is null rather than today', () => {
    expect(buildAttendance(response([row({ localBusinessDate: null })])).rows[0].businessDate).toBeNull()
  })

  test('asOfUtc — a server-computed stamp, which arrives WITH a Z — reads as the same instant', () => {
    expect(buildAttendance(response([row()])).asOfUtc.toISOString()).toBe('2026-09-03T11:04:00.000Z')
  })
})

describe('buildAttendance — unknown is not zero, and zero is not unknown', () => {
  // `plannedMinutes: 0` is a REAL answer from this endpoint: the staff-day exists because something
  // was clocked, and no PUBLISHED assignment contributed to it. Rendering that as a dash would claim
  // the figure is unknown when the server stated it.
  test('a stated zero stays zero', () => {
    const [built] = buildAttendance(response([row({ plannedMinutes: 0, actualMinutes: 0, varianceMinutes: 0 })])).rows
    expect(built.plannedMinutes).toBe(0)
    expect(built.plannedMinutes).not.toBeNull()
    expect(built.actualMinutes).toBe(0)
  })

  test('an absent figure stays null', () => {
    const [built] = buildAttendance(response([row({ plannedMinutes: null, actualMinutes: undefined, varianceMinutes: null })])).rows
    expect(built.plannedMinutes).toBeNull()
    expect(built.actualMinutes).toBeNull()
    expect(built.varianceMinutes).toBeNull()
    expect(built.plannedMinutes).not.toBe(0)
  })

  test('an unnamed engagement is null, never the id standing in for a name', () => {
    const [built] = buildAttendance(response([row({ displayName: null })])).rows
    expect(built.displayName).toBeNull()
    expect(built.displayName).not.toBe('sm-1')
  })

  test('the flags are the SERVER\'s, carried through rather than re-derived', () => {
    // `missingPunch` already means "a planned day with nothing clocked, or an open session". A
    // second definition of it on the same screen is how two numbers start disagreeing.
    const [built] = buildAttendance(response([row({ missingPunch: true, plannedMinutes: 450, actualMinutes: 450 })])).rows
    expect(built.missingPunch).toBe(true)

    const [quiet] = buildAttendance(response([row({ missingPunch: false, plannedMinutes: 450, actualMinutes: 0 })])).rows
    expect(quiet.missingPunch).toBe(false)
  })
})

describe('buildAttendance — the counts a manager acts on', () => {
  test('counts rows the server flagged, not minutes', () => {
    const built = buildAttendance(response([
      row({ staffMemberId: 'sm-1', missingPunch: true }),
      row({ staffMemberId: 'sm-2', missingPunch: true, openSessionCount: 1 }),
      row({ staffMemberId: 'sm-3', missingPunch: false, approvedAdjustmentCount: 2 }),
      row({ staffMemberId: 'sm-4' })
    ]))

    expect(built.missingPunchCount).toBe(2)
    expect(built.adjustedRowCount).toBe(1)
  })

  test('adjustmentCount is the sum of the three states the read reports', () => {
    const [built] = buildAttendance(response([
      row({ pendingAdjustmentCount: 1, approvedAdjustmentCount: 2, rejectedAdjustmentCount: 3 })
    ])).rows
    expect(built.adjustmentCount).toBe(6)
  })

  test('missing counts default to zero, because a count is never unknown once the read answered', () => {
    const [built] = buildAttendance(response([
      row({ pendingAdjustmentCount: null, approvedAdjustmentCount: undefined, rejectedAdjustmentCount: null, openSessionCount: null })
    ])).rows
    expect(built.adjustmentCount).toBe(0)
    expect(built.openSessionCount).toBe(0)
  })
})

describe('formatMinutes', () => {
  test('renders hours and minutes', () => {
    expect(formatMinutes(450)).toBe('7 t 30 min')
    expect(formatMinutes(60)).toBe('1 t 0 min')
    expect(formatMinutes(45)).toBe('45 min')
    expect(formatMinutes(0)).toBe('0 min')
  })

  test('unknown is a dash, never a zero', () => {
    expect(formatMinutes(null)).toBe('—')
    expect(formatMinutes(undefined)).toBe('—')
    expect(formatMinutes(NaN)).toBe('—')
    expect(formatMinutes(null)).not.toBe('0 min')
    expect(formatMinutes(null, '?')).toBe('?')
  })

  // Variance is genuinely negative when somebody worked less than planned. Feeding a negative
  // straight through the hour/minute split gives "-1 t -15 min", which reads as two separate
  // negatives and is not the figure — the same shape of defect `utils/margin/money.js` documents
  // for sub-krone negative money.
  test('a negative figure carries ONE sign, in front', () => {
    expect(formatMinutes(-75)).toBe('−1 t 15 min')
    expect(formatMinutes(-30)).toBe('−30 min')

    // THE CONTROL: assert the malformed rendering the naive split would produce is absent.
    expect(formatMinutes(-75)).not.toContain('-15')
    expect(formatMinutes(-75)).not.toBe('-1 t -15 min')
    // U+2212, not a hyphen — it cannot be mistaken for a dash in a column of figures.
    expect(formatMinutes(-75).charCodeAt(0)).toBe(0x2212)
  })

  test('the magnitude of a negative matches the positive rendering', () => {
    expect(formatMinutes(-450).slice(1)).toBe(formatMinutes(450))
  })
})
