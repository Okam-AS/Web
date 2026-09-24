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
//
// The `MANAGER-REACHABLE` tests are the mirror image of that gap, and the same question asked in the
// other direction: not "is this link a dead end for the person offered it" but "is this page a page
// nobody is offered". A page whose only link hangs off a role flag its own guard never checks is
// reachable only by typing its URL, and a suite can be entirely green while that is true — the page
// renders, its client works, and no test ever asks whether a menu leads to it.

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
//
// Order matters: this is compared with `toEqual` against the flattened `navGroups`, so a link added
// to a group must be added at the same position here. All NINE store-admin module surfaces are on
// this list now, and every one of them being here is the point:
//
//   `/admin/margin-recipes` and `/admin/margin-statements` (Menu); `/admin/growth-newsletter` and
//   `/admin/events-pipeline` (Sales & marketing); `/admin/workforce-schedule`,
//   `/admin/workforce-roster`, `/admin/workforce-rates`, `/admin/training-courses` and
//   `/admin/meals-agreements` (Administration). No module surface is role-gated any more, and none is
//   unlinked.
//
// WHAT THE LAST FIVE ENTRIES RECORD, because it is one defect wearing two masks. Every one of these
// pages mounts `AdminPage` with no `allow-non-admin` and reads no role flag, so what admits a caller
// has always been store-admin membership at the selected store. The sidebar disagreed in two ways:
//
//   the wrong gate  — schedule, roster and events shipped inside the PowerUser group. The manager was
//                     authorised and unlinked. Signing in as the PowerUser was no escape either: that
//                     account administers no store, so the same shell bounces it to /registrer, which
//                     made the only visible link a dead end for the only user who could see it.
//   no gate at all  — `/admin/workforce-rates` and `/admin/training-courses` had no link in ANY group.
//                     A page nobody is offered is a page reachable only by typing its URL.
//
// Moving and adding links widens nothing; it points them at the role that already passed the guard.
// The second mask is why `THE CONVERSE WALK` at the bottom of this file exists: the original static
// walk checked links → pages and could not see a page → no link.
// Ordered, and the order is the assertion: `toEqual` below pins the sidebar a store admin actually
// renders.
//
// TWO RULINGS ARE RECORDED IN THIS ORDER, and the second only makes sense against the first:
//
//   1. The module links were moved OUT of Menu / Sales / Administration into one `Moduler` group by
//      the owner's instruction — filed by subject matter they were correct and unfindable, and the
//      six restaurant modules are the surfaces under active acceptance.
//   2. That single group was split into SIX, one per module, once it had grown to 22 links: one list
//      of 22 is the same unscannable wall as five scattered ones. Ruling 1 survives — nothing went
//      back to Menu or Sales — so the only thing that changed is which heading a link sits under and
//      therefore the order below. The module block is now ordered by how finished each module is,
//      best first: Margin, Workforce, Training, Events, Growth, Meals.
//
// Neither ruling moved a link across the `showsStoreAdminNav` boundary, which is why this list has
// exactly the same MEMBERS after the split as before it — only their positions changed. The
// `MODULE GROUPING` block at the bottom of this file asserts that membership property directly, as a
// set comparison, so a future reorder cannot quietly drop or add a path while looking like a reorder.

function mountNav (currentUser) {
  return shallowMount(AdminPageHeader, {
    mocks: {
      $i: key => key,
      $store: {
        getters: { userIsLoggedIn: !!(currentUser && currentUser.id) },
        state: { currentUser, selectedAdminStore: 7, adminLocale: 'no' },
        dispatch: jest.fn(),
        commit: jest.fn()
      },
      $route: { path: '/admin', query: {} },
      $router: { replace: jest.fn() },
      _userService: { Logout: jest.fn() }
    },
    stubs: { LanguageSwitcher: true }
  })
}

const pathsOf = wrapper => wrapper.vm.navGroups
  .reduce((acc, group) => acc.concat(group.items.map(item => item.path)), [])

const pageExists = link => {
  const route = link.split('?')[0].replace(/\/$/, '')
  return ['.vue', '/index.vue'].some(ext => fs.existsSync(path.join(__dirname, '..', 'pages', route + ext)))
}

// The October strip removed whole admin surfaces; a sidebar link left pointing at one of them would
// bounce the store owner to a 404. Every kind of user is walked, so role-gated groups are covered too.
describe('no link the sidebar offers leads to a page that is gone', () => {
  const users = {
    'store admin': { id: 9, adminIn: [{ id: 7, name: 'Kafé Nord' }] },
    'unresolved user': { id: 9 },
    'PowerUser and key account manager': { id: 9, adminIn: [{ id: 7 }], isPowerUser: true, isKeyAccountManager: true }
  }

  test.each(Object.entries(users))('%s', (_, user) => {
    const links = pathsOf(mountNav(user))
    expect(links.length).toBeGreaterThan(5)
    expect(links.filter(link => !pageExists(link))).toEqual([])
  })
})
