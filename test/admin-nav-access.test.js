import fs from 'fs'
import path from 'path'
import { shallowMount } from '@vue/test-utils'
import AdminPageHeader from '~/components/organisms/AdminPageHeader.vue'
import {
  storeAdminAccess,
  showsStoreAdminNav,
  ACCESS_UNKNOWN,
  ACCESS_STORE_ADMIN,
  ACCESS_WORKER
} from '~/utils/admin/nav-access'

// The sidebar half of the worker-access gap. `AdminPage` learned to let a pure worker through to
// `/admin/workforce-me`; the sidebar kept offering them every store-admin link, all of which the
// same shell bounces straight back to `/registrer`.
//
// The whole risk of fixing that lives in the 46 pages NOT being fixed, so these tests are written as
// a proof obligation in two halves:
//
//   1. BEHAVIOURAL — the group list a store admin sees, and the group list an UNKNOWN user sees, are
//      the same list, and it is the full one. That is what makes the async `Reload()` unable to
//      produce a flicker: there is no frame in which an admin's sidebar is smaller.
//   2. STATIC — walk `pages/admin/` and check that every link the sidebar offers a worker lands on a
//      page that actually lets a worker in. The same walk-every-page discipline the membership guard
//      shipped with, pointed at the menu instead of at the shell.

describe('storeAdminAccess — unknown is a state, not a refusal', () => {
  test('no user at all is unknown', () => {
    expect(storeAdminAccess(null)).toBe(ACCESS_UNKNOWN)
    expect(storeAdminAccess({})).toBe(ACCESS_UNKNOWN)
  })

  test('a signed-in user whose adminIn has not loaded is unknown, NOT a worker', () => {
    expect(storeAdminAccess({ id: 9 })).toBe(ACCESS_UNKNOWN)
    expect(storeAdminAccess({ id: 9, adminIn: null })).toBe(ACCESS_UNKNOWN)
  })

  test('a non-empty adminIn is a store admin', () => {
    expect(storeAdminAccess({ id: 9, adminIn: [{ id: 7 }] })).toBe(ACCESS_STORE_ADMIN)
  })

  test('an EMPTY adminIn is a positive answer: this person administers no store', () => {
    expect(storeAdminAccess({ id: 9, adminIn: [] })).toBe(ACCESS_WORKER)
  })

  test('the nav is withheld only on the positive worker answer', () => {
    expect(showsStoreAdminNav(ACCESS_STORE_ADMIN)).toBe(true)
    expect(showsStoreAdminNav(ACCESS_UNKNOWN)).toBe(true)
    expect(showsStoreAdminNav(ACCESS_WORKER)).toBe(false)
  })
})

// Every store-admin link the sidebar has ever offered. Hard-coded rather than derived from the
// component, so a link silently dropped from `navGroups` fails here instead of being "still equal to
// itself".
const STORE_ADMIN_PATHS = [
  '/admin', '/admin/ongoing', '/admin/orders', '/admin/statistics',
  '/admin/products', '/admin/categories', '/admin/allergens', '/admin/import',
  '/admin/delivery', '/admin/wolt',
  '/admin/kravia-invoice', '/admin/rewards', '/admin/discounts',
  '/admin/payment', '/admin/settlements', '/admin/terminals',
  '/admin/customers', '/admin/employees'
]

const WORKER_PATHS = ['/admin/workforce-me']

describe('AdminPageHeader — which links each kind of user is offered', () => {
  function mountNav (currentUser) {
    const wrapper = shallowMount(AdminPageHeader, {
      mocks: {
        $i: key => key,
        $store: {
          // The whole sidebar hangs off this getter, so it is mocked truthfully rather than to a
          // constant: an anonymous visitor renders no nav at all.
          getters: { userIsLoggedIn: !!(currentUser && currentUser.id) },
          state: { currentUser, selectedAdminStore: 7, adminLocale: 'no' },
          dispatch: jest.fn(),
          commit: jest.fn()
        },
        $route: { path: '/admin/workforce-me', query: {} },
        $router: { replace: jest.fn() },
        _userService: { Logout: jest.fn() }
      },
      stubs: { LanguageSwitcher: true }
    })
    return wrapper
  }

  const pathsOf = wrapper => wrapper.vm.navGroups
    .reduce((acc, group) => acc.concat(group.items.map(item => item.path)), [])

  const admin = { id: 9, adminIn: [{ id: 7, name: 'Kafé Nord' }] }
  const worker = { id: 4, adminIn: [] }
  const notYetKnown = { id: 4 }

  test('a store admin is offered every store-admin link, exactly as before', () => {
    expect(pathsOf(mountNav(admin))).toEqual(STORE_ADMIN_PATHS.concat(WORKER_PATHS))
  })

  test('NO FLICKER: an unresolved user is offered the identical list to a store admin', () => {
    // This is the property that keeps the async `Reload()` invisible on all 46 admin pages. If it
    // ever fails, an admin's sidebar has a frame in which links are missing.
    expect(pathsOf(mountNav(notYetKnown))).toEqual(pathsOf(mountNav(admin)))
  })

  test('a pure worker is offered only their own page', () => {
    expect(pathsOf(mountNav(worker))).toEqual(WORKER_PATHS)
  })

  test('the worker keeps the group that a store admin also has — it is added, never swapped', () => {
    const adminGroups = mountNav(admin).navGroups || mountNav(admin).vm.navGroups
    expect(adminGroups.map(g => g.title)).toContain('nav_group_me')
    expect(mountNav(worker).vm.navGroups.map(g => g.title)).toEqual(['nav_group_me'])
  })

  test('the store switcher is hidden from a worker and shown while unknown', () => {
    // It picks which store you administer. For someone who administers none it renders an empty
    // name over an empty dropdown; while unknown it must stay exactly as it was.
    expect(mountNav(admin).find('.store-selector-container').exists()).toBe(true)
    expect(mountNav(notYetKnown).find('.store-selector-container').exists()).toBe(true)
    expect(mountNav(worker).find('.store-selector-container').exists()).toBe(false)
  })

  test('role-gated groups are untouched by this change', () => {
    // KAM and PowerUser groups hang off explicit role flags, not off membership. A store admin
    // without those flags sees neither, before and after.
    const paths = pathsOf(mountNav(admin))
    expect(paths).not.toContain('/admin/offers')
    expect(paths).not.toContain('/admin/pos')

    const powerUser = { id: 9, adminIn: [{ id: 7 }], isPowerUser: true }
    expect(pathsOf(mountNav(powerUser))).toContain('/admin/workforce-schedule')
  })
})

// The static half. `pages/admin/` is walked rather than trusted, so a page added, renamed or
// re-gated later is caught by the same test that caught the original bug.
describe('no link the sidebar offers is a link the shell will bounce', () => {
  const pagesDir = path.resolve(__dirname, '..', 'pages', 'admin')

  function adminPages (dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).reduce((acc, entry) => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) { return acc.concat(adminPages(full)) }
      return entry.name.endsWith('.vue') ? acc.concat(full) : acc
    }, [])
  }

  // Nuxt maps `/admin` to `pages/admin/index.vue` and `/admin/x` to `pages/admin/x.vue`.
  function pageFor (navPath) {
    const rest = navPath.replace(/^\/admin\/?/, '')
    return path.join(pagesDir, (rest || 'index') + '.vue')
  }

  test('every store-admin link in the sidebar resolves to a page that exists', () => {
    const missing = STORE_ADMIN_PATHS.filter(p => !fs.existsSync(pageFor(p)))
    expect(missing).toEqual([])
  })

  test('THE INVARIANT: every link offered to a worker opts out of the store-admin guard', () => {
    // A worker reaching a page that does not set `allow-non-admin` is thrown to /registrer. The
    // sidebar must therefore never offer them one — this is the bug, stated as a check.
    const bounced = WORKER_PATHS.filter((navPath) => {
      const file = pageFor(navPath)
      return !fs.existsSync(file) || !/allow-non-admin|allowNonAdmin/.test(fs.readFileSync(file, 'utf8'))
    })
    expect(bounced).toEqual([])
  })

  test('and the converse: the store-admin links are all still guarded', () => {
    // If one of these ever started opting out, it would belong in the worker list instead — and the
    // list above would be wrong without anything failing.
    const optedOut = STORE_ADMIN_PATHS.filter((navPath) => {
      const file = pageFor(navPath)
      return fs.existsSync(file) && /allow-non-admin|allowNonAdmin/.test(fs.readFileSync(file, 'utf8'))
    })
    expect(optedOut).toEqual([])
  })

  test('the admin surface is still the size the membership guard assumes', () => {
    expect(adminPages(pagesDir).length).toBeGreaterThan(40)
  })
})
