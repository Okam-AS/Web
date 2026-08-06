import { shallowMount } from '@vue/test-utils'
import AdminPage from '~/components/organisms/AdminPage.vue'

// `closeLoginModal` decides one thing: after a sign-in, does the shell NAVIGATE somewhere, or does
// it TELL THE PAGE IT IS ALREADY ON that a session arrived? Those are the only two outcomes, and
// they are mutually exclusive — a navigation destroys the component that would have heard the event.
//
// It used to decide by comparing the `redirect` target against `$route.fullPath`. `fullPath` is the
// path AND the query, and the query is where the target itself is written, so on
// `/admin/ongoing?redirect=/admin/ongoing` the comparison could not match and the shell "navigated"
// to the page the visitor was already looking at. vue-router reuses the component for a same-path
// route change: `mounted` does not run again, `login-success` was never emitted, and the page's own
// recovery — on the ongoing board, the order poll — never started. Measured in a browser on this
// build before the change: `/orders/ongoing` requests after the sign-in = 0.
//
// The comparison is against `$route.path` here because a redirect target is a PAGE.
describe('AdminPage.closeLoginModal — navigate, or tell the page it is on', () => {
  function mountShell (route) {
    const replace = jest.fn()
    const wrapper = shallowMount(AdminPage, {
      mocks: {
        $store: {
          getters: { userIsLoggedIn: true },
          state: { currentUser: { adminIn: [{ id: 1 }] } }
        },
        $route: route,
        $router: { replace },
        _userService: { Reload: jest.fn().mockResolvedValue(undefined) }
      },
      stubs: { 'client-only': true }
    })
    return { wrapper, replace }
  }

  const route = (path, query) => ({
    path,
    query: query || {},
    fullPath: path + (query && query.redirect
      ? '?redirect=' + encodeURIComponent(String(query.redirect))
      : '')
  })

  const emitted = wrapper => (wrapper.emitted('login-success') || []).length

  test('THE DEFECT: signing in on the page the redirect points AT emits, and does not navigate', () => {
    const { wrapper, replace } = mountShell(route('/admin/ongoing', { redirect: '/admin/ongoing' }))
    wrapper.vm.closeLoginModal(true)
    expect(emitted(wrapper)).toBe(1)
    expect(replace).not.toHaveBeenCalled()
  })

  test('the redirect may carry a query of its own and it is still the same page', () => {
    const { wrapper, replace } = mountShell(route('/admin/ongoing', { redirect: '/admin/ongoing?storeId=1' }))
    wrapper.vm.closeLoginModal(true)
    expect(emitted(wrapper)).toBe(1)
    expect(replace).not.toHaveBeenCalled()
  })

  test('a fragment on the target does not make it a different page either', () => {
    const { wrapper, replace } = mountShell(route('/admin/ongoing', { redirect: '/admin/ongoing#new' }))
    wrapper.vm.closeLoginModal(true)
    expect(emitted(wrapper)).toBe(1)
    expect(replace).not.toHaveBeenCalled()
  })

  test('a repeated redirect key arrives as an array and the first value decides', () => {
    const { wrapper, replace } = mountShell(route('/admin/ongoing', { redirect: ['/admin/ongoing', '/admin'] }))
    wrapper.vm.closeLoginModal(true)
    expect(emitted(wrapper)).toBe(1)
    expect(replace).not.toHaveBeenCalled()
  })

  test('the dashboard reached as its own redirect target is the same case', () => {
    const { wrapper, replace } = mountShell(route('/admin', { redirect: '/admin' }))
    wrapper.vm.closeLoginModal(true)
    expect(emitted(wrapper)).toBe(1)
    expect(replace).not.toHaveBeenCalled()
  })

  // ---- the branch that was always right, pinned so the fix cannot be mistaken for deleting it ----

  test('CONTROL: a redirect to a DIFFERENT page still navigates, and does not emit', () => {
    const { wrapper, replace } = mountShell(route('/admin', { redirect: '/admin/ongoing' }))
    wrapper.vm.closeLoginModal(true)
    expect(replace).toHaveBeenCalledWith('/admin/ongoing')
    expect(emitted(wrapper)).toBe(0)
  })

  test('CONTROL: a different page keeps the query the redirect asked for', () => {
    const { wrapper, replace } = mountShell(route('/admin', { redirect: '/admin/ongoing?storeId=1' }))
    wrapper.vm.closeLoginModal(true)
    expect(replace).toHaveBeenCalledWith('/admin/ongoing?storeId=1')
    expect(emitted(wrapper)).toBe(0)
  })

  test('CONTROL: no redirect query at all emits, exactly as it always did', () => {
    const { wrapper, replace } = mountShell(route('/admin'))
    wrapper.vm.closeLoginModal(true)
    expect(emitted(wrapper)).toBe(1)
    expect(replace).not.toHaveBeenCalled()
  })

  test('CONTROL: an empty redirect value is not a destination', () => {
    const { wrapper, replace } = mountShell(route('/admin/ongoing', { redirect: '' }))
    wrapper.vm.closeLoginModal(true)
    expect(emitted(wrapper)).toBe(1)
    expect(replace).not.toHaveBeenCalled()
  })

  test('CONTROL: closing without signing in leaves the sign-in up and announces nothing', () => {
    const { wrapper, replace } = mountShell(route('/admin/ongoing', { redirect: '/admin/ongoing' }))
    wrapper.setData({ showLogin: true })
    wrapper.vm.closeLoginModal(false)
    expect(wrapper.vm.showLogin).toBe(true)
    expect(emitted(wrapper)).toBe(0)
    expect(replace).not.toHaveBeenCalled()
  })

  test('a completed sign-in always takes the sign-in off the screen', () => {
    const { wrapper } = mountShell(route('/admin/ongoing', { redirect: '/admin/ongoing' }))
    wrapper.setData({ showLogin: true })
    wrapper.vm.closeLoginModal(true)
    expect(wrapper.vm.showLogin).toBe(false)
  })
})
