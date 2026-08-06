/**
 * LIVE BEFORE/AFTER CAPTURE — lane L-DESTRUCTIVE-SAVES-LOAD-FIRST
 * =================================================================================================
 *
 * This is a RECEIPT, not a pin. It asserts that the defect IS present at the measured baseline and
 * that the fix refuses it, against a record held by a real HTTP server over a real socket. The
 * durable pins live in test/store-config-full-replace.test.js; a receipt that passes against the
 * defect is worthless as a guard and is labelled so it is never mistaken for one.
 *
 * WHAT IS REAL HERE
 *   - a stored record, held by an HTTP server on 127.0.0.1:4893, mutated by real POSTs over TCP;
 *   - the server's write semantics, copied field-for-field from OkamAPI 8e2b57de
 *     (Services/StoreService.cs:1266 / :1390 — every field of the write model assigned
 *     unconditionally, so an ABSENT key is bound to the C# default: false / null / 0);
 *   - the PRE-FIX page components, taken verbatim from the measured baseline (see prefix/);
 *   - the FIXED core StoreService, with the guard, in the refusal arm.
 *
 * WHAT IS SUBSTITUTED, AND WHY THAT IS HONEST
 *   The defect arm drives the pre-fix pages through a thin axios forwarder in place of
 *   `StoreService`. At the baseline, `StoreService.UpdateDinteroConfig` / `UpdateSurfboardConfig`
 *   were pure pass-throughs — `PostRequest(path, options)` and nothing else (prefix/
 *   store-service.prefix.ts:284-301 and :323-344) — so a forwarder that posts the payload verbatim
 *   IS that behaviour. The probe asserts that pass-through property against the baseline source
 *   before it uses the substitute, so the claim is checked rather than asserted.
 *
 * PRODUCTION SAFETY (F-DEV-BUILD-POINTS-AT-PRODUCTION)
 *   nuxt.config.js:45 defaults API_BASE_URL to the PRODUCTION API, so an unset base URL is a live
 *   client against real customer data. This file sets it to a loopback address before anything
 *   loads, and refuses to run at all if the resolved base URL is not loopback.
 *
 * SECRETS (C7)
 *   The record's credential fields hold values invented for this probe and prefixed
 *   `PROBE-FAKE-`. Nothing real is used, and the receipt this writes redacts the VALUE of every
 *   credential field while still proving the value CHANGED — which is the whole point of the
 *   capture, and can be shown with a hash rather than with the secret.
 *
 * RUN
 *   npx jest --rootDir . --testPathIgnorePatterns=/node_modules/ --coverage=false \
 *     lanes/L-DESTRUCTIVE-SAVES-LOAD-FIRST/live-record.probe.js
 */

const PORT = 4893
const BASE = 'http://127.0.0.1:' + PORT

// Must precede every import that reaches core/helpers/configuration.ts, which snapshots
// process.env at module load. `require` (not `import`) so this ordering is real, not hoisted away.
process.env.API_BASE_URL = BASE

const http = require('http')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const axios = require('axios')
const { shallowMount } = require('@vue/test-utils')

const LANE = path.resolve(__dirname)
const RECEIPT = path.join(LANE, 'receipts', 'live-record-before-after.md')

// Fields whose VALUE never leaves this process. Proven changed by hash, never by print.
const CREDENTIAL_FIELDS = new Set(['clientSecret', 'webhookSecret'])

const fingerprint = v => crypto.createHash('sha256').update(String(v)).digest('hex').slice(0, 12)
const show = (field, value) =>
  CREDENTIAL_FIELDS.has(field) ? '<redacted sha256:' + fingerprint(value) + '>' : JSON.stringify(value)

// ---- the stored record -------------------------------------------------------------------------
//
// Realistic, non-empty, and the point of the exercise: every one of these is a value an operator
// entered once and would have to recover from somewhere else if a Save blanked it.
const STORE_ID = 42

function seedDintero () {
  return {
    id: 1,
    dinteroAccountId: 'T11112222',
    clientId: 'PROBE-FAKE-client-id',
    clientSecret: 'PROBE-FAKE-client-secret',
    vippsEnabled: true,
    applePayEnabled: true,
    creditCardEnabled: true,
    googlePayEnabled: false,
    klarnaEnabled: true,
    billieEnabled: false,
    kraviaEnabled: true,
    kraviaMessage: 'Faktura sendes fra Kravia innen 3 virkedager.',
    splitSellerId: 'P00001111',
    commissionPercentage: 2.45,
    woltDeliveryFeePercent: 12.5,
    woltCustomerDeliveryFeeAmount: 4900,
    woltServiceFeeAmount: 990
  }
}

function seedSurfboard () {
  return {
    id: 1,
    merchantId: 'MER-9911',
    storeExternalId: 'STO-4422',
    onlineTerminalId: 'TRM-online-1',
    webhookSecret: 'PROBE-FAKE-webhook-secret',
    applicationId: 'APP-771',
    onboardingStatus: 'MERCHANT_CREATED',
    cardEnabled: true,
    vippsEnabled: true,
    mobilePayEnabled: false,
    swishEnabled: false,
    klarnaEnabled: true,
    tipsEnabled: true,
    partialPaymentsEnabled: true,
    commissionPercentage: 1.75,
    terminalCommissionPercentage: 0.95,
    woltDeliveryFeePercent: 12.5,
    woltCustomerDeliveryFeeAmount: 4900,
    woltServiceFeeAmount: 990
  }
}

// The backend write models, field for field. `kind` is the C# type, which is what decides the
// default an absent key binds to — that mapping is the mechanism of the whole defect.
const DINTERO_WRITE_MODEL = [
  ['dinteroEnabled', 'bool'], ['dinteroAccountId', 'string'], ['clientId', 'string'],
  ['clientSecret', 'string'], ['vippsEnabled', 'bool'], ['applePayEnabled', 'bool'],
  ['creditCardEnabled', 'bool'], ['googlePayEnabled', 'bool'], ['klarnaEnabled', 'bool'],
  ['billieEnabled', 'bool'], ['kraviaEnabled', 'bool'], ['kraviaMessage', 'string'],
  ['splitSellerId', 'string'], ['commissionPercentage', 'number'],
  ['woltDeliveryFeePercent', 'number'], ['woltCustomerDeliveryFeeAmount', 'number'],
  ['woltServiceFeeAmount', 'number']
]
const SURFBOARD_WRITE_MODEL = [
  ['surfboardEnabled', 'bool'], ['merchantId', 'string'], ['storeExternalId', 'string'],
  ['onlineTerminalId', 'string'], ['webhookSecret', 'string'], ['cardEnabled', 'bool'],
  ['vippsEnabled', 'bool'], ['mobilePayEnabled', 'bool'], ['swishEnabled', 'bool'],
  ['klarnaEnabled', 'bool'], ['tipsEnabled', 'bool'], ['partialPaymentsEnabled', 'bool'],
  ['commissionPercentage', 'number'], ['terminalCommissionPercentage', 'number'],
  ['woltDeliveryFeePercent', 'number'], ['woltCustomerDeliveryFeeAmount', 'number'],
  ['woltServiceFeeAmount', 'number']
]

const CSHARP_DEFAULT = { bool: false, string: null, number: 0 }

// One full replace, exactly as the backend does it: every field of the write model assigned from
// the body, and a body that did not carry the key yields the C# default.
function fullReplace (record, writeModel, body) {
  for (const [field, kind] of writeModel) {
    if (field === 'dinteroEnabled' || field === 'surfboardEnabled') { continue } // live on Store
    record[field] = Object.prototype.hasOwnProperty.call(body, field) && body[field] !== undefined
      ? body[field]
      : CSHARP_DEFAULT[kind]
  }
}

let dintero
let surfboard
let server

function start () {
  dintero = seedDintero()
  surfboard = seedSurfboard()
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      // jsdom applies CORS to a cross-origin XHR; the test page's origin is http://localhost.
      const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      }
      if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end() }

      let raw = ''
      req.on('data', (c) => { raw += c })
      req.on('end', () => {
        const reply = (payload) => {
          res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, cors))
          res.end(JSON.stringify(payload))
        }
        const body = raw ? JSON.parse(raw) : {}
        const url = req.url

        if (req.method === 'GET' && url === '/stores/' + STORE_ID) {
          return reply({ id: STORE_ID, dinteroEnabled: true, surfboardEnabled: true, name: 'Probe store' })
        }
        if (req.method === 'GET' && url === '/stores/' + STORE_ID + '/dintero-configuration') { return reply(dintero) }
        if (req.method === 'GET' && url === '/stores/' + STORE_ID + '/surfboard-configuration') { return reply(surfboard) }
        if (req.method === 'POST' && url === '/stores/' + STORE_ID + '/dintero-configuration') {
          fullReplace(dintero, DINTERO_WRITE_MODEL, body)
          return reply(true)
        }
        if (req.method === 'POST' && url === '/stores/' + STORE_ID + '/surfboard-configuration') {
          fullReplace(surfboard, SURFBOARD_WRITE_MODEL, body)
          return reply(true)
        }
        if (req.method === 'GET' && url === '/stores') { return reply([{ id: STORE_ID, name: 'Probe store', vat: 999999999 }]) }
        return reply({})
      })
    })
    server.listen(PORT, '127.0.0.1', resolve)
  })
}

// ---- the pre-fix StoreService, as a forwarder ---------------------------------------------------
//
// Verified against the baseline source below before it is used.
function baselineForwarder () {
  const get = url => axios.get(BASE + url).then(r => r.data)
  const post = (url, payload) => axios.post(BASE + url, payload).then(r => r.data)
  return {
    Get: id => get('/stores/' + id),
    GetAll: () => get('/stores'),
    GetDinteroConfig: id => get('/stores/' + id + '/dintero-configuration'),
    UpdateDinteroConfig: (id, options) => post('/stores/' + id + '/dintero-configuration', options),
    GetSurfboardConfig: id => get('/stores/' + id + '/surfboard-configuration'),
    UpdateSurfboardConfig: (id, options) => post('/stores/' + id + '/surfboard-configuration', options)
  }
}

function mountWith (component, storeService, selectedAdminStore) {
  return shallowMount(component, {
    mocks: {
      $i: k => k,
      $router: { push: () => {} },
      $store: {
        state: { selectedAdminStore, currentUser: { isPowerUser: true, name: 'n', title: 't' } },
        getters: { userIsLoggedIn: true }
      },
      _storeService: storeService,
      _dinteroService: { getSellers: () => Promise.resolve({ payoutDestinations: [] }) },
      _surfboardService: {
        getMerchants: () => Promise.resolve([]),
        getApplications: () => Promise.resolve([]),
        getStoreTerminals: () => Promise.resolve([])
      },
      _cashPointService: { GetForStore: () => Promise.resolve([]) }
    },
    stubs: {
      AdminPage: { template: '<div><slot /></div>' },
      Loading: true, Modal: true, VatAutocompleteInput: true, VueQrcode: true
    }
  })
}

const settle = () => new Promise(r => setTimeout(r, 30))
const lines = []
const log = (s) => { lines.push(s) }

function diff (before, after) {
  return Object.keys(before)
    .filter(f => JSON.stringify(before[f]) !== JSON.stringify(after[f]))
    .map(f => ({ field: f, before: show(f, before[f]), after: show(f, after[f]) }))
}

jest.setTimeout(30000)

beforeAll(() => start())
afterAll(() => new Promise((resolve) => {
  fs.mkdirSync(path.dirname(RECEIPT), { recursive: true })
  fs.writeFileSync(RECEIPT, lines.join('\n') + '\n')
  server.close(resolve)
}))

describe('the probe is pointed at a local record, not at production', () => {
  test('the resolved API base URL is loopback', () => {
    const $config = require('~/core/helpers/configuration').default
    expect($config.okamApiBaseUrl).toBe(BASE)
    expect($config.okamApiBaseUrl).toMatch(/^http:\/\/127\.0\.0\.1:/)
    expect($config.okamApiBaseUrl).not.toMatch(/azurewebsites|okam\.no|okamapi/)
    log('# Live before/after capture — L-DESTRUCTIVE-SAVES-LOAD-FIRST')
    log('')
    log('Baseline measured against: ' + fs.readFileSync(path.join(LANE, 'prefix', 'BASELINE.txt'), 'utf8').trim().replace(/\n/g, ' | '))
    log('Record held by a local HTTP server at ' + BASE + ' (loopback, asserted). Never production.')
    log('Credential VALUES redacted; a sha256 prefix proves the value changed without printing it.')
    log('')
  })

  test('the baseline Update methods were pure pass-throughs, which is what the forwarder stands in for', () => {
    const baseline = fs.readFileSync(path.join(LANE, 'prefix', 'store-service.prefix.ts'), 'utf8')
    for (const method of ['UpdateDinteroConfig', 'UpdateSurfboardConfig']) {
      const at = baseline.indexOf('public async ' + method)
      expect(at).toBeGreaterThan(-1)
      // To the next method declaration, so the options-object literal in the signature — which is
      // full of `}` at this indentation — cannot truncate the body being examined.
      const next = baseline.indexOf('public async ', at + 1)
      const body = baseline.slice(at, next > -1 ? next : baseline.length)
      // Posts the options object verbatim, and does nothing else to it.
      expect(body).toContain('PostRequest(')
      expect(body).toContain(', options)')
      expect(body).not.toContain('assertFullReplaceIsSafe')
    }
  })
})

describe('ARM 1 — the defect, against the stored record', () => {
  test('dintero.vue: opening the page and pressing Save blanks the live record', async () => {
    const PreFixDintero = require('./prefix/dintero.prefix.vue').default
    const before = JSON.parse(JSON.stringify(dintero))

    const wrapper = mountWith(PreFixDintero, baselineForwarder(), STORE_ID)
    await settle()

    // The reproduction in one line: the store was already selected, so nothing changed, so nothing
    // was read. The form the operator is looking at is the blank default.
    const readsOnArrival = wrapper.vm.dinteroConfig.dinteroAccountId
    expect(readsOnArrival).toBe('')

    await wrapper.vm.updateDinteroConfig()
    await settle()
    const after = JSON.parse(JSON.stringify(dintero))
    wrapper.destroy()

    const changed = diff(before, after)
    log('## ARM 1a — pre-fix pages/admin/dintero.vue, open page, press Save')
    log('')
    log('| field | stored before | stored after |')
    log('|---|---|---|')
    for (const row of changed) { log('| `' + row.field + '` | ' + row.before + ' | ' + row.after + ' |') }
    log('')
    log(changed.length + ' of ' + Object.keys(before).length + ' stored fields destroyed by one Save.')
    log('')

    // The credentials and the money fields are gone.
    expect(after.dinteroAccountId).toBe('')
    expect(after.clientId).toBe('')
    expect(after.clientSecret).toBe('')
    expect(after.splitSellerId).toBe('')
    expect(after.commissionPercentage).toBe(0)
    expect(after.woltCustomerDeliveryFeeAmount).toBe(0)
    // And the field the page never even had: absent from the body, so bound to the C# default.
    expect(before.kraviaMessage).not.toBeNull()
    expect(after.kraviaMessage).toBeNull()
    expect(changed.length).toBeGreaterThanOrEqual(8)
  })

  test('surfboard.vue: a normal save silently switches tipping off', async () => {
    surfboard = seedSurfboard()
    const PreFixSurfboard = require('./prefix/surfboard.prefix.vue').default
    const before = JSON.parse(JSON.stringify(surfboard))

    const wrapper = mountWith(PreFixSurfboard, baselineForwarder(), 0)
    wrapper.vm.selectedStoreId = STORE_ID
    wrapper.vm.onStoreChange()
    await settle()

    // This page DOES read first — the whole record is on screen, tipsEnabled included.
    expect(wrapper.vm.config.merchantId).toBe('MER-9911')
    expect(wrapper.vm.config.tipsEnabled).toBe(true)

    await wrapper.vm.saveConfig()
    await settle()
    const after = JSON.parse(JSON.stringify(surfboard))
    wrapper.destroy()

    const changed = diff(before, after)
    log('## ARM 1b — pre-fix pages/admin/surfboard.vue, load store, change nothing, press Save')
    log('')
    log('| field | stored before | stored after |')
    log('|---|---|---|')
    for (const row of changed) { log('| `' + row.field + '` | ' + row.before + ' | ' + row.after + ' |') }
    log('')
    log('A save that changed nothing changed ' + changed.length + ' stored field(s).')
    log('')

    expect(before.tipsEnabled).toBe(true)
    expect(after.tipsEnabled).toBe(false)
    // Everything the form DID carry survived — which is why nobody noticed.
    expect(after.merchantId).toBe('MER-9911')
    expect(after.commissionPercentage).toBe(1.75)
    expect(changed.map(c => c.field)).toEqual(['tipsEnabled'])
  })
})

describe('ARM 2 — the fix, against the same stored record', () => {
  test('dintero.vue: the same Save is refused and the record is untouched', async () => {
    dintero = seedDintero()
    const { StoreService } = require('~/core/services/store-service')
    const { setPlatform } = require('~/core/platform')
    const { HttpModule } = require('~/platform/http-module')
    class Persistence { load () { return null } store () {} remove () {} }
    setPlatform(HttpModule, Persistence)
    const real = new StoreService({ bearerToken: 't', clientPlatformName: 'probe', cultureCode: 'no' })

    const before = JSON.parse(JSON.stringify(dintero))

    // The exact shape the pre-fix page produced: blank defaults, and no kraviaMessage at all.
    const preFixPayload = {
      dinteroEnabled: false,
      dinteroAccountId: '',
      clientId: '',
      clientSecret: '',
      vippsEnabled: false,
      applePayEnabled: false,
      creditCardEnabled: false,
      googlePayEnabled: false,
      klarnaEnabled: false,
      billieEnabled: false,
      kraviaEnabled: false,
      commissionPercentage: 0,
      woltDeliveryFeePercent: 0,
      woltCustomerDeliveryFeeAmount: 0,
      woltServiceFeeAmount: 0,
      splitSellerId: ''
    }

    let refusal = null
    try { await real.UpdateDinteroConfig(STORE_ID, preFixPayload) } catch (e) { refusal = e }
    const afterUnread = JSON.parse(JSON.stringify(dintero))

    expect(refusal && refusal.isFullReplaceGuardError).toBe(true)
    expect(refusal.reason).toBe('not-loaded')
    expect(afterUnread).toEqual(before)

    // Now read first — the record is loaded, but the payload is still short of kraviaMessage.
    await real.GetDinteroConfig(STORE_ID)
    let second = null
    try { await real.UpdateDinteroConfig(STORE_ID, preFixPayload) } catch (e) { second = e }
    const afterShort = JSON.parse(JSON.stringify(dintero))

    expect(second && second.reason).toBe('incomplete')
    expect(second.missingFields).toEqual(['kraviaMessage'])
    expect(afterShort).toEqual(before)

    log('## ARM 2a — the same bytes, through the fixed core/services/store-service.ts')
    log('')
    log('- unread record + whole-looking payload -> refused `' + refusal.reason + '`; 0 stored fields changed')
    log('- record read + payload short of `kraviaMessage` -> refused `' + second.reason + '`; 0 stored fields changed')
    log('- refusal text names field names only: ' + JSON.stringify(second.missingFields))
    log('')
  })

  test('surfboard.vue: the tipsEnabled-less save is refused and tipping stays on', async () => {
    surfboard = seedSurfboard()
    const { StoreService } = require('~/core/services/store-service')
    const real = new StoreService({ bearerToken: 't', clientPlatformName: 'probe', cultureCode: 'no' })
    const before = JSON.parse(JSON.stringify(surfboard))

    await real.GetSurfboardConfig(STORE_ID)

    const preFixPayload = {
      surfboardEnabled: true,
      merchantId: 'MER-9911',
      storeExternalId: 'STO-4422',
      onlineTerminalId: 'TRM-online-1',
      webhookSecret: 'PROBE-FAKE-webhook-secret',
      cardEnabled: true,
      vippsEnabled: true,
      mobilePayEnabled: false,
      swishEnabled: false,
      klarnaEnabled: true,
      partialPaymentsEnabled: true,
      commissionPercentage: 1.75,
      terminalCommissionPercentage: 0.95,
      woltDeliveryFeePercent: 12.5,
      woltCustomerDeliveryFeeAmount: 4900,
      woltServiceFeeAmount: 990
    }

    let refusal = null
    try { await real.UpdateSurfboardConfig(STORE_ID, preFixPayload) } catch (e) { refusal = e }
    const afterRefusal = JSON.parse(JSON.stringify(surfboard))

    expect(refusal && refusal.reason).toBe('incomplete')
    expect(refusal.missingFields).toEqual(['tipsEnabled'])
    expect(afterRefusal.tipsEnabled).toBe(true)
    expect(afterRefusal).toEqual(before)

    // And the whole payload goes through, leaving tipping exactly as it was found.
    const whole = Object.assign({}, preFixPayload, { tipsEnabled: true })
    await expect(real.UpdateSurfboardConfig(STORE_ID, whole)).resolves.toBe(true)
    expect(surfboard.tipsEnabled).toBe(true)

    log('## ARM 2b — the same bytes, through the fixed core/services/store-service.ts')
    log('')
    log('- payload short of `tipsEnabled` -> refused `' + refusal.reason + '`; stored `tipsEnabled` still ' + surfboard.tipsEnabled)
    log('- whole payload -> accepted; stored `tipsEnabled` still true')
    log('')
    log('Receipt written by lanes/L-DESTRUCTIVE-SAVES-LOAD-FIRST/live-record.probe.js.')
  })
})
