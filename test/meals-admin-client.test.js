import { WorkforceClientBase } from '~/utils/workforce/api-client'
import { MealsAdminService } from '~/utils/meals/admin-client'

// The Meals CONCIERGE + COMPANY-ADMIN client. Three things are under test, and they are different in
// kind:
//
//   1. THE ROUTES — that every method calls a path the backend actually binds. This is the class of
//      defect that produced four Workforce client functions calling routes that never existed, and
//      it is the reason each assertion below names the controller file and line it came from.
//   2. THE IDEMPOTENCY PRECONDITION — `MealsControllerBase.TryGetIdempotencyKey` refuses a mutation
//      without an `Idempotency-Key` header with a plain module 400. A write that forgot it would fail
//      on every attempt, and nothing else in this repo would notice.
//   3. WHICH METHODS EXIST — pinned as a SET, so a route added later is a deliberate act rather than
//      something that drifted in. The deliberately-absent ones (archive, membership revoke, program
//      enrolment, claim) are the point of the assertion, not a side effect of it.

const originalFetch = global.fetch

// `newGuid` reaches for the platform `crypto`, which jsdom does not provide here. A COUNTER rather
// than a constant, so the "every mutation gets its own key" assertion is about the client's
// behaviour and not about a stub that happens to vary.
const originalCrypto = global.crypto
let minted = 0

function respondWith (status, body) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body))
  })
}

const service = () => new MealsAdminService({ bearerToken: 'tok' })
const calledUrl = () => global.fetch.mock.calls[0][0]
const calledInit = () => global.fetch.mock.calls[0][1]

beforeEach(() => {
  respondWith(200, {})
  global.crypto = { randomUUID: () => 'idem-key-' + (++minted) }
})
afterEach(() => {
  global.fetch = originalFetch
  global.crypto = originalCrypto
})

const COMPANY = '11111111-1111-1111-1111-111111111111'
const PROGRAM = '22222222-2222-2222-2222-222222222222'
const INVITE = '33333333-3333-3333-3333-333333333333'

describe('MealsAdminService — route-for-route with the backend', () => {
  test('it is the SHARED HTTP layer, not a third copy of it', () => {
    expect(new MealsAdminService({})).toBeInstanceOf(WorkforceClientBase)
  })

  test('the company account routes', async () => {
    await service().CreateCompany({ legalName: 'Acme' })
    expect(calledUrl()).toContain('/v1/meals/companies')
    expect(calledInit().method).toBe('POST')

    respondWith(200, {})
    await service().GetCompany(COMPANY)
    expect(calledUrl()).toContain('/v1/meals/companies/' + COMPANY)
    expect(calledInit().method).toBe('GET')

    respondWith(200, {})
    await service().UpdateCompany(COMPANY, { displayName: 'Acme' })
    expect(calledUrl()).toContain('/v1/meals/companies/' + COMPANY)
    expect(calledInit().method).toBe('POST')
  })

  // THE STORE IS IN THE PATH, and this is the assertion that keeps it there. The request model has no
  // `StoreId` at all — deliberately, so the gate's store and the written row's store cannot differ —
  // and a client that moved it into the body would be sending a field the server ignores while the
  // corridor silently landed on whatever store the path carried.
  test('the corridor agreement route is store-addressed, and the body carries no store', async () => {
    await service().SignAgreement(42, COMPANY, { currency: 'NOK', sellerLegalName: 'Kafé Nord AS' })
    expect(calledUrl()).toContain('/v1/stores/42/meals/companies/' + COMPANY + '/agreements')

    const body = JSON.parse(calledInit().body)
    expect(body.currency).toBe('NOK')
    expect(body.storeId).toBeUndefined()
    // Omitted, not sent as now: the server resolves the signing instant inside the idempotency
    // envelope so a retry replays instead of hashing a fresh clock reading.
    expect(body.effectiveFromUtc).toBeUndefined()
  })

  test('the programme and policy routes', async () => {
    await service().ListPrograms(COMPANY)
    expect(calledUrl()).toContain('/v1/meals/companies/' + COMPANY + '/programs')

    respondWith(200, {})
    await service().CreateProgram(COMPANY, { agreementId: 'a-1', name: 'Lunsj' })
    expect(calledUrl()).toContain('/v1/meals/companies/' + COMPANY + '/programs')
    expect(calledInit().method).toBe('POST')

    // The policy route hangs off the PROGRAM, not off the company — a company-scoped path here would
    // 404 for every caller.
    respondWith(200, {})
    await service().CreatePolicyVersion(PROGRAM, { expectedCurrentVersion: 0 })
    expect(calledUrl()).toContain('/v1/meals/programs/' + PROGRAM + '/policies')
  })

  test('the people routes', async () => {
    await service().ListMembers(COMPANY)
    expect(calledUrl()).toContain('/v1/meals/companies/' + COMPANY + '/members')

    respondWith(200, [])
    await service().ListInvitations(COMPANY)
    expect(calledUrl()).toContain('/v1/meals/companies/' + COMPANY + '/invitations')

    respondWith(200, {})
    await service().CreateInvitation(COMPANY, { intendedContactEmail: 'a@b.no' })
    expect(calledUrl()).toContain('/v1/meals/companies/' + COMPANY + '/invitations')
    expect(calledInit().method).toBe('POST')

    respondWith(200, {})
    await service().RevokeInvitation(COMPANY, INVITE, { expectedVersion: 'r1' })
    expect(calledUrl()).toContain('/v1/meals/companies/' + COMPANY + '/invitations/' + INVITE + '/revoke')
  })
})

describe('the Idempotency-Key precondition', () => {
  // Every Meals mutation is refused without this header. The reads must NOT carry one — sending a
  // header the route does not read would imply a contract that is not there.
  const mutations = [
    ['CreateCompany', s => s.CreateCompany({})],
    ['UpdateCompany', s => s.UpdateCompany(COMPANY, {})],
    ['SignAgreement', s => s.SignAgreement(42, COMPANY, {})],
    ['CreateProgram', s => s.CreateProgram(COMPANY, {})],
    ['CreatePolicyVersion', s => s.CreatePolicyVersion(PROGRAM, {})],
    ['CreateInvitation', s => s.CreateInvitation(COMPANY, {})],
    ['RevokeInvitation', s => s.RevokeInvitation(COMPANY, INVITE, {})]
  ]

  mutations.forEach(([name, call]) => {
    test(name + ' carries an Idempotency-Key', async () => {
      respondWith(200, {})
      await call(service())
      expect(calledInit().headers['Idempotency-Key']).toEqual(expect.any(String))
      expect(calledInit().headers['Idempotency-Key'].length).toBeGreaterThan(0)
    })
  })

  test('every mutation gets its OWN key — a shared one would deduplicate two real commands', async () => {
    respondWith(200, {})
    await service().CreateInvitation(COMPANY, {})
    const first = calledInit().headers['Idempotency-Key']

    respondWith(200, {})
    await service().CreateInvitation(COMPANY, {})
    expect(calledInit().headers['Idempotency-Key']).not.toBe(first)
  })

  const reads = [
    ['GetCompany', s => s.GetCompany(COMPANY)],
    ['ListPrograms', s => s.ListPrograms(COMPANY)],
    ['ListInvitations', s => s.ListInvitations(COMPANY)],
    ['ListMembers', s => s.ListMembers(COMPANY)]
  ]

  reads.forEach(([name, call]) => {
    test(name + ' is a read: no key, no body', async () => {
      respondWith(200, [])
      await call(service())
      expect(calledInit().method).toBe('GET')
      expect(calledInit().headers['Idempotency-Key']).toBeUndefined()
      expect(calledInit().body).toBeUndefined()
    })
  })
})

describe('what this client deliberately does NOT bind', () => {
  test('the method set is exactly the eleven routes this surface can exercise', () => {
    const methods = Object.getOwnPropertyNames(MealsAdminService.prototype)
      .filter(name => name !== 'constructor' && name.charAt(0) !== '_')
    expect(methods.sort()).toEqual([
      'CreateCompany',
      'CreateInvitation',
      'CreatePolicyVersion',
      'CreateProgram',
      'GetCompany',
      'ListInvitations',
      'ListMembers',
      'ListPrograms',
      'RevokeInvitation',
      'SignAgreement',
      'UpdateCompany'
    ])
  })

  // Stated as absences rather than left to the sorted list above, because each one is a decision with
  // a reason recorded in the client's header: archive and membership revoke have no inverse route,
  // enrolment has no candidates until somebody claims, and claim/session belong to the invitee.
  test('no archive, no membership revoke, no enrolment, no claim', () => {
    const names = Object.getOwnPropertyNames(MealsAdminService.prototype).join(' ')
    expect(names).not.toMatch(/Archive/)
    expect(names).not.toMatch(/RevokeMembership/)
    expect(names).not.toMatch(/SetProgramMembers/)
    expect(names).not.toMatch(/Claim|Session/)
  })
})
