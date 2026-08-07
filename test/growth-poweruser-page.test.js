import Vue from 'vue'
import { mount } from '@vue/test-utils'
import { translate } from '~/utils/i18n'
import { setPlatform } from '~/core/platform'
import { StatisticsService } from '~/core/services/statistics-service'

// ---- WHAT THIS FILE IS ABOUT -------------------------------------------------------------------
//
// `pages/admin/poweruser-growth.vue` is the screen an Okam poweruser opens to read the WHOLE
// platform: every store, every order, every krone, since the first one. It is linked from the admin
// header (`AdminPageHeader.vue:637`, `nav_okam_growth`), so it is a real destination and not dead
// code. It carried NO tests at all — 0% of 372 statements — which for a page behind an elevated
// right is the wrong file to have left unmeasured.
//
// Everything below is written from the operator's side of the glass: what is fetched, what is
// refused, what the numbers say, and what the screen says when the read does not come back. The
// assertions read rendered text and chart data — the things a person looks at — not method calls.
//
// ---- THE ONE FAILING TEST IS DELIBERATE --------------------------------------------------------
//
// `describe('the operator is told which failure this is')` holds an arm that FAILS on purpose. It
// is the `F-GROWTH-PUBLISH-LIES-ABOUT-WHY-IT-FAILED` shape measured on this page's own read path,
// driven through the REAL `StatisticsService` and a transport that fails the way axios fails. It is
// left red rather than written around, and it is described at that describe block.
//
// ---- WHY THESE ASSERTIONS CANNOT PASS VACUOUSLY ------------------------------------------------
//
// Every arm here was run against a mutated page and watched to go red before it was kept. The
// mutations were applied to the file, observed, and reverted; they are listed in this lane's
// mutation receipt. Arms that could not be made to fail were deleted rather than kept for the
// coverage they would have decorated.

// The Chart.js double, and why there is one, are explained in `test/support/fake-chart.js`.
const { FakeChart } = require('~/test/support/fake-chart')

jest.mock('chart.js', () => {
  const { FakeChart: Double } = require('./support/fake-chart')
  return { Chart: Double, registerables: [] }
})

// ---- THE WORLD ---------------------------------------------------------------------------------
//
// Monthly cumulative points, the shape `/statistics/platform-growth` returns. The months are chosen
// to line up with the store-opening dates the page hard-codes, so the annotation arms are placed on
// real milestones rather than on invented ones:
//   2025-01  Chicken House, Arena Restaurant & Kafe, Alfonzo Pizzeria   (3 stores)
//   2025-03  Alegria Bistro, STRANDY                                    (2 stores)
//   2025-04  Lierbyen Sushi & Wok, Maxim's Grill                        (2 stores)
//   2025-05  Miss Gin, Hønefoss Pizza & Grill, La spiseria              (3 stores)
//            + Wolt Drive and Dintero, both first seen 2025-05-07       (2 features)
const MONTHS = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06']

function camelWorld () {
  let orders = 0
  let revenue = 0
  return {
    from: '2021-01-01T00:00:00',
    to: '2025-06-30T00:00:00',
    points: MONTHS.map((month, i) => {
      const orderCount = 100 * (i + 1)
      const revenueAmount = 250000 * (i + 1) // øre
      orders += orderCount
      revenue += revenueAmount
      return {
        date: `${month}-01T00:00:00`,
        orderCount,
        revenueAmount,
        cumulativeOrderCount: orders,
        cumulativeRevenueAmount: revenue
      }
    })
  }
}

// The same world in the casing a .NET backend serialises by default. The page reads both, and the
// arm that uses this one is what says so.
function pascalWorld () {
  const world = camelWorld()
  return {
    From: world.from,
    To: world.to,
    Points: world.points.map(p => ({
      Date: p.date,
      OrderCount: p.orderCount,
      RevenueAmount: p.revenueAmount,
      CumulativeOrderCount: p.cumulativeOrderCount,
      CumulativeRevenueAmount: p.cumulativeRevenueAmount
    }))
  }
}

// Totals of `camelWorld`, written out so an assertion cannot drift with the generator.
const TOTAL_ORDERS = 100 + 200 + 300 + 400 + 500 + 600            // 2100
const TOTAL_REVENUE_ORE = 250000 * (1 + 2 + 3 + 4 + 5 + 6)        // 5 250 000 øre = 52 500 kr

// ---- MOUNTING ----------------------------------------------------------------------------------

function makeStore () {
  return {
    state: Vue.observable({ currentUser: null, adminLocale: 'no' }),
    getters: Vue.observable({ userIsLoggedIn: false })
  }
}

function signInAsPowerUser (store) {
  store.state.currentUser = { id: 1, isPowerUser: true }
  store.getters.userIsLoggedIn = true
}

function signInAsOrdinaryAdmin (store) {
  store.state.currentUser = { id: 2, isPowerUser: false }
  store.getters.userIsLoggedIn = true
}

// Named, so an arm can raise the one event the shell sends downwards. The page mounts no sign-in
// modal of its own; `AdminPage` owns it, and a sign-in completed there arrives as `login-success`.
const AdminPageStub = { name: 'AdminPageStub', template: '<div><slot /></div>' }

// The real dictionary, at the operator's locale. `$i: key => key` is the usual shortcut in this
// repo, but half of what this page puts on screen is interpolated — "{count} nye butikker",
// "+ {count} til" — and the shortcut would throw the count away, which is the part worth asserting.
const mixinMocks = {
  $i (key, params) { return translate('no', key, params) },
  priceLabel: value => String(value)
}

async function settle (wrapper) {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve()
    await wrapper.vm.$nextTick()
  }
}

function mountGrowth ({ store, service, push = jest.fn() } = {}) {
  const wrapper = mount(require('~/pages/admin/poweruser-growth.vue').default, {
    mocks: {
      ...mixinMocks,
      $store: store,
      $router: { push },
      _statisticsService: service
    },
    stubs: { AdminPage: AdminPageStub, Loading: true }
  })
  return { wrapper, push }
}

// A service that answers, and counts how often it was asked. The count is what proves a refused
// operator was never allowed to reach the platform's numbers.
function servingService (world = camelWorld()) {
  const calls = { count: 0 }
  return {
    calls,
    GetPlatformGrowth () { calls.count += 1; return Promise.resolve(world) }
  }
}

function refusingService (error) {
  return { GetPlatformGrowth () { return Promise.reject(error) } }
}

// Whitespace in nb-NO number groups is U+00A0, which is invisible in a diff and unreadable in a
// failure message. Every text assertion goes through this.
const norm = text => text.replace(/\s+/g, ' ').trim()

const heroValues = wrapper => wrapper.findAll('.hero-stat strong').wrappers.map(w => norm(w.text()))
const chart = () => FakeChart.latest()

let openWrappers = []
function track (result) { openWrappers.push(result.wrapper); return result }

beforeEach(() => {
  FakeChart.reset()
  FakeChart.installCanvasContext()
  openWrappers = []
})

afterEach(() => {
  // `addChartListeners` puts a `mouseup` listener on WINDOW on every render. Leaving wrappers alive
  // would let one arm's chart answer another arm's drag.
  openWrappers.forEach(w => w.destroy())
})

// ================================================================================================
// ACCESS — the whole reason this page is called `poweruser-`
// ================================================================================================
describe('only a poweruser is let at the platform-wide numbers', () => {
  test('an ordinary admin is sent back to /admin and the platform numbers are never fetched', async () => {
    const store = makeStore()
    const service = servingService()
    const { wrapper, push } = track(mountGrowth({ store, service }))

    signInAsOrdinaryAdmin(store)
    await settle(wrapper)

    expect(push).toHaveBeenCalledWith('/admin')
    // The redirect is not the point on its own — an admin who lingers on the route for the moment
    // it takes to navigate must not be served the numbers anyway.
    expect(service.calls.count).toBe(0)
    expect(wrapper.findAll('.hero-stat').length).toBe(0)
  })

  test('a poweruser is shown the platform total orders, turnover and latest month', async () => {
    const store = makeStore()
    const service = servingService()
    const { wrapper, push } = track(mountGrowth({ store, service }))

    signInAsPowerUser(store)
    await settle(wrapper)

    expect(push).not.toHaveBeenCalled()
    expect(service.calls.count).toBe(1)
    expect(heroValues(wrapper)).toEqual(['2 100', '52 500 kr', 'juni 2025'])
  })

  test('a signed-out visitor is not bounced, and nothing is fetched on their behalf', async () => {
    const store = makeStore()
    const service = servingService()
    const { wrapper, push } = track(mountGrowth({ store, service }))
    await settle(wrapper)

    // Signed out is not the same refusal as "signed in, not entitled". The shell owns the sign-in
    // for this route, so the page waits rather than navigating away from the modal about to open.
    expect(push).not.toHaveBeenCalled()
    expect(service.calls.count).toBe(0)
  })

  test('an operator who signs in while standing here gets the numbers without reloading', async () => {
    const store = makeStore()
    const service = servingService()
    const { wrapper } = track(mountGrowth({ store, service }))
    await settle(wrapper)
    expect(wrapper.findAll('.hero-stat').length).toBe(0)

    signInAsPowerUser(store)
    wrapper.findComponent(AdminPageStub).vm.$emit('login-success')
    await settle(wrapper)

    expect(heroValues(wrapper)).toEqual(['2 100', '52 500 kr', 'juni 2025'])
  })

  test('the platform read is made once, not once per reason to re-check it', async () => {
    // `mounted`, and two `immediate` watchers, all call `ensureDataLoaded`. Three reads of a
    // platform-wide aggregate is a real cost on the server, and the in-flight guard is what stops
    // it — a guard nothing else in this file would notice going missing.
    const store = makeStore()
    signInAsPowerUser(store)
    const service = servingService()
    const { wrapper } = track(mountGrowth({ store, service }))
    await settle(wrapper)

    expect(service.calls.count).toBe(1)
  })
})

// ================================================================================================
// FAILURE — what the screen says when the read does not come back
// ================================================================================================
describe('the operator is told which failure this is', () => {
  test('a failed read is said out loud instead of leaving an empty page', async () => {
    const store = makeStore()
    signInAsPowerUser(store)
    const { wrapper } = track(mountGrowth({
      store,
      service: refusingService(new Error('Rapportmotoren svarte ikke'))
    }))
    await settle(wrapper)

    const empty = wrapper.find('.empty-state')
    expect(empty.exists()).toBe(true)
    expect(norm(empty.text())).toContain(translate('no', 'poweruserGrowth_loadError'))
    expect(norm(empty.text())).toContain('Rapportmotoren svarte ikke')
    // and the chart is not left standing next to the error
    expect(wrapper.find('.chart-panel').exists()).toBe(false)
  })

  test('a failure that carries no message at all still says something', async () => {
    const store = makeStore()
    signInAsPowerUser(store)
    const { wrapper } = track(mountGrowth({ store, service: refusingService(new Error('')) }))
    await settle(wrapper)

    expect(norm(wrapper.find('.empty-state').text()))
      .toContain(translate('no', 'poweruserGrowth_unknownError'))
  })

  test('the spinner is taken down whether the read succeeded or failed', async () => {
    const store = makeStore()
    signInAsPowerUser(store)
    const { wrapper } = track(mountGrowth({ store, service: refusingService(new Error('nei')) }))
    await settle(wrapper)

    expect(wrapper.find('.loading-state').exists()).toBe(false)
  })

  // ---- THE DEFECT ------------------------------------------------------------------------------
  //
  // LEFT FAILING ON PURPOSE. `F-GROWTH-PUBLISH-LIES-ABOUT-WHY-IT-FAILED` on this page's read path.
  //
  // `StatisticsService.GetPlatformGrowth` (core/services/statistics-service.ts:40-45) reads through
  // the UNSAFE `GetRequest`, which does not catch. Axios rejects on every non-2xx, so the rejection
  // leaves the service as the RAW AXIOS ERROR and the page's `catch` puts `error.message` on screen.
  // Measured, for a backend that answered with a reason in its body:
  //
  //     401 + {message: "Sesjonen din er utløpt"}          -> "Request failed with status code 401"
  //     403 + {message: "Du har ikke tilgang …"}           -> "Request failed with status code 403"
  //     500 + {message: "Noe gikk galt i rapportmotoren"}  -> "Request failed with status code 500"
  //     offline                                            -> "Network Error"
  //
  // Three consequences, all of them the operator's:
  //   1. the backend's own reason is DISCARDED every time — the page shows a transport string;
  //   2. `error.statusCode` is `undefined` on all four, so the page cannot branch on it either: an
  //      expired session cannot be told from a refusal or from a crashed report engine;
  //   3. the string is untranslated English inside a Norwegian admin UI.
  //
  // `RequestService` already has the parts that fix this and they are documented for exactly this
  // purpose — `SafeGetRequest` (:151) resolves the rejection, and `BuildError` (:139) prefers "the
  // backend's own message (an AppException reason the operator can act on) over the caller's
  // generic fallback" and attaches `statusCode` "so callers can branch on e.statusCode — e.g. 401
  // => session expired, undefined => network failure". `GetPlatformGrowth` calls neither.
  //
  // Note also that the service's own fallback string, 'Failed to get platform growth', is reachable
  // ONLY when the transport RESOLVES a non-200 — which axios on web never does. On this platform
  // that line is dead.
  //
  // This is not fixed here. The fix belongs in `core/services/statistics-service.ts` and is a
  // one-service change with the other four reads in that file sharing the flaw.
  describe('[KNOWN DEFECT] the reason the backend gave is what reaches the screen', () => {
    let respondWith
    class FakeHttpModule { httpClient () { return respondWith() } }
    class FakePersistenceModule {}

    // The real service, over a transport that fails the way axios fails: rejects on any non-2xx,
    // real response under `.response`.
    const realService = () => new StatisticsService({ bearerToken: '', clientPlatformName: 'Web', cultureCode: 'no' })
    const axiosRejects = (status, body) => () => {
      const error = new Error('Request failed with status code ' + status)
      error.isAxiosError = true
      error.response = { status, data: body }
      return Promise.reject(error)
    }

    beforeEach(() => setPlatform(FakeHttpModule, FakePersistenceModule))

    test.each([
      ['an expired session', 401, 'Sesjonen din er utløpt'],
      ['a refusal', 403, 'Du har ikke tilgang til plattformtall'],
      ['a crashed report engine', 500, 'Noe gikk galt i rapportmotoren']
    ])('%s reaches the operator as the reason the backend gave', async (_name, status, reason) => {
      respondWith = axiosRejects(status, { message: reason })
      const store = makeStore()
      signInAsPowerUser(store)
      const { wrapper } = track(mountGrowth({ store, service: realService() }))
      await settle(wrapper)

      expect(norm(wrapper.find('.empty-state').text())).toContain(reason)
    })
  })
})

// ================================================================================================
// MONEY — the payload is øre, the screen is kroner
// ================================================================================================
describe('turnover is shown in kroner even though it is held in øre', () => {
  test('the headline turnover is the øre total divided by a hundred', async () => {
    const store = makeStore()
    signInAsPowerUser(store)
    const { wrapper } = track(mountGrowth({ store, service: servingService() }))
    await settle(wrapper)

    expect(TOTAL_REVENUE_ORE).toBe(5250000)
    expect(heroValues(wrapper)[1]).toBe('52 500 kr')
  })

  test('the kroner curve plots kroner, so the axis is not a hundred times too high', async () => {
    const store = makeStore()
    signInAsPowerUser(store)
    const { wrapper } = track(mountGrowth({ store, service: servingService() }))
    await settle(wrapper)

    wrapper.findAll('.metric-toggle button').at(1).trigger('click')
    await settle(wrapper)

    // cumulative øre / 100, month by month
    expect(chart().data.datasets[0].data).toEqual([2500, 7500, 15000, 25000, 37500, 52500])
  })
})

// ================================================================================================
// THE METRIC TOGGLE
// ================================================================================================
describe('switching the chart between orders and kroner', () => {
  async function mountedPowerUser () {
    const store = makeStore()
    signInAsPowerUser(store)
    const result = track(mountGrowth({ store, service: servingService() }))
    await settle(result.wrapper)
    return result.wrapper
  }

  test('the orders curve is what is drawn first', async () => {
    const wrapper = await mountedPowerUser()
    expect(chart().data.datasets[0].data).toEqual([100, 300, 600, 1000, 1500, 2100])
    expect(chart().data.datasets[0].label).toBe(translate('no', 'poweruserGrowth_orders'))
  })

  test('choosing kroner relabels the curve as well as replotting it', async () => {
    const wrapper = await mountedPowerUser()

    wrapper.findAll('.metric-toggle button').at(1).trigger('click')
    await settle(wrapper)

    expect(chart().data.datasets[0].label).toBe(translate('no', 'poweruserGrowth_kroner'))
    expect(wrapper.findAll('.metric-toggle button').at(1).classes()).toContain('active')
    expect(wrapper.findAll('.metric-toggle button').at(0).classes()).not.toContain('active')
  })

  test('choosing kroner and going back leaves the orders curve as it was', async () => {
    const wrapper = await mountedPowerUser()

    wrapper.findAll('.metric-toggle button').at(1).trigger('click')
    await settle(wrapper)
    wrapper.findAll('.metric-toggle button').at(0).trigger('click')
    await settle(wrapper)

    // Written out rather than compared against a snapshot taken before the round trip: a
    // self-comparison only fails if the toggle is ASYMMETRIC, so a curve that was wrong in the same
    // way at both ends would satisfy it. These are the order totals, stated.
    expect(chart().data.datasets[0].data).toEqual([100, 300, 600, 1000, 1500, 2100])
    expect(chart().data.datasets[0].label).toBe(translate('no', 'poweruserGrowth_orders'))
    expect(wrapper.findAll('.metric-toggle button').at(0).classes()).toContain('active')
  })
})

// ================================================================================================
// WHAT THE AXES AND THE TOOLTIP SAY
//
// Chart.js renders axis ticks and tooltip rows by CALLING BACK into functions the page supplies in
// its options object. They are ordinary page code holding ordinary display rules — how a krone
// total is written on the axis, whether a tooltip row is off by a factor of a hundred — and they
// are invoked below exactly the way Chart.js invokes them, with the arguments Chart.js passes.
// ================================================================================================
describe('what the axis and the tooltip tell the operator', () => {
  async function mountedPowerUser () {
    const store = makeStore()
    signInAsPowerUser(store)
    const result = track(mountGrowth({ store, service: servingService() }))
    await settle(result.wrapper)
    return result.wrapper
  }

  async function switchToKroner (wrapper) {
    wrapper.findAll('.metric-toggle button').at(1).trigger('click')
    await settle(wrapper)
  }

  const options = () => chart().options
  const yTick = value => options().scales.y.ticks.callback(value)
  const xTick = index => options().scales.x.ticks.callback(null, index)
  // Chart.js hands the label callback a context carrying the plotted y value and the point's index.
  // Normalised, because nb-NO groups digits with U+00A0 and an expectation written with an ordinary
  // space would fail on a difference no operator can see.
  const tooltipRows = (yValue, dataIndex) =>
    options().plugins.tooltip.callbacks.label({ parsed: { y: yValue }, dataIndex }).map(norm)

  test('the orders axis is written in compact numbers', async () => {
    await mountedPowerUser()
    expect(yTick(2100)).toBe('2,1k')
    expect(yTick(0)).toBe('0')
  })

  test('the kroner axis says kroner, so a turnover axis is not read as an order count', async () => {
    const wrapper = await mountedPowerUser()
    await switchToKroner(wrapper)
    expect(yTick(52500)).toBe('52,5k kr')
  })

  test('the year is what marks the axis in January, and the quarters in between', async () => {
    const wrapper = await mountedPowerUser()
    // This world starts in January 2025 and runs to June.
    expect(xTick(0)).toBe(2025)   // January -> the year itself
    expect(xTick(3)).toBe('Q2')   // April
    expect(xTick(1)).toBe('')     // February -> nothing, so the axis stays readable
    expect(xTick(99)).toBe('')    // past the end of the data
  })

  test('a tooltip on the orders curve gives the month and the running total', async () => {
    await mountedPowerUser()
    // Point 4 is May: 500 orders that month, 1500 cumulative.
    expect(tooltipRows(1500, 4)).toEqual([
      translate('no', 'poweruserGrowth_tooltipTotalOrders', { value: '1 500' }),
      translate('no', 'poweruserGrowth_tooltipMonthOrders', { value: '500' })
    ])
  })

  test('a tooltip on the kroner curve is in kroner, not a hundred times off in either direction', async () => {
    const wrapper = await mountedPowerUser()
    await switchToKroner(wrapper)

    // The curve is plotted in KRONER (øre/100) but the month figure is read from the payload in
    // ØRE, so the two rows travel different routes to the same unit. Point 4 is May: 1 250 000 øre
    // that month, 3 750 000 øre cumulative — 12 500 kr and 37 500 kr.
    expect(tooltipRows(37500, 4)).toEqual([
      translate('no', 'poweruserGrowth_tooltipTotal', { value: '37 500 kr' }),
      translate('no', 'poweruserGrowth_tooltipMonth', { value: '12 500 kr' })
    ])
  })

  test('the tooltip title names the month the point belongs to', async () => {
    await mountedPowerUser()
    expect(options().plugins.tooltip.callbacks.title([{ label: '2025-05-01T00:00:00' }]))
      .toBe('mai 2025')
  })

  test('the curve tooltip stands down while a milestone popover is open', async () => {
    const wrapper = await mountedPowerUser()
    expect(options().plugins.tooltip.filter()).toBe(true)

    const january = wrapper.vm.annotationHitAreas.find(a => a.key === 'store-2025-1')
    wrapper.find('canvas').element
      .dispatchEvent(new MouseEvent('mousemove', { clientX: january.x, clientY: january.y }))
    await settle(wrapper)

    // Two overlapping panels describing the same point is the thing this prevents.
    expect(options().plugins.tooltip.filter()).toBe(false)
  })
})

// ================================================================================================
// THE WIRE — the page is fed by a .NET backend and reads both casings
// ================================================================================================
describe('the page reads the payload the backend actually sends', () => {
  test('a PascalCase payload puts the same numbers on screen as a camelCase one', async () => {
    const store = makeStore()
    signInAsPowerUser(store)
    const { wrapper } = track(mountGrowth({ store, service: servingService(pascalWorld()) }))
    await settle(wrapper)

    expect(heroValues(wrapper)).toEqual(['2 100', '52 500 kr', 'juni 2025'])
    expect(chart().data.datasets[0].data).toEqual([100, 300, 600, 1000, 1500, 2100])
  })

  test('a platform that has genuinely sold nothing shows nothing sold, not a blank', async () => {
    // The distinction that matters: `0` is a real answer and must survive the fallback chain that
    // exists for the two casings. A page that treated it as absent would show the same screen for
    // "no orders yet" as for "the field is missing".
    const store = makeStore()
    signInAsPowerUser(store)
    const world = {
      from: '2025-01-01T00:00:00',
      to: '2025-02-28T00:00:00',
      points: [
        { date: '2025-01-01T00:00:00', orderCount: 0, revenueAmount: 0, cumulativeOrderCount: 0, cumulativeRevenueAmount: 0 },
        { date: '2025-02-01T00:00:00', orderCount: 0, revenueAmount: 0, cumulativeOrderCount: 0, cumulativeRevenueAmount: 0 }
      ]
    }
    const { wrapper } = track(mountGrowth({ store, service: servingService(world) }))
    await settle(wrapper)

    expect(heroValues(wrapper)).toEqual(['0', '0 kr', 'feb. 2025'])
  })

  test('the period the report covers is named at the top of the page', async () => {
    const store = makeStore()
    signInAsPowerUser(store)
    const { wrapper } = track(mountGrowth({ store, service: servingService() }))
    await settle(wrapper)

    expect(norm(wrapper.find('.period').text())).toBe(
      norm(translate('no', 'poweruserGrowth_periodLabel', { from: '01.01.2021', to: '30.06.2025' }))
    )
  })
})

// ================================================================================================
// ZOOM — dragging a span out of four and a half years
// ================================================================================================
describe('zooming into a span of months and back out', () => {
  async function mountedPowerUser () {
    const store = makeStore()
    signInAsPowerUser(store)
    const result = track(mountGrowth({ store, service: servingService() }))
    await settle(result.wrapper)
    return result.wrapper
  }

  // Six points across 600px => 120px between months. Month 0 sits at x=60, month 5 at x=660.
  const pixelOfMonth = index => 60 + index * 120

  async function drag (wrapper, fromPixel, toPixel) {
    const canvas = wrapper.find('canvas').element
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: fromPixel, clientY: 200, button: 0 }))
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: toPixel, clientY: 200 }))
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: toPixel, clientY: 200 }))
    await settle(wrapper)
  }

  test('dragging across three months narrows the chart to those months and names the span', async () => {
    const wrapper = await mountedPowerUser()
    expect(chart().data.labels.length).toBe(6)

    await drag(wrapper, pixelOfMonth(2), pixelOfMonth(4))

    expect(chart().data.datasets[0].data).toEqual([600, 1000, 1500])
    expect(norm(wrapper.find('.chart-zoom-controls span').text())).toBe('mars 2025 - mai 2025')
  })

  test('a click that never became a drag leaves the whole history on screen', async () => {
    const wrapper = await mountedPowerUser()

    await drag(wrapper, pixelOfMonth(2), pixelOfMonth(2) + 9)

    expect(chart().data.datasets[0].data).toEqual([100, 300, 600, 1000, 1500, 2100])
    expect(norm(wrapper.find('.chart-zoom-controls span').text()))
      .toBe(translate('no', 'poweruserGrowth_dragToZoom'))
  })

  // The arm above passes on a six-month world for a reason that is NOT the 24px rule: six months
  // across 600px puts 120px between them, so a 9px slip cannot reach a second month and the index
  // check stops it first. The real page plots five years — about 10px a month — where a hand that
  // slips 20px while clicking HAS crossed two months, and the 24px rule is the only thing between
  // the operator and a chart that zooms every time they click it. So it is asserted on a world of
  // that density, from both sides of the threshold.
  describe('on a five-year chart, where a month is ten pixels wide', () => {
    const DENSE_MONTHS = 61

    function denseWorld () {
      let orders = 0
      return {
        from: '2020-01-01T00:00:00',
        to: '2025-01-31T00:00:00',
        points: Array.from({ length: DENSE_MONTHS }, (_, i) => {
          orders += 10
          const date = new Date(Date.UTC(2020, i, 1)).toISOString().slice(0, 10)
          return {
            date: `${date}T00:00:00`,
            orderCount: 10,
            revenueAmount: 1000,
            cumulativeOrderCount: orders,
            cumulativeRevenueAmount: 1000 * (i + 1)
          }
        })
      }
    }

    async function mountedDense () {
      const store = makeStore()
      signInAsPowerUser(store)
      const result = track(mountGrowth({ store, service: servingService(denseWorld()) }))
      await settle(result.wrapper)
      return result.wrapper
    }

    test('a hand that slips twenty pixels while clicking does not zoom the chart', async () => {
      const wrapper = await mountedDense()
      expect(chart().data.labels.length).toBe(DENSE_MONTHS)

      // 20px spans two whole months here, so nothing but the 24px rule can refuse this.
      await drag(wrapper, 300, 320)

      expect(chart().data.labels.length).toBe(DENSE_MONTHS)
      expect(norm(wrapper.find('.chart-zoom-controls span').text()))
        .toBe(translate('no', 'poweruserGrowth_dragToZoom'))
    })

    test('a deliberate forty-pixel drag on the same chart does zoom', async () => {
      const wrapper = await mountedDense()

      await drag(wrapper, 300, 340)

      // Both sides of the threshold, so the arm above is a rule and not a chart that never zooms.
      expect(chart().data.labels.length).toBeLessThan(DENSE_MONTHS)
      expect(wrapper.find('.chart-zoom-controls button').exists()).toBe(true)
    })
  })

  test('"show all" gives the whole history back after a zoom', async () => {
    const wrapper = await mountedPowerUser()
    await drag(wrapper, pixelOfMonth(2), pixelOfMonth(4))
    expect(chart().data.datasets[0].data).toEqual([600, 1000, 1500])

    wrapper.find('.chart-zoom-controls button').trigger('click')
    await settle(wrapper)

    expect(chart().data.datasets[0].data).toEqual([100, 300, 600, 1000, 1500, 2100])
    expect(wrapper.find('.chart-zoom-controls button').exists()).toBe(false)
  })

  test('zooming a second time narrows within the span already shown, not back at the start', async () => {
    // The bug this guards is an index read against the visible slice but applied to the full
    // history: a second zoom would silently jump the operator back to the beginning of time.
    const wrapper = await mountedPowerUser()
    await drag(wrapper, pixelOfMonth(2), pixelOfMonth(5))
    expect(chart().data.datasets[0].data).toEqual([600, 1000, 1500, 2100])

    // Now four points across the same 600px => 200px apart. Drag from the 2nd to the 4th.
    await drag(wrapper, 60 + 200, 60 + 600)

    expect(chart().data.datasets[0].data).toEqual([1000, 1500, 2100])
    expect(norm(wrapper.find('.chart-zoom-controls span').text())).toBe('apr. 2025 - juni 2025')
  })
})

// ================================================================================================
// MILESTONES — the markers on the curve and the legend that governs them
// ================================================================================================
describe('the milestone markers and the legend that turns them off', () => {
  async function mountedPowerUser () {
    const store = makeStore()
    signInAsPowerUser(store)
    const result = track(mountGrowth({ store, service: servingService() }))
    await settle(result.wrapper)
    return result.wrapper
  }

  const storeLegend = wrapper => wrapper.findAll('.chart-legend-button').at(0)
  const featureLegend = wrapper => wrapper.findAll('.chart-legend-button').at(1)

  // Hovering a marker is a mousemove at the marker's own coordinates; `getAnnotationHitArea`
  // measures from the canvas rect, which jsdom reports at the origin.
  async function hover (wrapper, hit) {
    wrapper.find('canvas').element
      .dispatchEvent(new MouseEvent('mousemove', { clientX: hit.x, clientY: hit.y }))
    await settle(wrapper)
  }

  const hitAreas = wrapper => wrapper.vm.annotationHitAreas

  test('three stores opened in one month are one marker that names all three', async () => {
    const wrapper = await mountedPowerUser()
    // January 2025 is point 0 of this world, and the page hard-codes three openings in it.
    const january = hitAreas(wrapper).find(a => a.key === 'store-2025-1')
    expect(january).toBeTruthy()

    await hover(wrapper, january)

    const popover = wrapper.find('.annotation-popover')
    expect(popover.exists()).toBe(true)
    expect(norm(popover.text())).toContain(translate('no', 'poweruserGrowth_newStoresCount', { count: 3 }))
    expect(norm(popover.text())).toContain('Chicken House')
    expect(norm(popover.text())).toContain('Arena Restaurant & Kafe')
    expect(norm(popover.text())).toContain('Alfonzo Pizzeria')
  })

  test('the popover reports that month\'s own orders next to the running total', async () => {
    const wrapper = await mountedPowerUser()
    const may = hitAreas(wrapper).find(a => a.key === 'store-2025-5')
    await hover(wrapper, may)

    // May is point 4: 500 orders in the month, 1500 cumulative. Read as two separate figures and
    // not as substrings of the popover's text — "1 500" contains "500", so a month figure that had
    // silently become the running total would satisfy a `toContain` pair without anyone noticing.
    const stats = wrapper.find('.annotation-month-stats')
    expect(stats.exists()).toBe(true)
    expect(stats.findAll('strong').wrappers.map(w => norm(w.text()))).toEqual(['500', '1 500'])
  })

  test('turning off new stores in the legend takes the store markers off the curve', async () => {
    const wrapper = await mountedPowerUser()
    expect(hitAreas(wrapper).some(a => a.key.startsWith('store-'))).toBe(true)
    expect(hitAreas(wrapper).some(a => a.key.startsWith('feature-'))).toBe(true)

    storeLegend(wrapper).trigger('click')
    await settle(wrapper)

    expect(hitAreas(wrapper).some(a => a.key.startsWith('store-'))).toBe(false)
    // and the feature markers are untouched — the legend turns off one kind, not the annotations
    expect(hitAreas(wrapper).some(a => a.key.startsWith('feature-'))).toBe(true)
    expect(storeLegend(wrapper).classes()).toContain('chart-legend-button--inactive')
    expect(storeLegend(wrapper).attributes('aria-pressed')).toBe('false')
  })

  test('turning a kind off closes a popover that was open for that kind, and gives the curve back', async () => {
    const wrapper = await mountedPowerUser()
    const january = hitAreas(wrapper).find(a => a.key === 'store-2025-1')
    await hover(wrapper, january)
    expect(wrapper.find('.annotation-popover').exists()).toBe(true)
    // Hovering a marker suppresses the curve's own tooltip, so the two never overlap.
    expect(wrapper.vm.chart.options.plugins.tooltip.enabled).toBe(false)

    storeLegend(wrapper).trigger('click')
    await settle(wrapper)

    // A popover left behind would be describing a marker that is no longer on the chart.
    expect(wrapper.find('.annotation-popover').exists()).toBe(false)
    // And the operator gets the ordinary curve tooltip back. Without this the page would go on
    // suppressing it for a marker that is no longer there, and hovering the curve would do nothing
    // for the rest of the visit — the popover vanishing is not on its own proof that it was let go.
    expect(wrapper.vm.chart.options.plugins.tooltip.enabled).toBe(true)
  })

  test('turning the other kind off leaves an open store popover alone', async () => {
    const wrapper = await mountedPowerUser()
    const january = hitAreas(wrapper).find(a => a.key === 'store-2025-1')
    await hover(wrapper, january)
    expect(wrapper.find('.annotation-popover').exists()).toBe(true)

    featureLegend(wrapper).trigger('click')
    await settle(wrapper)

    expect(wrapper.find('.annotation-popover').exists()).toBe(true)
  })

  test('clicking a marker pins its popover, and clicking it again lets go', async () => {
    const wrapper = await mountedPowerUser()
    const january = hitAreas(wrapper).find(a => a.key === 'store-2025-1')
    const canvas = wrapper.find('canvas').element

    canvas.dispatchEvent(new MouseEvent('click', { clientX: january.x, clientY: january.y }))
    await settle(wrapper)
    expect(wrapper.vm.pinnedAnnotationKey).toBe('store-2025-1')

    // Pinned means it survives the pointer moving off the marker entirely.
    await hover(wrapper, { x: january.x + 200, y: january.y + 120 })
    expect(wrapper.find('.annotation-popover').exists()).toBe(true)
    expect(norm(wrapper.find('.annotation-popover').text())).toContain('Chicken House')

    canvas.dispatchEvent(new MouseEvent('click', { clientX: january.x, clientY: january.y }))
    await settle(wrapper)
    expect(wrapper.vm.pinnedAnnotationKey).toBe(null)
  })

  test('switching between orders and kroner drops a pinned popover rather than leaving it stale', async () => {
    const wrapper = await mountedPowerUser()
    const canvas = wrapper.find('canvas').element
    const january = hitAreas(wrapper).find(a => a.key === 'store-2025-1')
    canvas.dispatchEvent(new MouseEvent('click', { clientX: january.x, clientY: january.y }))
    await settle(wrapper)
    expect(wrapper.find('.annotation-popover').exists()).toBe(true)

    wrapper.findAll('.metric-toggle button').at(1).trigger('click')
    await settle(wrapper)

    // The popover quotes the metric's own figures, so one left open across the switch would be
    // quoting orders under a kroner curve.
    expect(wrapper.find('.annotation-popover').exists()).toBe(false)
  })

  test('a month with three openings lists all three and counts nothing extra', async () => {
    const wrapper = await mountedPowerUser()
    const january = hitAreas(wrapper).find(a => a.key === 'store-2025-1')
    await hover(wrapper, january)

    const lines = wrapper.findAll('.annotation-popover li').wrappers.map(w => norm(w.text()))
    expect(lines).toEqual(['Chicken House', 'Arena Restaurant & Kafe', 'Alfonzo Pizzeria'])
  })

  test('a month with more openings than fit lists the first seven and counts the rest', async () => {
    // The shipped opening list has at most three stores in any one month, so no payload can reach
    // this rule TODAY — the events are hard-coded in the page. It is nonetheless the rule that
    // keeps the popover inside the panel on the day a month has eight, so it is driven through the
    // page's own `activeAnnotationLines` rather than restated here: the grouping method builds the
    // item, and the page's computed decides what is listed.
    const wrapper = await mountedPowerUser()
    const nine = Array.from({ length: 9 }, (_, i) => ({ date: '2025-01-15T10:00:00', name: `Butikk ${i + 1}` }))
    const [group] = wrapper.vm.buildGroupedAnnotationItems(nine, 'store', '#1bb776')
    expect(group.lines).toHaveLength(9)
    expect(group.title).toBe(translate('no', 'poweruserGrowth_newStoresCount', { count: 9 }))

    const lines = wrapper.vm.$options.computed.activeAnnotationLines.call({
      activeAnnotationItem: group,
      $i: mixinMocks.$i
    })

    expect(lines).toEqual([
      'Butikk 1', 'Butikk 2', 'Butikk 3', 'Butikk 4', 'Butikk 5', 'Butikk 6', 'Butikk 7',
      '+ 2 til'
    ])
  })
})
