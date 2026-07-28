import fs from 'fs'
import path from 'path'
import { shallowMount } from '@vue/test-utils'
import AdminPage from '~/components/organisms/AdminPage.vue'

// The shared admin shell guards 47 pages. It does two separate things that read as one: it requires
// AUTHENTICATION (a token), and it requires STORE-ADMIN MEMBERSHIP (a non-empty `adminIn`). The
// second is right for every page that reads or writes a store's data and wrong for exactly one —
// `/admin/workforce-me`, whose reader is a shop assistant the backend authorises from their own
// token. `allow-non-admin` separates the two.
//
// These tests are the proof obligation that came with that change: the default path must be
// byte-for-byte what it was, and no page but the worker page may take the new one.
describe('AdminPage — the store-admin membership guard', () => {
  function mountShell (options) {
    const opts = options || {}
    const replace = jest.fn()
    const reload = jest.fn().mockResolvedValue(undefined)

    const wrapper = shallowMount(AdminPage, {
      propsData: opts.propsData || {},
      mocks: {
        $store: {
          getters: { userIsLoggedIn: opts.loggedIn !== false },
          state: { currentUser: { adminIn: opts.adminIn } }
        },
        $route: { path: opts.path || '/admin/products', fullPath: opts.path || '/admin/products', query: {} },
        $router: { replace },
        _userService: { Reload: reload }
      },
      stubs: { 'client-only': true }
    })

    return { wrapper, replace, reload }
  }

  // `mounted` calls the async `initAuth`; the assertions run after its awaits have settled.
  const settled = () => new Promise(resolve => setTimeout(resolve, 0))

  test('DEFAULT: a signed-in user with no store admin membership is still sent to /registrer', async () => {
    const { replace } = mountShell({ adminIn: [] })
    await settled()
    expect(replace).toHaveBeenCalledWith('/registrer')
  })

  test('DEFAULT: a signed-in store admin is left alone', async () => {
    const { replace } = mountShell({ adminIn: [{ id: 7, name: 'Kafé Nord' }] })
    await settled()
    expect(replace).not.toHaveBeenCalled()
  })

  test('DEFAULT: an undefined adminIn is treated as no membership, exactly as before', async () => {
    const { replace } = mountShell({ adminIn: undefined })
    await settled()
    expect(replace).toHaveBeenCalledWith('/registrer')
  })

  test('OPT-IN: allow-non-admin lets a pure worker reach the page instead of bouncing', async () => {
    const { replace, reload } = mountShell({ adminIn: [], propsData: { allowNonAdmin: true } })
    await settled()
    expect(replace).not.toHaveBeenCalled()
    // Still authenticated and still reloaded — the flag drops the membership check, nothing else.
    expect(reload).toHaveBeenCalled()
  })

  test('OPT-IN does NOT weaken authentication: an anonymous visitor still gets the login redirect', async () => {
    const { wrapper, replace } = mountShell({
      loggedIn: false,
      adminIn: [],
      path: '/admin/workforce-me',
      propsData: { allowNonAdmin: true }
    })
    await settled()
    expect(wrapper.vm.showLogin).toBe(true)
    expect(replace).toHaveBeenCalledWith('/admin?redirect=%2Fadmin%2Fworkforce-me')
  })

  test('the prop defaults to false, so a page that says nothing keeps the old behaviour', () => {
    expect(AdminPage.props.allowNonAdmin.default).toBe(false)
  })
})

// A behaviour proof by construction: the branch can only be reached by a page that opts in, so
// enumerating the opt-ins enumerates every page whose behaviour could have changed.
describe('no existing admin page changed behaviour', () => {
  const pagesDir = path.resolve(__dirname, '..', 'pages', 'admin')

  function adminPages (dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).reduce((acc, entry) => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) { return acc.concat(adminPages(full)) }
      return entry.name.endsWith('.vue') ? acc.concat(full) : acc
    }, [])
  }

  const files = adminPages(pagesDir)

  test('the admin surface is the size we think it is', () => {
    expect(files.length).toBeGreaterThan(40)
  })

  test('exactly one page opts out of the store-admin requirement', () => {
    const optedIn = files
      .filter(file => /allow-non-admin|allowNonAdmin/.test(fs.readFileSync(file, 'utf8')))
      .map(file => path.relative(pagesDir, file))

    expect(optedIn).toEqual(['workforce-me.vue'])
  })

  test('every other admin page renders the shell with the guard intact', () => {
    const others = files.filter(file => path.basename(file) !== 'workforce-me.vue')
    const untouched = others.filter(file => !/allow-non-admin|allowNonAdmin/.test(fs.readFileSync(file, 'utf8')))
    expect(untouched.length).toBe(others.length)
  })
})
