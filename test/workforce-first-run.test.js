import { shallowMount, mount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mock must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import WorkforceRosterPage from '~/pages/admin/workforce-roster.vue'
import WorkforceFirstRunForm from '~/components/admin/workforce/WorkforceFirstRunForm.vue'
import { buildFirstRunRequest } from '~/utils/workforce/roster'

// THE DEADLOCK THIS SURFACE EXISTS FOR. Workforce resolves capability only from an engagement, so a
// store administrator whose store has no Workforce staff is refused by every route on the roster
// page — including the context read the page opens on. Telling them they lack a permission is true
// and useless: nobody in the world can grant it, because granting it needs the very capability
// nobody has. The page therefore asks the server whether the store may still be bootstrapped, and
// offers to do it.
//
// What these tests defend is that the offer is the SERVER's to make. Every branch here turns on the
// server's own answer — the context refusal's code, the probe's `isOpen` — and never on anything the
// page could infer for itself, because "this store looks empty to me" is exactly what a caller who
// was refused the read is not entitled to conclude.

const calls = []
const behaviour = {}

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

    GetFirstRunStatus (storeId) {
      calls.push(['GetFirstRunStatus', storeId])
      if (behaviour.probeFails) { return Promise.reject(behaviour.probeFails) }
      return Promise.resolve(behaviour.status || null)
    }

    RunFirstRun (storeId, request) {
      calls.push(['RunFirstRun', storeId, request])
      if (behaviour.runFails) { return Promise.reject(behaviour.runFails) }
      return Promise.resolve(behaviour.runResult || { moduleActivated: true })
    }

    ListStaff () { calls.push(['ListStaff']); return Promise.resolve(behaviour.staff || []) }
    ListRoles () { return Promise.resolve([]) }
    ListLegalEmployers () { return Promise.resolve([]) }
    ListInvitations () { return Promise.resolve([]) }
  }
}))

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

const problem = (status, code) => ({ isWorkforceApiError: true, status, code, conflictKind: code, message: 'x', problem: { code } })

const openStatus = over => Object.assign({
  storeId: 42,
  isOpen: true,
  storeHasWorkforceStaff: false,
  moduleEnabled: false,
  moduleWillBeActivated: true,
  completedAtUtc: null
}, over)

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

describe('the roster page offering a store its first run', () => {
  beforeEach(() => {
    calls.length = 0
    Object.keys(behaviour).forEach(k => delete behaviour[k])
  })

  test('a store administrator of an empty store is offered the bootstrap instead of a permission message', async () => {
    behaviour.contextFails = problem(403, 'workforce.forbidden')
    behaviour.status = openStatus()

    const wrapper = mountPage()
    await settled()

    expect(calls.map(c => c[0])).toEqual(['GetContext', 'GetFirstRunStatus'])
    expect(wrapper.vm.firstRunStatus).toEqual(openStatus())
    // `findComponent`, not a selector: the page is shallow-mounted, so the form is a stub and a
    // `[data-wfr-first-run]` query would answer false for BOTH the rendered and the absent case —
    // which would make every "it is not offered" assertion below pass without meaning anything.
    expect(wrapper.findComponent(WorkforceFirstRunForm).exists()).toBe(true)
  })

  // The probe is a SECOND round trip and it is not free. It runs only where it can help — a store
  // whose context read was refused about the CALLER — so a running store's page load is unchanged.
  test('a store that answers the context is never probed at all', async () => {
    behaviour.staff = []
    mountPage()
    await settled()

    expect(calls.filter(c => c[0] === 'GetFirstRunStatus')).toHaveLength(0)
  })

  // The other 403 on that route, and it is about the MODULE rather than the caller. A store whose
  // operator has switched Workforce off is not a store waiting to be set up, and offering to
  // bootstrap it would answer a question nobody asked — and would look, to the operator who just
  // switched it off, like the product ignoring them.
  test('a module-off store is not offered a bootstrap; its own message stands', async () => {
    behaviour.contextFails = problem(403, 'workforce.module-disabled')

    const wrapper = mountPage()
    await settled()

    expect(calls.filter(c => c[0] === 'GetFirstRunStatus')).toHaveLength(0)
    expect(wrapper.vm.contextError).toBe('wf_module_off')
    expect(wrapper.findComponent(WorkforceFirstRunForm).exists()).toBe(false)
  })

  test('a context read that simply failed is not a bootstrap offer either', async () => {
    behaviour.contextFails = problem(500, 'boom')

    const wrapper = mountPage()
    await settled()

    expect(calls.filter(c => c[0] === 'GetFirstRunStatus')).toHaveLength(0)
    expect(wrapper.vm.contextError).toBe('wfr_context_failed')
  })

  // THE SECURITY-RELEVANT BRANCH. The endpoint refuses anyone who does not administer the store with
  // the same 403 a store that does not exist gets, so a rejected probe means "not yours to set up" —
  // and the page must go on saying exactly what it said before the probe existed.
  test('a refused probe leaves the ordinary capability message on screen', async () => {
    behaviour.contextFails = problem(403, 'workforce.forbidden')
    behaviour.probeFails = problem(403, 'workforce.forbidden')

    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.firstRunStatus).toBeNull()
    expect(wrapper.vm.contextError).toBe('wfr_no_capability')
    expect(wrapper.findComponent(WorkforceFirstRunForm).exists()).toBe(false)
  })

  // A store past its first run answers 200 with `isOpen: false`. To a caller who holds no capability
  // that has to keep looking exactly like a permission problem, because that is what it is.
  test('a store past its first run shows the permission message, not a form that cannot succeed', async () => {
    behaviour.contextFails = problem(403, 'workforce.forbidden')
    behaviour.status = openStatus({ isOpen: false, storeHasWorkforceStaff: true, completedAtUtc: '2026-01-01T00:00:00Z' })

    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.firstRunStatus).toBeNull()
    expect(wrapper.vm.contextError).toBe('wfr_no_capability')
    expect(wrapper.findComponent(WorkforceFirstRunForm).exists()).toBe(false)
  })

  test('running it sends the confirmed body and then re-reads the CONTEXT, not just the roster', async () => {
    // `init()` rather than `loadRoster()` is the whole point: the caller held no capabilities a
    // moment ago, so reloading only the roster would leave the page read-only for the person who has
    // just become its manager.
    behaviour.contextFails = problem(403, 'workforce.forbidden')
    behaviour.status = openStatus()

    const wrapper = mountPage()
    await settled()

    delete behaviour.contextFails
    calls.length = 0

    wrapper.vm.runFirstRun({
      organizationNumber: ' 912 345 678 ',
      legalEmployerName: '  Bryggen Bistro AS ',
      displayName: ' Ingrid Moen '
    })
    await settled()

    expect(calls[0]).toEqual(['RunFirstRun', 42, {
      confirmModuleActivation: true,
      // The INTERNAL spaces survive: stripping them is the server's rule, and a second
      // implementation of one rule is how the two stop agreeing.
      organizationNumber: '912 345 678',
      legalEmployerName: 'Bryggen Bistro AS',
      displayName: 'Ingrid Moen'
    }])
    expect(calls.map(c => c[0])).toContain('GetContext')
    expect(calls.map(c => c[0])).toContain('ListStaff')
    expect(wrapper.vm.firstRunStatus).toBeNull()
    expect(wrapper.vm.capabilities).toEqual(['WorkforceScheduler', 'WorkforceManager'])
  })

  // The door shutting between the probe and the press: a colleague set the store up first. Leaving
  // the form on screen would leave the operator pressing a button that can no longer succeed.
  test('losing the race replaces the form with the refusal and the store\'s real standing', async () => {
    behaviour.contextFails = problem(403, 'workforce.forbidden')
    behaviour.status = openStatus()

    const wrapper = mountPage()
    await settled()

    behaviour.runFails = problem(409, 'workforce.first-run-complete')
    behaviour.status = openStatus({ isOpen: false, storeHasWorkforceStaff: true })

    wrapper.vm.runFirstRun({ organizationNumber: '912345678', legalEmployerName: 'X AS', displayName: 'Y' })
    await settled()

    expect(wrapper.vm.conflict.code).toBe('workforce.first-run-complete')
    expect(wrapper.vm.conflictHeadline).toBe('wfr_conflict_first_run_title')
    expect(wrapper.vm.conflictDetail).toBe('wfr_conflict_first_run')
    expect(wrapper.vm.firstRunStatus).toBeNull()
    expect(wrapper.findComponent(WorkforceFirstRunForm).exists()).toBe(false)
  })
})

describe('the first-run form', () => {
  const mountForm = status => mount(WorkforceFirstRunForm, {
    propsData: { status },
    mocks: { $i: key => key }
  })

  // THE MODULE CONSEQUENCE. Creating the first engagement switches Workforce on for the store
  // whatever this checkbox says — the gate grandfathers any store that has one — so the honest
  // design is not to hide the activation but to refuse to perform it until the operator has read
  // what it does. The server refuses an unconfirmed body for the same reason.
  test('it will not submit until the operator has confirmed switching the module on', async () => {
    const wrapper = mountForm(openStatus())

    await wrapper.find('[data-wfr-first-employer]').setValue('Bryggen Bistro AS')
    await wrapper.find('[data-wfr-first-orgnr]').setValue('912345678')
    await wrapper.find('[data-wfr-first-name]').setValue('Ingrid Moen')

    expect(wrapper.find('[data-wfr-first-consent]').exists()).toBe(true)
    expect(wrapper.find('[data-wfr-first-submit]').attributes('disabled')).toBe('disabled')

    await wrapper.find('[data-wfr-first-confirm]').setChecked(true)
    expect(wrapper.find('[data-wfr-first-submit]').attributes('disabled')).toBeUndefined()

    // The form's own submit, not a click on the button: the component binds `@submit.prevent`, and
    // jsdom does not turn a click on a submit button into a form submission.
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted().submit[0][0]).toEqual({
      confirmModuleActivation: true,
      organizationNumber: '912345678',
      legalEmployerName: 'Bryggen Bistro AS',
      displayName: 'Ingrid Moen'
    })
  })

  // A module that is already on cannot be switched on, so asking the operator to agree to it would
  // be theatre — and the kind that teaches people to tick boxes without reading them.
  test('a store whose module is already on is told so, and is asked to confirm nothing', async () => {
    const wrapper = mountForm(openStatus({ moduleEnabled: true, moduleWillBeActivated: false }))

    await wrapper.find('[data-wfr-first-employer]').setValue('Bryggen Bistro AS')
    await wrapper.find('[data-wfr-first-orgnr]').setValue('912345678')
    await wrapper.find('[data-wfr-first-name]').setValue('Ingrid Moen')

    expect(wrapper.find('[data-wfr-first-consent]').exists()).toBe(false)
    expect(wrapper.find('[data-wfr-first-already-on]').exists()).toBe(true)
    expect(wrapper.find('[data-wfr-first-submit]').attributes('disabled')).toBeUndefined()
  })

  test('it asks for no subject, because the engagement is the caller\'s own', () => {
    // Not a rendering preference: the endpoint takes no subject at all, and a field inviting an owner
    // to type their bookkeeper's name would promise something the seam deliberately cannot do.
    const wrapper = mountForm(openStatus())
    const names = wrapper.findAll('input').wrappers.map(w => w.attributes())

    expect(names.some(a => a['data-wfr-first-name'] !== undefined)).toBe(true)
    expect(wrapper.html()).toContain('wfr_first_your_name_hint')
    expect(wrapper.html()).not.toContain('workforcePersonId')
  })
})

describe('buildFirstRunRequest', () => {
  test('it trims the edges and leaves the organization number\'s internal spaces to the server', () => {
    expect(buildFirstRunRequest({
      organizationNumber: '  912 345 678  ',
      legalEmployerName: '  Bryggen Bistro AS  ',
      displayName: '  Ingrid Moen  '
    })).toEqual({
      confirmModuleActivation: true,
      organizationNumber: '912 345 678',
      legalEmployerName: 'Bryggen Bistro AS',
      displayName: 'Ingrid Moen'
    })
  })

  test('it never asks the server to engage anybody but the caller', () => {
    const body = buildFirstRunRequest({
      organizationNumber: '1',
      legalEmployerName: 'x',
      displayName: 'y',
      // A caller trying to smuggle a subject through gets nothing: the builder copies four fields and
      // the server reads no others.
      workforcePersonId: 'somebody-else',
      applicationUserId: 'somebody-else'
    })

    expect(Object.keys(body).sort()).toEqual([
      'confirmModuleActivation', 'displayName', 'legalEmployerName', 'organizationNumber'
    ])
  })
})
