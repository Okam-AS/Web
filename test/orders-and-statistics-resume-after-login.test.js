import Vue from 'vue'
import { mount } from '@vue/test-utils'
import OrdersPage from '~/pages/admin/orders.vue'
import StatisticsPage from '~/pages/admin/statistics.vue'

// WHAT THIS FILE IS ABOUT
//
// The third and fourth pages with the defect `kitchen-and-board-resume-after-login.test.js` was
// written for. Both return early from `mounted` for a signed-out visitor, both are reachable by
// one, and both bound the shell's `login-success` to the LAST line of their own starter list
// instead of the whole of it:
//
//   orders       `mounted` sets `adminStores` from the session, derives `selectedStoreIds` from it
//                (localStorage subset, or all of them), then calls `fetchOrders()`.
//                `@login-success` was bound to `fetchOrders()` alone.
//
//   statistics   `mounted` sets `adminStores`, sets `selectedStoreIds` to all of them, then calls
//                `loadStatistics()`. `@login-success` was bound to `loadStatistics` alone.
//
// So an operator who signed in on either page arrived with `adminStores` empty. That is not a
// cosmetic gap in either case, and neither page says anything is wrong:
//
//   - the store picker on both pages is `v-if="adminStores.length > 1"`, so it is not rendered and
//     the operator has no control with which to widen the selection back;
//   - `selectedStoreIds` stays `[]`, and BOTH pages send it to the server as the store filter —
//     `fetchOrders` as the `storeIds` argument of `GetAllOrdersWithPagination`, `loadStatistics` as
//     `storeIds` on each of its five requests. The server is asked about no stores and answers with
//     nothing.
//
// The result on screen is an operator with no stores, no orders and no turnover, which is exactly
// what an operator who genuinely has none looks like.
//
// EVERY ASSERTION BELOW IS ON PRODUCT STATE, NOT ON A CALL. Nothing here asserts that a handler
// fired or that a method exists — a test of that shape is what let this defect through the first
// two times. The sign-in is raised as the `login-success` EVENT on the shell, so it travels the
// page's own template binding: a page that binds a short handler, or binds nothing, reds these.
// The fakes below honour `storeIds` the way the server does, so `adminStores` left empty shows up
// as an empty screen rather than as a failed equality on a field nobody reads.
//
// `lanes/L-EVERY-STARTER-RESUMES-AFTER-IN-PAGE-SIGN-IN/mutate-bindings.probe.js` puts each page's
// binding back to the short handler, and to nothing at all, and shows the reds that follow.

// Pure microtask drain. Both pages resolve their fakes immediately, and Vue 2.6 schedules its
// watcher flush on a Promise microtask, so this drains the re-render too and the DOM assertions
// below read the updated render.
async function flush () {
  for (let i = 0; i < 8; i++) { await Promise.resolve() }
}

// A `$store` that can actually change. Plain objects passed through `mocks` are not reactive, so a
// computed reading `state.currentUser` would never recompute when a sign-in populates it.
// `Vue.observable` makes signing in mid-test behave like signing in mid-session.
function makeStore () {
  return {
    state: Vue.observable({ currentUser: null, selectedAdminStore: null }),
    getters: Vue.observable({ userIsLoggedIn: false })
  }
}

// Two stores, deliberately. One store would hide the picker on both pages for a legitimate reason
// and the picker assertions could not tell the fix from the defect.
const TESTKROA = { id: 42, name: 'Testkroa' }
const BRYGGA = { id: 43, name: 'Brygga' }

function signIn (store) {
  store.state.currentUser = { id: 1, adminIn: [TESTKROA, BRYGGA] }
  store.getters.userIsLoggedIn = true
}

// The shell, named so a test can raise the one event it sends downwards. These pages mount no
// sign-in modal of their own — `AdminPage` owns the only one on an admin route — so the sign-in
// arrives as `login-success` on the shell and NOT as a call to a method on the page. Emitting it
// here rather than calling the handler by name is deliberate and strictly stronger: it goes through
// the page's own template binding.
const AdminPageStub = {
  name: 'AdminPageStub',
  template: '<div><slot /></div>'
}

function signInThroughShell (wrapper) {
  wrapper.findComponent(AdminPageStub).vm.$emit('login-success')
}

// The global-mixin formatters these templates call. Every component test in this repo mocks
// `priceLabel`; the other two are the same kind of label helper.
const mixinMocks = {
  $i: key => key,
  priceLabel: value => String(value),
  deliveryTypeLabel: value => String(value),
  orderStatusLabel: value => String(value)
}

beforeEach(() => {
  localStorage.clear()
})

// ---------------------------------------------------------------------------------------------
// REACHABILITY
//
// Everything below only matters if a signed-out visitor can actually be standing on these two
// pages. The shell normally makes sure they cannot: a signed-out visitor to any admin path is
// bounced to `/admin?redirect=…`. The exception is the `&& !this.$route.query.redirect` on
// AdminPage.vue:99 — the bounce is skipped when a `redirect` query is ALREADY set, which is the URL
// the post-login return path itself produces. Asserted rather than reasoned about, because the
// difference decides whether this lane is a fix or dead code.
// ---------------------------------------------------------------------------------------------
describe('a signed-out visitor can be standing on these pages', () => {
  const AdminPage = require('~/components/organisms/AdminPage.vue').default

  function mountShell (route) {
    const replace = jest.fn()
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

  test('WITHOUT a redirect query the shell bounces them away — the ordinary case', async () => {
    const { replace } = mountShell({ path: '/admin/orders', fullPath: '/admin/orders', query: {} })
    await flush()
    expect(replace).toHaveBeenCalledWith('/admin?redirect=%2Fadmin%2Forders')
  })

  test.each([
    ['/admin/orders'],
    ['/admin/statistics']
  ])('WITH a redirect query already set, %s renders for them instead', async (path) => {
    const fullPath = path + '?redirect=' + encodeURIComponent(path)
    const { wrapper, replace } = mountShell({ path, fullPath, query: { redirect: path } })
    await flush()
    expect(replace).not.toHaveBeenCalled()
    expect(wrapper.vm.showLogin).toBe(true)
    wrapper.destroy()
  })
})

// ---------------------------------------------------------------------------------------------
// ORDERS
// ---------------------------------------------------------------------------------------------
describe('/admin/orders — signing in through the page brings the whole page with it', () => {
  const orderIn = (storeId, friendlyOrderId) => ({
    orderId: 'ord-' + friendlyOrderId,
    orderCode: 'CODE' + friendlyOrderId,
    friendlyOrderId,
    storeId,
    storeName: storeId === 42 ? 'Testkroa' : 'Brygga',
    status: 'Accepted',
    userFullName: 'Gjest',
    created: '2026-08-06T17:00:00Z',
    finalAmount: 249,
    deliveryType: 'SelfPickup',
    drivingTimeInMinutes: null,
    totalTimeInMinutes: null,
    woltDeliveryInfo: null
  })

  const WORLD = [orderIn(42, '31'), orderIn(43, '32')]

  // A fake that filters the way the server does. This is what makes an empty `adminStores` visible
  // as an empty screen instead of as a field nobody looks at.
  function makeOrderService (seen) {
    return {
      // Positional, because that is how the page calls it; `storeIds` is the sixth argument and the
      // only one these assertions turn on.
      GetAllOrdersWithPagination: (_page, pageSize, _search, _from, _to, storeIds) => {
        seen.push(storeIds)
        const orders = WORLD.filter(o => (storeIds || []).includes(o.storeId))
        return Promise.resolve({
          orders,
          totalCount: orders.length,
          page: 1,
          pageSize,
          totalPages: orders.length ? 1 : 0
        })
      }
    }
  }

  function mountOrders (store, seen) {
    return mount(OrdersPage, {
      mocks: {
        ...mixinMocks,
        $store: store,
        _orderService: makeOrderService(seen)
      },
      stubs: {
        AdminPage: AdminPageStub,
        OrderModal: true,
        MultiSelectDropdown: true
      }
    })
  }

  const rowText = wrapper => wrapper.findAll('.order-row.clickable').wrappers.map(r => r.text())

  test('the operator arrives on their own stores and their own orders, not on an empty page', async () => {
    const store = makeStore()
    const seen = []
    const wrapper = mountOrders(store, seen)
    await flush()

    // Signed out: nothing started, nothing asked of the server.
    expect(wrapper.vm.adminStores).toEqual([])
    expect(seen).toEqual([])

    signIn(store)
    signInThroughShell(wrapper)
    await flush()

    // The stores the operator administers, taken from the session that has just arrived.
    expect(wrapper.vm.adminStores).toEqual([TESTKROA, BRYGGA])

    // The filter that follows from them — and the filter the server was actually asked with. A page
    // that recovered `adminStores` but not this would still show an empty table.
    expect(wrapper.vm.selectedStoreIds).toEqual([42, 43])
    expect(seen).toEqual([[42, 43]])

    // The orders themselves, on screen, for both stores.
    expect(rowText(wrapper)).toHaveLength(2)
    expect(wrapper.text()).toContain('CODE31')
    expect(wrapper.text()).toContain('CODE32')

    wrapper.destroy()
  })

  test('the store picker is on screen afterwards, so the selection can still be changed', async () => {
    const store = makeStore()
    const wrapper = mountOrders(store, [])
    await flush()

    // `v-if="adminStores.length > 1"` — with no stores there is no control at all.
    expect(wrapper.text()).not.toContain('orders_stores')

    signIn(store)
    signInThroughShell(wrapper)
    await flush()

    expect(wrapper.text()).toContain('orders_stores')
    expect(wrapper.vm.storeOptions).toEqual([
      { id: 42, label: 'Testkroa' },
      { id: 43, label: 'Brygga' }
    ])

    wrapper.destroy()
  })

  // The middle of this page's starter list, and the part a handler bound to `fetchOrders()` alone
  // could not have reached even in principle: the saved selection is filtered AGAINST `adminStores`,
  // so it is meaningless until `adminStores` is populated.
  test('a store selection saved from a previous visit is restored, not silently widened', async () => {
    localStorage.setItem('ordersPageStoreIds', JSON.stringify([43, 999]))

    const store = makeStore()
    const seen = []
    const wrapper = mountOrders(store, seen)
    await flush()

    signIn(store)
    signInThroughShell(wrapper)
    await flush()

    // 999 is not a store this operator administers any more and is dropped; 43 survives.
    expect(wrapper.vm.selectedStoreIds).toEqual([43])
    expect(seen).toEqual([[43]])

    // And the table shows that store's order and only that one.
    expect(rowText(wrapper)).toHaveLength(1)
    expect(wrapper.text()).toContain('CODE32')
    expect(wrapper.text()).not.toContain('CODE31')

    wrapper.destroy()
  })

  // Recovery must not undo the work the visitor did while the modal was over the page. The
  // localStorage read stays in `mounted` above the guard for this reason.
  test('a filter typed before signing in survives the sign-in', async () => {
    const store = makeStore()
    const seen = []
    const wrapper = mountOrders(store, seen)
    await flush()

    wrapper.vm.searchQuery = 'CODE32'
    wrapper.vm.selectedStatuses = ['Accepted']
    await flush()

    signIn(store)
    signInThroughShell(wrapper)
    await flush()

    expect(wrapper.vm.searchQuery).toBe('CODE32')
    expect(wrapper.vm.selectedStatuses).toEqual(['Accepted'])

    wrapper.destroy()
  })
})

// ---------------------------------------------------------------------------------------------
// STATISTICS
// ---------------------------------------------------------------------------------------------
describe('/admin/statistics — signing in through the page brings the whole page with it', () => {
  // A day's trade, per store. `loadStatistics` sends `storeIds` on every request, so a fake that
  // sums only the requested stores turns an empty `adminStores` into a page reporting zero.
  const PICKUPS_PER_STORE = { 42: 7, 43: 4 }

  function makeStatisticsService (seen) {
    const countFor = model => (model.storeIds || [])
      .reduce((sum, id) => sum + (PICKUPS_PER_STORE[id] || 0), 0)

    return {
      Get: (model) => {
        seen.push(model.storeIds)
        // Only the SelfPickup slice carries a count here; that is the one the assertions read.
        const isPickupSlice = (model.deliveryTypes || []).length === 1 &&
          model.deliveryTypes[0] === 'SelfPickup'
        return Promise.resolve({
          charts: [
            // The key the page looks for; `getDeliveryTypeCount` finds it by this exact string.
            { headingKey: 'Antall bestillinger totalt', headingValue: isPickupSlice ? countFor(model) : 0 },
            { headingKey: 'Sum', headingValue: 0 }
          ]
        })
      },
      GetHeatmapData: () => Promise.resolve({ data: [] })
    }
  }

  function mountStatistics (store, seen) {
    return mount(StatisticsPage, {
      mocks: {
        ...mixinMocks,
        $store: store,
        _statisticsService: makeStatisticsService(seen)
      },
      stubs: {
        AdminPage: AdminPageStub,
        MultiSelectDropdown: true,
        StatisticsChart: true,
        LoadingSkeleton: true,
        PeakPerformanceHeatmap: true,
        AIQueryBox: true
      }
    })
  }

  const pickupCount = wrapper => wrapper.find('.delivery-stat-value').text().trim()

  test('the operator arrives on their own stores and their own turnover, not on a zero day', async () => {
    const store = makeStore()
    const seen = []
    const wrapper = mountStatistics(store, seen)
    await flush()

    // Signed out: nothing started, nothing asked of the server.
    expect(wrapper.vm.adminStores).toEqual([])
    expect(seen).toEqual([])
    expect(wrapper.find('.statistics-content').exists()).toBe(false)

    signIn(store)
    signInThroughShell(wrapper)
    await flush()

    expect(wrapper.vm.adminStores).toEqual([TESTKROA, BRYGGA])
    expect(wrapper.vm.selectedStoreIds).toEqual([42, 43])

    // Every request the page made carried both stores. An empty `adminStores` sends `[]` here and
    // the server answers about nothing — which renders as a venue that took no money.
    expect(seen.length).toBeGreaterThan(0)
    seen.forEach(storeIds => expect(storeIds).toEqual([42, 43]))

    // And the number the operator reads is the day both stores actually had.
    expect(wrapper.find('.statistics-content').exists()).toBe(true)
    expect(pickupCount(wrapper)).toBe('11')

    wrapper.destroy()
  })

  test('the store picker is on screen afterwards, so the selection can still be changed', async () => {
    const store = makeStore()
    const wrapper = mountStatistics(store, [])
    await flush()

    expect(wrapper.text()).not.toContain('statistics_stores')

    signIn(store)
    signInThroughShell(wrapper)
    await flush()

    expect(wrapper.text()).toContain('statistics_stores')
    expect(wrapper.vm.storeOptions).toEqual([
      { id: 42, label: 'Testkroa' },
      { id: 43, label: 'Brygga' }
    ])

    wrapper.destroy()
  })
})

// ---------------------------------------------------------------------------------------------
// THE STATE IS THE SAME ONE A FRESH MOUNT PRODUCES
//
// The exit criterion in its own words. Mounting the page for an operator who is ALREADY signed in
// is the reference; signing in on the page must land on the same state. Written as a comparison so
// that a starter added to `mounted` later and not to the sign-in path cannot pass this file: the
// reference moves with it.
// ---------------------------------------------------------------------------------------------
describe('signing in on the page lands where a fresh mount would have', () => {
  const readable = vm => ({
    adminStores: vm.adminStores,
    selectedStoreIds: vm.selectedStoreIds
  })

  test('/admin/orders', async () => {
    const fresh = makeStore()
    signIn(fresh)
    const freshWrapper = mount(OrdersPage, {
      mocks: {
        ...mixinMocks,
        $store: fresh,
        _orderService: { GetAllOrdersWithPagination: () => Promise.resolve({ orders: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 }) }
      },
      stubs: { AdminPage: AdminPageStub, OrderModal: true, MultiSelectDropdown: true }
    })
    await flush()

    const late = makeStore()
    const lateWrapper = mount(OrdersPage, {
      mocks: {
        ...mixinMocks,
        $store: late,
        _orderService: { GetAllOrdersWithPagination: () => Promise.resolve({ orders: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 }) }
      },
      stubs: { AdminPage: AdminPageStub, OrderModal: true, MultiSelectDropdown: true }
    })
    await flush()
    signIn(late)
    signInThroughShell(lateWrapper)
    await flush()

    expect(readable(lateWrapper.vm)).toEqual(readable(freshWrapper.vm))
    expect(readable(freshWrapper.vm).adminStores).toEqual([TESTKROA, BRYGGA])

    freshWrapper.destroy()
    lateWrapper.destroy()
  })

  test('/admin/statistics', async () => {
    const service = () => ({
      Get: () => Promise.resolve({ charts: [] }),
      GetHeatmapData: () => Promise.resolve({ data: [] })
    })
    const stubs = {
      AdminPage: AdminPageStub,
      MultiSelectDropdown: true,
      StatisticsChart: true,
      LoadingSkeleton: true,
      PeakPerformanceHeatmap: true,
      AIQueryBox: true
    }

    const fresh = makeStore()
    signIn(fresh)
    const freshWrapper = mount(StatisticsPage, {
      mocks: { ...mixinMocks, $store: fresh, _statisticsService: service() },
      stubs
    })
    await flush()

    const late = makeStore()
    const lateWrapper = mount(StatisticsPage, {
      mocks: { ...mixinMocks, $store: late, _statisticsService: service() },
      stubs
    })
    await flush()
    signIn(late)
    signInThroughShell(lateWrapper)
    await flush()

    expect(readable(lateWrapper.vm)).toEqual(readable(freshWrapper.vm))
    expect(readable(freshWrapper.vm).adminStores).toEqual([TESTKROA, BRYGGA])

    freshWrapper.destroy()
    lateWrapper.destroy()
  })
})
