import Vue from 'vue'
import { shallowMount } from '@vue/test-utils'
import AdminPage from '~/components/organisms/AdminPage.vue'
import AdminPageHeader from '~/components/organisms/AdminPageHeader.vue'
import AdminPageFooter from '~/components/organisms/AdminPageFooter.vue'

// Where signing out of the admin puts you. Nothing asserted this before, which is why
// `window.location.href = '/'` — the CONSUMER storefront — survived in two components at once: the
// destination is a different page in the other half of the product, and no test of either half
// crosses that line.
//
// The browser walk is the real evidence (lanes/L-ADMIN-LOGOUT-RETURNS-TO-SIGN-IN/arm-*/walk.txt);
// these tests exist so the destination cannot be changed back without a red.

// A store whose `currentUser` is genuinely reactive, so the shell's watcher fires the way it fires
// in the app — from the session ending — rather than by being called by hand.
function reactiveStore (currentUser) {
  const state = Vue.observable({
    currentUser,
    selectedAdminStore: 7,
    adminLocale: 'no'
  })
  return {
    state,
    get getters () {
      return { userIsLoggedIn: state.currentUser && state.currentUser.id }
    },
    dispatch: jest.fn(),
    commit: jest.fn()
  }
}

function mountShell (path) {
  const $store = reactiveStore({ id: 9, adminIn: [{ id: 7, name: 'Kafé Nord' }] })
  const replace = jest.fn().mockReturnValue(Promise.resolve())
  const wrapper = shallowMount(AdminPage, {
    mocks: {
      $store,
      $route: { path, fullPath: path, query: {} },
      $router: { replace },
      _userService: { Reload: jest.fn().mockResolvedValue(undefined) }
    },
    stubs: { 'client-only': true }
  })
  // How the session actually ends: `Logout()` dispatches ClearState, which empties currentUser.
  //
  // `initAuth` is awaited out first and its calls discarded. It has its own membership bounce which
  // reads `currentUser.adminIn` AFTER an await, so emptying the user inside that window makes it
  // navigate to /registrer — a real (pre-existing) race, but a mount-time one, and not the thing
  // under test here. A person signs out long after the shell has settled.
  const endTheSession = async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
    replace.mockClear()
    $store.state.currentUser = {}
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
  }
  return { wrapper, replace, endTheSession }
}

describe('AdminPage — where the end of a session leaves you', () => {
  test('from a deeper admin page, the session ending routes to the admin sign-in', async () => {
    const { wrapper, replace, endTheSession } = mountShell('/admin/orders')
    await endTheSession()
    expect(replace).toHaveBeenCalledWith('/admin')
    expect(wrapper.vm.showLogin).toBe(true)
  })

  test('NOT the consumer storefront, and NOT the ?redirect= form that never emits login-success', async () => {
    const { replace, endTheSession } = mountShell('/admin/orders')
    await endTheSession()
    const destinations = replace.mock.calls.map(call => String(call[0]))
    // Asserted WHOLE rather than as two absences, so it cannot pass by the shell navigating nowhere
    // at all — which is exactly how the unfixed component behaves.
    expect(destinations).toEqual(['/admin'])
  })

  test('already on /admin: the sign-in is put up in place, with no navigation at all', async () => {
    const { wrapper, replace, endTheSession } = mountShell('/admin')
    await endTheSession()
    expect(wrapper.vm.showLogin).toBe(true)
    expect(replace).not.toHaveBeenCalled()
  })

  test('a session that never existed is not a session ending: an anonymous visitor is untouched', async () => {
    const $store = reactiveStore({})
    const replace = jest.fn().mockReturnValue(Promise.resolve())
    shallowMount(AdminPage, {
      mocks: {
        $store,
        $route: { path: '/admin', fullPath: '/admin', query: {} },
        $router: { replace },
        _userService: { Reload: jest.fn().mockResolvedValue(undefined) }
      },
      stubs: { 'client-only': true }
    })
    // Still falsy, so no transition — the watcher must not re-fire on every unrelated mutation.
    $store.state.currentUser = { adminIn: [] }
    await Vue.nextTick()
    expect(replace).not.toHaveBeenCalled()
  })
})

describe('the two sign-out buttons clear the session and navigate nowhere themselves', () => {
  test('the sidebar button clears the session and closes its own dialog', () => {
    const Logout = jest.fn()
    const vm = {
      showLogoutConfirm: true,
      _userService: { Logout }
    }
    AdminPageHeader.methods.logout.call(vm)
    expect(Logout).toHaveBeenCalledTimes(1)
    expect(vm.showLogoutConfirm).toBe(false)
  })

  test('the footer button does the same', () => {
    const Logout = jest.fn()
    const vm = {
      showLogoutButton: true,
      _userService: { Logout }
    }
    AdminPageFooter.methods.logout.call(vm)
    expect(Logout).toHaveBeenCalledTimes(1)
    expect(vm.showLogoutButton).toBe(false)
  })

  // Structural, and deliberately so: the defect WAS a statement, and a jsdom `window.location`
  // assignment is swallowed rather than observable, so behaviour alone cannot pin its absence.
  test('neither leaves the SPA by hand', () => {
    expect(AdminPageHeader.methods.logout.toString()).not.toMatch(/location/)
    expect(AdminPageFooter.methods.logout.toString()).not.toMatch(/location/)
  })
})
