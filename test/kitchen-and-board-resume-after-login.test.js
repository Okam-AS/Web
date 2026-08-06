import Vue from 'vue'
import { mount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- `jest.mock` is hoisted above the imports; the page import
// is not, and `pages/admin/ongoing.vue` reaches ReceiptModal at module load (see below).
import KitchenPage from '~/pages/admin/kitchen.vue'
// eslint-disable-next-line import/first
import OngoingPage from '~/pages/admin/ongoing.vue'

// ReceiptModal is replaced at MODULE level, not stubbed at mount level. Its template contains
// `order.user?.phoneNumber`, and vue-jest transpiles render functions with buble, which cannot parse
// optional chaining — merely importing `/admin/ongoing` throws `SyntaxError` before an assertion
// runs. Same reason as in `ongoing-board-covers-every-live-status.test.js`.
jest.mock('~/components/molecules/ReceiptModal.vue', () => ({
  name: 'ReceiptModal',
  render (h) { return h('div') }
}))

// WHAT THIS FILE IS ABOUT
//
// Both of these pages return early from `mounted` for a signed-out visitor, and both offer that
// visitor a sign-in modal on the page itself. So for a signed-out visitor the page's `mounted` runs
// HALF of itself, and the modal's close handler is the only thing that ever runs the other half.
// That handler was written once, by hand, against the starter list as it stood that day — and the
// starter list has grown since.
//
// The visitor gets there through `AdminPage.initAuth`: a signed-out visitor to an admin path is
// bounced to `/admin?redirect=…`, EXCEPT when a `redirect` query is already present (AdminPage.vue
// :99). That exception is the post-login return path, so `/admin/kitchen?redirect=…` and
// `/admin/ongoing?redirect=…` render for a signed-out visitor with the page's own modal over them.
//
// What each page forgot:
//
//   kitchen   `mounted` starts a 1s clock into `this.now` (:143) and a `fullscreenchange` listener
//             (:144). `closeLoginModal` restarted the fetch and the poll and NEITHER of those two.
//             `this.now` then stays frozen at page-load time for the life of the session, and
//             `KitchenTicket.ageSeconds` is `(now - createdAt)` clamped at zero — so every ticket
//             that arrives after the page was opened reads `0:00` forever and never escalates to
//             amber or red. On a kitchen display the ageing ticket IS the screen.
//
//   ongoing   `mounted` starts a 7s poll and populates `adminStores`. `closeLoginModal` called
//             `loadOrders()` and neither of those — so the board froze on the snapshot taken at
//             sign-in and no order placed afterwards ever appeared on it.
//
// EVERY ASSERTION BELOW IS ON OBSERVABLE PRODUCT STATE, not on which method exists or which method
// was called: the text and colour class the cook reads off a ticket, and the card for an order that
// was placed after sign-in. A page that satisfies these has recovered; how it recovers is its own
// business. `lanes/L-KITCHEN-AND-BOARD-RECOVER-AFTER-LOGIN/mutate-starters.probe.js` deletes each
// starter in turn and shows each deletion turning a test in this file red.

// ---------------------------------------------------------------------------------------------
// A clock the test owns.
//
// jest 26's default fake timers are the LEGACY ones, which mock `setInterval` but leave `Date.now`
// alone — and `Date.now` is exactly what the kitchen clock writes into `this.now`. Under legacy
// timers alone, `advanceTimersByTime(540000)` fires the interval 540 times and each tick writes the
// same real wall-clock millisecond, so a WORKING clock would look frozen and this file would pass
// on the defect it exists to catch. So the test stubs `Date.now` and moves the two together.
// ---------------------------------------------------------------------------------------------
const T0 = Date.UTC(2026, 7, 6, 17, 0, 0)
let clockMs = T0
const realDateNow = Date.now

beforeEach(() => {
  clockMs = T0
  Date.now = () => clockMs
  jest.useFakeTimers()
  // jest 26's legacy fake timers keep ONE timer store per test file, and `useFakeTimers()` does not
  // empty it. Without this, an interval a previous test's page left running is still counted here,
  // and the two "exactly one clock" assertions below would be reading other tests' leaks.
  jest.clearAllTimers()
})

afterEach(() => {
  Date.now = realDateNow
  jest.useRealTimers()
})

// Move wall-clock time and timer time together, then let any promise the tick started settle.
async function advance (ms) {
  clockMs += ms
  jest.advanceTimersByTime(ms)
  await flush()
}

// Pure microtask drain. `setTimeout(resolve, 0)` would need a timer advance under fake timers, and
// the services here resolve immediately, so draining the microtask queue is enough and does not
// silently move the clock.
// Vue 2.6 schedules its own watcher flush on a Promise microtask, so draining the microtask queue
// drains the re-render too — no `nextTick` call needed, and the DOM assertions below read the
// updated render.
async function flush () {
  for (let i = 0; i < 8; i++) { await Promise.resolve() }
}

// A `$store` mock that can actually change. Plain objects passed through `mocks` are not reactive,
// so a computed reading `state.currentUser` would never recompute when a sign-in populates it — and
// both pages derive their store id that way. `Vue.observable` makes signing in mid-test behave like
// signing in mid-session.
function makeStore () {
  return {
    state: Vue.observable({ currentUser: null, selectedAdminStore: null }),
    getters: Vue.observable({ userIsLoggedIn: false })
  }
}

function signIn (store) {
  store.state.currentUser = { id: 1, adminIn: [{ id: 42, name: 'Testkroa' }] }
  store.getters.userIsLoggedIn = true
}

// ---------------------------------------------------------------------------------------------
// REACHABILITY
//
// Everything below this point is about a handler that only matters if a signed-out visitor can
// actually be standing on one of these two pages. The shell normally makes sure they cannot: a
// signed-out visitor to any admin path is bounced to `/admin?redirect=…`. So the first question is
// whether these handlers are dead code, and the answer is the `&& !this.$route.query.redirect` on
// AdminPage.vue:99 — the bounce is skipped when a `redirect` query is ALREADY set, which is the URL
// the post-login return path itself produces. Asserted here rather than reasoned about, because a
// sibling lane found other modals on this estate genuinely unreachable and the difference decides
// whether this lane is a fix or dead code.
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
    const { replace } = mountShell({ path: '/admin/kitchen', fullPath: '/admin/kitchen', query: {} })
    await flush()
    expect(replace).toHaveBeenCalledWith('/admin?redirect=%2Fadmin%2Fkitchen')
  })

  // The exception, and the whole reason the two sign-in handlers below are live code. `/admin/…`
  // carrying a `redirect` is what the sign-in flow itself leaves in the address bar, so it is a
  // bookmarkable, shareable, reloadable URL that renders an admin page for a signed-out visitor.
  test.each([
    ['/admin/kitchen'],
    ['/admin/ongoing']
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
// KITCHEN
// ---------------------------------------------------------------------------------------------
describe('/admin/kitchen — signing in through the page brings the ticket clock with it', () => {
  // A POS ticket that is SENT while the cook is signing in. This is the ordinary case on a kitchen
  // display — the screen is opened once at the start of service and every ticket it shows arrives
  // afterwards — and it is the case a frozen `now` renders as `0:00`, because `ageSeconds` clamps a
  // negative age at zero.
  function boardWithTicketSentAt (createdMs) {
    return {
      tickets: [{
        orderId: 'ord-1',
        source: 'PosTable',
        friendlyId: '31',
        tableName: 'Bord 4',
        couverts: 2,
        comment: '',
        createdAt: new Date(createdMs).toISOString(),
        sentAt: null,
        deliveryType: null,
        status: 'Accepted',
        overallStatus: 'Sent',
        lines: [{
          orderLineItemId: 'line-1',
          name: 'Fiskesuppe',
          quantity: 1,
          courseSequence: 1,
          status: 'Sent',
          notes: '',
          allergens: [],
          options: []
        }]
      }]
    }
  }

  function mountKitchen (store, board) {
    return mount(KitchenPage, {
      mocks: {
        $i: key => key,
        $store: store,
        _kitchenService: {
          GetBoard: () => Promise.resolve(board()),
          BumpLine: () => Promise.resolve(board()),
          BumpCourse: () => Promise.resolve(board()),
          BumpTicket: () => Promise.resolve(board()),
          RecallLine: () => Promise.resolve(board())
        }
      },
      // KitchenTicket is deliberately NOT stubbed: the timer text and its colour class are the
      // product behaviour under test, and they are computed inside it.
      stubs: {
        AdminPage: { template: '<div><slot /></div>' },
        Loading: true,
        LoginModal: true
      }
    })
  }

  // The one the cook reads.
  const timerText = wrapper => wrapper.find('.kds-timer').text().trim()
  const timerIsAmber = wrapper => wrapper.find('.kds-timer').classes().includes('is-amber')
  const timerIsRed = wrapper => wrapper.find('.kds-timer').classes().includes('is-red')

  test('a ticket sent at sign-in ages on screen instead of sitting at 0:00', async () => {
    const store = makeStore()
    let board = { tickets: [] }
    const wrapper = mountKitchen(store, () => board)
    await flush()

    // Signed out: the page shows its own modal and starts nothing. `now` is page-load time.
    expect(wrapper.vm.showLogin).toBe(true)
    expect(wrapper.vm.now).toBe(T0)

    // The cook spends a minute finding the password.
    await advance(60 * 1000)

    // Sign in through the page's own modal, at T0+60s, and a ticket is sent at that same moment.
    const sentAt = clockMs
    board = boardWithTicketSentAt(sentAt)
    signIn(store)
    wrapper.vm.closeLoginModal(true)
    await flush()

    expect(wrapper.find('.kds-timer').exists()).toBe(true)
    expect(timerText(wrapper)).toContain('0:00')

    // Nine minutes of service. The ticket is nine minutes old and past `amberMinutes` (8).
    await advance(9 * 60 * 1000)

    expect(timerText(wrapper)).toContain('9:00')
    expect(timerIsAmber(wrapper)).toBe(true)
    expect(timerIsRed(wrapper)).toBe(false)

    // Seven more. Past `redMinutes` (15).
    await advance(7 * 60 * 1000)

    expect(timerText(wrapper)).toContain('16:00')
    expect(timerIsRed(wrapper)).toBe(true)

    wrapper.destroy()
  })

  test('the board keeps polling after the sign-in, not just once', async () => {
    const store = makeStore()
    let calls = 0
    const wrapper = mount(KitchenPage, {
      mocks: {
        $i: key => key,
        $store: store,
        _kitchenService: {
          GetBoard: () => { calls++; return Promise.resolve({ tickets: [] }) }
        }
      },
      stubs: {
        AdminPage: { template: '<div><slot /></div>' },
        Loading: true,
        LoginModal: true
      }
    })
    await flush()
    expect(calls).toBe(0)

    signIn(store)
    wrapper.vm.closeLoginModal(true)
    await flush()
    const afterSignIn = calls
    expect(afterSignIn).toBeGreaterThan(0)

    await advance(5000)
    await advance(5000)
    expect(calls).toBeGreaterThan(afterSignIn)

    wrapper.destroy()
  })

  // The second starter `mounted` runs and `closeLoginModal` did not. Asserted through the state the
  // listener maintains rather than through `addEventListener` having been called, so a page that
  // keeps `isFullscreen` honest some other way still passes.
  test('the fullscreen state tracks the document after the sign-in', async () => {
    const store = makeStore()
    const wrapper = mountKitchen(store, () => ({ tickets: [] }))
    await flush()

    signIn(store)
    wrapper.vm.closeLoginModal(true)
    await flush()

    expect(wrapper.vm.isFullscreen).toBe(false)

    // jsdom implements neither `requestFullscreen` nor `fullscreenElement`; the page reads the
    // property and the event, so the test provides both.
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: wrapper.vm.$refs.kdsBoard || {}
    })
    document.dispatchEvent(new Event('fullscreenchange'))
    await flush()

    expect(wrapper.vm.isFullscreen).toBe(true)

    delete document.fullscreenElement
    wrapper.destroy()
  })

  // Recovery must not double-start what is already running: a second clock would write `now` twice a
  // second forever and outlive the component. Guards the fix rather than the defect.
  test('a repeated sign-in leaves exactly one clock and one poll behind', async () => {
    const store = makeStore()
    const wrapper = mountKitchen(store, () => ({ tickets: [] }))
    await flush()

    signIn(store)
    wrapper.vm.closeLoginModal(true)
    await flush()
    wrapper.vm.closeLoginModal(true)
    await flush()

    // One poll and one clock, no matter how many times the modal closed.
    expect(jest.getTimerCount()).toBe(2)
    // And `beforeDestroy` can then actually stop them — it holds one handle each, so a second
    // interval started over the top of the first is one this page can never clear.
    wrapper.destroy()
    expect(jest.getTimerCount()).toBe(0)
  })
})

// ---------------------------------------------------------------------------------------------
// ONGOING
// ---------------------------------------------------------------------------------------------
describe('/admin/ongoing — signing in through the page brings the live board with it', () => {
  const orderWith = id => ({
    id,
    friendlyOrderId: id,
    storeId: 42,
    storeLegalName: 'Testkroa AS',
    status: 'Accepted',
    deliveryType: 'SelfPickup',
    created: new Date(clockMs).toISOString(),
    userFullName: 'Gjest',
    userId: 'user-1',
    totalAmount: 249,
    currencyCode: 'NOK',
    items: []
  })

  const CardStub = {
    props: ['order'],
    template: '<div class="probe-card" :data-order-id="order.id" />'
  }

  function mountOngoing (store, feed) {
    return mount(OngoingPage, {
      mocks: {
        $i: key => key,
        $store: store,
        _orderService: {
          GetAllOngoing: () => Promise.resolve(feed()),
          UpdateStatus: () => Promise.resolve({})
        }
      },
      stubs: {
        AdminPage: { template: '<div><slot /></div>' },
        OrderCard: CardStub,
        Loading: true,
        LoginModal: true,
        OrderProcessingModal: true,
        ReceiptModal: true,
        TransferOrderModal: true,
        ChangeDeliveryTypeModal: true,
        SmsDriverModal: true,
        CustomerInfoModal: true,
        NuxtLink: true
      }
    })
  }

  const cardIds = wrapper => wrapper.findAll('.probe-card').wrappers.map(c => c.attributes('data-order-id'))

  test('an order placed after the sign-in appears on the board without a reload', async () => {
    const store = makeStore()
    // The world the fixture serves: empty at sign-in, one order a few seconds later.
    let orders = []
    const wrapper = mountOngoing(store, () => orders)
    await flush()

    expect(cardIds(wrapper)).toEqual([])

    signIn(store)
    wrapper.vm.closeLoginModal(true)
    await flush()

    // The snapshot taken at sign-in. Still empty — nothing has been ordered yet.
    expect(cardIds(wrapper)).toEqual([])

    // A guest orders. The board polls every 7s, so within one poll the card must be there. This is
    // the whole promise of the screen: it is live, and nobody reloads it during service.
    orders = [orderWith('order-2001')]
    await advance(7000)

    expect(cardIds(wrapper)).toEqual(['order-2001'])

    // And it keeps going — a second order lands on a later poll.
    orders = [orderWith('order-2001'), orderWith('order-2002')]
    await advance(7000)

    expect(cardIds(wrapper)).toEqual(['order-2001', 'order-2002'])

    wrapper.destroy()
  })

  // `adminStores` is what the transfer modal offers as destinations. Left empty, transfer is not
  // broken in a way anyone can see — it simply has nowhere to send the order.
  test('the stores an order can be transferred to are known after the sign-in', async () => {
    const store = makeStore()
    const wrapper = mountOngoing(store, () => [])
    await flush()

    expect(wrapper.vm.adminStores).toEqual([])

    signIn(store)
    wrapper.vm.closeLoginModal(true)
    await flush()

    expect(wrapper.vm.adminStores).toEqual([{ id: 42, name: 'Testkroa' }])

    wrapper.destroy()
  })

  test('a repeated sign-in leaves exactly one poll behind', async () => {
    const store = makeStore()
    const wrapper = mountOngoing(store, () => [])
    await flush()

    signIn(store)
    wrapper.vm.closeLoginModal(true)
    await flush()
    wrapper.vm.closeLoginModal(true)
    await flush()

    expect(jest.getTimerCount()).toBe(1)
    wrapper.destroy()
    expect(jest.getTimerCount()).toBe(0)
  })
})
