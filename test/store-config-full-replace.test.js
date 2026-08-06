import path from 'path'
import { shallowMount } from '@vue/test-utils'
import * as extract from './support/full-replace-extract'
import { setPlatform } from '~/core/platform'
import {
  StoreService,
  DINTERO_CONFIG_KIND,
  SURFBOARD_CONFIG_KIND
} from '~/core/services/store-service'
import {
  fullReplaceContractFor,
  registeredFullReplaceKinds,
  resetFullReplaceLedger,
  assertFullReplaceIsSafe,
  noteRecordLoaded
} from '~/core/services/full-replace-guard'

// ---- WHY THIS FILE EXISTS ---------------------------------------------------------------------
//
// Two admin settings pages posted a PARTIAL FORM to a FULL-REPLACE endpoint, and Save — the most
// ordinary action a person takes on a settings page — destroyed live configuration:
//
//   pages/admin/dintero.vue    never read the store's configuration on arrival (the watcher on
//                              `selectedStore` was not `immediate`, and the sidebar already carried
//                              the selected id, so nothing changed and nothing fired). Save posted
//                              the blank form over the live Dintero account id, client id, CLIENT
//                              SECRET, split seller, commission and Wolt fees.
//
//   pages/admin/surfboard.vue  omitted `tipsEnabled` from every save, so the backend bound it to
//                              its C# default and every save switched the terminal tip prompt off.
//
// Both endpoints assign EVERY field of their write model unconditionally (OkamAPI 8e2b57de,
// Services/StoreService.cs:1266 and :1390), so an omitted key is not "unchanged" — it is set to the
// backend default. That is what makes a short payload destructive rather than merely incomplete.
//
// ---- WHAT IS PINNED, AND WHY IT CANNOT PASS VACUOUSLY ------------------------------------------
//
// Nineteen non-failing assertion shapes have shipped in this estate, so each group below is written
// to red on a NAMED mutation, and the mutations were run — see the lane's red receipt:
//
//   (A) the guard's rules              — red by deleting any one rule from assertFullReplaceIsSafe
//   (B) the service seam enforces them — red by removing the assert/note call from StoreService
//   (C) the payload each page BUILDS   — red by deleting a field from either page's payload literal
//                                        (this group reds on the PRE-FIX pages: surfboard was short
//                                        `tipsEnabled`, dintero was short `kraviaMessage`)
//   (D) the pages' arrival + save flow — red by making dintero's load conditional on a change event
//                                        again, or by removing either page's configLoaded gate
//
// (C) derives its expectation from the contract and its subject from the page SOURCE, so a new
// settings page is covered the day it is written rather than the day someone remembers to add it.
// Group (E) asserts the walk found what it claims to have found, so a regex that stops matching
// reds instead of examining nothing and reporting success.

const ROOT = path.resolve(__dirname, '..')

// ---- a recording HTTP module, so the REAL RequestService/StoreService/guard chain runs ----------
//
// Not a mocked StoreService: mocking the service would mock away the seam under test. Only the
// bottom of the stack — the platform HTTP adapter — is replaced, exactly as the web app replaces it
// at startup via setPlatform().
const sent = []
let nextResponse = { status: 200, data: {} }

class RecordingHttpModule {
  constructor () {
    this.httpClient = (request) => {
      sent.push({ url: request.url, method: request.method, data: request.data })
      if (nextResponse instanceof Error) { return Promise.reject(nextResponse) }
      return Promise.resolve(nextResponse)
    }
  }
}
class NoopPersistenceModule {
  load () { return null }
  store () {}
  remove () {}
}

setPlatform(RecordingHttpModule, NoopPersistenceModule)

function service () {
  return new StoreService({ bearerToken: 'test-token', clientPlatformName: 'jest', cultureCode: 'no' })
}

beforeEach(() => {
  sent.length = 0
  nextResponse = { status: 200, data: {} }
  resetFullReplaceLedger()
})

// A complete payload for each kind, built FROM the contract so it can never drift out of step with
// it. Values are placeholders and are never asserted on — the rules under test are about which
// KEYS travel, and both records carry a credential (C7: names only, never values).
function completePayload (kind) {
  const payload = {}
  for (const field of fullReplaceContractFor(kind).writableFields) {
    payload[field] = field.endsWith('Enabled') ? true : (/Percent|Percentage|Amount/.test(field) ? 1 : 'x')
  }
  return payload
}

// ---- (A) the guard's rules ---------------------------------------------------------------------

describe('A: a full replacement is refused unless the record was read and the payload is whole', () => {
  test('A1: an unregistered endpoint cannot be written through at all', () => {
    expect(registeredFullReplaceKinds()).not.toContain('store.some-future-configuration')
    let thrown = null
    try {
      assertFullReplaceIsSafe('store.some-future-configuration', 7, { anything: true })
    } catch (error) { thrown = error }
    expect(thrown && thrown.reason).toBe('unregistered')
  })

  test('A2: a whole payload is still refused when the record was never read', () => {
    let thrown = null
    try {
      assertFullReplaceIsSafe(DINTERO_CONFIG_KIND, 7, completePayload(DINTERO_CONFIG_KIND))
    } catch (error) { thrown = error }
    expect(thrown && thrown.reason).toBe('not-loaded')
  })

  test('A3: a read of a DIFFERENT store does not license this one', () => {
    noteRecordLoaded(DINTERO_CONFIG_KIND, 8)
    let thrown = null
    try {
      assertFullReplaceIsSafe(DINTERO_CONFIG_KIND, 7, completePayload(DINTERO_CONFIG_KIND))
    } catch (error) { thrown = error }
    expect(thrown && thrown.reason).toBe('not-loaded')
  })

  test('A4: a read record plus a whole payload is allowed', () => {
    noteRecordLoaded(SURFBOARD_CONFIG_KIND, 7)
    expect(() => assertFullReplaceIsSafe(SURFBOARD_CONFIG_KIND, 7, completePayload(SURFBOARD_CONFIG_KIND))).not.toThrow()
  })

  // THE SURFBOARD DEFECT, as a rule. Every writable field is tried in turn, so this cannot rot into
  // a check about `tipsEnabled` alone while the rest of the record goes unguarded.
  test('A5: dropping ANY single writable field is refused, and the field is named', () => {
    for (const kind of [DINTERO_CONFIG_KIND, SURFBOARD_CONFIG_KIND]) {
      noteRecordLoaded(kind, 7)
      for (const field of fullReplaceContractFor(kind).writableFields) {
        const payload = completePayload(kind)
        delete payload[field]
        let thrown = null
        try { assertFullReplaceIsSafe(kind, 7, payload) } catch (error) { thrown = error }
        expect(thrown && thrown.reason).toBe('incomplete')
        expect(thrown.missingFields).toEqual([field])
      }
    }
  })

  // A key whose value is `undefined` is DROPPED by JSON.stringify, so it reaches the server exactly
  // as an omitted key does. A guard that accepted key presence alone would pass a payload that is
  // still destructive — and surfboard.vue produced precisely that shape, because `emptyConfig()`
  // did not carry `tipsEnabled` at all.
  test('A6: a key present with an undefined value counts as missing', () => {
    noteRecordLoaded(SURFBOARD_CONFIG_KIND, 7)
    const payload = completePayload(SURFBOARD_CONFIG_KIND)
    payload.tipsEnabled = undefined
    expect(JSON.parse(JSON.stringify(payload))).not.toHaveProperty('tipsEnabled')
    let thrown = null
    try { assertFullReplaceIsSafe(SURFBOARD_CONFIG_KIND, 7, payload) } catch (error) { thrown = error }
    expect(thrown && thrown.reason).toBe('incomplete')
    expect(thrown.missingFields).toEqual(['tipsEnabled'])
  })

  test('A7: a misspelled field reds twice — once missing, once unknown', () => {
    noteRecordLoaded(SURFBOARD_CONFIG_KIND, 7)
    const payload = completePayload(SURFBOARD_CONFIG_KIND)
    delete payload.tipsEnabled
    payload.tipsEnable = true
    let thrown = null
    try { assertFullReplaceIsSafe(SURFBOARD_CONFIG_KIND, 7, payload) } catch (error) { thrown = error }
    expect(thrown && thrown.missingFields).toEqual(['tipsEnabled'])
    expect(thrown.unknownFields).toEqual(['tipsEnable'])
  })

  // C7. Both records carry a credential; a refusal must not be the thing that publishes it.
  test('A8: a refusal names field names only, never a value', () => {
    noteRecordLoaded(DINTERO_CONFIG_KIND, 7)
    const payload = completePayload(DINTERO_CONFIG_KIND)
    payload.clientSecret = 'super-secret-value-nobody-should-see'
    payload.kraviaMessage = undefined
    let thrown = null
    try { assertFullReplaceIsSafe(DINTERO_CONFIG_KIND, 7, payload) } catch (error) { thrown = error }
    expect(thrown).not.toBeNull()
    const surface = thrown.message + JSON.stringify({
      missingFields: thrown.missingFields,
      unknownFields: thrown.unknownFields
    })
    expect(surface).not.toContain('super-secret-value-nobody-should-see')
    expect(thrown.missingFields).toEqual(['kraviaMessage'])
  })
})

// ---- (B) the seam every caller must pass through -----------------------------------------------

describe('B: StoreService is where the rules are enforced, so no caller can skip them', () => {
  test('B1: UpdateDinteroConfig makes no request when the config was never read', async () => {
    await expect(service().UpdateDinteroConfig(7, completePayload(DINTERO_CONFIG_KIND)))
      .rejects.toMatchObject({ isFullReplaceGuardError: true, reason: 'not-loaded' })
    expect(sent).toEqual([])
  })

  test('B2: UpdateSurfboardConfig makes no request when tipsEnabled is dropped', async () => {
    nextResponse = { status: 200, data: { merchantId: 'm-1' } }
    await service().GetSurfboardConfig(7)
    sent.length = 0
    const payload = completePayload(SURFBOARD_CONFIG_KIND)
    delete payload.tipsEnabled
    await expect(service().UpdateSurfboardConfig(7, payload))
      .rejects.toMatchObject({ isFullReplaceGuardError: true, reason: 'incomplete' })
    expect(sent).toEqual([])
  })

  test('B3: a read then a whole payload does reach the wire', async () => {
    nextResponse = { status: 200, data: { merchantId: 'm-1' } }
    await service().GetSurfboardConfig(7)
    sent.length = 0
    await expect(service().UpdateSurfboardConfig(7, completePayload(SURFBOARD_CONFIG_KIND))).resolves.toBe(true)
    expect(sent).toHaveLength(1)
    expect(sent[0].url).toContain('/stores/7/surfboard-configuration')
    expect(Object.keys(sent[0].data).sort())
      .toEqual(fullReplaceContractFor(SURFBOARD_CONFIG_KIND).writableFields.slice().sort())
  })

  // The read that FAILED is the one that fills a form with blank defaults. It must not license the
  // save that follows — this is the surfboard page's `.catch(() => ({}))` as a rule.
  test('B4: a read that failed does not license the write, and does not un-license an earlier one', async () => {
    nextResponse = { status: 200, data: { merchantId: 'm-1' } }
    await service().GetSurfboardConfig(7)

    nextResponse = { status: 500, data: null }
    await expect(service().GetSurfboardConfig(9)).rejects.toThrow()

    nextResponse = { status: 200, data: true }
    sent.length = 0
    await expect(service().UpdateSurfboardConfig(9, completePayload(SURFBOARD_CONFIG_KIND)))
      .rejects.toMatchObject({ reason: 'not-loaded' })
    expect(sent).toEqual([])

    await expect(service().UpdateSurfboardConfig(7, completePayload(SURFBOARD_CONFIG_KIND))).resolves.toBe(true)
  })
})

// ---- (C) what each page actually BUILDS --------------------------------------------------------
//
// Derived from the page source, so this covers a settings page written tomorrow. Group (E) proves
// the extraction reached both pages; without that, a broken regex would examine nothing and pass.
//
// The extraction lives in test/support/full-replace-extract.js because the lane's red receipt runs
// the SAME functions against the pre-fix sources. A receipt with its own copy would only show that
// some extractor reds, not that THIS pin does.

const payloadKeysFor = (file, method) => extract.payloadKeysForFile(path.join(ROOT, file), method)
const signatureKeysFor = method =>
  extract.signatureKeysForFile(path.join(ROOT, 'core', 'services', 'store-service.ts'), method)
const objectLiteralKeys = extract.objectLiteralKeys

const PAGES = [
  { file: 'pages/admin/dintero.vue', method: 'UpdateDinteroConfig', kind: DINTERO_CONFIG_KIND },
  { file: 'pages/admin/surfboard.vue', method: 'UpdateSurfboardConfig', kind: SURFBOARD_CONFIG_KIND }
]

describe('C: every page that replaces a record whole builds the whole record', () => {
  for (const page of PAGES) {
    // THE FINDING, as a static identity. Reds on the pre-fix tree: surfboard.vue was short
    // `tipsEnabled`, dintero.vue was short `kraviaMessage`.
    test('C: ' + page.file + ' sends exactly the fields ' + page.method + ' overwrites', () => {
      const extracted = payloadKeysFor(page.file, page.method)
      expect(extracted.found).toBe(true)
      expect(extracted.keys).not.toBeNull()
      expect(extracted.keys.slice().sort())
        .toEqual(fullReplaceContractFor(page.kind).writableFields.slice().sort())
    })

    // The TypeScript signature is the third place the same field list is written. Keeping all three
    // equal is what stops a field being added to two of them and quietly dropped by the third —
    // `partialPaymentsEnabled` was in the page and in the backend model but NOT in the signature,
    // and `tipsEnabled` was in the signature but not in the page.
    test('C: ' + page.method + '\'s TypeScript signature matches its contract', () => {
      const keys = signatureKeysFor(page.method)
      expect(keys).not.toBeNull()
      expect(keys.slice().sort())
        .toEqual(fullReplaceContractFor(page.kind).writableFields.slice().sort())
    })
  }
})

// ---- (D) the pages, mounted -------------------------------------------------------------------

const calls = []
const answers = {}

function stubStoreService () {
  const record = (name, args, fallback) => {
    calls.push({ name, args })
    const override = answers[name]
    if (typeof override === 'function') { return override.apply(null, args) }
    return Promise.resolve(fallback)
  }
  return {
    Get: id => record('Get', [id], { id, dinteroEnabled: true, surfboardEnabled: true }),
    GetAll: () => record('GetAll', [], []),
    GetDinteroConfig: id => record('GetDinteroConfig', [id], {}),
    UpdateDinteroConfig: (id, payload) => record('UpdateDinteroConfig', [id, payload], true),
    GetSurfboardConfig: id => record('GetSurfboardConfig', [id], {}),
    UpdateSurfboardConfig: (id, payload) => record('UpdateSurfboardConfig', [id, payload], true)
  }
}

function mountPage (component, { selectedAdminStore = 0 } = {}) {
  return shallowMount(component, {
    mocks: {
      $i: key => key,
      $router: { push: () => {} },
      $store: {
        state: { selectedAdminStore, currentUser: { isPowerUser: true, name: 'n', title: 't' } },
        getters: { userIsLoggedIn: true }
      },
      _storeService: stubStoreService(),
      _dinteroService: { getSellers: () => Promise.resolve({ payoutDestinations: [] }) },
      _surfboardService: {
        getMerchants: () => Promise.resolve([]),
        getApplications: () => Promise.resolve([]),
        getStoreTerminals: () => Promise.resolve([])
      },
      _cashPointService: { GetForStore: () => Promise.resolve([]) }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' }, Loading: true, Modal: true, VatAutocompleteInput: true, VueQrcode: true }
  })
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

describe('D: the pages read before they let anyone write', () => {
  beforeEach(() => {
    calls.length = 0
    for (const key of Object.keys(answers)) { delete answers[key] }
  })

  // THE DINTERO DEFECT. The sidebar already carries the selected store, so nothing CHANGES on
  // arrival; the page must read anyway. Reds on the pre-fix page, which read nothing at all.
  test('D1: dintero.vue reads the selected store\'s configuration on arrival', async () => {
    const DinteroPage = require('~/pages/admin/dintero.vue').default
    const wrapper = mountPage(DinteroPage, { selectedAdminStore: 42 })
    await flush()
    expect(calls.filter(c => c.name === 'GetDinteroConfig').map(c => c.args)).toEqual([[42]])
    wrapper.destroy()
  })

  test('D2: dintero.vue posts nothing when the read failed', async () => {
    answers.GetDinteroConfig = () => Promise.reject(new Error('403'))
    const DinteroPage = require('~/pages/admin/dintero.vue').default
    const wrapper = mountPage(DinteroPage, { selectedAdminStore: 42 })
    await flush()
    wrapper.vm.updateDinteroConfig()
    await flush()
    expect(calls.filter(c => c.name === 'UpdateDinteroConfig')).toEqual([])
    expect(wrapper.vm.configLoadFailed).toBe(true)
    wrapper.destroy()
  })

  test('D3: dintero.vue posts what it read, including the field it has no input for', async () => {
    answers.GetDinteroConfig = () => Promise.resolve({
      dinteroAccountId: 'acct-1',
      clientId: 'cid-1',
      clientSecret: 'not-a-real-secret',
      kraviaEnabled: true,
      kraviaMessage: 'Faktura via Kravia',
      splitSellerId: 'seller-1',
      commissionPercentage: 2.5,
      woltDeliveryFeePercent: 3,
      woltCustomerDeliveryFeeAmount: 4900,
      woltServiceFeeAmount: 990
    })
    const DinteroPage = require('~/pages/admin/dintero.vue').default
    const wrapper = mountPage(DinteroPage, { selectedAdminStore: 42 })
    await flush()
    wrapper.vm.updateDinteroConfig()
    await flush()
    const posted = calls.filter(c => c.name === 'UpdateDinteroConfig')
    expect(posted).toHaveLength(1)
    const payload = posted[0].args[1]
    expect(payload.kraviaMessage).toBe('Faktura via Kravia')
    expect(payload.dinteroAccountId).toBe('acct-1')
    expect(payload.splitSellerId).toBe('seller-1')
    expect(payload.commissionPercentage).toBe(2.5)
    wrapper.destroy()
  })

  // THE SURFBOARD DEFECT. Reds on the pre-fix page, whose payload had no `tipsEnabled` at all.
  test('D4: surfboard.vue carries the loaded tipsEnabled through a save', async () => {
    answers.GetSurfboardConfig = () => Promise.resolve({ merchantId: 'm-1', storeExternalId: 's-1', tipsEnabled: true })
    const SurfboardPage = require('~/pages/admin/surfboard.vue').default
    const wrapper = mountPage(SurfboardPage)
    wrapper.vm.selectedStoreId = 42
    wrapper.vm.onStoreChange()
    await flush()
    wrapper.vm.saveConfig()
    await flush()
    const posted = calls.filter(c => c.name === 'UpdateSurfboardConfig')
    expect(posted).toHaveLength(1)
    expect(posted[0].args[1].tipsEnabled).toBe(true)
    wrapper.destroy()
  })

  test('D5: surfboard.vue posts nothing when the read failed', async () => {
    answers.GetSurfboardConfig = () => Promise.reject(new Error('500'))
    const SurfboardPage = require('~/pages/admin/surfboard.vue').default
    const wrapper = mountPage(SurfboardPage)
    wrapper.vm.selectedStoreId = 42
    wrapper.vm.onStoreChange()
    await flush()
    wrapper.vm.saveConfig()
    await flush()
    expect(calls.filter(c => c.name === 'UpdateSurfboardConfig')).toEqual([])
    expect(wrapper.vm.configLoadFailed).toBe(true)
    wrapper.destroy()
  })
})

// ---- (E) the guard examined what it claims to have examined ------------------------------------

describe('E: this file read what it says it read', () => {
  test('E1: both contracts are registered and neither is empty', () => {
    expect(registeredFullReplaceKinds()).toEqual([DINTERO_CONFIG_KIND, SURFBOARD_CONFIG_KIND].sort())
    for (const kind of registeredFullReplaceKinds()) {
      expect(fullReplaceContractFor(kind).writableFields.length).toBeGreaterThan(10)
    }
  })

  // Reachability pins. If a page stops calling its Update method, or the payload literal moves out
  // of reach of the extractor, group (C) would go on passing about a corpus that no longer holds
  // the thing it exists to protect.
  test('E2: the payload extractor reached both pages and read a literal from each', () => {
    for (const page of PAGES) {
      const extracted = payloadKeysFor(page.file, page.method)
      expect(extracted.found).toBe(true)
      expect(extracted.keys && extracted.keys.length).toBeGreaterThan(10)
    }
  })

  test('E3: the two fields this lane exists for are among the fields (C) reads', () => {
    expect(payloadKeysFor('pages/admin/surfboard.vue', 'UpdateSurfboardConfig').keys).toContain('tipsEnabled')
    expect(payloadKeysFor('pages/admin/dintero.vue', 'UpdateDinteroConfig').keys).toContain('kraviaMessage')
    expect(payloadKeysFor('pages/admin/dintero.vue', 'UpdateDinteroConfig').keys).toContain('clientSecret')
  })

  // The refusal an operator sees is a translated string. This repo has shipped a page rendering a
  // raw key before, and a refusal that reads `dintero_configNotLoaded` teaches nobody why their
  // save did not happen.
  test('E5: the refusal the operator reads exists in every locale', () => {
    const translations = require('~/translations').default || require('~/translations')
    const locales = Object.keys(translations).filter(l => typeof translations[l] === 'object')
    expect(locales.length).toBeGreaterThan(1)
    for (const locale of locales) {
      expect(typeof translations[locale].dintero_configNotLoaded).toBe('string')
      expect(translations[locale].dintero_configNotLoaded.length).toBeGreaterThan(20)
    }
  })

  // The extractor must be able to FAIL. A scanner that returns the same answer for a payload with a
  // field removed is not reading the payload.
  test('E4: the extractor distinguishes a short literal from a whole one', () => {
    const whole = 'const payload = { a: 1, b: 2, c: 3 };'
    const short = 'const payload = { a: 1, c: 3 };'
    const keysOf = (src) => {
      const at = /const\s+payload\s*=\s*\{/.exec(src)
      return objectLiteralKeys(src, at.index + at[0].length - 1)
    }
    expect(keysOf(whole)).toEqual(['a', 'b', 'c'])
    expect(keysOf(short)).toEqual(['a', 'c'])
    expect(objectLiteralKeys('const x = { a: 1,', 10)).toBeNull()
  })
})
