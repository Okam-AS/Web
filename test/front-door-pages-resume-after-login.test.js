import Vue from 'vue'
import { mount } from '@vue/test-utils'
import OverviewPage from '~/pages/admin/overview.vue'
import OffersPage from '~/pages/admin/offers.vue'
import KamPage from '~/pages/admin/kam.vue'
import GoodsPage from '~/pages/admin/goods.vue'

// WHAT THIS FILE IS ABOUT
//
// The same defect a third time, on the last four pages that had it. `orders` and `statistics` were
// the second pair (`orders-and-statistics-resume-after-login.test.js`); `ongoing` and `kitchen` were
// the first. `overview`, `offers`, `kam` and `goods` are these four, and they arrived at the defect
// from the other direction: the front-door lane made a signed-out stand on them POSSIBLE — it split
// "who are you" (the shell's question) from "are you privileged" (the page's) so a bare
// `push('/admin')` would stop eating the shell's in-flight `?redirect=` — and then bound nothing to
// the shell's answer. So the page returned early from `mounted` and never heard that a session had
// arrived. Two things were left undone, and only one of them is data:
//
//   overview   no `loadFiltersFromLocalStorage`, no date range, no `loadOverview()` — an empty
//              store table with a «no stores found» row, which is what a Key Account Manager with
//              no portfolio looks like.
//   offers     no proposals, no offer items, no refresh poll.
//   kam        no relationships, no KAM users — and its modal's two `<select>`s are populated from
//              `kamUsers`, so assigning anybody was impossible as well as invisible.
//   goods      no offer items, no refresh poll.
//
//   ALL FOUR    the PRIVILEGE bounce never ran. `overview` and `offers` are for Key Account
//               Managers and Power Users, `kam` and `goods` for Power Users only. Somebody who
//               signed in on one of these pages as none of those was left sitting on it — reading
//               an empty screen they were never entitled to see — until they reloaded.
//
// EVERY ASSERTION BELOW IS ON PRODUCT STATE, NOT ON A CALL. Nothing here asserts that a handler
// fired or that a method exists; a test of that shape is what let this class through the first two
// times. The sign-in is raised as the `login-success` EVENT on the shell, so it travels the page's
// own template binding — a page that binds a short handler, or binds nothing, reds these.
//
// `lanes/L-THE-LAST-FOUR-PAGES-RESUME-AFTER-SIGN-IN/mutate-bindings.probe.js` unbinds each page's
// starter, and binds a short handler in its place, and shows the reds that follow.
//
// `pages/admin/wrapped.vue` is deliberately NOT here. It renders no `<AdminPage>`, so there is no
// shell to hear and its own `push('/admin')` is the only thing keeping its door; delegating there
// was tried by the front-door lane and left an anonymous visitor on a blank page with jest green
// throughout (lanes/L-THE-SIGN-IN-FRONT-DOOR-IS-HONEST/walk-wrapped-delegation-regression.json).

// Pure microtask drain. All four pages resolve their fakes immediately, and Vue 2.6 schedules its
// watcher flush on a Promise microtask, so this drains the re-render too and the DOM assertions
// below read the updated render.
async function flush () {
  for (let i = 0; i < 8; i++) { await Promise.resolve() }
}

// A `$store` that can actually change. Plain objects passed through `mocks` are not reactive, so
// `kam`'s `isPowerUser` computed would never recompute when a sign-in populates `currentUser`.
function makeStore () {
  return {
    state: Vue.observable({ currentUser: null, selectedAdminStore: null }),
    getters: Vue.observable({ userIsLoggedIn: false })
  }
}

const KEY_ACCOUNT_MANAGER = { id: 1, isKeyAccountManager: true, isPowerUser: false }
const POWER_USER = { id: 2, isKeyAccountManager: false, isPowerUser: true }
// The person these pages are not for. Signed in, real, and entitled to none of these four screens.
const ORDINARY_OPERATOR = { id: 3, isKeyAccountManager: false, isPowerUser: false }

function signIn (store, user) {
  store.state.currentUser = user
  store.getters.userIsLoggedIn = true
}

// The shell, named so a test can raise the one event it sends downwards. None of these pages mounts
// a sign-in modal of its own — `AdminPage` owns the only one on an admin route — so a sign-in
// arrives as `login-success` on the shell and NOT as a call to a method on the page. Emitting it
// here rather than calling the handler by name is deliberate and strictly stronger: it travels the
// page's own template binding.
const AdminPageStub = {
  name: 'AdminPageStub',
  template: '<div><slot /></div>'
}

function signInThroughShell (wrapper) {
  wrapper.findComponent(AdminPageStub).vm.$emit('login-success')
}

// The global-mixin helpers these four templates call. `formatDate` and `priceLabel` are
// `plugins/global-mixin.js` methods, not page methods, so a mounted page has to be given them.
const mixinMocks = {
  $i: key => key,
  priceLabel: value => 'kr ' + String(value),
  formatDate: value => String(value || '')
}

beforeEach(() => {
  localStorage.clear()
})

// ---------------------------------------------------------------------------------------------
// REACHABILITY
//
// Everything below only matters if a signed-out visitor can actually be standing on these four
// pages. The shell normally makes sure they cannot. There are two ways past it, and the front-door
// lane built both, so both are asserted rather than reasoned about — the difference decides whether
// this lane is a fix or dead code.
//
//   1. a `redirect` query already in the URL — the URL the post-login return path itself leaves
//      behind, which is bookmarkable and reloadable (AdminPage.vue, the `!query.redirect` clause);
//   2. a navigation the router REFUSES — the shell puts the door back in place rather than leaving
//      a guarded page with no way in.
// ---------------------------------------------------------------------------------------------
describe('a signed-out visitor can be standing on these four pages', () => {
  const AdminPage = require('~/components/organisms/AdminPage.vue').default

  function mountShell (route, replaceResult) {
    const replace = jest.fn().mockReturnValue(replaceResult)
    const wrapper = mount(AdminPage, {
      mocks: {
        $i: key => key,
        $store: { getters: { userIsLoggedIn: false }, state: { currentUser: null } },
        $route: route,
        $router: { replace },
        _userService: { Reload: jest.fn().mockResolvedValue(undefined) }
      },
      stubs: { 'client-only': true, LoginModal: true, NuxtLink: true, AdminSidebar: true }
    })
    return { wrapper, replace }
  }

  const PATHS = [
    ['/admin/overview'],
    ['/admin/offers'],
    ['/admin/kam'],
    ['/admin/goods']
  ]

  test.each(PATHS)('WITHOUT a redirect query the shell bounces them away from %s — the ordinary case', async (path) => {
    const { wrapper, replace } = mountShell({ path, fullPath: path, query: {} })
    await flush()
    expect(replace).toHaveBeenCalledWith('/admin?redirect=' + encodeURIComponent(path))
    expect(wrapper.vm.showLogin).toBe(false)
    wrapper.destroy()
  })

  test.each(PATHS)('WITH a redirect query already set, %s renders for them instead', async (path) => {
    const fullPath = path + '?redirect=' + encodeURIComponent(path)
    const { wrapper, replace } = mountShell({ path, fullPath, query: { redirect: path } })
    await flush()
    expect(replace).not.toHaveBeenCalled()
    expect(wrapper.vm.showLogin).toBe(true)
    wrapper.destroy()
  })

  test.each(PATHS)('a REFUSED navigation leaves them on %s with the door up', async (path) => {
    const { wrapper, replace } = mountShell(
      { path, fullPath: path, query: {} },
      Promise.reject(new Error('aborted'))
    )
    await flush()
    await flush()
    expect(replace).toHaveBeenCalled()
    expect(wrapper.vm.showLogin).toBe(true)
    wrapper.destroy()
  })
})

// ---------------------------------------------------------------------------------------------
// THE FOUR PAGES
//
// One table, because the four differ only in what they fetch and what that puts on screen. Each row
// carries: the component, the service fakes, the entitled user, the state the page must hold
// afterwards, and a string that is on screen only when the data arrived.
// ---------------------------------------------------------------------------------------------

const TESTKROA = {
  storeId: 42,
  name: 'Testkroa',
  orderCount: 7,
  totalAmount: 1749,
  approved: true,
  kamUserId: '',
  kamStatus: 1
}
const BRYGGA = {
  storeId: 43,
  name: 'Brygga',
  orderCount: 4,
  totalAmount: 998,
  approved: false,
  kamUserId: '',
  kamStatus: 1
}

const OFFER_ITEMS = [
  { offerItemId: 'oi-1', name: 'Kassaterminal', description: 'Leie per måned', minMonthlyFee: 499, minOnetimeFee: 0 },
  { offerItemId: 'oi-2', name: 'Kvitteringsskriver', description: 'Engangskjøp', minMonthlyFee: 0, minOnetimeFee: 3200 }
]

const PROPOSALS = [
  {
    offerProposalId: 'op-1',
    code: 'TILBUD-901',
    clientName: 'Kari Nordmann',
    companyLegalName: 'Testkroa AS',
    status: 'Sent',
    createdAt: '2026-08-01T09:00:00Z',
    updatedAt: '2026-08-02T09:00:00Z',
    sellerName: 'Ola'
  }
]

const RELATIONSHIPS = [
  {
    keyAccountManager: { id: 'kam-1', name: 'Ida Selger', phoneNumber: '+4741000001' },
    director: { id: 'dir-1', name: 'Per Direktor', phoneNumber: '+4741000002' }
  }
]

const KAM_USERS = [
  { id: 'kam-1', name: 'Ida Selger' },
  { id: 'dir-1', name: 'Per Direktor' }
]

// Each page's fakes RECORD that they were asked. A page that never started asks nothing, and that
// is the difference this file exists to see.
function overviewCase () {
  const asked = []
  return {
    name: '/admin/overview',
    Component: OverviewPage,
    entitled: KEY_ACCOUNT_MANAGER,
    asked,
    services: {
      _storeService: {
        GetOverview: (range) => {
          asked.push(range)
          return Promise.resolve({ stores: [TESTKROA, BRYGGA], kams: KAM_USERS, isKeyAccountManager: true })
        }
      }
    },
    stubs: { AdminPage: AdminPageStub, Loading: true, EmployeeManagerModal: true },
    // What a fresh mount produces, read off the page's own data.
    readable: vm => ({
      storeOverview: vm.storeOverview,
      kams: vm.kams,
      showKAMColumns: vm.showKAMColumns,
      dateRange: { ...vm.dateRange }
    }),
    onScreen: ['Testkroa', 'Brygga', 'kr 1749'],
    absentBefore: ['Testkroa', 'Brygga'],
    // The «no stores found» row is what an entitled operator sees when the page never started, and
    // it is indistinguishable from a genuinely empty portfolio.
    emptyMarker: 'overview_noStoresFound'
  }
}

function offersCase () {
  const asked = []
  return {
    name: '/admin/offers',
    Component: OffersPage,
    entitled: KEY_ACCOUNT_MANAGER,
    asked,
    services: {
      _offerProposalService: {
        GetAll: () => { asked.push('proposals'); return Promise.resolve(PROPOSALS) }
      },
      _offerService: {
        GetAll: () => { asked.push('items'); return Promise.resolve(OFFER_ITEMS) }
      }
    },
    stubs: { AdminPage: AdminPageStub, Loading: true, Modal: true, OfferDocument: true, PriceInput: true },
    readable: vm => ({ offerProposals: vm.offerProposals, offerItems: vm.offerItems }),
    onScreen: ['TILBUD-901', 'Kari Nordmann', 'Testkroa AS'],
    absentBefore: ['TILBUD-901', 'Kari Nordmann'],
    emptyMarker: null
  }
}

function kamCase () {
  const asked = []
  return {
    name: '/admin/kam',
    Component: KamPage,
    entitled: POWER_USER,
    asked,
    services: {
      _kamService: {
        GetKamDirectorRelationships: () => { asked.push('relationships'); return Promise.resolve(RELATIONSHIPS) },
        GetAllKeyAccountManagers: () => { asked.push('kamUsers'); return Promise.resolve(KAM_USERS) }
      }
    },
    stubs: { AdminPage: AdminPageStub, Modal: true },
    readable: vm => ({ relationships: vm.relationships, kamUsers: vm.kamUsers }),
    onScreen: ['Ida Selger', 'Per Direktor', '+4741000001'],
    absentBefore: ['Ida Selger', 'Per Direktor'],
    emptyMarker: 'kam_noRelationshipsFound'
  }
}

function goodsCase () {
  const asked = []
  return {
    name: '/admin/goods',
    Component: GoodsPage,
    entitled: POWER_USER,
    asked,
    services: {
      _offerService: {
        GetAll: () => { asked.push('items'); return Promise.resolve(OFFER_ITEMS) }
      }
    },
    stubs: { AdminPage: AdminPageStub, Modal: true, PriceInput: true },
    readable: vm => ({ offerItems: vm.offerItems }),
    onScreen: ['Kassaterminal', 'Kvitteringsskriver', 'kr 3200'],
    absentBefore: ['Kassaterminal', 'Kvitteringsskriver'],
    emptyMarker: 'goods_noItemsFound'
  }
}

const CASES = [overviewCase, offersCase, kamCase, goodsCase]

function mountCase (page, store, push) {
  return mount(page.Component, {
    mocks: {
      ...mixinMocks,
      $store: store,
      $router: { push: push || jest.fn() },
      ...page.services
    },
    stubs: page.stubs
  })
}

describe.each(CASES.map(build => [build().name, build]))(
  '%s — signing in through the page brings the whole page with it',
  (_name, build) => {
    test('the entitled operator arrives on their own data, not on an empty screen', async () => {
      const page = build()
      const store = makeStore()
      const wrapper = mountCase(page, store)
      await flush()

      // Signed out: nothing started, nothing asked of the server, none of the data on screen.
      expect(page.asked).toEqual([])
      page.absentBefore.forEach(text => expect(wrapper.text()).not.toContain(text))
      if (page.emptyMarker) {
        // And what IS on screen is the sentence a page with genuinely nothing shows.
        expect(wrapper.text()).toContain(page.emptyMarker)
      }

      signIn(store, page.entitled)
      signInThroughShell(wrapper)
      await flush()

      // The server was asked, and the answer reached the screen.
      expect(page.asked.length).toBeGreaterThan(0)
      page.onScreen.forEach(text => expect(wrapper.text()).toContain(text))
      if (page.emptyMarker) {
        expect(wrapper.text()).not.toContain(page.emptyMarker)
      }

      wrapper.destroy()
    })

    // THE HALF THAT IS NOT DATA. These four screens are for Key Account Managers and Power Users;
    // the privilege question used to sit in `mounted`, where it is asked once — before anybody has
    // answered "who are you" — and never again. Somebody who signs in here as neither is entitled
    // to nothing on this page, and the page has to act on that when it hears about them.
    test('an operator who signs in WITHOUT the privilege is sent away, and is shown nothing', async () => {
      const page = build()
      const store = makeStore()
      const push = jest.fn()
      const wrapper = mountCase(page, store, push)
      await flush()

      signIn(store, ORDINARY_OPERATOR)
      signInThroughShell(wrapper)
      await flush()

      expect(push).toHaveBeenCalledWith('/admin')
      // Sent away AND not served: the refusal is not cosmetic.
      expect(page.asked).toEqual([])
      page.absentBefore.forEach(text => expect(wrapper.text()).not.toContain(text))

      wrapper.destroy()
    })

    // THE EXIT CRITERION IN ITS OWN WORDS. Mounting the page for an operator who is ALREADY signed
    // in is the reference; signing in on the page must land on the same state. Written as a
    // comparison so a starter added later and wired to only one of the two paths cannot pass this
    // file — the reference moves with it.
    test('signing in on the page lands where a fresh mount would have', async () => {
      const freshPage = build()
      const fresh = makeStore()
      signIn(fresh, freshPage.entitled)
      const freshWrapper = mountCase(freshPage, fresh)
      await flush()

      const latePage = build()
      const late = makeStore()
      const lateWrapper = mountCase(latePage, late)
      await flush()
      signIn(late, latePage.entitled)
      signInThroughShell(lateWrapper)
      await flush()

      expect(latePage.readable(lateWrapper.vm)).toEqual(freshPage.readable(freshWrapper.vm))
      // Negative control: the reference is not itself empty, so the equality above is not two
      // blank pages agreeing with each other.
      expect(freshPage.asked.length).toBeGreaterThan(0)
      freshPage.onScreen.forEach(text => expect(freshWrapper.text()).toContain(text))

      freshWrapper.destroy()
      lateWrapper.destroy()
    })
  }
)

// ---------------------------------------------------------------------------------------------
// OVERVIEW'S SAVED FILTERS
//
// The part of overview's starter list that a handler bound to `loadOverview()` alone could not have
// reached even in principle: the saved date range is read from localStorage, and `loadOverview`
// sends it to the server. A page that recovered the data but not the filters would quietly report a
// different day than the one the operator left the screen on.
// ---------------------------------------------------------------------------------------------
describe('/admin/overview restores the filters the operator left behind', () => {
  test('the saved date range is read, and it is the range the server is asked with', async () => {
    localStorage.setItem('okam_overview_date_from', '2026-07-01')
    localStorage.setItem('okam_overview_date_to', '2026-07-31')
    localStorage.setItem('okam_overview_sort_key', 'orderCount')
    localStorage.setItem('okam_overview_sort_order', 'desc')

    const page = overviewCase()
    const store = makeStore()
    const wrapper = mountCase(page, store)
    await flush()

    expect(page.asked).toEqual([])

    signIn(store, KEY_ACCOUNT_MANAGER)
    signInThroughShell(wrapper)
    await flush()

    expect(wrapper.vm.dateRange).toEqual({ from: '2026-07-01', to: '2026-07-31' })
    expect(page.asked).toEqual([{ from: '2026-07-01', to: '2026-07-31' }])
    expect(wrapper.vm.sortKey).toBe('orderCount')
    expect(wrapper.vm.sortOrder).toBe('desc')

    // And the sort the operator saved is the order the rows are actually in — Testkroa (7 orders)
    // above Brygga (4) descending.
    const names = wrapper.vm.sortedStores.map(s => s.name)
    expect(names).toEqual(['Testkroa', 'Brygga'])

    wrapper.destroy()
  })
})

// ---------------------------------------------------------------------------------------------
// THE POLL IS NOT STARTED TWICE
//
// `offers`, `kam` and `goods` each hold ONE interval handle and `beforeDestroy` clears ONE, so a
// second interval laid over the first is one the page can never stop — it keeps fetching after the
// screen is gone. Before this lane the second start was impossible because the shell's answer went
// nowhere; binding it is what makes `login-success` at an already-running page expressible at all.
//
// This is stated as insurance and not as a journey: no route reaches it today (`AdminPage.openLogin`
// is called only by `onboarding.vue` and `wolt-menu.vue`, and a session that ENDS makes the shell
// replace to /admin, which unmounts these pages). It is here because `ongoing.vue` already carries
// the same clear-before-set with the same reasoning, and because "cannot happen today" is what the
// three previous rounds of this defect each believed about their own second copy.
// ---------------------------------------------------------------------------------------------
describe('a second sign-in on an already-running page does not double the poll', () => {
  const POLLERS = [
    ['/admin/offers', offersCase, 10000],
    ['/admin/kam', kamCase, 30000],
    ['/admin/goods', goodsCase, 30000]
  ]

  test.each(POLLERS)('%s polls once per period afterwards', async (_name, build, period) => {
    jest.useFakeTimers()
    try {
      const page = build()
      const store = makeStore()
      signIn(store, page.entitled)
      const wrapper = mountCase(page, store)
      await flush()

      const afterMount = page.asked.length
      expect(afterMount).toBeGreaterThan(0)

      // The shell's answer arriving at a page that already started.
      signInThroughShell(wrapper)
      await flush()
      const afterSecondStart = page.asked.length

      jest.advanceTimersByTime(period)
      await flush()

      // One period, one round of requests — the same number the page makes when it starts once.
      const perPeriod = page.asked.length - afterSecondStart
      expect(perPeriod).toBe(afterMount)

      wrapper.destroy()
    } finally {
      jest.useRealTimers()
    }
  })
})
