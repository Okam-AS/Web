import { WorkforceApiError } from '~/utils/workforce/api-client'
import {
  buildAdminView,
  clockFromMinutes,
  minutesFromClock,
  weekdayFlagsFrom,
  weekdayMaskFrom
} from '~/utils/meals/admin-view'
import {
  problemDetail,
  refusalKey,
  writeFailureKey,
  SCOPE_COMPANY,
  SCOPE_CONCIERGE,
  SCOPE_CORRIDOR,
  SCOPE_STORE
} from '~/utils/meals/refusal-copy'
import { REFUSAL_DARK, REFUSAL_FORBIDDEN, REFUSAL_UNKNOWN } from '~/utils/meals/meals-client'

const ACME = '11111111-1111-1111-1111-111111111111'
const BOLT = '22222222-2222-2222-2222-222222222222'

function directoryEntry (over) {
  return Object.assign({
    companyId: ACME,
    legalName: 'Acme Industri AS',
    displayName: 'Acme',
    organizationNumber: '912345678',
    companyStatus: 'Active',
    agreementId: 'a-1',
    currency: 'NOK',
    agreementStatus: 'Active',
    activeMemberCount: 3
  }, over)
}

describe('buildAdminView — the three-state rule, kept per read', () => {
  test('a directory that did not answer is UNKNOWN, never an empty company list', () => {
    const view = buildAdminView({ directory: null, directoryRefusal: REFUSAL_DARK })
    expect(view.companies.state).toBe('unknown')
    expect(view.companies.isEmpty).toBe(false)
    expect(view.companies.refusal).toBe(REFUSAL_DARK)

    // Positive control: an answered-but-empty directory is a DIFFERENT state, so the assertion above
    // is about the failure and not about the view never loading anything.
    const empty = buildAdminView({ directory: [] })
    expect(empty.companies.state).toBe('loaded')
    expect(empty.companies.isEmpty).toBe(true)
  })

  test('the four company reads fail independently — one refusal never answers for another', () => {
    const view = buildAdminView({
      directory: [directoryEntry()],
      selectedCompanyId: ACME,
      company: { companyId: ACME, displayName: 'Acme', revision: 'r1' },
      programs: null,
      programsRefusal: REFUSAL_FORBIDDEN,
      invitations: [],
      members: [{ membershipId: 'm-1', applicationUserId: 'u-1', role: 'CompanyAdmin', state: 'Active' }]
    })

    expect(view.company.state).toBe('loaded')
    expect(view.programs.state).toBe('unknown')
    expect(view.programs.refusal).toBe(REFUSAL_FORBIDDEN)
    // The invitations read ANSWERED with nothing, which is a claim; the programmes failure must not
    // have turned it into an unknown, nor the members list into an empty one.
    expect(view.invitations.state).toBe('loaded')
    expect(view.invitations.isEmpty).toBe(true)
    expect(view.members.rows).toHaveLength(1)
    expect(view.programs.refusal).not.toBe(view.invitations.refusal)
  })
})

describe('the company picker, where there is no list endpoint to pick from', () => {
  test('a company created this session is offered even though the directory cannot see it', () => {
    const view = buildAdminView({
      directory: [],
      sessionCompanies: [{ companyId: BOLT, legalName: 'Bolt AS', displayName: 'Bolt', status: 'Active' }]
    })
    expect(view.companies.rows.map(r => r.companyId)).toEqual([BOLT])
    expect(view.companies.rows[0].hasCorridorHere).toBe(false)
    // ...and it is reported as unconfirmed, because it is the row that vanishes on reload.
    expect(view.companies.unconfirmedCompanyIds).toEqual([BOLT])
  })

  test('once its agreement is signed the directory row wins — the company is listed ONCE', () => {
    const view = buildAdminView({
      directory: [directoryEntry({ companyId: BOLT, displayName: 'Bolt' })],
      sessionCompanies: [{ companyId: BOLT, legalName: 'Bolt AS', displayName: 'Bolt', status: 'Active' }]
    })
    expect(view.companies.rows).toHaveLength(1)
    expect(view.companies.rows[0].hasCorridorHere).toBe(true)
    expect(view.companies.unconfirmedCompanyIds).toEqual([])
  })

  // The recovery path the picker's identifier field exists for. Without this the company would be
  // read successfully and still select nothing, so its agreement could never be signed.
  test('a company opened by identifier becomes selectable the moment its own read answers', () => {
    const view = buildAdminView({
      directory: [],
      selectedCompanyId: BOLT,
      company: { companyId: BOLT, legalName: 'Bolt AS', displayName: 'Bolt', status: 'Active', revision: 'r1' }
    })
    expect(view.companies.rows.map(r => r.companyId)).toEqual([BOLT])
    expect(view.selected).not.toBeNull()
    expect(view.companies.unconfirmedCompanyIds).toEqual([BOLT])

    // ...and it is not duplicated when the directory already carries it.
    const listed = buildAdminView({
      directory: [directoryEntry({ companyId: BOLT })],
      selectedCompanyId: BOLT,
      company: { companyId: BOLT, legalName: 'Bolt AS' }
    })
    expect(listed.companies.rows).toHaveLength(1)
    expect(listed.companies.unconfirmedCompanyIds).toEqual([])
  })

  test('nothing is called "not in the directory" while the directory is unknown', () => {
    const view = buildAdminView({
      directory: null,
      directoryRefusal: REFUSAL_UNKNOWN,
      sessionCompanies: [{ companyId: BOLT, legalName: 'Bolt AS' }]
    })
    expect(view.companies.unconfirmedCompanyIds).toEqual([])
  })

  test('a directory that failed still shows this session\'s company, and says nothing about the rest', () => {
    const view = buildAdminView({
      directory: null,
      directoryRefusal: REFUSAL_UNKNOWN,
      sessionCompanies: [{ companyId: BOLT, legalName: 'Bolt AS' }]
    })
    expect(view.companies.state).toBe('loaded')
    expect(view.companies.rows.map(r => r.companyId)).toEqual([BOLT])
    // The refusal is carried alongside rather than dropped: the list is incomplete and says so.
    expect(view.companies.refusal).toBe(REFUSAL_UNKNOWN)
    expect(view.companies.isEmpty).toBe(false)
  })

  test('the display/legal name split matches the venue surface: no name is a null, never an id', () => {
    const view = buildAdminView({ directory: [directoryEntry({ displayName: null, legalName: null })] })
    expect(view.companies.rows[0].label).toBeNull()
    expect(view.companies.rows[0].secondaryName).toBeNull()
  })
})

describe('a programme carries what a policy version needs', () => {
  const programs = [{
    programId: 'p-1',
    agreementId: 'a-1',
    storeId: 42,
    currency: 'NOK',
    name: 'Lunsj',
    status: 'Active',
    currentPolicyVersion: null,
    enrolledMemberCount: 0
  }]

  test('a programme with no policy expects version 0 — the contract\'s own "none yet"', () => {
    const view = buildAdminView({ programs })
    expect(view.programs.rows[0].currentPolicyVersion).toBeNull()
    expect(view.programs.rows[0].expectedCurrentVersion).toBe(0)
  })

  test('and one with a policy expects that number, so the CAS is against what was read', () => {
    const view = buildAdminView({ programs: [Object.assign({}, programs[0], { currentPolicyVersion: 3 })] })
    expect(view.programs.rows[0].expectedCurrentVersion).toBe(3)
  })
})

describe('invitations and memberships', () => {
  test('only a Pending invitation is revocable — a claimed one already produced a membership', () => {
    const view = buildAdminView({
      invitations: [
        { invitationId: 'i-1', state: 'Pending' },
        { invitationId: 'i-2', state: 'Claimed' },
        { invitationId: 'i-3', state: 'Revoked' },
        { invitationId: 'i-4', state: 'Expired' }
      ]
    })
    expect(view.invitations.rows.filter(r => r.isRevocable).map(r => r.invitationId)).toEqual(['i-1'])
  })

  // The projection must never invent a token field. Only the create RESPONSE carries one; a list row
  // that appeared to have one would put an unusable value on screen and imply it could be re-read.
  test('no invitation row carries a token', () => {
    const view = buildAdminView({ invitations: [{ invitationId: 'i-1', state: 'Pending', token: 'mealsinv_leaked' }] })
    expect(view.invitations.rows[0].token).toBeUndefined()
  })

  test('a membership is its identifier and its account, and nothing is invented for a name', () => {
    const view = buildAdminView({ members: [{ membershipId: 'm-1', applicationUserId: 'u-9', role: 'Employee', state: 'Active' }] })
    expect(view.members.rows[0]).toMatchObject({ membershipId: 'm-1', applicationUserId: 'u-9' })
    expect(view.members.rows[0].displayName).toBeUndefined()
  })

  // `statementRef` mirrors the server's own rule (MealsStatementService: the company-supplied
  // employeeReference, or the membership id). Computed once here so the screen and the bill cannot
  // disagree — the whole point of decision D-MEALS-EMPREF is that the operator sees, at invitation
  // time, what the accountant will read at month end.
  test('a member with a company reference reads as that reference on the statement', () => {
    const view = buildAdminView({
      members: [{ membershipId: 'm-1', applicationUserId: 'u-9', employeeReference: 'ANS-1042', role: 'Employee', state: 'Active' }]
    })
    expect(view.members.rows[0].statementRef).toBe('ANS-1042')
    expect(view.members.rows[0].hasEmployeeReference).toBe(true)
  })

  test('a member whose invitation carried none falls back to the id, and is flagged as unfixable', () => {
    const view = buildAdminView({
      members: [{ membershipId: 'm-1', applicationUserId: 'u-9', role: 'Employee', state: 'Active' }]
    })
    expect(view.members.rows[0].statementRef).toBe('m-1')
    expect(view.members.rows[0].hasEmployeeReference).toBe(false)
  })

  // A blank string is not a reference. It has to normalize to the same absent value a missing field
  // does, or the screen would show an empty cell with no flag on a row that bills as an identifier.
  test('a blank reference is absent, not supplied', () => {
    const view = buildAdminView({
      members: [{ membershipId: 'm-1', applicationUserId: 'u-9', employeeReference: '', role: 'Employee', state: 'Active' }]
    })
    expect(view.members.rows[0].statementRef).toBe('m-1')
    expect(view.members.rows[0].hasEmployeeReference).toBe(false)
  })

  test('an invitation carries the reference it was issued with', () => {
    const view = buildAdminView({
      invitations: [{ invitationId: 'i-1', state: 'Pending', employeeReference: 'ANS-1042' }]
    })
    expect(view.invitations.rows[0].employeeReference).toBe('ANS-1042')
  })
})

describe('the policy window conversions', () => {
  test('bit 0 is Monday and bit 6 is Sunday, matching the wire mask', () => {
    expect(weekdayMaskFrom({ mon: true })).toBe(1)
    expect(weekdayMaskFrom({ sun: true })).toBe(64)
    expect(weekdayMaskFrom({ mon: true, tue: true, wed: true, thu: true, fri: true })).toBe(31)
    expect(weekdayMaskFrom({})).toBe(0)
  })

  test('and the mask round-trips', () => {
    expect(weekdayMaskFrom(weekdayFlagsFrom(31))).toBe(31)
    expect(weekdayFlagsFrom(64)).toMatchObject({ mon: false, sun: true })
    // Bits above Sunday are ignored rather than turned into a day nobody chose.
    expect(weekdayMaskFrom(weekdayFlagsFrom(255))).toBe(127)
  })

  test('clock times become whole minutes from midnight, and rubbish becomes null', () => {
    expect(minutesFromClock('00:00')).toBe(0)
    expect(minutesFromClock('11:30')).toBe(690)
    expect(minutesFromClock('23:59')).toBe(1439)
    // `<input type="time">` emits seconds when a step is set; the wire has nowhere to put them.
    expect(minutesFromClock('11:30:00')).toBe(690)

    expect(minutesFromClock('')).toBeNull()
    expect(minutesFromClock('25:00')).toBeNull()
    expect(minutesFromClock('11:60')).toBeNull()
    expect(minutesFromClock('half eleven')).toBeNull()
    expect(minutesFromClock(null)).toBeNull()
  })

  test('and back — including 24:00, which is a legal END and not the next midnight', () => {
    expect(clockFromMinutes(0)).toBe('00:00')
    expect(clockFromMinutes(690)).toBe('11:30')
    expect(clockFromMinutes(1440)).toBe('24:00')
    expect(clockFromMinutes(1441)).toBeNull()
    expect(clockFromMinutes(-1)).toBeNull()
  })
})

describe('refusalKey — one sentence per gate, because there are two gates', () => {
  // The load-bearing pair. Both are the same refusal KIND; what differs is which switch a person has
  // to go and find. Telling a concierge the venue's flag is off when the installation's config is
  // what refused them sends them to the wrong person entirely.
  test('a dark store and a dark company surface do not read the same', () => {
    expect(refusalKey(REFUSAL_DARK, SCOPE_STORE)).toBe('meals_refusal_dark')
    expect(refusalKey(REFUSAL_DARK, SCOPE_COMPANY)).toBe('meals_refusal_company_dark')
    expect(refusalKey(REFUSAL_DARK, SCOPE_STORE)).not.toBe(refusalKey(REFUSAL_DARK, SCOPE_COMPANY))
  })

  test('and neither does a missing company-admin membership from a missing concierge role', () => {
    expect(refusalKey(REFUSAL_FORBIDDEN, SCOPE_COMPANY)).toBe('meals_refusal_company_forbidden')
    expect(refusalKey(REFUSAL_FORBIDDEN, SCOPE_CONCIERGE)).toBe('meals_refusal_concierge_forbidden')
  })

  // The corridor route is the one place the gates mix: store-addressed 404, concierge 403.
  test('the corridor scope takes the STORE sentence for dark and the concierge one for forbidden', () => {
    expect(refusalKey(REFUSAL_DARK, SCOPE_CORRIDOR)).toBe('meals_refusal_dark')
    expect(refusalKey(REFUSAL_FORBIDDEN, SCOPE_CORRIDOR)).toBe('meals_refusal_concierge_forbidden')
  })

  test('the store scope is the default, so no existing caller changed meaning', () => {
    expect(refusalKey(REFUSAL_DARK)).toBe(refusalKey(REFUSAL_DARK, SCOPE_STORE))
    expect(refusalKey(REFUSAL_FORBIDDEN)).toBe('meals_refusal_forbidden')
    expect(refusalKey(null)).toBe('meals_refusal_not_read')
  })
})

describe('writeFailureKey — every sentence has to say whether anything was saved', () => {
  const problem = (status, body) => new WorkforceApiError(status, body)

  test('the typed conflicts are told apart, because the recovery differs for each', () => {
    expect(writeFailureKey(problem(409, { code: 'meals.stale-revision' }))).toBe('meals_write_stale')
    expect(writeFailureKey(problem(409, { code: 'meals.stale-policy-version' }))).toBe('meals_write_stale_policy')
    expect(writeFailureKey(problem(409, { code: 'meals.idempotency-in-progress' }))).toBe('meals_write_in_progress')
    expect(writeFailureKey(problem(409, { code: 'meals.idempotency-payload-mismatch' }))).toBe('meals_write_idempotency_mismatch')
    expect(writeFailureKey(problem(409, { code: 'meals.invitation-not-claimable' }))).toBe('meals_write_invitation_not_claimable')
    expect(writeFailureKey(problem(400, { code: 'meals.currency-mismatch' }))).toBe('meals_write_currency_mismatch')
  })

  // The code is consulted BEFORE the status. A `meals.validation` 400 and the controller's own
  // precondition 400 are both 400s and mean different things.
  test('a typed validation 400 and a bare 400 are different sentences', () => {
    expect(writeFailureKey(problem(400, { code: 'meals.validation' }))).toBe('meals_write_validation')
    expect(writeFailureKey(problem(400, { detail: 'An Idempotency-Key header is required.' }))).toBe('meals_write_rejected')
  })

  test('403 and 404 route through the scoped refusal copy rather than growing a second vocabulary', () => {
    expect(writeFailureKey(problem(403, { code: 'meals.forbidden' }), SCOPE_CONCIERGE)).toBe('meals_refusal_concierge_forbidden')
    expect(writeFailureKey(problem(404, { code: 'meals.not-found' }), SCOPE_COMPANY)).toBe('meals_refusal_company_dark')
    // The same strict split the read path makes: no `meals.*` code, no claim about the gate.
    expect(writeFailureKey(problem(404, null), SCOPE_COMPANY)).toBe('meals_refusal_absent')
  })

  // A request that never arrived and one the server refused are not the same fact, and only the
  // second one tells you the state on the server.
  test('a network failure is its own sentence, never folded into "the server refused it"', () => {
    expect(writeFailureKey(new TypeError('Failed to fetch'))).toBe('meals_write_network')
    expect(writeFailureKey(problem(500, {}))).toBe('meals_write_unknown')
    expect(writeFailureKey(new TypeError('x'))).not.toBe(writeFailureKey(problem(500, {})))
  })

  test('no error is no failure', () => {
    expect(writeFailureKey(null)).toBeNull()
  })

  test('problemDetail offers the server prose separately, and only when it is a typed failure', () => {
    expect(problemDetail(problem(400, { detail: 'A legal name is required.' }))).toBe('A legal name is required.')
    expect(problemDetail(problem(400, {}))).toBeNull()
    expect(problemDetail(new TypeError('offline'))).toBeNull()
  })
})
