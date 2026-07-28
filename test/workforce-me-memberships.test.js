import {
  CAPABILITY_SELF,
  canSelfServe,
  hasCapability,
  roleSummary,
  selfServiceMemberships
} from '~/utils/workforce-me/memberships'

const membership = over => Object.assign({
  staffMemberId: '30000000-0000-0000-0000-000000000002',
  storeId: 90001,
  workforcePersonId: '20000000-0000-0000-0000-000000000001',
  displayName: 'Kari Claimed',
  isActive: true,
  capabilityGrants: 'WorkforceSelf',
  legalEmployerId: '10000000-0000-0000-0000-000000000001',
  activeFromUtc: '2026-01-01T00:00:00Z',
  activeToUtc: null,
  roleNames: ['Kokk']
}, over || {})

describe('capabilityGrants is a [Flags] enum on the wire', () => {
  // A single grant is "WorkforceSelf"; several are comma-separated. Failing to split would make every
  // multi-grant worker read as un-capable and blank the page while looking like "no shifts".
  test('a single grant matches', () => {
    expect(hasCapability('WorkforceSelf', CAPABILITY_SELF)).toBe(true)
  })

  test('a combined grant string matches each of its members', () => {
    const grants = 'WorkforceSelf, WorkforceScheduler'
    expect(hasCapability(grants, 'WorkforceSelf')).toBe(true)
    expect(hasCapability(grants, 'WorkforceScheduler')).toBe(true)
    expect(hasCapability(grants, 'WorkforceManager')).toBe(false)
  })

  test('spacing around the comma does not matter', () => {
    expect(hasCapability('WorkforceScheduler,WorkforceSelf', CAPABILITY_SELF)).toBe(true)
    expect(hasCapability('  WorkforceSelf ,WorkforceManager ', CAPABILITY_SELF)).toBe(true)
  })

  test('a prefix is not a match', () => {
    // "WorkforceSelfService" must not satisfy "WorkforceSelf".
    expect(hasCapability('WorkforceSelfService', CAPABILITY_SELF)).toBe(false)
  })

  test('None and absent grants match nothing', () => {
    expect(hasCapability('None', CAPABILITY_SELF)).toBe(false)
    expect(hasCapability('', CAPABILITY_SELF)).toBe(false)
    expect(hasCapability(null, CAPABILITY_SELF)).toBe(false)
    expect(hasCapability(undefined, CAPABILITY_SELF)).toBe(false)
  })

  test('the array shape is tolerated', () => {
    expect(hasCapability(['WorkforceSelf', 'WorkforceScheduler'], CAPABILITY_SELF)).toBe(true)
    expect(hasCapability([], CAPABILITY_SELF)).toBe(false)
  })

  test('the numeric bitmask shape is tolerated', () => {
    expect(hasCapability(1, 'WorkforceSelf')).toBe(true)
    expect(hasCapability(3, 'WorkforceSelf')).toBe(true)
    expect(hasCapability(3, 'WorkforceScheduler')).toBe(true)
    expect(hasCapability(2, 'WorkforceSelf')).toBe(false)
    expect(hasCapability(0, 'WorkforceSelf')).toBe(false)
    expect(hasCapability(12, 'WorkforceManager')).toBe(true)
  })
})

describe('which engagements the self-service reads cover', () => {
  test('an active engagement holding WorkforceSelf can be self-served', () => {
    expect(canSelfServe(membership())).toBe(true)
  })

  test('an inactive engagement cannot, even holding the grant', () => {
    // #33 and #39 both filter to active engagements server-side.
    expect(canSelfServe(membership({ isActive: false }))).toBe(false)
  })

  test('an active engagement without the grant cannot', () => {
    expect(canSelfServe(membership({ capabilityGrants: 'WorkforceScheduler' }))).toBe(false)
  })

  test('selection keeps the client picture identical to the server filter', () => {
    const all = [
      membership({ staffMemberId: 'a' }),
      membership({ staffMemberId: 'b', isActive: false }),
      membership({ staffMemberId: 'c', capabilityGrants: 'WorkforceManager' }),
      membership({ staffMemberId: 'd', capabilityGrants: 'WorkforceSelf, WorkforceManager' })
    ]
    expect(selfServiceMemberships(all).map(m => m.staffMemberId)).toEqual(['a', 'd'])
  })

  test('not loaded is null, and having no engagements is an empty list', () => {
    expect(selfServiceMemberships(null)).toBeNull()
    expect(selfServiceMemberships(undefined)).toBeNull()
    expect(selfServiceMemberships([])).toEqual([])
  })

  test('a null membership is never self-servable', () => {
    expect(canSelfServe(null)).toBe(false)
    expect(canSelfServe({})).toBe(false)
  })
})

describe('role summary', () => {
  test('roles are joined when present', () => {
    expect(roleSummary(membership({ roleNames: ['Kokk', 'Servitør'] }))).toBe('Kokk, Servitør')
  })

  test('no roles is an empty string, never an invented one', () => {
    expect(roleSummary(membership({ roleNames: [] }))).toBe('')
    expect(roleSummary(membership({ roleNames: null }))).toBe('')
    expect(roleSummary(membership({ roleNames: [null, ''] }))).toBe('')
    expect(roleSummary(null)).toBe('')
  })
})
