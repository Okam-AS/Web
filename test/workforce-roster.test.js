import {
  CAPABILITY_MANAGER,
  ROSTER_COUNTED,
  ROSTER_EMPTY,
  ROSTER_UNKNOWN,
  SESSIONS_UNKNOWN,
  WAGE_NONE,
  WAGE_SET,
  WAGE_WITHHELD,
  activeEngagementConflict,
  buildCreateRequest,
  buildEndRequest,
  buildReactivateRequest,
  buildRoles,
  buildRoster,
  buildTermRequest,
  buildTerms,
  buildUpdateRequest,
  callerHas,
  capabilitySet,
  contractHoursPerWeek,
  endEngagementEffects,
  formatDate,
  legalEmployerOptions,
  localDateToInstant,
  openSessionCount,
  orDash,
  personOptions,
  reactivationBlockedBy,
  wageState,
  wouldStrandStore
} from '~/utils/workforce/roster'

// These tests are meaningful only under a non-UTC TZ — run the suite with TZ=Europe/Oslo. Under
// TZ=UTC a browser-local parse and a UTC parse agree on every value below, so a green run would
// prove nothing about the two defects this module is most exposed to: reading a bare wire stamp as
// local, and turning a picked calendar date into the wrong day's midnight.

// The wire shape `GET /staff` actually puts on the wire. `activeFromUtc` is a column-loaded
// DateTime, so EF serialises it BARE — no `Z`, no offset — while denoting UTC. Capabilities arrive
// DECOMPOSED here (the manager surface maps the flags through ToCapabilityList), which is a
// different shape from the comma-separated flags string `/workforce/me` returns.
const summary = over => Object.assign({
  staffMemberId: 'sm-1',
  workforcePersonId: 'p-1',
  displayName: 'Ida Berg',
  employmentNumber: '104',
  capabilities: ['WorkforceSelf'],
  isActive: true,
  activeFromUtc: '2026-01-10T00:00:00',
  activeToUtc: null,
  legalEmployerId: 'le-1',
  personState: 'Claimed'
}, over)

describe('capabilitySet — one parser for both wire shapes', () => {
  test('reads the decomposed list this surface returns', () => {
    expect(capabilitySet(['WorkforceSelf', 'WorkforceManager'])).toEqual(['WorkforceSelf', 'WorkforceManager'])
  })

  // The self-service surface's [Flags] rendering. Tolerated rather than assumed away, because the
  // failure mode of getting it wrong is silent: every engagement would read as un-capable and the
  // roster would show people who apparently may do nothing.
  test('reads the comma-separated flags string too', () => {
    expect(capabilitySet('WorkforceSelf, WorkforceScheduler')).toEqual(['WorkforceSelf', 'WorkforceScheduler'])
  })

  test('reads the raw bitmask too', () => {
    expect(capabilitySet(5)).toEqual(['WorkforceSelf', 'WorkforceManager'])
  })

  // The distinction the whole module turns on. "None" is a fact; "not loaded" is not.
  test('an absent grant field is unknown (null), never an empty set', () => {
    expect(capabilitySet(undefined)).toBeNull()
    expect(capabilitySet(null)).toBeNull()
    expect(capabilitySet('None')).toEqual([])
  })

  test('callerHas answers off the context capability list', () => {
    expect(callerHas(['WorkforceManager'], CAPABILITY_MANAGER)).toBe(true)
    expect(callerHas(['WorkforceSelf'], CAPABILITY_MANAGER)).toBe(false)
    expect(callerHas(null, CAPABILITY_MANAGER)).toBe(false)
  })
})

describe('buildRoster — three answers that must never be confused', () => {
  test('a read that did not answer is UNKNOWN', () => {
    expect(buildRoster(null).state).toBe(ROSTER_UNKNOWN)
    expect(buildRoster(undefined).state).toBe(ROSTER_UNKNOWN)
    expect(buildRoster(null).rows).toEqual([])
    // Not zero: how many managers a store has is unknowable from a read that failed.
    expect(buildRoster(null).activeManagerCount).toBeNull()
  })

  test('a read that answered with nothing is EMPTY — a different claim entirely', () => {
    const roster = buildRoster([])
    expect(roster.state).toBe(ROSTER_EMPTY)
    expect(roster.activeManagerCount).toBe(0)
  })

  test('a read that answered with rows is COUNTED', () => {
    expect(buildRoster([summary()]).state).toBe(ROSTER_COUNTED)
  })

  // The defect fixed in b65501c, pinned on this surface too. Under Europe/Oslo a bare stamp read as
  // browser-local would land on the previous day.
  test('a BARE wire stamp is read as UTC, not as browser-local', () => {
    const row = buildRoster([summary({ activeFromUtc: '2026-01-15T23:30:00' })]).rows[0]
    expect(row.activeFromUtc.toISOString()).toBe('2026-01-15T23:30:00.000Z')
    // Rendered in the store's zone that is already the next day — which is the point.
    expect(formatDate(row.activeFromUtc, 'Europe/Oslo', 'en')).toContain('16')
  })

  test('a Z-suffixed stamp is not double-shifted', () => {
    const row = buildRoster([summary({ activeFromUtc: '2026-01-15T23:30:00Z' })]).rows[0]
    expect(row.activeFromUtc.toISOString()).toBe('2026-01-15T23:30:00.000Z')
  })

  test('a null date stays null so the screen can print a dash', () => {
    expect(buildRoster([summary()]).rows[0].activeToUtc).toBeNull()
    expect(orDash(null)).toBe('—')
    expect(orDash(0)).toBe(0)
  })

  // One human, several engagements — the split this UI exists to preserve. The count is SAME-STORE
  // only; engagements elsewhere are not knowable here and must never be implied.
  test('two engagements of one person are two rows that know they share a person', () => {
    const roster = buildRoster([
      summary({ staffMemberId: 'sm-1', isActive: false, legalEmployerId: 'le-1' }),
      summary({ staffMemberId: 'sm-2', isActive: true, legalEmployerId: 'le-2' })
    ])
    expect(roster.rows.map(r => r.staffMemberId)).toEqual(['sm-1', 'sm-2'])
    expect(roster.rows.every(r => r.engagementCount === 2)).toBe(true)
    expect(roster.rows[0].workforcePersonId).toBe(roster.rows[1].workforcePersonId)
  })

  test('only ACTIVE engagements holding the manager grant are counted as managers', () => {
    const roster = buildRoster([
      summary({ staffMemberId: 'sm-1', capabilities: ['WorkforceManager'], isActive: true }),
      summary({ staffMemberId: 'sm-2', capabilities: ['WorkforceManager'], isActive: false }),
      summary({ staffMemberId: 'sm-3', capabilities: ['WorkforceScheduler'], isActive: true })
    ])
    expect(roster.activeManagerCount).toBe(1)
  })
})

// UX_WorkforceStaffMembers_ActiveEngagement: UNIQUE (WorkforcePersonId, LegalEmployerId) WHERE
// IsActive = 1. StoreId is NOT a column of it, which is the subtle half.
describe('the unique index, as the UI honours it', () => {
  const rows = buildRoster([
    summary({ staffMemberId: 'sm-1', workforcePersonId: 'p-1', legalEmployerId: 'le-1', isActive: true }),
    summary({ staffMemberId: 'sm-2', workforcePersonId: 'p-2', legalEmployerId: 'le-1', isActive: false })
  ]).rows

  test('it forbids a SECOND ACTIVE engagement for the same person and legal employer', () => {
    expect(activeEngagementConflict(rows, 'p-1', 'le-1', null).staffMemberId).toBe('sm-1')
  })

  test('a DIFFERENT legal employer is allowed — that is how one person works two venues at once', () => {
    expect(activeEngagementConflict(rows, 'p-1', 'le-2', null)).toBeNull()
  })

  test('an ENDED engagement does not conflict — the filter is WHERE IsActive = 1', () => {
    expect(activeEngagementConflict(rows, 'p-2', 'le-1', null)).toBeNull()
  })

  test('reactivating a row does not conflict with itself', () => {
    expect(activeEngagementConflict(rows, 'p-1', 'le-1', 'sm-1')).toBeNull()
  })

  test('an incomplete question is not an answer of "no conflict"', () => {
    expect(activeEngagementConflict(rows, null, 'le-1', null)).toBeNull()
    expect(activeEngagementConflict(rows, 'p-1', null, null)).toBeNull()
  })

  // The half this screen cannot see. The check is same-store by construction, so a clean result is
  // never a guarantee — the server's opaque 409 is the only answer for the rest.
  test('the check only ever sees this store, which is why the form still warns', () => {
    const otherStorePerson = 'p-elsewhere'
    expect(activeEngagementConflict(rows, otherStorePerson, 'le-1', null)).toBeNull()
  })

  test('a person already engaged under that employer is offered BLOCKED, not hidden', () => {
    const options = personOptions(rows, 'le-1')
    const blocked = options.find(o => o.workforcePersonId === 'p-1')
    expect(blocked.blocked).toBe(true)
    expect(blocked.blockingStaffMemberId).toBe('sm-1')
    // Still present: a silently missing name reads as "we have never heard of them".
    expect(options.map(o => o.workforcePersonId).sort()).toEqual(['p-1', 'p-2'])
  })

  test('the same person is offered freely under a different employer', () => {
    expect(personOptions(rows, 'le-2').every(o => !o.blocked)).toBe(true)
  })
})

describe('legalEmployerOptions — derived from the roster because nothing else exposes them', () => {
  test('distinct employers, with the counts that are the only way to tell two ids apart', () => {
    const rows = buildRoster([
      summary({ staffMemberId: 'a', legalEmployerId: 'le-1', isActive: true }),
      summary({ staffMemberId: 'b', legalEmployerId: 'le-1', isActive: false }),
      summary({ staffMemberId: 'c', legalEmployerId: 'le-2', isActive: true })
    ]).rows
    const options = legalEmployerOptions(rows)
    expect(options).toHaveLength(2)
    expect(options[0]).toMatchObject({ legalEmployerId: 'le-1', count: 2, activeCount: 1 })
  })

  test('an unknown roster yields no employers rather than a guessed one', () => {
    expect(legalEmployerOptions([])).toEqual([])
  })
})

describe('wouldStrandStore — the one-way door with no key', () => {
  // Capabilities are resolved ONLY from an active engagement's grant bits. Neither StoreAdmin nor
  // PowerUser can stand in, and every endpoint that could grant the capability back requires it.
  const single = buildRoster([summary({ capabilities: ['WorkforceManager'], isActive: true })])
  const pair = buildRoster([
    summary({ staffMemberId: 'sm-1', capabilities: ['WorkforceManager'], isActive: true }),
    summary({ staffMemberId: 'sm-2', workforcePersonId: 'p-2', capabilities: ['WorkforceManager'], isActive: true })
  ])

  test('ending the last active manager would strand the store', () => {
    expect(wouldStrandStore(single, single.rows[0])).toBe(true)
  })

  test('ending one of two does not', () => {
    expect(wouldStrandStore(pair, pair.rows[0])).toBe(false)
  })

  test('a non-manager, or an already-ended engagement, cannot strand anything', () => {
    const roster = buildRoster([
      summary({ staffMemberId: 'sm-1', capabilities: ['WorkforceManager'], isActive: true }),
      summary({ staffMemberId: 'sm-2', workforcePersonId: 'p-2', capabilities: ['WorkforceSelf'], isActive: true })
    ])
    expect(wouldStrandStore(roster, roster.rows[1])).toBe(false)
  })

  test('an UNKNOWN roster never claims a stranding it cannot have counted', () => {
    expect(wouldStrandStore(buildRoster(null), single.rows[0])).toBe(false)
  })
})

describe('open clock sessions — the reason ending is guarded at all', () => {
  const attendance = {
    rows: [
      { staffMemberId: 'sm-1', localBusinessDate: '2026-07-20T00:00:00', openSessionCount: 1 },
      { staffMemberId: 'sm-1', localBusinessDate: '2026-07-21T00:00:00', openSessionCount: 0 },
      { staffMemberId: 'sm-2', localBusinessDate: '2026-07-21T00:00:00', openSessionCount: 3 }
    ]
  }

  test('open sessions are summed per engagement across the window', () => {
    expect(openSessionCount(attendance, 'sm-1')).toBe(1)
    expect(openSessionCount(attendance, 'sm-2')).toBe(3)
  })

  test('a person with rows but no open session is a real zero', () => {
    expect(openSessionCount({ rows: [{ staffMemberId: 'sm-9', openSessionCount: 0 }] }, 'sm-9')).toBe(0)
  })

  // THE failure this guard must not have. A read that was refused or failed reports UNKNOWN; if it
  // reported 0 the screen would clear an engagement to be ended and strand the session forever.
  test('a read that did not answer is UNKNOWN, never zero', () => {
    expect(openSessionCount(null, 'sm-1')).toBe(SESSIONS_UNKNOWN)
    expect(openSessionCount({}, 'sm-1')).toBe(SESSIONS_UNKNOWN)
  })
})

describe('endEngagementEffects — what ending actually does', () => {
  const roster = buildRoster([summary({ capabilities: ['WorkforceSelf'] })])

  test('the personalliste is preserved — which is why ending is offered at all', () => {
    expect(endEngagementEffects(roster, roster.rows[0], null).personnelListPreserved).toBe(true)
  })

  // `GET /schedules?from&to` resolves a range to ONE revision rather than returning everything in
  // it, so the future-shift count cannot be answered by any single read. It is reported unknown
  // rather than guessed at, and the screen points at the schedule instead.
  test('the future-shift count is unknown and is never fabricated', () => {
    expect(endEngagementEffects(roster, roster.rows[0], null).futureShifts).toBe(SESSIONS_UNKNOWN)
  })

  test('an unanswered attendance read leaves the open-session fact unknown', () => {
    expect(endEngagementEffects(roster, roster.rows[0], null).openSessions).toBe(SESSIONS_UNKNOWN)
  })
})

describe('reactivationBlockedBy — the unclearable end date', () => {
  // PATCH applies ActiveToUtc only when a value is present, so null means "leave unchanged" and no
  // request can ever clear one. The schedule write meanwhile refuses assignments past it.
  const asOf = new Date('2026-07-29T00:00:00Z')

  test('a past end date caps a reactivated engagement permanently', () => {
    const row = buildRoster([summary({ isActive: false, activeToUtc: '2026-06-30T00:00:00' })]).rows[0]
    expect(reactivationBlockedBy(row, asOf).toISOString()).toBe('2026-06-30T00:00:00.000Z')
  })

  test('no end date, no cap', () => {
    const row = buildRoster([summary({ isActive: false })]).rows[0]
    expect(reactivationBlockedBy(row, asOf)).toBeNull()
  })

  test('a future end date is not yet a cap', () => {
    const row = buildRoster([summary({ isActive: false, activeToUtc: '2026-12-31T00:00:00' })]).rows[0]
    expect(reactivationBlockedBy(row, asOf)).toBeNull()
  })
})

describe('employment terms — one null, two meanings', () => {
  const term = { id: 't1', effectiveFromUtc: '2026-01-01T00:00:00', effectiveToUtc: null, contractMinutesPerWeek: 1500, employmentCategory: 'Fast', wage: null }

  test('without the payroll capability an absent wage is WITHHELD, not "no wage"', () => {
    expect(wageState(term, false)).toBe(WAGE_WITHHELD)
  })

  test('with the payroll capability an absent wage really is none', () => {
    expect(wageState(term, true)).toBe(WAGE_NONE)
  })

  test('a present wage is a wage', () => {
    expect(wageState({ wage: { amount: 240, currency: 'NOK' } }, true)).toBe(WAGE_SET)
  })

  test('an unfetched term history is unknown, not "this engagement has no terms"', () => {
    expect(buildTerms(null, true)).toBeNull()
    expect(buildTerms([], true)).toEqual([])
  })

  test('contract minutes become hours; an unrecorded contract stays null rather than becoming zero', () => {
    expect(contractHoursPerWeek(1500)).toBe(25)
    expect(contractHoursPerWeek(2250)).toBe(37.5)
    expect(contractHoursPerWeek(null)).toBeNull()
    expect(contractHoursPerWeek(undefined)).toBeNull()
    // A real zero survives as a zero — it is only the ABSENT one that must not become one.
    expect(contractHoursPerWeek(0)).toBe(0)
  })

  test('term stamps go through the UTC-aware parser too', () => {
    const built = buildTerms([Object.assign({}, term, { effectiveFromUtc: '2026-03-29T23:00:00' })], true)
    expect(built[0].effectiveFromUtc.toISOString()).toBe('2026-03-29T23:00:00.000Z')
    expect(built[0].isOpen).toBe(true)
  })
})

describe('roles — authorization-free, and never silently dropped', () => {
  const asOf = new Date('2026-07-29T00:00:00Z')

  test('a retired role is marked, not hidden — hiding it would make an engagement look role-less', () => {
    const roles = buildRoles([
      { roleId: 'r1', name: 'Kokk', sortOrder: 1, effectiveFromUtc: '2025-01-01T00:00:00', effectiveToUtc: null },
      { roleId: 'r2', name: 'Vakt', sortOrder: 2, effectiveFromUtc: '2025-01-01T00:00:00', effectiveToUtc: '2026-01-01T00:00:00' }
    ], asOf)
    expect(roles).toHaveLength(2)
    expect(roles[0].retired).toBe(false)
    expect(roles[1].retired).toBe(true)
  })

  test('an unfetched catalogue is unknown, not "this store has no roles"', () => {
    expect(buildRoles(null, asOf)).toBeNull()
    expect(buildRoles([], asOf)).toEqual([])
  })
})

describe('the wire shapes', () => {
  // A picked calendar date is a STORE-local day. `new Date("2026-08-01")` parses as UTC midnight,
  // which in Oslo's summer offset is 02:00 on 1 August — but in any zone WEST of UTC it would be
  // the previous day. `zonedMidnightToUtc` resolves the offset at the date itself.
  test('a picked date becomes the store zone\'s local midnight, not UTC midnight', () => {
    expect(localDateToInstant('2026-08-01', 'Europe/Oslo').toISOString()).toBe('2026-07-31T22:00:00.000Z')
    // Winter, one hour less offset — resolved at the date rather than from "the offset right now".
    expect(localDateToInstant('2026-01-15', 'Europe/Oslo').toISOString()).toBe('2026-01-14T23:00:00.000Z')
  })

  test('an empty date is null rather than an invented one', () => {
    expect(localDateToInstant('', 'Europe/Oslo')).toBeNull()
    expect(localDateToInstant('2026-08-01', null)).toBeNull()
  })

  test('create for a NEW person sends the person fields and no person id', () => {
    const request = buildCreateRequest({
      displayName: 'Ida Berg',
      contactEmail: 'ida@example.com',
      contactPhone: '+4790000000',
      legalEmployerId: 'le-1',
      capabilities: ['WorkforceSelf'],
      employmentNumber: '104',
      payrollNumber: '',
      activeFromDate: '2026-08-01'
    }, 'Europe/Oslo')

    expect(request.workforcePersonId).toBeNull()
    expect(request.displayName).toBe('Ida Berg')
    // Bare, no `Z`: the format nothing converts, and the one the schedule lane already sends in bodies.
    expect(request.activeFromUtc).toBe('2026-07-31T22:00:00')
    expect(request.payrollNumber).toBeNull()
  })

  // The second-engagement path. The endpoint attaches to the existing person and ignores the
  // display/contact fields, so sending them would look like an edit that silently did not happen.
  test('create for an EXISTING person sends the id and withholds the person fields', () => {
    const request = buildCreateRequest({
      workforcePersonId: 'p-1',
      displayName: 'typed but irrelevant',
      contactEmail: 'x@example.com',
      legalEmployerId: 'le-2',
      capabilities: [],
      activeFromDate: ''
    }, 'Europe/Oslo')

    expect(request.workforcePersonId).toBe('p-1')
    expect(request.displayName).toBeNull()
    expect(request.contactEmail).toBeNull()
    expect(request.activeFromUtc).toBeNull()
    expect(request.capabilities).toEqual([])
  })

  // A non-null capability list REPLACES the whole grant set, so an untouched form must send null
  // rather than an empty array — which would strip every capability the engagement had.
  test('an update that did not touch capabilities sends null, not an empty list', () => {
    expect(buildUpdateRequest({ capabilitiesTouched: false, capabilities: [] }).capabilities).toBeNull()
    expect(buildUpdateRequest({ capabilitiesTouched: true, capabilities: [] }).capabilities).toEqual([])
  })

  test('an ordinary update never touches isActive or the dates', () => {
    const request = buildUpdateRequest({ capabilitiesTouched: true, capabilities: ['WorkforceSelf'] })
    expect(request.isActive).toBeNull()
    expect(request.activeFromUtc).toBeNull()
    expect(request.activeToUtc).toBeNull()
  })

  test('ending is isActive:false and, by default, NO end date', () => {
    const request = buildEndRequest({ recordEndDate: false, endDate: '2026-08-01' }, 'Europe/Oslo')
    expect(request.isActive).toBe(false)
    // Deliberately absent: an end date cannot be cleared afterwards and caps schedulability.
    expect(request.activeToUtc).toBeNull()
    expect(request.capabilities).toBeNull()
  })

  test('ending WITH an opted-in end date sends it in the store\'s zone', () => {
    const request = buildEndRequest({ recordEndDate: true, endDate: '2026-08-01' }, 'Europe/Oslo')
    expect(request.activeToUtc).toBe('2026-07-31T22:00:00')
  })

  test('reactivating flips only the gate', () => {
    expect(buildReactivateRequest()).toMatchObject({ isActive: true, activeToUtc: null, capabilities: null })
  })

  test('a term converts hours to minutes and omits wage without the payroll capability', () => {
    const request = buildTermRequest({
      effectiveFromDate: '2026-08-01',
      contractHoursPerWeek: '37.5',
      employmentCategory: 'Fast',
      wageAmount: '240',
      wageCurrency: 'NOK'
    }, 'Europe/Oslo', false)

    expect(request.contractMinutesPerWeek).toBe(2250)
    expect(request.effectiveFromUtc).toBe('2026-07-31T22:00:00')
    // Sending a wage a caller cannot read turns the whole save into a 403.
    expect(request.wage).toBeNull()
  })

  test('a term carries wage when the caller may read one', () => {
    const request = buildTermRequest({
      effectiveFromDate: '2026-08-01',
      contractHoursPerWeek: '',
      wageAmount: '240',
      wageCurrency: 'NOK',
      wageInterval: 'Hour'
    }, 'Europe/Oslo', true)

    expect(request.contractMinutesPerWeek).toBeNull()
    expect(request.wage).toEqual({ amount: 240, currency: 'NOK', interval: 'Hour' })
  })
})
