/**
 * RED RECEIPT — lane L-DESTRUCTIVE-SAVES-LOAD-FIRST
 * =================================================================================================
 *
 * The live capture (live-record.probe.js) proves the DEFECT destroyed a stored record. This file
 * proves the PIN would have caught it: it applies the assertions from
 * test/store-config-full-replace.test.js to the PRE-FIX sources and shows each one failing.
 *
 * Written as "the pin's expectation, applied to the baseline, THROWS", so the receipt itself cannot
 * pass vacuously: if an expectation stopped failing against the baseline, this file reds.
 *
 * The extraction is imported from test/support/full-replace-extract.js — the same module the pin
 * uses, not a copy. Showing that a DIFFERENT extractor reds would prove nothing about the pin.
 *
 * Group (A)/(B) of the pin — the guard's rules and the service seam — need no replay: the guard did
 * not exist at the baseline. That is asserted from the baseline source rather than assumed.
 *
 * RUN
 *   npx jest --rootDir . --testPathIgnorePatterns=/node_modules/ \
 *     --testMatch '**\/L-DESTRUCTIVE-SAVES-LOAD-FIRST/*.probe.js' --coverage=false
 */

const fs = require('fs')
const path = require('path')
const { shallowMount } = require('@vue/test-utils')
const extract = require('~/test/support/full-replace-extract')
const {
  DINTERO_CONFIG_KIND,
  SURFBOARD_CONFIG_KIND
} = require('~/core/services/store-service')
const { fullReplaceContractFor } = require('~/core/services/full-replace-guard')

const LANE = path.resolve(__dirname)
const PREFIX = path.join(LANE, 'prefix')
const RECEIPT = path.join(LANE, 'receipts', 'red-before-green.md')

const lines = []
const log = s => lines.push(s)

// Runs an assertion and returns the failure message. Fails if it did NOT throw — which is the
// property that stops this receipt from going quiet.
function mustFail (label, fn) {
  let error = null
  try { fn() } catch (e) { error = e }
  if (!error) {
    throw new Error('RECEIPT IS VACUOUS: "' + label + '" passed against the pre-fix source; it is not a pin for this defect.')
  }
  return String(error.message).split('\n').filter(Boolean).slice(0, 4).join(' / ')
}

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
    GetDinteroConfig: id => record('GetDinteroConfig', [id], { dinteroAccountId: 'T11112222', clientId: 'cid' }),
    UpdateDinteroConfig: (id, payload) => record('UpdateDinteroConfig', [id, payload], true),
    GetSurfboardConfig: id => record('GetSurfboardConfig', [id], { merchantId: 'MER-9911', tipsEnabled: true }),
    UpdateSurfboardConfig: (id, payload) => record('UpdateSurfboardConfig', [id, payload], true)
  }
}

function mountPage (component, selectedAdminStore) {
  return shallowMount(component, {
    mocks: {
      $i: k => k,
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
    stubs: {
      AdminPage: { template: '<div><slot /></div>' },
      Loading: true, Modal: true, VatAutocompleteInput: true, VueQrcode: true
    }
  })
}

const flush = () => new Promise(r => setTimeout(r, 30))

beforeAll(() => {
  calls.length = 0
  log('# Red receipt — the pin, applied to the pre-fix sources')
  log('')
  log('Baseline: ' + fs.readFileSync(path.join(PREFIX, 'BASELINE.txt'), 'utf8').trim().replace(/\n/g, ' | '))
  log('')
  log('Each row is an assertion from `test/store-config-full-replace.test.js` run against the')
  log('pre-fix source in `prefix/`. Every one FAILED there and passes on the fixed tree.')
  log('')
  log('| pin | subject | failure against the baseline |')
  log('|---|---|---|')
})

afterAll(() => {
  fs.mkdirSync(path.dirname(RECEIPT), { recursive: true })
  fs.writeFileSync(RECEIPT, lines.join('\n') + '\n')
})

describe('the pin reds against the pre-fix sources', () => {
  test('C (payload literal): pre-fix surfboard.vue is short of tipsEnabled', () => {
    const keys = extract.payloadKeysForFile(path.join(PREFIX, 'surfboard.prefix.vue'), 'UpdateSurfboardConfig').keys
    expect(keys).not.toBeNull()
    expect(keys).not.toContain('tipsEnabled')
    const message = mustFail('C: surfboard payload === contract', () => {
      expect(keys.slice().sort()).toEqual(fullReplaceContractFor(SURFBOARD_CONFIG_KIND).writableFields.slice().sort())
    })
    log('| C payload | prefix/surfboard.prefix.vue | ' + message.slice(0, 120) + ' |')
  })

  test('C (payload literal): pre-fix dintero.vue is short of kraviaMessage', () => {
    const keys = extract.payloadKeysForFile(path.join(PREFIX, 'dintero.prefix.vue'), 'UpdateDinteroConfig').keys
    expect(keys).not.toBeNull()
    expect(keys).not.toContain('kraviaMessage')
    const message = mustFail('C: dintero payload === contract', () => {
      expect(keys.slice().sort()).toEqual(fullReplaceContractFor(DINTERO_CONFIG_KIND).writableFields.slice().sort())
    })
    log('| C payload | prefix/dintero.prefix.vue | ' + message.slice(0, 120) + ' |')
  })

  test('C (signature): the pre-fix TypeScript signatures were short too, in different places', () => {
    const source = fs.readFileSync(path.join(PREFIX, 'store-service.prefix.ts'), 'utf8')
    const dintero = extract.signatureKeysFrom(source, 'UpdateDinteroConfig')
    const surfboard = extract.signatureKeysFrom(source, 'UpdateSurfboardConfig')
    // Three places wrote the same field list and no two agreed: the signature omitted five Dintero
    // fields the page DID send, and omitted partialPaymentsEnabled while naming tipsEnabled, which
    // the page did NOT send.
    expect(dintero).not.toContain('kraviaEnabled')
    expect(dintero).not.toContain('woltServiceFeeAmount')
    expect(surfboard).toContain('tipsEnabled')
    expect(surfboard).not.toContain('partialPaymentsEnabled')
    const message = mustFail('C: dintero signature === contract', () => {
      expect(dintero.slice().sort()).toEqual(fullReplaceContractFor(DINTERO_CONFIG_KIND).writableFields.slice().sort())
    })
    log('| C signature | prefix/store-service.prefix.ts | ' + message.slice(0, 120) + ' |')
  })

  test('D1: the pre-fix dintero page reads nothing on arrival', async () => {
    calls.length = 0
    const PreFix = require('./prefix/dintero.prefix.vue').default
    const wrapper = mountPage(PreFix, 42)
    await flush()
    const reads = calls.filter(c => c.name === 'GetDinteroConfig').map(c => c.args)
    const message = mustFail('D1: dintero reads on arrival', () => { expect(reads).toEqual([[42]]) })
    log('| D1 read-on-arrival | prefix/dintero.prefix.vue | ' + message.slice(0, 120) + ' |')
    expect(reads).toEqual([])
    wrapper.destroy()
  })

  test('D2: the pre-fix dintero page posts the blank form anyway', async () => {
    calls.length = 0
    const PreFix = require('./prefix/dintero.prefix.vue').default
    const wrapper = mountPage(PreFix, 42)
    await flush()
    await wrapper.vm.updateDinteroConfig()
    await flush()
    const posted = calls.filter(c => c.name === 'UpdateDinteroConfig')
    expect(posted).toHaveLength(1)
    // There is no configLoaded gate on the baseline page at all.
    expect(wrapper.vm.configLoaded).toBeUndefined()
    const message = mustFail('D2: nothing posted without a read', () => { expect(posted).toEqual([]) })
    log('| D2 no-post-without-read | prefix/dintero.prefix.vue | ' + message.slice(0, 120) + ' |')
    expect(posted[0].args[1].clientSecret).toBe('')
    wrapper.destroy()
  })

  test('D4: the pre-fix surfboard page drops tipsEnabled from a save', async () => {
    calls.length = 0
    const PreFix = require('./prefix/surfboard.prefix.vue').default
    const wrapper = mountPage(PreFix, 0)
    wrapper.vm.selectedStoreId = 42
    wrapper.vm.onStoreChange()
    await flush()
    await wrapper.vm.saveConfig()
    await flush()
    const posted = calls.filter(c => c.name === 'UpdateSurfboardConfig')
    expect(posted).toHaveLength(1)
    expect(wrapper.vm.config.tipsEnabled).toBe(true) // it was READ, and then not sent
    const message = mustFail('D4: tipsEnabled travels', () => { expect(posted[0].args[1].tipsEnabled).toBe(true) })
    log('| D4 tipsEnabled travels | prefix/surfboard.prefix.vue | ' + message.slice(0, 120) + ' |')
    wrapper.destroy()
  })

  test('A/B: the guard did not exist at the baseline, so its rules could not have been enforced', () => {
    const source = fs.readFileSync(path.join(PREFIX, 'store-service.prefix.ts'), 'utf8')
    expect(source).not.toContain('assertFullReplaceIsSafe')
    expect(source).not.toContain('noteRecordLoaded')
    expect(source).not.toContain('full-replace-guard')
    log('| A/B guard rules | prefix/store-service.prefix.ts | the guard is not referenced anywhere in the baseline service |')
    log('')
    log('Live before/after of the stored record: `receipts/live-record-before-after.md`.')
  })
})
