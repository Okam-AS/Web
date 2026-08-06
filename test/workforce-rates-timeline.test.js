import {
  RATE_EMPTY,
  RATE_LISTED,
  RATE_UNKNOWN,
  buildTimeline,
  collisionOn,
  predecessorOn,
  successorOn
} from '~/utils/workforce-rates/rate-timeline'

// These tests are meaningful only under a non-UTC TZ — run the suite with TZ=Europe/Oslo. The whole
// point of the instant assertions is that a browser-local read gives a DIFFERENT answer, and under
// TZ=UTC it would not.

const version = over => Object.assign({
  rateVersionId: 'rv-1',
  source: 'EngagementOverride',
  staffMemberId: 'sm-1',
  roleId: null,
  effectiveFromLocalDate: '2026-09-01',
  // A column-loaded stamp: EF returns `DateTimeKind.Unspecified` and Newtonsoft serialises it BARE.
  effectiveFromUtc: '2026-08-31T22:00:00',
  effectiveToUtc: null,
  timeZoneId: 'Europe/Oslo',
  hourlyRateMinor: 23550,
  currency: 'NOK',
  createdAtUtc: '2026-08-20T09:12:33'
}, over)

const history = (versions, over) => Object.assign({
  storeId: 42,
  source: 'EngagementOverride',
  staffMemberId: 'sm-1',
  roleId: null,
  timeZoneId: 'Europe/Oslo',
  versions
}, over)

describe('buildTimeline — honest state', () => {
  test('a failed read is UNKNOWN and never renders as "this scope has no rate"', () => {
    expect(buildTimeline(null).state).toBe(RATE_UNKNOWN)
    expect(buildTimeline(undefined).state).toBe(RATE_UNKNOWN)
    // A document that arrived without the array is unknown too: the read did not answer the
    // question, which is not the same as answering "none".
    expect(buildTimeline({}).state).toBe(RATE_UNKNOWN)
    expect(buildTimeline({ versions: null }).state).toBe(RATE_UNKNOWN)
  })

  // POSITIVE CONTROL for the block above: the server's real "no rate here" answer must reach a
  // DIFFERENT state, or a projection that returned `unknown` for everything would pass it.
  test('an answered read with no statements is EMPTY, which is a different claim', () => {
    const empty = buildTimeline(history([]))
    expect(empty.state).toBe(RATE_EMPTY)
    expect(empty.state).not.toBe(RATE_UNKNOWN)
    expect(empty.rows).toEqual([])
  })

  test('an answered read with statements is LISTED', () => {
    expect(buildTimeline(history([version()])).state).toBe(RATE_LISTED)
  })

  test('an unknown timeline carries no zone and no currency to render from', () => {
    const unknown = buildTimeline(null)
    expect(unknown.timeZoneId).toBeNull()
    expect(unknown.headCurrency).toBeNull()
  })
})

describe('buildTimeline — the instants', () => {
  // THE defect this projection exists to avoid, and it has shipped on this estate once already.
  // `effectiveFromUtc` arrives BARE off a column load; `new Date(bare)` reads it as browser-local,
  // which in Oslo is two hours out — enough to show a rate starting on the wrong day.
  test('a BARE stamp is read as UTC, and the browser-local reading is provably different', () => {
    const [row] = buildTimeline(history([version({ effectiveFromUtc: '2026-08-31T22:00:00' })])).rows

    expect(row.effectiveFromUtc.toISOString()).toBe('2026-08-31T22:00:00.000Z')

    // The MUTATION CHECK. If this projection used `new Date(iso)` the assertion above would fail —
    // and this line proves the two readings really do diverge under the suite's TZ, so the
    // assertion is not passing by coincidence.
    expect(new Date('2026-08-31T22:00:00').getTime()).not.toBe(row.effectiveFromUtc.getTime())
    expect(new Date('2026-08-31T22:00:00').getTime() - row.effectiveFromUtc.getTime()).toBe(-2 * 60 * 60 * 1000)
  })

  // The SAME document carries both shapes: the row this request just appended was built from
  // `StartOfDayUtc` (Kind = Utc) and serialises with a `Z`, while the rows loaded from the column
  // do not. Both denote the same instant and must read as the same instant.
  test('the zoned and the bare spelling of one instant resolve identically', () => {
    const bare = buildTimeline(history([version({ effectiveFromUtc: '2026-08-31T22:00:00' })])).rows[0]
    const zoned = buildTimeline(history([version({ effectiveFromUtc: '2026-08-31T22:00:00Z' })])).rows[0]

    expect(bare.effectiveFromUtc.getTime()).toBe(zoned.effectiveFromUtc.getTime())
  })

  test('the local date is taken VERBATIM off the wire, never derived from the instant', () => {
    // The instant is 22:00 on 31 August UTC; the venue calls that day 1 September. A client that
    // derived the date from the instant would have to pick a zone, and would print 31 August.
    const [row] = buildTimeline(history([version()])).rows
    expect(row.effectiveFromLocalDate).toBe('2026-09-01')
    expect(row.effectiveFromUtc.toISOString().slice(0, 10)).toBe('2026-08-31')
  })

  test('a null end bound is the open head, not a missing value', () => {
    const [open] = buildTimeline(history([version({ effectiveToUtc: null })])).rows
    expect(open.effectiveToUtc).toBeNull()
    expect(open.isOpen).toBe(true)

    const [closed] = buildTimeline(history([version({ effectiveToUtc: '2026-09-30T22:00:00' })])).rows
    expect(closed.isOpen).toBe(false)
    expect(closed.effectiveToUtc.toISOString()).toBe('2026-09-30T22:00:00.000Z')
  })

  test('a missing amount stays null rather than becoming zero', () => {
    const [row] = buildTimeline(history([version({ hourlyRateMinor: null })])).rows
    expect(row.hourlyRateMinor).toBeNull()
    expect(row.hourlyRateMinor).not.toBe(0)
  })

  test('the amount is carried through unscaled — this layer never touches money', () => {
    expect(buildTimeline(history([version({ hourlyRateMinor: 23550 })])).rows[0].hourlyRateMinor).toBe(23550)
    expect(buildTimeline(history([version({ hourlyRateMinor: 1 })])).rows[0].hourlyRateMinor).toBe(1)
  })

  // Three worlds, not two. The middle one is the one a guard usually loses.
  test('a non-finite amount is absence, and a genuine zero is not', () => {
    const rateOf = value => buildTimeline(history([version({ hourlyRateMinor: value })])).rows[0].hourlyRateMinor

    // PRESENT.
    expect(rateOf(23550)).toBe(23550)

    // GENUINELY ZERO. The server refuses a non-positive rate (`workforce.rate-not-positive`), so this
    // does not arrive today — which is the reason to assert it rather than the reason not to. The
    // guard has to be the kind that would carry a zero if one ever came, not the kind that is right
    // by accident: `row.hourlyRateMinor || null` passes both neighbours here and destroys this one.
    expect(rateOf(0)).toBe(0)
    expect(rateOf(0)).not.toBeNull()

    // ABSENT OR NON-FINITE. `typeof NaN` is `'number'`, so `typeof === 'number'` called a NaN a
    // stated rate. The one consumer, `amountLabel` in `WorkforceRateTimeline.vue`, tests `=== null`
    // and would have let it through to the cross-currency branch, where the deliberately ungated
    // `wholeAmount`/`fractionAmount` answer "0"/"00" to anything falsy: `0,00 SEK` for an hour of
    // work nobody priced.
    for (const value of [null, undefined, NaN, Infinity, -Infinity]) {
      expect(rateOf(value)).toBeNull()
    }

    // A numeric string is not this wire's shape and was already refused. Asserted so that relaxing
    // the guard to the GLOBAL `isFinite`, which coerces (`isFinite('23550')` is true) where
    // `Number.isFinite` does not, fails here rather than by putting a string into a formatter.
    expect(rateOf('23550')).toBeNull()
  })
})

describe('buildTimeline — the currency in force', () => {
  test('the head currency is the OPEN row\'s, not the first row\'s', () => {
    // A backdated statement is bounded by its successor and is therefore CLOSED, even though it may
    // arrive first in some ordering. The currency that matters is the one currently in force.
    const timeline = buildTimeline(history([
      version({ rateVersionId: 'rv-back', effectiveFromLocalDate: '2026-04-01', effectiveToUtc: '2026-06-30T22:00:00', currency: 'SEK' }),
      version({ rateVersionId: 'rv-open', effectiveFromLocalDate: '2026-07-01', effectiveToUtc: null, currency: 'NOK' })
    ]))

    expect(timeline.headCurrency).toBe('NOK')
    expect(timeline.headCurrency).not.toBe(timeline.rows[0].currency)
  })

  test('every row closed means no currency is in force, and that is said as null', () => {
    const timeline = buildTimeline(history([
      version({ effectiveToUtc: '2026-06-30T22:00:00' })
    ]))
    expect(timeline.headCurrency).toBeNull()
  })
})

describe('the append-only guards a form needs before it submits', () => {
  const timeline = buildTimeline(history([
    version({ rateVersionId: 'rv-apr', effectiveFromLocalDate: '2026-04-01', effectiveToUtc: '2026-06-30T22:00:00' }),
    version({ rateVersionId: 'rv-jul', effectiveFromLocalDate: '2026-07-01', effectiveToUtc: '2026-08-31T22:00:00' }),
    version({ rateVersionId: 'rv-sep', effectiveFromLocalDate: '2026-09-01', effectiveToUtc: null })
  ]))

  test('collisionOn names the statement already in force on that exact date', () => {
    expect(collisionOn(timeline, '2026-07-01').rateVersionId).toBe('rv-jul')
    expect(collisionOn(timeline, '2026-09-01').rateVersionId).toBe('rv-sep')
  })

  // POSITIVE CONTROL: a date with no statement must find NOTHING, or a guard that always reported a
  // collision would block every submission and satisfy the two assertions above.
  test('and finds nothing on a date that carries no statement', () => {
    expect(collisionOn(timeline, '2026-07-02')).toBeNull()
    expect(collisionOn(timeline, '2026-12-24')).toBeNull()
    expect(collisionOn(timeline, '')).toBeNull()
    expect(collisionOn(buildTimeline(null), '2026-07-01')).toBeNull()
    expect(collisionOn(buildTimeline(history([])), '2026-07-01')).toBeNull()
  })

  test('predecessorOn names the statement the server will close forward', () => {
    expect(predecessorOn(timeline, '2026-10-01').rateVersionId).toBe('rv-sep')
    expect(predecessorOn(timeline, '2026-08-01').rateVersionId).toBe('rv-jul')
    // Nothing precedes the first statement, so nothing is closed.
    expect(predecessorOn(timeline, '2026-01-01')).toBeNull()
  })

  test('successorOn names the statement that BOUNDS a backdated one rather than being cancelled by it', () => {
    // A rate agreed in June and dated back to 1 May must not silently cancel the raise somebody
    // already dated to 1 July: the server bounds the new row at the successor's start instead.
    expect(successorOn(timeline, '2026-05-01').rateVersionId).toBe('rv-jul')
    // Nothing follows a statement dated past the whole timeline.
    expect(successorOn(timeline, '2026-12-01')).toBeNull()
  })

  test('the two lookups are compared as calendar strings, so no zone is ever chosen here', () => {
    // `yyyy-MM-dd` sorts lexicographically exactly as it sorts chronologically, which is why these
    // comparisons need no parsing. A year boundary is where a naive numeric comparison would break.
    const across = buildTimeline(history([
      version({ rateVersionId: 'rv-2025', effectiveFromLocalDate: '2025-12-31', effectiveToUtc: '2025-12-31T23:00:00' }),
      version({ rateVersionId: 'rv-2026', effectiveFromLocalDate: '2026-01-01', effectiveToUtc: null })
    ]))
    expect(predecessorOn(across, '2026-06-01').rateVersionId).toBe('rv-2026')
    expect(successorOn(across, '2025-06-01').rateVersionId).toBe('rv-2025')
  })
})
