import { shallowMount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mock must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import WorkforceRosterPage from '~/pages/admin/workforce-roster.vue'
import { ROSTER_EMPTY, ROSTER_UNKNOWN } from '~/utils/workforce/roster'

// These tests are meaningful only under a non-UTC TZ — run the suite with TZ=Europe/Oslo.

const calls = []
const behaviour = {}

// The page builds its client in a computed, so the module is mocked rather than the instance. Every
// call is recorded so the tests can assert WHICH reads and writes the page issues — the part of a
// page that is a contract with the backend rather than a rendering choice.
jest.mock('~/utils/workforce/roster-client', () => ({
  WorkforceRosterService: class {
    GetContext (storeId) {
      calls.push(['GetContext', storeId])
      if (behaviour.contextFails) { return Promise.reject(behaviour.contextFails) }
      return Promise.resolve({
        timeZone: { id: 'Europe/Oslo' },
        capabilities: behaviour.capabilities || ['WorkforceScheduler', 'WorkforceManager']
      })
    }

    ListStaff () {
      calls.push(['ListStaff'])
      return behaviour.staffFails ? Promise.reject(behaviour.staffFails) : Promise.resolve(behaviour.staff || [])
    }

    ListRoles () { calls.push(['ListRoles']); return Promise.resolve([]) }

    ListLegalEmployers () {
      calls.push(['ListLegalEmployers'])
      return behaviour.employersFails ? Promise.reject(behaviour.employersFails) : Promise.resolve(behaviour.employers || [])
    }

    CreateLegalEmployer (_s, request) {
      calls.push(['CreateLegalEmployer', request])
      return behaviour.createEmployerFails ? Promise.reject(behaviour.createEmployerFails) : Promise.resolve({ legalEmployerId: 'le-new' })
    }

    GetStaff (_s, id) { calls.push(['GetStaff', id]); return Promise.resolve({ staffMemberId: id, revision: behaviour.revision === undefined ? 'AAAA' : behaviour.revision }) }
    ListStaffRoles (_s, id) { calls.push(['ListStaffRoles', id]); return Promise.resolve([]) }
    GetEmploymentTerms (_s, id) { calls.push(['GetEmploymentTerms', id]); return Promise.resolve([]) }
    GetAttendance (_s, from, to) { calls.push(['GetAttendance', from, to]); return Promise.resolve({ rows: [] }) }

    CreateStaff (_s, request) {
      calls.push(['CreateStaff', request])
      return behaviour.createFails ? Promise.reject(behaviour.createFails) : Promise.resolve({ staffMemberId: 'sm-new' })
    }

    UpdateStaff (_s, id, revision, request) {
      calls.push(['UpdateStaff', id, revision, request])
      return behaviour.updateFails ? Promise.reject(behaviour.updateFails) : Promise.resolve({ staffMemberId: id })
    }

    AssignStaffRoles (_s, id, roles) { calls.push(['AssignStaffRoles', id, roles]); return Promise.resolve([]) }
    CreateEmploymentTerm (_s, id, request) { calls.push(['CreateEmploymentTerm', id, request]); return Promise.resolve({}) }
  }
}))

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

const summary = over => Object.assign({
  staffMemberId: 'sm-1',
  workforcePersonId: 'p-1',
  displayName: 'Ida Berg',
  employmentNumber: '104',
  capabilities: ['WorkforceSelf', 'WorkforceManager'],
  isActive: true,
  activeFromUtc: '2026-01-10T00:00:00',
  activeToUtc: null,
  legalEmployerId: 'le-1',
  personState: 'Claimed'
}, over)

// A typed workforce failure as `api-client` constructs it, without importing the class into a file
// whose whole subject is how the page reacts to one.
const problem = (status, code) => ({ isWorkforceApiError: true, status, code, conflictKind: code, message: 'x', problem: { code } })

function mountPage () {
  return shallowMount(WorkforceRosterPage, {
    mocks: {
      $i: key => key,
      $store: {
        getters: { userIsLoggedIn: true },
        state: { selectedAdminStore: 42, adminLocale: 'no', currentUser: { id: 1, adminIn: [{ id: 42 }] } }
      },
      _coreInitializer: { bearerToken: 'tok' }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' } }
  })
}

describe('the workforce roster page', () => {
  beforeEach(() => {
    calls.length = 0
    Object.keys(behaviour).forEach(k => delete behaviour[k])
  })

  test('it reads the context first, because every date is rendered in the STORE zone', async () => {
    behaviour.staff = [summary()]
    const wrapper = mountPage()
    await settled()

    expect(calls[0]).toEqual(['GetContext', 42])
    expect(wrapper.vm.timeZoneId).toBe('Europe/Oslo')
    expect(calls.filter(c => c[0] === 'ListStaff')).toHaveLength(1)
  })

  test('without the store timezone it renders nothing rather than the viewer\'s own zone', async () => {
    behaviour.contextFails = problem(500, 'boom')
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.contextError).toBe('wfr_context_failed')
    expect(calls.filter(c => c[0] === 'ListStaff')).toHaveLength(0)
  })

  test('a 403 on the context is a capability answer, not a generic failure', async () => {
    behaviour.contextFails = problem(403, 'workforce.forbidden')
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.contextError).toBe('wfr_no_capability')
  })

  // THE OTHER 403, and it is not about the reader at all. `workforce.module` off for this store
  // answers 403 `workforce.module-disabled` — measured on the live world, whose body reads
  // `{"code":"workforce.module-disabled","status":403,…}` (lanes/…/walk-before.json). The page used
  // to print «Du har ikke bemanningstilgang», sending the operator who switched the module off to go
  // and look at somebody's permissions.
  test('a module-off 403 names the MODULE, not the reader\'s access', async () => {
    behaviour.contextFails = problem(403, 'workforce.module-disabled')
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.contextError).toBe('wf_module_off')
    expect(wrapper.vm.contextError).not.toBe('wfr_no_capability')
    // And it still blocks: naming the cause is not permission to try the reads behind it.
    expect(calls.filter(c => c[0] === 'ListStaff')).toHaveLength(0)
  })

  // THE distinction. A failed roster read must never spend a frame claiming the store is empty.
  test('a failed staff read leaves the roster UNKNOWN, never empty', async () => {
    behaviour.staffFails = problem(500, 'boom')
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.staff).toBeNull()
    expect(wrapper.vm.roster.state).toBe(ROSTER_UNKNOWN)
  })

  test('a staff read that answers with nothing is EMPTY — the other claim', async () => {
    behaviour.staff = []
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.roster.state).toBe(ROSTER_EMPTY)
  })

  test('selecting an engagement fetches its detail, roles, terms and open-session probe', async () => {
    behaviour.staff = [summary()]
    const wrapper = mountPage()
    await settled()
    calls.length = 0

    wrapper.vm.select({ staffMemberId: 'sm-1' })
    await settled()

    expect(calls.map(c => c[0]).sort()).toEqual(['GetAttendance', 'GetEmploymentTerms', 'GetStaff', 'ListStaffRoles'])
  })

  // Thirty days back: a session left open days ago is exactly the case the probe exists for, so a
  // window of "today" would miss the only interesting answer.
  test('the open-session probe looks back far enough to find a stranded session', async () => {
    behaviour.staff = [summary()]
    const wrapper = mountPage()
    await settled()
    calls.length = 0

    wrapper.vm.select({ staffMemberId: 'sm-1' })
    await settled()

    const [, from, to] = calls.find(c => c[0] === 'GetAttendance')
    expect(Math.round((to - from) / 86400000)).toBe(31)
  })

  test('creating sends the built wire shape and reloads the roster', async () => {
    behaviour.staff = [summary()]
    const wrapper = mountPage()
    await settled()
    calls.length = 0

    await wrapper.vm.createStaff({
      displayName: 'Nora Haug',
      legalEmployerId: 'le-1',
      capabilities: ['WorkforceSelf'],
      activeFromDate: '2026-08-01'
    })
    await settled()

    const [, request] = calls.find(c => c[0] === 'CreateStaff')
    expect(request.displayName).toBe('Nora Haug')
    // Store-local midnight, bare, no `Z`.
    expect(request.activeFromUtc).toBe('2026-07-31T22:00:00')
    expect(calls.filter(c => c[0] === 'ListStaff')).toHaveLength(1)
  })

  // The roster's PREREQUISITE, not a detail of it: POST /staff refuses without a legalEmployerId, so
  // a store whose employer list never loads cannot hire and the page has to know that before the
  // manager opens the form.
  test('it reads the legal employers alongside the roster', async () => {
    behaviour.staff = [summary()]
    behaviour.employers = [{ legalEmployerId: 'le-1', organizationNumber: '912345678', name: 'Bryggen Bistro AS', inUseHere: true }]
    const wrapper = mountPage()
    await settled()

    expect(calls.filter(c => c[0] === 'ListLegalEmployers')).toHaveLength(1)
    expect(wrapper.vm.employers.state).toBe('listed')
    expect(wrapper.vm.employers.rows[0]).toMatchObject({ name: 'Bryggen Bistro AS', activeCount: 1 })
  })

  test('a failed employer read leaves the list UNKNOWN, never empty', async () => {
    behaviour.staff = [summary()]
    behaviour.employersFails = new Error('offline')
    const wrapper = mountPage()
    await settled()

    // Empty would invite the manager to register an employer this store may already have.
    expect(wrapper.vm.employers.state).toBe('unknown')
  })

  test('registering an employer sends the trimmed body, re-reads, and then opens the hiring form', async () => {
    behaviour.staff = [summary()]
    const wrapper = mountPage()
    await settled()
    calls.length = 0

    await wrapper.vm.createLegalEmployer({ name: '  Bryggen Bistro AS ', organizationNumber: ' 912 345 678 ' })
    await settled()

    const [, request] = calls.find(c => c[0] === 'CreateLegalEmployer')
    expect(request).toEqual({ name: 'Bryggen Bistro AS', organizationNumber: '912 345 678' })

    // The re-read has to happen BEFORE the hiring form opens: that form picks its default employer
    // in `created`, so opening it first would build it against the list from before this call.
    const employerCall = calls.findIndex(c => c[0] === 'CreateLegalEmployer')
    const listCall = calls.findIndex(c => c[0] === 'ListLegalEmployers')
    expect(listCall).toBeGreaterThan(employerCall)
    expect(wrapper.vm.registeringEmployer).toBe(false)
    expect(wrapper.vm.adding).toBe(true)
  })

  // Not a toast and not a retry: the company is already registered here and the refusal names the
  // row, so the manager is sent to the list rather than to the button.
  test('an already-registered company is a conflict band, and the list is re-read anyway', async () => {
    behaviour.staff = [summary()]
    behaviour.createEmployerFails = problem(409, 'workforce.legal-employer-exists')
    const wrapper = mountPage()
    await settled()
    calls.length = 0

    await wrapper.vm.createLegalEmployer({ name: 'Bryggen Bistro AS', organizationNumber: '912345678' })
    await settled()

    expect(wrapper.vm.conflict.code).toBe('workforce.legal-employer-exists')
    expect(wrapper.vm.conflictDetail).toBe('wfr_conflict_employer_exists')
    // The refusal means the row exists; if it was missing from the list on screen, that list was
    // stale — which is the only reading under which this button was ever pressed.
    expect(calls.filter(c => c[0] === 'ListLegalEmployers')).toHaveLength(1)
    // And the hiring form is NOT opened on a refusal.
    expect(wrapper.vm.adding).toBe(false)
  })

  // The two engagement conflicts are one rule with two answers, and only one of them may name
  // anything. The page keys on the code, never on the prose.
  test('the cross-store conflict is rendered with a message that names nothing', async () => {
    behaviour.staff = [summary()]
    behaviour.createFails = problem(409, 'workforce.hidden-engagement-conflict')
    const wrapper = mountPage()
    await settled()

    await wrapper.vm.createStaff({ displayName: 'Nora Haug', legalEmployerId: 'le-1', capabilities: [] })
    await settled()

    expect(wrapper.vm.conflictHeadline).toBe('wfr_conflict_hidden_title')
    expect(wrapper.vm.conflictDetail).toBe('wfr_conflict_hidden')
  })

  test('the same-store conflict is a different sentence', async () => {
    behaviour.staff = [summary()]
    behaviour.createFails = problem(409, 'workforce.engagement-conflict')
    const wrapper = mountPage()
    await settled()

    await wrapper.vm.createStaff({ displayName: 'Nora Haug', legalEmployerId: 'le-1', capabilities: [] })
    await settled()
    expect(wrapper.vm.conflictHeadline).toBe('wfr_conflict_same_store_title')
  })

  test('ending PATCHes isActive:false with the opaque revision as the precondition', async () => {
    behaviour.staff = [summary({ capabilities: ['WorkforceSelf'] })]
    const wrapper = mountPage()
    await settled()
    wrapper.vm.select({ staffMemberId: 'sm-1' })
    await settled()
    calls.length = 0

    await wrapper.vm.endEngagement({ recordEndDate: false, endDate: '' })
    await settled()

    const [, id, revision, request] = calls.find(c => c[0] === 'UpdateStaff')
    expect(id).toBe('sm-1')
    expect(revision).toBe('AAAA')
    expect(request.isActive).toBe(false)
    // Not sent by default: an end date cannot be cleared afterwards.
    expect(request.activeToUtc).toBeNull()
  })

  // Without the revision there is no If-Match, and the controller answers a plain 400 before the
  // service runs. The page refuses to fire it rather than showing the manager a 400.
  test('an engagement with no revision is not patchable, and the page says so instead of trying', async () => {
    behaviour.staff = [summary()]
    behaviour.revision = null
    const wrapper = mountPage()
    await settled()
    wrapper.vm.select({ staffMemberId: 'sm-1' })
    await settled()
    calls.length = 0

    expect(wrapper.vm.canPatch).toBe(false)
    await wrapper.vm.endEngagement({ recordEndDate: false, endDate: '' })
    expect(calls.filter(c => c[0] === 'UpdateStaff')).toHaveLength(0)
  })

  test('a stale revision is surfaced and the roster re-read, so the screen stops showing a dead version', async () => {
    behaviour.staff = [summary({ capabilities: ['WorkforceSelf'] })]
    const wrapper = mountPage()
    await settled()
    wrapper.vm.select({ staffMemberId: 'sm-1' })
    await settled()

    behaviour.updateFails = problem(409, 'workforce.stale-revision')
    calls.length = 0
    await wrapper.vm.endEngagement({ recordEndDate: false, endDate: '' })
    await settled()

    expect(wrapper.vm.conflictHeadline).toBe('wfr_conflict_stale_title')
    expect(calls.filter(c => c[0] === 'ListStaff').length).toBeGreaterThan(0)
  })

  // The same index governs a reactivation, and this half of it is visible, so it is refused here
  // rather than through a 409.
  test('reactivating into a same-store, same-employer clash is refused without a call', async () => {
    behaviour.staff = [
      summary({ staffMemberId: 'sm-1', isActive: false }),
      summary({ staffMemberId: 'sm-2', isActive: true })
    ]
    const wrapper = mountPage()
    await settled()
    wrapper.vm.select({ staffMemberId: 'sm-1' })
    await settled()
    calls.length = 0

    await wrapper.vm.reactivate()
    expect(calls.filter(c => c[0] === 'UpdateStaff')).toHaveLength(0)
    expect(wrapper.vm.conflictHeadline).toBe('wfr_conflict_same_store_title')
  })

  test('a scheduler without the manager capability gets a read-only roster', async () => {
    behaviour.capabilities = ['WorkforceScheduler']
    behaviour.staff = [summary()]
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.canManage).toBe(false)
  })

  test('the payroll capability is what decides whether a null wage means withheld', async () => {
    behaviour.capabilities = ['WorkforceManager', 'WorkforcePayrollApprover']
    behaviour.staff = [summary()]
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.hasPayrollApprover).toBe(true)
  })

  // A non-null capability list REPLACES the grant set, so a number edit that sent one would let
  // "fix a payroll number" silently rewrite what someone may do.
  test('saving the engagement numbers sends no capability list at all', async () => {
    behaviour.staff = [summary()]
    const wrapper = mountPage()
    await settled()
    wrapper.vm.select({ staffMemberId: 'sm-1' })
    await settled()
    calls.length = 0

    await wrapper.vm.saveNumbers({ employmentNumber: '211', payrollNumber: '9' })
    const [, , , request] = calls.find(c => c[0] === 'UpdateStaff')
    expect(request).toMatchObject({ employmentNumber: '211', payrollNumber: '9', capabilities: null, isActive: null })
  })

  test('a term appends with hours converted to minutes and the date in the store zone', async () => {
    behaviour.staff = [summary()]
    const wrapper = mountPage()
    await settled()
    wrapper.vm.select({ staffMemberId: 'sm-1' })
    await settled()
    calls.length = 0

    await wrapper.vm.saveTerm({ effectiveFromDate: '2026-08-01', contractHoursPerWeek: '37.5', employmentCategory: 'Fast' })
    const [, id, request] = calls.find(c => c[0] === 'CreateEmploymentTerm')
    expect(id).toBe('sm-1')
    expect(request.contractMinutesPerWeek).toBe(2250)
    expect(request.effectiveFromUtc).toBe('2026-07-31T22:00:00')
    // No payroll capability in this context, so no wage block is sent at all.
    expect(request.wage).toBeNull()
  })

  test('assigning roles PUTs the full intended set', async () => {
    behaviour.staff = [summary()]
    const wrapper = mountPage()
    await settled()
    wrapper.vm.select({ staffMemberId: 'sm-1' })
    await settled()
    calls.length = 0

    await wrapper.vm.saveRoles(['r1', 'r2'])
    const [, id, roles] = calls.find(c => c[0] === 'AssignStaffRoles')
    expect(id).toBe('sm-1')
    expect(roles.map(r => r.roleId)).toEqual(['r1', 'r2'])
  })
})
