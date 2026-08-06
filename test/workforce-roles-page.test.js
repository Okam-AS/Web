import { shallowMount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mock must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import WorkforceRolesPage from '~/pages/admin/workforce-roles.vue'

// WHAT THIS SUITE IS FOR, given that the journey already drives the page in a browser.
//
// The journey proves the round trip exists. It cannot cheaply prove the SHAPE of what goes on the
// wire, and the shape is where this endpoint is dangerous: `PUT /roles` is a MERGE whose sibling one
// line below it in the same client (`AssignStaffRoles`) is a full REPLACE, and its update branch
// assigns `EffectiveToUtc` unconditionally. Both are silent, destructive and invisible on screen —
// a page that sent the whole catalogue would look identical in a browser, and so would one that
// un-retired a role every time somebody fixed its spelling. So the assertions below are about the
// REQUEST, and they are the reason the page can be trusted with a verb this sharp.

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

    ListRoles (storeId) {
      calls.push(['ListRoles', storeId])
      return behaviour.rolesFails ? Promise.reject(behaviour.rolesFails) : Promise.resolve(behaviour.roles || [])
    }

    UpsertRoles (storeId, roles) {
      calls.push(['UpsertRoles', storeId, roles])
      if (behaviour.upsertFails) { return Promise.reject(behaviour.upsertFails) }
      return Promise.resolve(behaviour.upsertReturns || [])
    }
  }
}))

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

const problem = (status, code) => ({ isWorkforceApiError: true, status, code, message: 'x', problem: { code } })

const role = over => Object.assign({
  roleId: 'r-1',
  name: 'Barvakt',
  station: 'Bar',
  color: '#1bb776',
  sortOrder: 1,
  effectiveFromUtc: '2026-01-01T00:00:00',
  effectiveToUtc: null
}, over)

function mountPage () {
  return shallowMount(WorkforceRolesPage, {
    mocks: {
      $i: key => key,
      $store: {
        getters: { userIsLoggedIn: true },
        state: { selectedAdminStore: 44, adminLocale: 'no', currentUser: { id: 1, adminIn: [{ id: 44 }] } }
      },
      _coreInitializer: { bearerToken: 'tok' }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' } }
  })
}

const lastUpsert = () => calls.filter(c => c[0] === 'UpsertRoles').pop()

describe('the workforce role catalogue page', () => {
  beforeEach(() => {
    calls.length = 0
    Object.keys(behaviour).forEach(k => delete behaviour[k])
  })

  test('it reads the context before the catalogue — the write needs a capability the read does not', async () => {
    mountPage()
    await settled()
    expect(calls[0]).toEqual(['GetContext', 44])
    expect(calls[1]).toEqual(['ListRoles', 44])
  })

  // THE distinction this whole surface turns on, and the reason the lane exists: a manager told
  // "this store has no roles" types the catalogue again.
  test('a failed role read leaves the list UNKNOWN, never empty', async () => {
    behaviour.rolesFails = problem(500, 'boom')
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.roles).toBeNull()
  })

  test('a read that answers with nothing is EMPTY — the other claim', async () => {
    behaviour.roles = []
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.roles).toEqual([])
  })

  test('a 403 on the context is a workforce-access answer, not a generic failure', async () => {
    behaviour.contextFails = problem(403, 'workforce.forbidden')
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.contextError).toBe('wfrl_no_workforce_access')
    expect(calls.filter(c => c[0] === 'ListRoles')).toHaveLength(0)
  })

  // The read is WorkforceScheduler and the write is WorkforceManager, so this pair is a real state:
  // the list must still render while the form is refused.
  test('a scheduler without WorkforceManager still sees the list and cannot author', async () => {
    behaviour.capabilities = ['WorkforceScheduler']
    behaviour.roles = [role()]
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.canManage).toBe(false)
    expect(wrapper.vm.roles).toHaveLength(1)
  })

  test('a create sends ONE item and no roleId — absence is what makes it a create', async () => {
    behaviour.roles = [role({ roleId: 'r-existing', name: 'Kjøkken', sortOrder: 3 })]
    behaviour.upsertReturns = [role()]
    const wrapper = mountPage()
    await settled()

    wrapper.vm.form.name = 'Barvakt'
    wrapper.vm.form.station = 'Bar'
    await wrapper.vm.submit()

    const [, storeId, items] = lastUpsert()
    expect(storeId).toBe(44)
    // NOT the whole catalogue. `PUT /roles` leaves roles absent from the request untouched, so
    // sending the existing role back would rewrite a row this manager never edited.
    expect(items).toHaveLength(1)
    expect(items[0].roleId).toBeUndefined()
    expect(items[0].name).toBe('Barvakt')
    expect(items[0].station).toBe('Bar')
  })

  test('a new role is ordered AFTER the ones that exist rather than colliding at zero', async () => {
    behaviour.roles = [role({ sortOrder: 3 }), role({ roleId: 'r-2', sortOrder: 7 })]
    behaviour.upsertReturns = []
    const wrapper = mountPage()
    await settled()

    wrapper.vm.form.name = 'Ny'
    await wrapper.vm.submit()
    expect(lastUpsert()[2][0].sortOrder).toBe(8)
  })

  test('a blank name is refused HERE, because the server stores it without complaint', async () => {
    behaviour.roles = []
    const wrapper = mountPage()
    await settled()

    wrapper.vm.form.name = '   '
    await wrapper.vm.submit()

    expect(calls.filter(c => c[0] === 'UpsertRoles')).toHaveLength(0)
    expect(wrapper.vm.nameError).toBe('wfrl_error_name_required')
  })

  test('the page adopts the write RESPONSE as the catalogue rather than re-reading', async () => {
    behaviour.roles = []
    behaviour.upsertReturns = [role({ name: 'Barvakt' })]
    const wrapper = mountPage()
    await settled()

    wrapper.vm.form.name = 'Barvakt'
    await wrapper.vm.submit()
    await settled()

    expect(wrapper.vm.roles).toEqual([role({ name: 'Barvakt' })])
    // One read at init and no second one: a re-read could observe a different write and would make
    // the toast describe a state the screen is not showing.
    expect(calls.filter(c => c[0] === 'ListRoles')).toHaveLength(1)
  })

  test('retiring sets effectiveToUtc and restates every other field unchanged', async () => {
    const existing = role({ name: 'Barvakt', station: 'Bar', sortOrder: 4 })
    behaviour.roles = [existing]
    behaviour.upsertReturns = [existing]
    const wrapper = mountPage()
    await settled()

    await wrapper.vm.retireRole(existing)
    const item = lastUpsert()[2][0]

    expect(item.roleId).toBe('r-1')
    expect(typeof item.effectiveToUtc).toBe('string')
    expect(item.name).toBe('Barvakt')
    expect(item.station).toBe('Bar')
    expect(item.sortOrder).toBe(4)
    // Never sent, so the role keeps the day it started — the ONE field the service assigns
    // conditionally.
    expect(item.effectiveFromUtc).toBeUndefined()
  })

  test('reinstating clears effectiveToUtc — there is no delete, only the two directions of this', async () => {
    const retired = role({ effectiveToUtc: '2026-02-01T00:00:00' })
    behaviour.roles = [retired]
    behaviour.upsertReturns = [retired]
    const wrapper = mountPage()
    await settled()

    await wrapper.vm.reinstateRole(retired)
    expect(lastUpsert()[2][0].effectiveToUtc).toBeNull()
  })

  // THE TRAP. `UpsertRolesAsync` assigns `role.EffectiveToUtc = item.EffectiveToUtc` with no null
  // check, so an edit that omitted the field would silently bring a retired role back onto every
  // manager's role select. This is the test that would fail if the page ever stopped carrying it.
  test('editing a RETIRED role does not silently bring it back', async () => {
    const retired = role({ name: 'Barvakt', effectiveToUtc: '2026-02-01T00:00:00' })
    behaviour.roles = [retired]
    behaviour.upsertReturns = [retired]
    const wrapper = mountPage()
    await settled()

    wrapper.vm.editRole(retired)
    expect(wrapper.vm.form.effectiveToUtc).toBe('2026-02-01T00:00:00')

    wrapper.vm.form.name = 'Barvakt kveld'
    await wrapper.vm.submit()

    const item = lastUpsert()[2][0]
    expect(item.roleId).toBe('r-1')
    expect(item.name).toBe('Barvakt kveld')
    expect(item.effectiveToUtc).toBe('2026-02-01T00:00:00')
  })

  test('a role retired in the past reads as retired; one with no end date does not', async () => {
    behaviour.roles = [
      role({ roleId: 'past', effectiveToUtc: '2020-01-01T00:00:00' }),
      role({ roleId: 'open', effectiveToUtc: null }),
      role({ roleId: 'future', effectiveToUtc: '2999-01-01T00:00:00' })
    ]
    const wrapper = mountPage()
    await settled()

    const byId = {}
    wrapper.vm.orderedRoles.forEach((r) => { byId[r.roleId] = r.retired })
    expect(byId).toEqual({ past: true, open: false, future: false })
  })

  test('a refused write leaves the catalogue as it was and says so with the server\'s wording', async () => {
    behaviour.roles = [role()]
    behaviour.upsertFails = problem(409, 'workforce.flag-disabled-read-only')
    const wrapper = mountPage()
    await settled()

    wrapper.vm.form.name = 'Ny'
    await wrapper.vm.submit()
    await settled()

    expect(wrapper.vm.roles).toEqual([role()])
    expect(wrapper.vm.toast.type).toBe('error')
    expect(wrapper.vm.saving).toBe(false)
  })

  test('switching store re-reads everything, because a catalogue belongs to one store', async () => {
    behaviour.roles = [role()]
    const wrapper = mountPage()
    await settled()
    calls.length = 0

    wrapper.vm.$store.state.selectedAdminStore = 42
    await wrapper.vm.$nextTick()
    await settled()

    expect(calls.filter(c => c[0] === 'ListRoles').map(c => c[1])).toEqual([42])
  })
})
