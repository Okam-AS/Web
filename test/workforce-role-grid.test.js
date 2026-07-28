import { buildRoleGrid, ROLE_NONE_KEY, DATA_UNKNOWN, DATA_NO_PLAN, DATA_COUNTED } from '~/utils/workforce/week-grid'
import { weekRange } from '~/utils/workforce/week-range'

const OSLO = 'Europe/Oslo'
const WEEK = weekRange(OSLO, new Date('2026-07-29T09:00:00Z')) // Mon 27 Jul – Sun 2 Aug 2026

const KOKK = 'aaaaaaaa-0000-0000-0000-000000000001'
const BAR = 'bbbbbbbb-0000-0000-0000-000000000002'
const VANISHED = 'cccccccc-0000-0000-0000-000000000003'

const ANNA = '11111111-1111-1111-1111-111111111111'
const BJORN = '22222222-2222-2222-2222-222222222222'

function role (over) {
  return Object.assign({
    roleId: KOKK,
    name: 'Kokk',
    station: 'Kjøkken',
    color: '#111111',
    sortOrder: 1,
    effectiveFromUtc: '2026-01-01T00:00:00Z',
    effectiveToUtc: null
  }, over)
}

function shift (over) {
  return Object.assign({
    shiftAssignmentId: 'a1',
    staffMemberId: ANNA,
    staffDisplayName: 'Anna Haugen',
    isOpenShift: false,
    roleId: KOKK,
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
    assignments
  }
}

function build (options) {
  return buildRoleGrid(Object.assign({
    days: WEEK.days,
    windowStartUtc: WEEK.startUtc,
    windowEndUtc: WEEK.endUtc
  }, options || {}))
}

describe('buildRoleGrid — the role pivot', () => {
  test('groups the week by role rather than by person', () => {
    const grid = build({
      roles: [role(), role({ roleId: BAR, name: 'Bar', station: 'Bar', sortOrder: 2 })],
      range: draftRange([
        shift(),
        shift({ shiftAssignmentId: 'a2', staffMemberId: BJORN, staffDisplayName: 'Bjørn Ek' })
      ])
    })

    expect(grid.rows.map(r => r.name)).toEqual(['Kokk', 'Bar'])
    // Both people land in the SAME role row — that is the whole point of the pivot.
    expect(grid.rows[0].totals.shiftCount).toBe(2)
    expect(grid.rows[0].totals.staffCount).toBe(2)
  })

  test('the server order (sortOrder, then name) is preserved, not re-sorted', () => {
    const grid = build({
      roles: [role({ roleId: BAR, name: 'Bar', sortOrder: 1 }), role({ name: 'Kokk', sortOrder: 2 })],
      range: draftRange([])
    })
    expect(grid.rows.map(r => r.name)).toEqual(['Bar', 'Kokk'])
  })

  // THE REQUIREMENT: an unstaffed section is the information a manager came for.
  test('AN EMPTY ROLE STILL GETS A ROW, and its zeros are true zeros', () => {
    const grid = build({
      roles: [role(), role({ roleId: BAR, name: 'Bar', sortOrder: 2 })],
      range: draftRange([shift()])
    })

    const bar = grid.rows.find(r => r.name === 'Bar')
    expect(bar).toBeDefined()
    expect(bar.totals.shiftCount).toBe(0)
    expect(bar.totals.minutes).toBe(0)
    expect(bar.totals.staffCount).toBe(0)
    expect(bar.cells.every(c => c.shifts.length === 0)).toBe(true)
  })

  test('but an empty role reads UNKNOWN, not 0, when the week itself did not resolve', () => {
    const unknown = build({ roles: [role()], range: null })
    expect(unknown.dataState).toBe(DATA_UNKNOWN)
    expect(unknown.rows[0].totals.shiftCount).toBeNull()
    expect(unknown.rows[0].totals.minutes).toBeNull()

    const noPlan = build({ roles: [role()], range: { view: 'draft', assignments: [] } })
    expect(noPlan.dataState).toBe(DATA_NO_PLAN)
    expect(noPlan.rows[0].totals.shiftCount).toBeNull()
  })

  test('paid minutes subtract the unpaid break, exactly as the employee pivot does', () => {
    const grid = build({ roles: [role()], range: draftRange([shift()]) })
    expect(grid.dataState).toBe(DATA_COUNTED)
    expect(grid.rows[0].totals.minutes).toBe(8 * 60 - 30)
  })
})

describe('buildRoleGrid — a shift whose role is not in the list', () => {
  test('gets its OWN row, keeping the name the server sent — never folded into "no role"', () => {
    const grid = build({
      roles: [role()],
      range: draftRange([
        shift(),
        shift({ shiftAssignmentId: 'a9', roleId: VANISHED, roleName: 'Oppvask' })
      ])
    })

    const unlisted = grid.rows.find(r => r.key === VANISHED)
    expect(unlisted).toBeDefined()
    expect(unlisted.name).toBe('Oppvask')
    expect(unlisted.isListed).toBe(false)
    expect(unlisted.totals.shiftCount).toBe(1)
    expect(grid.unresolvedCount).toBe(1)
    // The distinct fact is preserved: this is NOT a shift without a role.
    expect(grid.noRoleRow).toBeNull()
  })

  test('with no name either, the row carries a null name rather than an invented one', () => {
    const grid = build({
      roles: [role()],
      range: draftRange([shift({ shiftAssignmentId: 'a9', roleId: VANISHED, roleName: null })])
    })
    const unlisted = grid.rows.find(r => r.key === VANISHED)
    expect(unlisted.name).toBeNull()
  })

  test('two different vanished roles are two rows, never merged into one', () => {
    const other = 'dddddddd-0000-0000-0000-000000000004'
    const grid = build({
      roles: [],
      range: draftRange([
        shift({ shiftAssignmentId: 'x', roleId: VANISHED, roleName: 'Oppvask' }),
        shift({ shiftAssignmentId: 'y', roleId: other, roleName: 'Runner' })
      ])
    })
    expect(grid.unresolvedCount).toBe(2)
    expect(grid.rows.map(r => r.name).sort()).toEqual(['Oppvask', 'Runner'])
  })

  test('a shift with roleId null is the "no role" row — a different fact, pinned separately', () => {
    const grid = build({
      roles: [role()],
      range: draftRange([shift({ shiftAssignmentId: 'a9', roleId: null, roleName: null })])
    })
    expect(grid.noRoleRow).not.toBeNull()
    expect(grid.noRoleRow.key).toBe(ROLE_NONE_KEY)
    expect(grid.noRoleRow.totals.shiftCount).toBe(1)
    expect(grid.noRoleShiftCount).toBe(1)
    expect(grid.unresolvedCount).toBe(0)
  })

  test('the "no role" row is absent when nothing is in it — unlike an empty listed role', () => {
    const grid = build({ roles: [role()], range: draftRange([shift()]) })
    expect(grid.noRoleRow).toBeNull()
    expect(grid.rows).toHaveLength(1)
  })
})

describe('buildRoleGrid — retired roles and an unknown role list', () => {
  test('a role whose effective window ended before the week is hidden, and COUNTED as hidden', () => {
    const grid = build({
      roles: [role(), role({ roleId: BAR, name: 'Bar', effectiveToUtc: '2025-01-01T00:00:00Z' })],
      range: draftRange([shift()])
    })
    expect(grid.rows.map(r => r.name)).toEqual(['Kokk'])
    expect(grid.hiddenRetiredCount).toBe(1)
  })

  test('...but a retired role that still holds shifts stays on screen, flagged', () => {
    const grid = build({
      roles: [role({ effectiveToUtc: '2025-01-01T00:00:00Z' })],
      range: draftRange([shift()])
    })
    expect(grid.rows).toHaveLength(1)
    expect(grid.rows[0].isEffective).toBe(false)
    expect(grid.hiddenRetiredCount).toBe(0)
  })

  test('a role that only becomes effective after this week is hidden too', () => {
    const grid = build({
      roles: [role({ effectiveFromUtc: '2027-01-01T00:00:00Z' })],
      range: draftRange([])
    })
    expect(grid.rows).toHaveLength(0)
    expect(grid.hiddenRetiredCount).toBe(1)
  })

  test('an unread role list is UNKNOWN, not an empty store', () => {
    const grid = build({ roles: null, range: draftRange([shift()]) })
    expect(grid.rolesKnown).toBe(false)
    expect(grid.hiddenRetiredCount).toBeNull()
    // The shifts still appear — dropping them would delete real scheduled work from the pivot.
    expect(grid.rows).toHaveLength(1)
    // NOT `false`. We were never told this role is missing from the list; we failed to read the
    // list. Claiming "not in the role list" here would assert the thing we did not find out.
    expect(grid.rows[0].isListed).toBeNull()
    expect(grid.unresolvedCount).toBeNull()
  })

  test('an EMPTY role list is a different answer from an unread one', () => {
    const grid = build({ roles: [], range: draftRange([]) })
    expect(grid.rolesKnown).toBe(true)
    expect(grid.rows).toHaveLength(0)
    expect(grid.hiddenRetiredCount).toBe(0)
  })
})

describe('buildRoleGrid — shared placement rules are the SAME ones, not copies', () => {
  test('a shift is placed on the server\'s business date, not on a re-derived one', () => {
    // Starts 23:30 local on the 28th and ends after midnight; the server attributes it to the 28th.
    const grid = build({
      roles: [role()],
      range: draftRange([shift({
        startsUtc: '2026-07-28T21:30:00',
        endsUtc: '2026-07-29T04:00:00',
        localBusinessDate: '2026-07-28T00:00:00'
      })])
    })
    const cells = grid.rows[0].cells
    expect(cells.find(c => c.isoDate === '2026-07-28').shifts).toHaveLength(1)
    expect(cells.find(c => c.isoDate === '2026-07-29').shifts).toHaveLength(0)
    expect(cells.find(c => c.isoDate === '2026-07-28').shifts[0].crossesMidnight).toBe(true)
  })

  test('a shift outside the seven columns is dropped rather than clamped into one', () => {
    const grid = build({
      roles: [role()],
      range: draftRange([shift({ localBusinessDate: '2026-08-20T00:00:00' })])
    })
    expect(grid.rows[0].totals.shiftCount).toBe(0)
  })

  test('the open-shift row does not exist here: an open shift belongs to its ROLE', () => {
    const grid = build({
      roles: [role()],
      range: draftRange([shift({ staffMemberId: null, staffDisplayName: null, isOpenShift: true })])
    })
    expect(grid.rows[0].totals.shiftCount).toBe(1)
    expect(grid.rows[0].totals.openShiftCount).toBe(1)
    // An open shift has nobody, so it must not inflate the head count.
    expect(grid.rows[0].totals.staffCount).toBe(0)
  })

  test('the cross-store overlay flags the same shifts it flags in the employee pivot', () => {
    const grid = build({
      roles: [role()],
      range: draftRange([shift()]),
      external: {
        timeZoneId: OSLO,
        items: [{
          staffMemberId: ANNA,
          kind: 'external-published-shift',
          startsUtc: '2026-07-28T10:00:00',
          endsUtc: '2026-07-28T18:00:00'
        }]
      }
    })
    expect(grid.externalKnown).toBe(true)
    expect(grid.externalClashCount).toBe(1)
    expect(grid.rows[0].hasExternalClash).toBe(true)
  })

  test('an unread overlay is unknown, never "nobody clashes"', () => {
    const grid = build({ roles: [role()], range: draftRange([shift()]), external: null })
    expect(grid.externalKnown).toBe(false)
    expect(grid.externalClashCount).toBeNull()
  })

  test('the typed 409 marks the named shift in this pivot too', () => {
    const grid = build({
      roles: [role()],
      range: draftRange([shift()]),
      conflict: { conflictKind: 'assignment-overlap', conflictingAssignmentId: 'a1' }
    })
    expect(grid.rows[0].hasConflict).toBe(true)
  })
})

describe('buildRoleGrid — totals and the money column', () => {
  test('day headers count every row including "no role"', () => {
    const grid = build({
      roles: [role()],
      range: draftRange([shift(), shift({ shiftAssignmentId: 'a2', roleId: null, roleName: null })])
    })
    const tuesday = grid.days.find(d => d.isoDate === '2026-07-28')
    expect(tuesday.shiftCount).toBe(2)
    expect(grid.totals.shiftCount).toBe(2)
  })

  // The rates lane HAS landed — the employee week grid reads a real wage sum off `range.cost`. This
  // pivot still carries none, and that is the assertion: the API totals cost per shift, per day and
  // per range, so the only per-role figure obtainable is a sum of rounded chips, which is exactly
  // the sum that drifts from the footer of the same week on the employee tab.
  test('cost stays null everywhere — a per-role wage could only be a chip sum, and chips are never summed', () => {
    const grid = build({ roles: [role()], range: draftRange([shift()]) })
    expect(grid.totals.cost).toBeNull()
    expect(grid.rows[0].totals.cost).toBeNull()
  })

  // Not merely "no total": no shift in this pivot carries a priced chip either, so there is nothing
  // on screen a later refactor could quietly add up. `buildRoleGrid` calls the shared `toShift` with
  // one argument on purpose.
  test('no shift in the role pivot carries a cost chip at all', () => {
    const range = draftRange([shift()])
    range.cost = {
      costComplete: true,
      totalMinor: 100000,
      currency: 'NOK',
      days: [{ localBusinessDate: '2026-07-28', costComplete: true, totalMinor: 100000, currency: 'NOK', shifts: [{ shiftAssignmentId: 'a1', costComplete: true, totalMinor: 100000, currency: 'NOK' }] }]
    }
    const grid = build({ roles: [role()], range })
    expect(grid.rows[0].cells.some(c => c.shifts.length)).toBe(true)
    for (const cell of grid.rows[0].cells) {
      for (const s of cell.shifts) { expect(s.cost).toBeNull() }
    }
    expect(grid.totals.cost).toBeNull()
  })
})
