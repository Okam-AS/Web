import Vue from 'vue'
import { mount } from '@vue/test-utils'
import { translate } from '~/utils/i18n'
import { setPlatform } from '~/core/platform'
import { StatisticsService } from '~/core/services/statistics-service'
import StatisticsPage from '~/pages/admin/statistics.vue'
import SettlementsPage from '~/pages/admin/settlements.vue'
import WoltDriveInvoicePage from '~/pages/admin/wolt-drive-invoice.vue'

// ---- WHY THIS FILE EXISTS ---------------------------------------------------------------------
//
// A sibling lane taught `StatisticsService` to say WHY a read failed — the backend's own localised
// reason, the HTTP status, and whether the message came from the server. Three pages then threw
// that away, each in its own way:
//
//   statistics.vue           `Promise.all(...).catch(e => console.error(...))`. The operator was
//                            shown NOTHING. `statistics` stayed null, the loading skeleton came
//                            down, and the page rendered its filter chrome over blank space.
//
//   wolt-drive-invoice.vue   `console.error` and then `this.report = null`, which routes straight
//                            into `woltDriveInvoice_noOrdersTitle` — so a read that never came back
//                            was rendered as the POSITIVE CLAIM that the venue had no deliveries.
//
//   settlements.vue          `console.error` plus a fixed `settlements_loadError` toast, identical
//                            for an expired session, a refusal, a crash and a dead network — and
//                            underneath it the same "no Dintero orders in this period" empty state.
//
// A silent failure is worse than a wrong message: a wrong reason gets reported and fixed, a blank
// panel gets read as "no trade" and the operator makes a decision on it. Two of these three did not
// merely stay silent — they asserted a business fact on the strength of a request that never
// arrived.
//
// The rule for turning an error into a sentence is `utils/request-failure.js`, shared with
// `pages/admin/poweruser-growth.vue` rather than copied: prefer the server's reason, else name the
// cause per status, and report an error that did not come from the request layer as UNKNOWN rather
// than as offline.
//
// Everything below drives the REAL `StatisticsService` over a transport that fails the way axios
// fails, so these are assertions about the shipped read path.

const AdminPageStub = { name: 'AdminPageStub', template: '<div><slot /></div>' }

const mixinMocks = {
  $i (key, params) { return translate('no', key, params) },
  priceLabel: v => String(v),
  deliveryTypeLabel: v => String(v),
  orderStatusLabel: v => String(v)
}

const TESTKROA = { id: 42, name: 'Testkroa' }

function makeStore () {
  return {
    state: Vue.observable({
      currentUser: { id: 1, isPowerUser: true, adminIn: [TESTKROA], token: 't' },
      selectedAdminStore: 42,
      adminLocale: 'no'
    }),
    getters: Vue.observable({ userIsLoggedIn: true })
  }
}

// The transport. `respondWith` is swapped per arm; it is a function so an arm can fail one read and
// answer another.
let respondWith
class FakeHttpModule { httpClient (request) { return respondWith(request) } }
class FakePersistenceModule {}

const axiosRejects = (status, body) => {
  const error = new Error('Request failed with status code ' + status)
  error.isAxiosError = true
  error.response = { status, data: body }
  return Promise.reject(error)
}
const axiosOffline = () => Promise.reject(Object.assign(new Error('Network Error'), { isAxiosError: true }))
const ok = data => Promise.resolve({ status: 200, data })

// A body the statistics page can render, so a successful arm reaches its figures.
const GOOD_STATS = { charts: [{ headingKey: 'Antall bestillinger totalt', headingValue: 3 }, { headingKey: 'Sum', headingValue: 0 }] }

const realService = () => new StatisticsService({ bearerToken: '', clientPlatformName: 'Web', cultureCode: 'no' })

async function settle (wrapper) {
  for (let i = 0; i < 14; i++) { await Promise.resolve(); await wrapper.vm.$nextTick() }
}

const norm = t => t.replace(/\s+/g, ' ').trim()

let alerts = []
let consoleErrors = []
let openWrappers = []

beforeEach(() => {
  setPlatform(FakeHttpModule, FakePersistenceModule)
  alerts = []
  consoleErrors = []
  openWrappers = []
  // `settlements.vue` notifies through `window.alert`; captured rather than silenced so an arm can
  // read what it said.
  jest.spyOn(window, 'alert').mockImplementation(m => alerts.push(String(m)))
  jest.spyOn(console, 'error').mockImplementation((...a) => consoleErrors.push(a.map(String).join(' ')))
})

afterEach(() => {
  openWrappers.forEach(w => w.destroy())
  jest.restoreAllMocks()
})

function mountPage (Page, extraStubs = {}) {
  const wrapper = mount(Page, {
    mocks: {
      ...mixinMocks,
      $store: makeStore(),
      $route: { query: {}, path: '/admin', fullPath: '/admin' },
      $router: { push: jest.fn(), replace: jest.fn() },
      _statisticsService: realService()
    },
    stubs: {
      AdminPage: AdminPageStub,
      MultiSelectDropdown: true,
      StatisticsChart: true,
      LoadingSkeleton: true,
      PeakPerformanceHeatmap: true,
      AIQueryBox: true,
      Loading: true,
      ...extraStubs
    }
  })
  openWrappers.push(wrapper)
  return wrapper
}

// ================================================================================================
// statistics.vue — the page that said nothing at all
// ================================================================================================
describe('a failed statistics read reaches the operator', () => {
  async function screenAfter (transport) {
    respondWith = transport
    const wrapper = mountPage(StatisticsPage)
    await settle(wrapper)
    return { wrapper, text: norm(wrapper.text()) }
  }

  test('the reason the backend gave is on the screen, not only in the console', async () => {
    const { wrapper, text } = await screenAfter(() => axiosRejects(500, { message: 'Noe gikk galt i rapportmotoren' }))

    expect(wrapper.find('.statistics-error').exists()).toBe(true)
    expect(text).toContain('Noe gikk galt i rapportmotoren')
    // The console line is kept — it is useful to a developer — but it is no longer the ONLY place
    // the failure exists, which is the whole defect.
    expect(consoleErrors.join(' ')).toContain('Failed to load statistics')
  })

  test('figures already on screen are taken down when a refresh fails', async () => {
    // The dangerous shape. On a FIRST load there is nothing to leave standing, so a failure there
    // proves nothing about this. After a good load the page holds real figures, and a refresh that
    // fails must not leave them under an error banner: stale turnover the operator reads as current
    // is exactly the decision this lane exists to prevent.
    respondWith = request => ok(String(request.url).includes('/heatmap') ? { data: [] } : GOOD_STATS)
    const wrapper = mountPage(StatisticsPage)
    await settle(wrapper)
    expect(wrapper.find('.statistics-content').exists()).toBe(true)

    respondWith = () => axiosRejects(500, { message: 'Oppdateringen feilet' })
    wrapper.vm.loadStatistics()
    await settle(wrapper)

    expect(norm(wrapper.text())).toContain('Oppdateringen feilet')
    expect(wrapper.find('.statistics-content').exists()).toBe(false)
  })

  // The exit criterion names the reads individually: it is not enough that SOME failure surfaces,
  // each read the page makes has to reach the operator when it is the one that broke.
  test.each([
    ['the general slice', m => (m.deliveryTypes || []).length > 1 || !m.deliveryTypes],
    ['the self-pickup slice', m => (m.deliveryTypes || [])[0] === 'SelfPickup'],
    ['the home-delivery slice', m => (m.deliveryTypes || []).includes('WoltDelivery')],
    ['the table slice', m => (m.deliveryTypes || [])[0] === 'TableDelivery']
  ])('a failure of %s alone still reaches the operator', async (_name, matches) => {
    const { text } = await screenAfter((request) => {
      // `BuildRequest` parses the payload back out on web, so `request.data` is the model object
      // the page sent, not a JSON string.
      const model = request.data || {}
      const isHeatmap = String(request.url).includes('/heatmap')
      if (!isHeatmap && matches(model)) { return axiosRejects(503, { message: 'Denne delen svarte ikke' }) }
      return ok(isHeatmap ? { data: [] } : GOOD_STATS)
    })

    expect(text).toContain('Denne delen svarte ikke')
  })

  test('a failure of the heatmap read alone still reaches the operator', async () => {
    const { text } = await screenAfter((request) => {
      if (String(request.url).includes('/heatmap')) { return axiosRejects(503, { message: 'Varmekartet svarte ikke' }) }
      return ok(GOOD_STATS)
    })

    expect(text).toContain('Varmekartet svarte ikke')
  })

  test.each([
    ['an expired session', () => axiosRejects(401, null), 'requestFailure_sessionExpired'],
    ['a refusal', () => axiosRejects(403, null), 'requestFailure_notAllowed'],
    ['being offline', axiosOffline, 'requestFailure_offline']
  ])('%s with no reason in the body is still named', async (_name, transport, key) => {
    const { text } = await screenAfter(transport)
    expect(text).toContain(translate('no', key))
  })

  test('a server error with no body names the code it answered with', async () => {
    const { text } = await screenAfter(() => axiosRejects(500, null))
    expect(text).toContain(translate('no', 'requestFailure_serverError', { status: 500 }))
  })

  test('the four failures do not read alike', async () => {
    const screens = []
    for (const transport of [() => axiosRejects(401, null), () => axiosRejects(403, null),
      () => axiosRejects(500, null), axiosOffline]) {
      const { wrapper, text } = await screenAfter(transport)
      screens.push(norm(wrapper.find('.statistics-error').text()))
      expect(text).toBeTruthy()
    }
    expect(new Set(screens).size).toBe(4)
  })

  test('a read that succeeds shows no failure panel at all', async () => {
    const { wrapper } = await screenAfter((request) =>
      ok(String(request.url).includes('/heatmap') ? { data: [] } : GOOD_STATS))

    expect(wrapper.find('.statistics-error').exists()).toBe(false)
    expect(wrapper.find('.statistics-content').exists()).toBe(true)
  })

  test('trying again after a failure clears it and shows the figures', async () => {
    // The panel offers a retry, so the operator is not required to reload the browser to recover.
    const { wrapper } = await screenAfter(() => axiosRejects(500, { message: 'midlertidig' }))
    expect(wrapper.find('.statistics-error').exists()).toBe(true)

    respondWith = (request) => ok(String(request.url).includes('/heatmap') ? { data: [] } : GOOD_STATS)
    wrapper.find('.statistics-error button').trigger('click')
    await settle(wrapper)

    expect(wrapper.find('.statistics-error').exists()).toBe(false)
    expect(wrapper.find('.statistics-content').exists()).toBe(true)
  })
})

// ================================================================================================
// wolt-drive-invoice.vue — the page that turned a failed read into "no deliveries"
// ================================================================================================
describe('a failed Wolt Drive invoice read is not reported as an empty period', () => {
  async function screenAfter (transport) {
    respondWith = transport
    const wrapper = mountPage(WoltDriveInvoicePage)
    await settle(wrapper)
    return { wrapper, text: norm(wrapper.text()) }
  }

  test('the reason is on the screen and the "no orders" claim is gone', async () => {
    const { wrapper, text } = await screenAfter(() => axiosRejects(500, { message: 'Rapporten kunne ikke bygges' }))

    expect(text).toContain('Rapporten kunne ikke bygges')
    // The one that matters: the page used to state, on a request that never came back, that the
    // venue had no Wolt Drive deliveries in the period.
    expect(text).not.toContain(translate('no', 'woltDriveInvoice_noOrdersTitle'))
    expect(wrapper.find('.load-error').exists()).toBe(true)
  })

  test('a genuinely empty Wolt Drive period still says the period was empty', async () => {
    // So the arm above pins "do not lie about a failure", not "never show the empty state".
    const { wrapper, text } = await screenAfter(() => ok({ totalOrderCount: 0, summaryLines: [], orderRows: [] }))

    expect(text).toContain(translate('no', 'woltDriveInvoice_noOrdersTitle'))
    expect(wrapper.find('.load-error').exists()).toBe(false)
  })

  test('being offline is named as such rather than as an empty period', async () => {
    const { text } = await screenAfter(axiosOffline)
    expect(text).toContain(translate('no', 'requestFailure_offline'))
    expect(text).not.toContain(translate('no', 'woltDriveInvoice_noOrdersTitle'))
  })
})

// ================================================================================================
// settlements.vue — the page whose message was the same for every cause
// ================================================================================================
describe('a failed settlements read names its cause', () => {
  async function screenAfter (transport) {
    respondWith = transport
    const wrapper = mountPage(SettlementsPage)
    await settle(wrapper)
    return { wrapper, text: norm(wrapper.text()) }
  }

  test('the reason replaces the fixed "could not load" line, and stays on the page', async () => {
    const { wrapper, text } = await screenAfter(() => axiosRejects(500, { message: 'Oppgjøret kunne ikke hentes' }))

    expect(text).toContain('Oppgjøret kunne ikke hentes')
    expect(wrapper.find('.load-error').exists()).toBe(true)
    // The notification carried a fixed string for every cause; it now carries the same reason the
    // panel does. A toast alone would not be enough — it disappears, and the panel underneath it
    // was claiming the period had no orders.
    expect(alerts.join(' ')).toContain('Oppgjøret kunne ikke hentes')
    expect(alerts.join(' ')).not.toContain(translate('no', 'settlements_loadError'))
  })

  test('the "no Dintero orders" claim is not made about a read that failed', async () => {
    const { text } = await screenAfter(() => axiosRejects(403, null))

    expect(text).toContain(translate('no', 'requestFailure_notAllowed'))
    expect(text).not.toContain(translate('no', 'settlements_noOrdersTitle'))
  })

  test('a genuinely empty settlements period still says the period was empty', async () => {
    const { wrapper, text } = await screenAfter(() => ok({ totalDinteroOrders: 0, settlements: [] }))

    expect(text).toContain(translate('no', 'settlements_noOrdersTitle'))
    expect(wrapper.find('.load-error').exists()).toBe(false)
  })
})

// ================================================================================================
// The shared rule, at its own level
// ================================================================================================
describe('an error that did not come from the request layer is unknown, not offline', () => {
  // Driven through the page, because the point is what the OPERATOR reads. The throw here is a
  // plain TypeError — the shape a bug in this code produces — and it carries no `hasBackendMessage`,
  // because it never went near the request layer.
  //
  // (An earlier version of this arm tried to provoke the throw by answering 200 with a null body.
  // That does not throw: `TryParseResponse` returns the null, the page assigns it and renders
  // nothing. The arm passed while proving nothing, which is why the error is now explicit.)
  test('a page-side failure is not reported to the operator as a network problem', async () => {
    const brokenService = {
      Get: () => Promise.reject(new TypeError("Cannot read property 'map' of undefined")),
      GetHeatmapData: () => Promise.resolve({ data: [] })
    }
    const wrapper = mount(StatisticsPage, {
      mocks: {
        ...mixinMocks,
        $store: makeStore(),
        $route: { query: {}, path: '/admin', fullPath: '/admin' },
        $router: { push: jest.fn(), replace: jest.fn() },
        _statisticsService: brokenService
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
    openWrappers.push(wrapper)
    await settle(wrapper)

    const shown = norm(wrapper.find('.statistics-error').text())
    // Its own message, so the operator has something real to report.
    expect(shown).toContain("Cannot read property 'map' of undefined")
    // And NOT a transport diagnosis. Guessing "offline" would send them to check a connection that
    // is fine — the same lie as a status code, pointing the other way.
    expect(shown).not.toContain(translate('no', 'requestFailure_offline'))
  })

  test('an error with nothing on it at all is reported as unknown', () => {
    const { describeRequestFailure } = require('~/utils/request-failure')
    expect(describeRequestFailure(null, (k, p) => translate('no', k, p)))
      .toBe(translate('no', 'requestFailure_unknown'))
  })

  test('an error the request layer DID build is still named by its status', () => {
    // The other side of the same rule, so the arm above is not satisfied by a helper that simply
    // never uses its status branches.
    const { describeRequestFailure } = require('~/utils/request-failure')
    const built = Object.assign(new Error('Failed to get statistics'), { statusCode: 401, hasBackendMessage: false })
    expect(describeRequestFailure(built, (k, p) => translate('no', k, p)))
      .toBe(translate('no', 'requestFailure_sessionExpired'))
  })
})
