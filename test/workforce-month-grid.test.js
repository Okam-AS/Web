import { buildMonthGrid } from '~/utils/workforce/month-grid'
import { monthRange } from '~/utils/workforce/week-range'
import { DATA_COUNTED, DATA_NO_PLAN, DATA_UNKNOWN } from '~/utils/workforce/week-grid'

const OSLO = 'Europe/Oslo'
const ANNA = '11111111-1111-1111-1111-111111111111'

// July 2026: Wed 1 Jul … Fri 31 Jul. It starts on a Wednesday, so its ISO weeks are
// W27 (29 Jun–5 Jul) … W31 (27 Jul–2 Aug) — five weeks, with leading and trailing blanks.
const JULY = monthRange(OSLO, new Date('2026-07-15T09:00:00Z'))

function shift (over) {
  return Object.assign({
    shiftAssignmentId: 'a1',
    staffMemberId: ANNA,
    staffDisplayName: 'Anna Haugen',
    isOpenShift: false,
    roleId: null,
    roleName: null,
    startsUtc: '2026-07-06T06:00:00',
    endsUtc: '2026-07-06T14:00:00',
    localBusinessDate: '2026-07-06T00:00:00',
    startOffsetMinutes: 120,
    endOffsetMinutes: 120,
    paidBreakMinutes: 0,
    unpaidBreakMinutes: 0,
    state: 'Draft'
  }, over)
}

function counted (assignments) {
  return { view: 'draft', scheduleRevisionId: 'rev', state: 'Draft', timeZoneId: OSLO, assignments }
}
const noPlan = { view: 'draft', assignments: [] }

/** A full month of resolved-but-empty weeks, so a test only has to say what it changes. */
function allWeeks (overrides) {
  return JULY.weeks.map((_week, index) => {
    if (overrides && Object.prototype.hasOwnProperty.call(overrides, index)) { return overrides[index] }
    return counted([])
  })
}

describe('monthRange — the calendar', () => {
  test('July 2026 has 31 days and spans five ISO weeks', () => {
    expect(JULY.year).toBe(2026)
    expect(JULY.month).toBe(7)
    expect(JULY.days).toHaveLength(31)
    expect(JULY.weeks).toHaveLength(5)
  })

  test('it starts on a Wednesday, so two cells lead the calendar', () => {
    expect(JULY.days[0].weekday).toBe(3)
    expect(JULY.leadingBlanks).toBe(2)
  })

  test('the weeks are the SAME ISO weeks the week view uses', () => {
    expect(JULY.weeks[0].days[0].isoDate).toBe('2026-06-29')
    expect(JULY.weeks[0].isoWeek.week).toBe(27)
    expect(JULY.weeks[4].days[6].isoDate).toBe('2026-08-02')
  })

  test('month arithmetic wraps the year without a special case', () => {
    const december = monthRange(OSLO, new Date('2026-12-15T09:00:00Z'), 1)
    expect(december.year).toBe(2027)
    expect(december.month).toBe(1)
    const previous = monthRange(OSLO, new Date('2026-01-15T09:00:00Z'), -1)
    expect(previous.year).toBe(2025)
    expect(previous.month).toBe(12)
  })

  test('February in a leap year is 29 days', () => {
    expect(monthRange(OSLO, new Date('2028-02-10T09:00:00Z')).days).toHaveLength(29)
  })
})

describe('buildMonthGrid — per-day totals', () => {
  test('a day carries the paid minutes and shift count of its own week\'s revision', () => {
    const grid = buildMonthGrid({
      month: JULY,
      weekRanges: allWeeks({ 1: counted([shift(), shift({ shiftAssignmentId: 'a2' })]) })
    })
    const sixth = grid.days.find(d => d.isoDate === '2026-07-06')
    expect(sixth.shiftCount).toBe(2)
    expect(sixth.minutes).toBe(16 * 60)
    expect(sixth.dataState).toBe(DATA_COUNTED)
  })

  test('a day in an unread week is UNKNOWN, and a day in an unplanned week says so instead', () => {
    const grid = buildMonthGrid({ month: JULY, weekRanges: allWeeks({ 1: null, 2: noPlan }) })

    const inUnknownWeek = grid.days.find(d => d.isoDate === '2026-07-06')
    expect(inUnknownWeek.dataState).toBe(DATA_UNKNOWN)
    expect(inUnknownWeek.shiftCount).toBeNull()
    expect(inUnknownWeek.minutes).toBeNull()

    const inNoPlanWeek = grid.days.find(d => d.isoDate === '2026-07-13')
    expect(inNoPlanWeek.dataState).toBe(DATA_NO_PLAN)
    expect(inNoPlanWeek.shiftCount).toBeNull()
  })

  test('a resolved week with no shifts on a day is a TRUE zero, not an unknown', () => {
    const grid = buildMonthGrid({ month: JULY, weekRanges: allWeeks() })
    const sixth = grid.days.find(d => d.isoDate === '2026-07-06')
    expect(sixth.shiftCount).toBe(0)
    expect(sixth.minutes).toBe(0)
  })

  test('a shorter weekRanges array leaves the remaining weeks unknown rather than padding zeros', () => {
    const grid = buildMonthGrid({ month: JULY, weekRanges: [counted([])] })
    expect(grid.weekStates).toEqual([
      DATA_COUNTED, DATA_UNKNOWN, DATA_UNKNOWN, DATA_UNKNOWN, DATA_UNKNOWN
    ])
  })
})

describe('buildMonthGrid — no double counting across overlapping revisions', () => {
  // A revision's assignments are NOT clipped to the requested range, so two week reads can both
  // hand back the same shift. Each day belongs to exactly one week, which is what prevents this.
  test('a shift returned by a week that does not own its day is ignored by that week', () => {
    const stray = shift({ shiftAssignmentId: 'stray' })
    const grid = buildMonthGrid({
      month: JULY,
      // Week 1 owns 6 Jul. Week 2 also returns the 6 Jul shift; only week 1 may place it.
      weekRanges: allWeeks({ 1: counted([stray]), 2: counted([stray]) })
    })
    const sixth = grid.days.find(d => d.isoDate === '2026-07-06')
    expect(sixth.shiftCount).toBe(1)
    expect(grid.totals.shiftCount).toBe(1)
  })

  test('a shift falling outside the month entirely is not counted', () => {
    const grid = buildMonthGrid({
      month: JULY,
      // 29 Jun is in week 0's range but is a June day.
      weekRanges: allWeeks({ 0: counted([shift({ localBusinessDate: '2026-06-29T00:00:00' })]) })
    })
    expect(grid.totals.shiftCount).toBe(0)
    expect(grid.days.every(d => d.month === 7)).toBe(true)
  })
})

// The reason this view exists: "how much do I staff a Monday?" is a question the week grid
// structurally cannot answer.
describe('buildMonthGrid — the per-weekday column totals', () => {
  test('every Monday of the month is summed into one column', () => {
    // July 2026 Mondays: 6, 13, 20, 27 — four of them. Four hours on each of two of them.
    const grid = buildMonthGrid({
      month: JULY,
      weekRanges: allWeeks({
        1: counted([shift({ localBusinessDate: '2026-07-06T00:00:00', startsUtc: '2026-07-06T06:00:00', endsUtc: '2026-07-06T10:00:00' })]),
        2: counted([shift({ shiftAssignmentId: 'b', localBusinessDate: '2026-07-13T00:00:00', startsUtc: '2026-07-13T06:00:00', endsUtc: '2026-07-13T10:00:00' })])
      })
    })

    const monday = grid.weekdayColumns.find(c => c.weekday === 1)
    expect(monday.dayCount).toBe(4)
    expect(monday.countedDays).toBe(4)
    expect(monday.isComplete).toBe(true)
    expect(monday.minutes).toBe(8 * 60)
    expect(monday.shiftCount).toBe(2)
    // The mean divides by the days actually counted, so it is 2h over four Mondays.
    expect(monday.averageMinutes).toBe(120)
  })

  test('a month has five of some weekdays and four of the rest, and each column knows which', () => {
    const grid = buildMonthGrid({ month: JULY, weekRanges: allWeeks() })
    const counts = {}
    for (const column of grid.weekdayColumns) { counts[column.weekday] = column.dayCount }
    // July 2026 runs Wed 1 → Fri 31: five Wednesdays, Thursdays and Fridays; four of the rest.
    expect(counts).toEqual({ 1: 4, 2: 4, 3: 5, 4: 5, 5: 5, 6: 4, 7: 4 })
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(31)
  })

  test('THE HONESTY RULE: a partial column keeps its number AND its denominator', () => {
    // Week 2 (13–19 Jul) did not load, so one of the four Mondays is unknown.
    const grid = buildMonthGrid({
      month: JULY,
      weekRanges: allWeeks({
        1: counted([shift({ localBusinessDate: '2026-07-06T00:00:00', startsUtc: '2026-07-06T06:00:00', endsUtc: '2026-07-06T10:00:00' })]),
        2: null
      })
    })

    const monday = grid.weekdayColumns.find(c => c.weekday === 1)
    expect(monday.dayCount).toBe(4)
    expect(monday.countedDays).toBe(3)
    expect(monday.unknownDays).toBe(1)
    expect(monday.noPlanDays).toBe(0)
    expect(monday.isComplete).toBe(false)
    // The sum of what WAS read survives — it is real and useful — but never travels alone.
    expect(monday.minutes).toBe(4 * 60)
  })

  test('unread days and unplanned days are counted apart, because they are different sentences', () => {
    const grid = buildMonthGrid({ month: JULY, weekRanges: allWeeks({ 1: null, 2: noPlan }) })
    const monday = grid.weekdayColumns.find(c => c.weekday === 1)
    expect(monday.unknownDays).toBe(1)
    expect(monday.noPlanDays).toBe(1)
    expect(monday.countedDays).toBe(2)
  })

  test('a column with nothing counted at all is null, never 0', () => {
    const grid = buildMonthGrid({ month: JULY, weekRanges: JULY.weeks.map(() => null) })
    for (const column of grid.weekdayColumns) {
      expect(column.minutes).toBeNull()
      expect(column.shiftCount).toBeNull()
      expect(column.averageMinutes).toBeNull()
      expect(column.countedDays).toBe(0)
    }
    expect(grid.totals.minutes).toBeNull()
  })

  test('the seven columns partition the month exactly once', () => {
    const grid = buildMonthGrid({ month: JULY, weekRanges: allWeeks() })
    const keys = grid.weekdayColumns.reduce((acc, c) => acc.concat(c.dayKeys), [])
    expect(keys).toHaveLength(31)
    expect(new Set(keys).size).toBe(31)
  })
})

describe('buildMonthGrid — month and week totals', () => {
  test('the month total is the sum of the counted days, with its own denominator', () => {
    const grid = buildMonthGrid({
      month: JULY,
      weekRanges: allWeeks({ 1: counted([shift()]), 3: null })
    })
    expect(grid.totals.shiftCount).toBe(1)
    expect(grid.totals.minutes).toBe(8 * 60)
    expect(grid.totals.dayCount).toBe(31)
    expect(grid.totals.countedDays).toBe(31 - 7)
    expect(grid.totals.isComplete).toBe(false)
    expect(grid.allCounted).toBe(false)
    expect(grid.anyUnknown).toBe(true)
  })

  test('a fully counted month says so, and only then may a total stand alone', () => {
    const grid = buildMonthGrid({ month: JULY, weekRanges: allWeeks() })
    expect(grid.allCounted).toBe(true)
    expect(grid.anyUnknown).toBe(false)
    expect(grid.totals.isComplete).toBe(true)
    expect(grid.totals.countedDays).toBe(31)
  })

  test('a week row only counts the days of the month it actually contains', () => {
    const grid = buildMonthGrid({ month: JULY, weekRanges: allWeeks() })
    // W27 holds 29–30 Jun plus 1–5 Jul: five days of July.
    expect(grid.weeks[0].dayCount).toBe(5)
    expect(grid.weeks[0].outsideMonth).toEqual(['2026-06-29', '2026-06-30'])
    // W31 holds 27–31 Jul plus 1–2 Aug.
    expect(grid.weeks[4].dayCount).toBe(5)
    expect(grid.weeks[4].outsideMonth).toEqual(['2026-08-01', '2026-08-02'])
    expect(grid.weeks.reduce((sum, w) => sum + w.dayCount, 0)).toBe(31)
  })

  // Permanently null now that the rates lane has landed, for three independent reasons: each week's
  // cost node is rounded once by the backend so `sum(weeks)` drifts, the weeks need not share a
  // currency, and an unknown week would silently shrink the sum.
  test('a month carries no money at all — null, never a sum of the weeks', () => {
    expect(buildMonthGrid({ month: JULY, weekRanges: allWeeks() }).totals.cost).toBeNull()
  })

  test('the typed 409 marks its shift here too', () => {
    const grid = buildMonthGrid({
      month: JULY,
      weekRanges: allWeeks({ 1: counted([shift()]) }),
      conflict: { conflictKind: 'assignment-overlap', conflictingAssignmentId: 'a1' }
    })
    expect(grid.days.find(d => d.isoDate === '2026-07-06').hasConflict).toBe(true)
  })
})

describe('buildMonthGrid — a month across the DST change', () => {
  // Norway falls back on Sunday 25 October 2026. The month must still have exactly 31 days and
  // every day must land in exactly one weekday column.
  const OCTOBER = monthRange(OSLO, new Date('2026-10-15T09:00:00Z'))

  test('October 2026 keeps 31 civil days across the fold', () => {
    expect(OCTOBER.days).toHaveLength(31)
    expect(OCTOBER.days[24].isoDate).toBe('2026-10-25')
  })

  test('the weekday columns still partition it exactly', () => {
    const grid = buildMonthGrid({ month: OCTOBER, weekRanges: OCTOBER.weeks.map(() => noPlan) })
    const keys = grid.weekdayColumns.reduce((acc, c) => acc.concat(c.dayKeys), [])
    expect(keys).toHaveLength(31)
    expect(new Set(keys).size).toBe(31)
  })
})
