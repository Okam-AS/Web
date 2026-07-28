import {
  buildWeekGrid,
  markersFromRequests,
  paidMinutesOf,
  formatMinutes,
  DATA_UNKNOWN,
  DATA_NO_PLAN,
  DATA_COUNTED,
  OPEN_ROW_KEY
} from '~/utils/workforce/week-grid'
import { weekRange } from '~/utils/workforce/week-range'

const OSLO = 'Europe/Oslo'
const WEEK = weekRange(OSLO, new Date('2026-07-29T09:00:00Z')) // Mon 27 Jul – Sun 2 Aug 2026

const ANNA = '11111111-1111-1111-1111-111111111111'
const BJORN = '22222222-2222-2222-2222-222222222222'

const staff = [
  { staffMemberId: ANNA, displayName: 'Anna Haugen', isActive: true, employmentNumber: '104' },
  { staffMemberId: BJORN, displayName: 'Bjørn Ek', isActive: true, employmentNumber: '108' }
]

// Oslo is UTC+2 in July, so 06:00Z reads 08:00 locally.
function shift (over) {
  return Object.assign({
    shiftAssignmentId: 'a1',
    staffMemberId: ANNA,
    staffDisplayName: 'Anna Haugen',
    isOpenShift: false,
    roleName: 'Kokk',
    startsUtc: '2026-07-28T06:00:00',
    endsUtc: '2026-07-28T14:00:00',
    localBusinessDate: '2026-07-28T00:00:00',
    startOffsetMinutes: 120,
    endOffsetMinutes: 120,
    paidBreakMinutes: 0,
    unpaidBreakMinutes: 30,
    state: 'Draft'
  }, over)
}

function draftRange (assignments) {
  return {
    view: 'draft',
    scheduleRevisionId: 'rev-1',
    revisionNumber: 2,
    state: 'Draft',
    timeZoneId: OSLO,
    asOfUtc: '2026-07-29T09:00:00Z',
    assignments
  }
}

describe('buildWeekGrid — honest state', () => {
  test('an unread week is unknown: no counts, no totals, never a zero', () => {
    const grid = buildWeekGrid({ days: WEEK.days, range: null, staff, markers: [] })

    expect(grid.dataState).toBe(DATA_UNKNOWN)
    expect(grid.days.every(d => d.shiftCount === null)).toBe(true)
    expect(grid.totals.shiftCount).toBeNull()
    expect(grid.totals.minutes).toBeNull()
    expect(grid.rows[0].totals.minutes).toBeNull()
  })

  test('a week the API answered with no revision reads as no plan, not as an empty plan', () => {
    const grid = buildWeekGrid({
      days: WEEK.days,
      range: { view: 'draft', scheduleRevisionId: null, assignments: [] },
      staff,
      markers: []
    })

    expect(grid.dataState).toBe(DATA_NO_PLAN)
    expect(grid.days.every(d => d.shiftCount === null)).toBe(true)
    expect(grid.totals.shiftCount).toBeNull()
  })

  test('a resolved revision makes zero an honest zero', () => {
    const grid = buildWeekGrid({ days: WEEK.days, range: draftRange([shift()]), staff, markers: [] })

    expect(grid.dataState).toBe(DATA_COUNTED)
    expect(grid.days.find(d => d.isoDate === '2026-07-28').shiftCount).toBe(1)
    expect(grid.days.find(d => d.isoDate === '2026-07-29').shiftCount).toBe(0)
    expect(grid.totals.shiftCount).toBe(1)
  })

  test('an unloaded roster is declared rather than presented as the full staff list', () => {
    const grid = buildWeekGrid({ days: WEEK.days, range: draftRange([shift()]), staff: null, markers: null })

    expect(grid.rosterKnown).toBe(false)
    expect(grid.markersKnown).toBe(false)
  })

  test('the wage total stays null — the money lane owns it and 0 kr would be a lie', () => {
    const grid = buildWeekGrid({ days: WEEK.days, range: draftRange([shift()]), staff, markers: [] })

    expect(grid.totals.cost).toBeNull()
    expect(grid.rows[0].totals.cost).toBeNull()
  })
})

describe('buildWeekGrid — shift placement', () => {
  test('a shift lands in its own employee row on its business date, in store-local wall time', () => {
    const grid = buildWeekGrid({ days: WEEK.days, range: draftRange([shift()]), staff, markers: [] })
    const anna = grid.rows.find(r => r.key === ANNA)
    const tuesday = anna.cells.find(c => c.isoDate === '2026-07-28')

    expect(tuesday.shifts).toHaveLength(1)
    expect(tuesday.shifts[0].start).toBe('08:00')
    expect(tuesday.shifts[0].end).toBe('16:00')
    expect(tuesday.shifts[0].roleName).toBe('Kokk')
    expect(anna.cells.filter(c => c.shifts.length)).toHaveLength(1)
  })

  test('an overnight shift stays on the business date the server attributed it to', () => {
    const overnight = shift({
      shiftAssignmentId: 'night',
      startsUtc: '2026-07-28T20:00:00',
      endsUtc: '2026-07-29T02:00:00',
      localBusinessDate: '2026-07-28T00:00:00',
      unpaidBreakMinutes: 0
    })
    const grid = buildWeekGrid({ days: WEEK.days, range: draftRange([overnight]), staff, markers: [] })
    const anna = grid.rows.find(r => r.key === ANNA)

    expect(anna.cells.find(c => c.isoDate === '2026-07-28').shifts).toHaveLength(1)
    expect(anna.cells.find(c => c.isoDate === '2026-07-29').shifts).toHaveLength(0)
    expect(anna.cells.find(c => c.isoDate === '2026-07-28').shifts[0].crossesMidnight).toBe(true)
  })

  test('shifts in a cell are ordered by their start time', () => {
    const grid = buildWeekGrid({
      days: WEEK.days,
      range: draftRange([
        shift({ shiftAssignmentId: 'late', startsUtc: '2026-07-28T14:00:00', endsUtc: '2026-07-28T20:00:00' }),
        shift({ shiftAssignmentId: 'early' })
      ]),
      staff,
      markers: []
    })
    const cell = grid.rows.find(r => r.key === ANNA).cells.find(c => c.isoDate === '2026-07-28')

    expect(cell.shifts.map(s => s.id)).toEqual(['early', 'late'])
  })

  test('a shift outside the displayed week is not drawn or counted', () => {
    const outside = shift({
      shiftAssignmentId: 'next-week',
      localBusinessDate: '2026-08-10T00:00:00'
    })
    const grid = buildWeekGrid({ days: WEEK.days, range: draftRange([outside]), staff, markers: [] })

    expect(grid.totals.shiftCount).toBe(0)
    expect(grid.rows.every(r => r.cells.every(c => !c.shifts.length))).toBe(true)
  })

  test('row and week totals subtract unpaid breaks', () => {
    const grid = buildWeekGrid({
      days: WEEK.days,
      range: draftRange([shift(), shift({ shiftAssignmentId: 'a2', localBusinessDate: '2026-07-30T00:00:00' })]),
      staff,
      markers: []
    })
    const anna = grid.rows.find(r => r.key === ANNA)

    expect(anna.totals.shiftCount).toBe(2)
    expect(anna.totals.minutes).toBe(2 * (8 * 60 - 30))
    expect(grid.totals.minutes).toBe(2 * (8 * 60 - 30))
  })
})

describe('buildWeekGrid — rows', () => {
  test('an employee with nothing scheduled still occupies a row', () => {
    const grid = buildWeekGrid({ days: WEEK.days, range: draftRange([shift()]), staff, markers: [] })
    const bjorn = grid.rows.find(r => r.key === BJORN)

    expect(bjorn).toBeDefined()
    expect(bjorn.totals.shiftCount).toBe(0)
    expect(bjorn.cells).toHaveLength(7)
  })

  test('the open-shift row exists even when nothing is open', () => {
    const grid = buildWeekGrid({ days: WEEK.days, range: draftRange([shift()]), staff, markers: [] })

    expect(grid.openRow.key).toBe(OPEN_ROW_KEY)
    expect(grid.openRow.totals.shiftCount).toBe(0)
  })

  test('an unassigned shift goes to the open row, not into anyone else', () => {
    const open = shift({
      shiftAssignmentId: 'open-1',
      staffMemberId: null,
      staffDisplayName: null,
      isOpenShift: true
    })
    const grid = buildWeekGrid({ days: WEEK.days, range: draftRange([open]), staff, markers: [] })

    expect(grid.openRow.cells.find(c => c.isoDate === '2026-07-28').shifts).toHaveLength(1)
    expect(grid.openRow.totals.shiftCount).toBe(1)
    expect(grid.rows.every(r => r.totals.shiftCount === 0)).toBe(true)
  })

  // StaffMemberId is nullable server-side and IsOpenShift is derived from it; a payload carrying
  // only the null must not fall through into a row keyed on undefined.
  test('a null staff member is an open shift even without the isOpenShift flag', () => {
    const open = shift({ shiftAssignmentId: 'open-2', staffMemberId: null, staffDisplayName: null, isOpenShift: false })
    const grid = buildWeekGrid({ days: WEEK.days, range: draftRange([open]), staff, markers: [] })

    expect(grid.openRow.totals.shiftCount).toBe(1)
    expect(grid.rows).toHaveLength(2)
  })

  test('a shift for someone off the roster keeps its row rather than disappearing', () => {
    const ghost = shift({
      shiftAssignmentId: 'ghost',
      staffMemberId: 'deadbeef',
      staffDisplayName: 'Kari Utmeldt'
    })
    const grid = buildWeekGrid({ days: WEEK.days, range: draftRange([ghost]), staff, markers: [] })
    const row = grid.rows.find(r => r.key === 'deadbeef')

    expect(row).toBeDefined()
    expect(row.isRostered).toBe(false)
    expect(row.name).toBe('Kari Utmeldt')
    expect(grid.totals.shiftCount).toBe(1)
  })
})

describe('markersFromRequests', () => {
  test('an unavailability exception becomes an Utilgjengelig marker on its days', () => {
    const markers = markersFromRequests([{
      kind: 'availability-exception',
      staffMemberId: BJORN,
      availabilityKind: 'Unavailable',
      localStartDate: '2026-07-29T00:00:00',
      localEndDate: '2026-07-29T00:00:00'
    }])
    const grid = buildWeekGrid({ days: WEEK.days, range: draftRange([]), staff, markers })
    const bjorn = grid.rows.find(r => r.key === BJORN)

    expect(bjorn.cells.find(c => c.isoDate === '2026-07-29').markers).toEqual(['unavailable'])
    expect(bjorn.cells.find(c => c.isoDate === '2026-07-28').markers).toEqual([])
  })

  test('an approved absence spans every day it covers', () => {
    const markers = markersFromRequests([{
      kind: 'time-off',
      staffMemberId: ANNA,
      status: 'Approved',
      localStartDate: '2026-07-30T00:00:00',
      localEndDate: '2026-08-01T00:00:00'
    }])
    const grid = buildWeekGrid({ days: WEEK.days, range: draftRange([]), staff, markers })
    const anna = grid.rows.find(r => r.key === ANNA)
    const marked = anna.cells.filter(c => c.markers.length).map(c => c.isoDate)

    expect(marked).toEqual(['2026-07-30', '2026-07-31', '2026-08-01'])
  })

  test('an undecided absence is marked as pending, a refused one not at all', () => {
    const markers = markersFromRequests([
      { kind: 'time-off', staffMemberId: ANNA, status: 'Submitted', localStartDate: '2026-07-28T00:00:00', localEndDate: '2026-07-28T00:00:00' },
      { kind: 'time-off', staffMemberId: BJORN, status: 'Rejected', localStartDate: '2026-07-28T00:00:00', localEndDate: '2026-07-28T00:00:00' }
    ])

    expect(markers).toEqual([
      { staffMemberId: ANNA, kind: 'time-off-pending', fromKey: '2026-07-28', toKey: '2026-07-28' }
    ])
  })

  test('two exceptions of the same kind on one day collapse to one marker', () => {
    const markers = markersFromRequests([
      { kind: 'availability-exception', staffMemberId: ANNA, availabilityKind: 'Unavailable', localStartDate: '2026-07-28T00:00:00', localEndDate: '2026-07-28T00:00:00' },
      { kind: 'availability-exception', staffMemberId: ANNA, availabilityKind: 'Unavailable', localStartDate: '2026-07-27T00:00:00', localEndDate: '2026-07-29T00:00:00' }
    ])
    const grid = buildWeekGrid({ days: WEEK.days, range: draftRange([]), staff, markers })
    const anna = grid.rows.find(r => r.key === ANNA)

    expect(anna.cells.find(c => c.isoDate === '2026-07-28').markers).toEqual(['unavailable'])
  })

  test('a positive availability declaration produces no marker', () => {
    const markers = markersFromRequests([{
      kind: 'availability-exception',
      staffMemberId: ANNA,
      availabilityKind: 'Available',
      localStartDate: '2026-07-28T00:00:00',
      localEndDate: '2026-07-28T00:00:00'
    }])

    expect(markers).toEqual([])
  })

  test('an open shift carries no personal markers', () => {
    const markers = markersFromRequests([{
      kind: 'availability-exception',
      staffMemberId: ANNA,
      availabilityKind: 'Unavailable',
      localStartDate: '2026-07-28T00:00:00',
      localEndDate: '2026-07-28T00:00:00'
    }])
    const grid = buildWeekGrid({ days: WEEK.days, range: draftRange([]), staff, markers })

    expect(grid.openRow.cells.every(c => c.markers.length === 0)).toBe(true)
  })
})

describe('buildWeekGrid — the double-booking guard the API enforces', () => {
  test('a same-store overlap marks the shift the API named', () => {
    const conflict = { conflictKind: 'assignment-overlap', conflictingAssignmentId: 'a1' }
    const grid = buildWeekGrid({ days: WEEK.days, range: draftRange([shift()]), staff, markers: [], conflict })
    const anna = grid.rows.find(r => r.key === ANNA)
    const cell = anna.cells.find(c => c.isoDate === '2026-07-28')

    expect(cell.shifts[0].isConflicting).toBe(true)
    expect(cell.hasConflict).toBe(true)
    expect(anna.hasConflict).toBe(true)
    expect(grid.hiddenConflict).toBe(false)
  })

  test('a cross-store conflict is flagged but points at no shift — the API discloses none', () => {
    const conflict = { conflictKind: 'hidden-engagement-conflict' }
    const grid = buildWeekGrid({ days: WEEK.days, range: draftRange([shift()]), staff, markers: [], conflict })

    expect(grid.hiddenConflict).toBe(true)
    expect(grid.rows.every(r => !r.hasConflict)).toBe(true)
    expect(grid.openRow.hasConflict).toBe(false)
  })

  test('with no conflict nothing is marked', () => {
    const grid = buildWeekGrid({ days: WEEK.days, range: draftRange([shift()]), staff, markers: [] })

    expect(grid.hiddenConflict).toBe(false)
    expect(grid.rows.every(r => !r.hasConflict)).toBe(true)
  })
})

describe('paidMinutesOf / formatMinutes', () => {
  test('unpaid break comes off the span', () => {
    expect(paidMinutesOf(shift())).toBe(450)
  })

  test('a malformed pair is zero, never negative', () => {
    expect(paidMinutesOf(shift({ endsUtc: '2026-07-28T06:10:00' }))).toBe(0)
  })

  test('formats hours and minutes', () => {
    expect(formatMinutes(450)).toBe('7t 30m')
    expect(formatMinutes(480)).toBe('8t')
    expect(formatMinutes(0)).toBe('0t')
  })

  test('an unknown total formats as null so the view can show a dash instead of 0t', () => {
    expect(formatMinutes(null)).toBeNull()
    expect(formatMinutes(undefined)).toBeNull()
  })
})
