import { shallowMount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mock must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import OngoingPage from '~/pages/admin/ongoing.vue'
import { OrderStatus } from '~/core/enums/order-status'
import {
  unclassifiedStatuses,
  columnForStatus,
  actionForStatus,
  COLUMN_NEW,
  COLUMN_PROCESSING,
  COLUMN_READY,
  ACTION_NONE,
  ACTION_NEXT,
  ACTION_COMPLETE
} from '~/utils/admin/ongoing-columns'

// ReceiptModal is replaced at MODULE level, not stubbed at mount level, and it is not a preference.
// Its template contains `order.user?.phoneNumber`; vue-jest transpiles render functions with buble
// (`vue-template-es2015-compiler`), which cannot parse optional chaining, so merely importing the
// page throws `SyntaxError: Unexpected token` before a single assertion runs. Five .vue files in
// this repo are in that state — ReceiptModal, OnboardingProductImages, offers, products, wolt-menu —
// and until that is fixed no test may import a page that reaches one of them. Recorded rather than
// worked around silently: it is why `/admin/ongoing` had no unit test to catch this defect.
jest.mock('~/components/molecules/ReceiptModal.vue', () => ({
  name: 'ReceiptModal',
  render (h) { return h('div') }
}))

// `/admin/ongoing` is the screen a venue actually works from, and it could lose an order.
//
// The board bucketed five statuses by hand — Accepted, Processing, ReadyForPickup, ReadyForDriver,
// Served. `DriverPickedUp` was not among them, and neither was `OpenCheck`. Both are real values of
// `OrderStatus`, both are returned by `/orders/ongoing`, and both were LOADED into `this.orders` and
// then rendered in no column at all: invisible on the board and un-completable from it.
//
// THE FAILURE MODE IS SILENCE. Nothing threw, no column looked broken, no request failed — the order
// simply was not there. So every assertion in this file is a PRESENCE assertion. Not "no error was
// raised", not "the page mounted": the card for each status is found in the rendered DOM, or the
// test fails.
//
// The live set is derived from `OrderStatus` here rather than listed, and the only literal in this
// file is the pair of statuses a live order CANNOT hold (below). That is deliberate: adding a status
// to the enum without giving it a home on the board must fail HERE, at the assertion, and not on a
// Saturday service.

// The two terminal states. A completed or cancelled order is not a live order, so it is off the
// board by design — the one exclusion this test is willing to spell out, because it is the one that
// is true by definition rather than by omission.
const TERMINAL = [OrderStatus.Completed, OrderStatus.Canceled]

const LIVE_STATUSES = Object.keys(OrderStatus)
  .map(key => OrderStatus[key])
  .filter(status => !TERMINAL.includes(status))

// The placement this board commits to, written out so a reader can disagree with it. Column names
// are the i18n KEYS, because `$i` is mocked to the identity below.
//
//   OpenCheck       new / no action  — a check still open at the register. It is a live order the
//                                      venue must be able to SEE, but the board cannot advance it;
//                                      the POS owns its lifecycle until it is accepted.
//   Accepted        new / next       — unchanged.
//   Processing      processing/next  — unchanged.
//   ReadyForPickup  ready / complete — unchanged.
//   ReadyForDriver  ready / complete — unchanged.
//   DriverPickedUp  ready / complete — THE DEFECT. Food has left the kitchen with a driver; the
//                                      order is still open and still has to be completed from this
//                                      screen. `core/pinia/order.ts` already treats it as the same
//                                      rung as ReadyForDriver for the customer's progress bar.
//   Served          ready / complete — unchanged.
const EXPECTED_PLACEMENT = {
  [OrderStatus.OpenCheck]: { column: 'ongoing_columnNew', action: '' },
  [OrderStatus.Accepted]: { column: 'ongoing_columnNew', action: 'ongoing_actionNext' },
  [OrderStatus.Processing]: { column: 'ongoing_columnProcessing', action: 'ongoing_actionNext' },
  [OrderStatus.ReadyForPickup]: { column: 'ongoing_columnReady', action: 'ongoing_actionComplete' },
  [OrderStatus.ReadyForDriver]: { column: 'ongoing_columnReady', action: 'ongoing_actionComplete' },
  [OrderStatus.DriverPickedUp]: { column: 'ongoing_columnReady', action: 'ongoing_actionComplete' },
  [OrderStatus.Served]: { column: 'ongoing_columnReady', action: 'ongoing_actionComplete' }
}

const orderWith = (status, index) => ({
  id: 'order-' + status,
  friendlyOrderId: String(2000 + index),
  storeId: 42,
  storeLegalName: 'Testkroa AS',
  status,
  deliveryType: 'SelfPickup',
  created: new Date(Date.UTC(2026, 7, 1, 9, index)).toISOString(),
  userFullName: 'Gjest ' + index,
  userId: 'user-' + index,
  totalAmount: 249,
  currencyCode: 'NOK',
  items: []
})

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

// The stub renders what the assertions read. It carries the order's own id and status into the DOM
// so a card can be found by the status it holds rather than by the column it was expected in — the
// whole point being to catch a card that is in NO column.
const CardStub = {
  props: ['order', 'primaryActionButton'],
  template: '<div class="probe-card" :data-order-id="order.id" :data-status="order.status" :data-action="primaryActionButton || \'\'" />'
}

function mountBoard (orders, statusCalls) {
  return shallowMount(OngoingPage, {
    mocks: {
      $i: key => key,
      $store: {
        getters: { userIsLoggedIn: true },
        state: { currentUser: { id: 1, adminIn: [{ id: 42 }] } }
      },
      _orderService: {
        GetAllOngoing: () => Promise.resolve(orders),
        UpdateStatus: (id, status) => {
          if (statusCalls) { statusCalls.push([id, status]) }
          return Promise.resolve({})
        }
      }
    },
    stubs: {
      AdminPage: { template: '<div><slot /></div>' },
      OrderCard: CardStub,
      LoginModal: true,
      Loading: true,
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

// Every card the board rendered, paired with the column it was rendered in. Built by walking the
// columns rather than by asking the page's computeds, so a card that no column renders is simply
// absent from this list — which is exactly the defect, made visible.
function renderedCards (wrapper) {
  const found = []
  wrapper.findAll('.orders-column').wrappers.forEach((column) => {
    const name = column.find('h2').text()
    column.findAll('.probe-card').wrappers.forEach((card) => {
      found.push({
        column: name,
        id: card.attributes('data-order-id'),
        status: card.attributes('data-status'),
        action: card.attributes('data-action')
      })
    })
  })
  return found
}

// The guard against the same defect arriving a second time. The DOM tests above can only see the
// statuses this file thought to name; these two see the ENUM, so they red for a status nobody has
// thought about yet — a new member of `OrderStatus`, or an existing one deleted from the table.
describe('the bucketing is total over OrderStatus', () => {
  test('no member of OrderStatus is left unplaced and unexcluded', () => {
    expect(unclassifiedStatuses()).toEqual([])
  })

  // Sanity on the guard itself: the assertion above is only worth something if the enum it walks is
  // the shipped one and is not empty.
  test('the enum it walks is the shipped one', () => {
    expect(Object.keys(OrderStatus)).toEqual([
      'OpenCheck', 'Accepted', 'Processing', 'ReadyForPickup',
      'ReadyForDriver', 'DriverPickedUp', 'Served', 'Completed', 'Canceled'
    ])
  })

  test('the column and the action agree with the placement the board renders', () => {
    expect(columnForStatus(OrderStatus.OpenCheck)).toBe(COLUMN_NEW)
    expect(columnForStatus(OrderStatus.Accepted)).toBe(COLUMN_NEW)
    expect(columnForStatus(OrderStatus.Processing)).toBe(COLUMN_PROCESSING)
    expect(columnForStatus(OrderStatus.ReadyForPickup)).toBe(COLUMN_READY)
    expect(columnForStatus(OrderStatus.ReadyForDriver)).toBe(COLUMN_READY)
    expect(columnForStatus(OrderStatus.DriverPickedUp)).toBe(COLUMN_READY)
    expect(columnForStatus(OrderStatus.Served)).toBe(COLUMN_READY)

    expect(columnForStatus(OrderStatus.Completed)).toBeNull()
    expect(columnForStatus(OrderStatus.Canceled)).toBeNull()

    expect(actionForStatus(OrderStatus.OpenCheck)).toBe(ACTION_NONE)
    expect(actionForStatus(OrderStatus.Accepted)).toBe(ACTION_NEXT)
    expect(actionForStatus(OrderStatus.Processing)).toBe(ACTION_NEXT)
    expect(actionForStatus(OrderStatus.DriverPickedUp)).toBe(ACTION_COMPLETE)
  })

  // Unrecognised is a reason to surface, never a reason to drop. A wire value this build's `core`
  // pin does not carry gets a column and no button.
  test('an unrecognised status gets a column and no action', () => {
    expect(columnForStatus('AwaitingCourierHandover')).toBe(COLUMN_NEW)
    expect(actionForStatus('AwaitingCourierHandover')).toBe(ACTION_NONE)
    expect(columnForStatus(undefined)).toBe(COLUMN_NEW)
  })
})

describe('the ongoing board shows every live order', () => {
  let wrapper = null

  afterEach(() => {
    if (wrapper) { wrapper.destroy(); wrapper = null }
  })

  // THE anti-silence assertion. One order per live status goes in; the ids that came out of the
  // rendered DOM are compared against the ids that went in. A status that buckets nowhere shows up
  // here as a missing id, named, rather than as a quietly shorter list.
  test('no live status renders in no column', async () => {
    const orders = LIVE_STATUSES.map(orderWith)
    wrapper = mountBoard(orders)
    await settled()

    expect(wrapper.vm.orders).toHaveLength(LIVE_STATUSES.length)

    const shown = renderedCards(wrapper).map(card => card.status).sort()
    expect(shown).toEqual(LIVE_STATUSES.slice().sort())
  })

  test('each live order is rendered once, in exactly one column', async () => {
    const orders = LIVE_STATUSES.map(orderWith)
    wrapper = mountBoard(orders)
    await settled()

    const byStatus = {}
    renderedCards(wrapper).forEach((card) => {
      byStatus[card.status] = (byStatus[card.status] || []).concat(card.column)
    })

    LIVE_STATUSES.forEach((status) => {
      expect(byStatus[status]).toEqual([EXPECTED_PLACEMENT[status].column])
    })
  })

  // The reviewable half: WHERE each status went, and what the venue can do to it once it is there.
  // Visible but un-actionable is only half a fix, so the primary action is asserted alongside the
  // column.
  test('each live status lands in its named column with its named action', async () => {
    const orders = LIVE_STATUSES.map(orderWith)
    wrapper = mountBoard(orders)
    await settled()

    const actual = {}
    renderedCards(wrapper).forEach((card) => {
      actual[card.status] = { column: card.column, action: card.action }
    })

    expect(actual).toEqual(EXPECTED_PLACEMENT)
  })

  // The reason the defect mattered: not merely that the card was unseen, but that the only control
  // that closes the order lives on it.
  test('an order whose driver has collected it can still be completed from this screen', async () => {
    const statusCalls = []
    const order = orderWith(OrderStatus.DriverPickedUp, 0)
    wrapper = mountBoard([order], statusCalls)
    await settled()

    const card = renderedCards(wrapper).find(c => c.status === OrderStatus.DriverPickedUp)
    expect(card).toBeDefined()
    expect(card.action).toBe('ongoing_actionComplete')

    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      wrapper.vm.completeOrder(order)
      await settled()
    } finally {
      confirmSpy.mockRestore()
    }

    expect(statusCalls).toEqual([[order.id, 'Completed']])
  })

  // A terminal order is off the board on purpose. Asserted so that "excluded" stays a decision
  // somebody made rather than a second omission hiding behind the first.
  test('completed and cancelled orders are excluded, and that exclusion is deliberate', async () => {
    wrapper = mountBoard(TERMINAL.map(orderWith))
    await settled()

    expect(wrapper.vm.orders).toHaveLength(TERMINAL.length)
    expect(renderedCards(wrapper)).toEqual([])
  })

  // The backend can start returning a status before this repo's `core` submodule pin carries it.
  // That order must still reach a human's eyes: unrecognised is a reason to surface something, never
  // a reason to drop it.
  test('a status this build has never heard of is surfaced, not dropped', async () => {
    const order = orderWith('AwaitingCourierHandover', 0)
    wrapper = mountBoard([order])
    await settled()

    const shown = renderedCards(wrapper)
    expect(shown.map(card => card.id)).toEqual([order.id])
  })
})
