import {
  buildWeekGrid,
  markersFromRequests,
  paidMinutesOf,
  formatMinutes,
  readCost,
  readShiftCost,
  DATA_UNKNOWN,
  DATA_NO_PLAN,
  DATA_COUNTED,
  COST_UNKNOWN,
  COST_REFUSED,
  COST_TOTALLED,
  COST_OPEN,
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

// --- the money axis -----------------------------------------------------------------------------

function totals (over) {
  return Object.assign({
    costComplete: true,
    totalMinor: 0,
    currency: 'NOK',
    incompleteCode: null,
    incompleteDetail: null,
    paidMinutes: 0,
    pricedShiftCount: 0,
    unpricedShiftCount: 0,
    openShiftCount: 0,
    openShiftMinutes: 0
  }, over)
}

describe('readCost', () => {
  test('no node at all is unknown, which is not a state of the money but the absence of a reading', () => {
    expect(readCost(null)).toBeNull()
    expect(readCost(undefined)).toBeNull()
  })

  test('a complete cost carries the total the backend rounded once', () => {
    const cost = readCost(totals({ totalMinor: 2001, pricedShiftCount: 2, paidMinutes: 900 }))

    expect(cost.state).toBe(COST_TOTALLED)
    expect(cost.totalMinor).toBe(2001)
    expect(cost.currency).toBe('NOK')
    expect(cost.isFloor).toBe(false)
  })

  test('an incomplete cost has no total — and none is reconstructed from the counts', () => {
    const cost = readCost(totals({
      costComplete: false,
      totalMinor: null,
      pricedShiftCount: 4,
      unpricedShiftCount: 2,
      incompleteCode: 'workforce.rate-unresolved',
      incompleteDetail: 'No rate for staff member over 2026-07-28T06:00:00 – 2026-07-28T14:00:00.'
    }))

    expect(cost.state).toBe(COST_REFUSED)
    expect(cost.totalMinor).toBeNull()
    expect(cost.unpricedShiftCount).toBe(2)
    expect(cost.incompleteCode).toBe('workforce.rate-unresolved')
    expect(cost.incompleteDetail).toContain('2026-07-28T06:00:00')
  })

  // The flag is the refusal; the null is only its wire form. A body carrying both must not be read
  // as a total, because that is exactly the partial sum the backend refuses to compute.
  test('the completeness flag wins over a number that arrived beside a false flag', () => {
    const cost = readCost(totals({ costComplete: false, totalMinor: 12345 }))

    expect(cost.state).toBe(COST_REFUSED)
    expect(cost.totalMinor).toBeNull()
  })

  test('a complete cost with no readable number stays unknown rather than becoming zero', () => {
    const cost = readCost(totals({ totalMinor: null }))

    expect(cost.state).toBe(COST_UNKNOWN)
    expect(cost.totalMinor).toBeNull()
  })

  // Rule 3: a vacancy is a planning state, not a data defect. It does not make the cost incomplete,
  // it is excluded from the total, and the total it sits beside is therefore a floor.
  test('open shifts leave the cost complete and mark the total as a floor', () => {
    const cost = readCost(totals({
      totalMinor: 124000,
      pricedShiftCount: 1,
      openShiftCount: 2,
      openShiftMinutes: 900
    }))

    expect(cost.state).toBe(COST_TOTALLED)
    expect(cost.totalMinor).toBe(124000)
    expect(cost.unpricedShiftCount).toBe(0)
    expect(cost.isFloor).toBe(true)
    expect(cost.openShiftCount).toBe(2)
    expect(cost.openShiftMinutes).toBe(900)
  })

  test('a currency clash refuses the range without counting an unpriced shift', () => {
    const cost = readCost(totals({
      costComplete: false,
      totalMinor: null,
      pricedShiftCount: 2,
      unpricedShiftCount: 0,
      incompleteCode: 'workforce.cost-currency-mismatch',
      incompleteDetail: 'The shifts in this range are priced in different currencies (NOK, CHF).'
    }))

    expect(cost.state).toBe(COST_REFUSED)
    expect(cost.incompleteCode).toBe('workforce.cost-currency-mismatch')
    expect(cost.unpricedShiftCount).toBe(0)
  })
})

describe('readShiftCost', () => {
  test('a priced shift carries its own once-rounded figure', () => {
    const cost = readShiftCost({ shiftAssignmentId: 'a1', isOpenShift: false, costComplete: true, totalMinor: 1001, currency: 'NOK' })

    expect(cost.state).toBe(COST_TOTALLED)
    expect(cost.totalMinor).toBe(1001)
  })

  test('a vacancy takes its own state — neither a refusal nor a zero', () => {
    const cost = readShiftCost({ shiftAssignmentId: 'o1', isOpenShift: true, costComplete: false, totalMinor: null, currency: null })

    expect(cost.state).toBe(COST_OPEN)
    expect(cost.isOpenShift).toBe(true)
    expect(cost.totalMinor).toBeNull()
    expect(cost.refusalCode).toBeNull()
  })

  test('a refused shift names the code the manager can act on', () => {
    const cost = readShiftCost({
      shiftAssignmentId: 'a2',
      isOpenShift: false,
      costComplete: false,
      totalMinor: null,
      refusalCode: 'workforce.rate-unresolved',
      refusalDetail: 'No rate.'
    })

    expect(cost.state).toBe(COST_REFUSED)
    expect(cost.refusalCode).toBe('workforce.rate-unresolved')
  })
})

describe('buildWeekGrid — money', () => {
  function cost (over, days) {
    return Object.assign(totals(over), { days: days || [] })
  }
  function costDay (date, over, shifts) {
    return Object.assign(totals(over), { localBusinessDate: date, shifts: shifts || [] })
  }

  test('the day and week figures are READ, never summed from the shift chips', () => {
    const twoShifts = [shift(), shift({ shiftAssignmentId: 'a2', startsUtc: '2026-07-28T14:00:00', endsUtc: '2026-07-28T22:00:00' })]
    const chips = [
      { shiftAssignmentId: 'a1', staffMemberId: ANNA, isOpenShift: false, costComplete: true, totalMinor: 1001, currency: 'NOK', paidMinutes: 450 },
      { shiftAssignmentId: 'a2', staffMemberId: ANNA, isOpenShift: false, costComplete: true, totalMinor: 1001, currency: 'NOK', paidMinutes: 450 }
    ]
    const dayAndWeek = { totalMinor: 2001, pricedShiftCount: 2, paidMinutes: 900 }

    const grid = buildWeekGrid({
      days: WEEK.days,
      staff,
      markers: [],
      range: Object.assign(draftRange(twoShifts), {
        cost: cost(dayAndWeek, [costDay('2026-07-28T00:00:00', dayAndWeek, chips)])
      })
    })

    // Each shift is rounded once, and so are the day and the week — over the UNROUNDED amounts. The
    // two disagree by an øre per shift, on purpose, and the model must carry the backend's figure.
    const tuesday = grid.days.find(d => d.isoDate === '2026-07-28')
    const sumOfChips = chips.reduce((sum, c) => sum + c.totalMinor, 0)

    expect(sumOfChips).toBe(2002)
    expect(tuesday.cost.totalMinor).toBe(2001)
    expect(grid.totals.cost.totalMinor).toBe(2001)
    expect(tuesday.cost.totalMinor).not.toBe(sumOfChips)
    expect(grid.totals.cost.totalMinor).not.toBe(sumOfChips)
  })

  test('a shift chip carries its own cost, keyed on the assignment id', () => {
    const grid = buildWeekGrid({
      days: WEEK.days,
      staff,
      markers: [],
      range: Object.assign(draftRange([shift()]), {
        cost: cost({ totalMinor: 124000, pricedShiftCount: 1 }, [
          costDay('2026-07-28T00:00:00', { totalMinor: 124000, pricedShiftCount: 1 }, [
            { shiftAssignmentId: 'a1', staffMemberId: ANNA, isOpenShift: false, costComplete: true, totalMinor: 124000, currency: 'NOK', paidMinutes: 450 }
          ])
        ])
      })
    })

    const annaRow = grid.rows.find(r => r.staffMemberId === ANNA)
    expect(annaRow.cells[1].shifts[0].cost.totalMinor).toBe(124000)
    // And still no per-person total: the API rolls up per day and per range only.
    expect(annaRow.totals.cost).toBeNull()
  })

  test('a range with no revision produces no money, even though the read carries a zero cost', () => {
    const grid = buildWeekGrid({
      days: WEEK.days,
      staff,
      markers: [],
      range: { view: 'draft', scheduleRevisionId: null, assignments: [], cost: cost({ totalMinor: 0 }, []) }
    })

    expect(grid.dataState).toBe(DATA_NO_PLAN)
    expect(grid.costKnown).toBe(false)
    expect(grid.totals.cost).toBeNull()
    expect(grid.days.every(d => d.cost === null)).toBe(true)
  })

  test('a response without the cost overlay is unknown money, not zero money', () => {
    const grid = buildWeekGrid({ days: WEEK.days, staff, markers: [], range: draftRange([shift()]) })

    expect(grid.dataState).toBe(DATA_COUNTED)
    expect(grid.costKnown).toBe(false)
    expect(grid.totals.cost).toBeNull()
    expect(grid.rows[0].cells[1].shifts.every(s => s.cost === null)).toBe(true)
  })
})
