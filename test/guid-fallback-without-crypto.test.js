/**
 * `utils/guid.js` mints the client-generated idempotency keys for every money-out and
 * payroll-bearing write this app makes: the POS cash return (`ReturnBuilder.returnId`), the cash
 * refund (`RefundModal.returnId`), the drawer movement (`DayFlow.txnIdempotencyKey`), the clock
 * punch (`ClockScreen.clientEventId`), the two invitation claims (`pages/workforce/join.vue` and
 * `pages/meals/join.vue`), and the `Idempotency-Key` header that
 * `utils/workforce/api-client.js:_mutate` puts on EVERY Workforce mutation.
 *
 * THE DEFECT THIS FILE PINS. The guard read
 *
 *     utils/guid.js:5   if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
 *     utils/guid.js:9     crypto.getRandomValues(bytes)          // <- unguarded
 *
 * The `typeof crypto !== 'undefined'` half of that guard was dead. The only way it can be false is
 * that there is no `crypto` global — and four lines later the fallback written to handle that case
 * dereferenced that exact global and raised a bare `ReferenceError: crypto is not defined`. The
 * function had a fallback for "crypto exists but randomUUID does not", and none for the case its
 * own guard tested.
 *
 * WHAT IT COST, measured rather than assumed. jsdom 16.7 (this repo's jest environment) defines no
 * `crypto` global at all — not on `globalThis`, not on `global`, not on `window` — so the throw was
 * unavoidable here. Where it landed depended on WHERE each component calls `newGuid()`, and the two
 * groups are not the same defect:
 *
 *   - `ReturnBuilder` and `RefundModal` — the till's two money-out surfaces — call it from `data()`.
 *     The throw came out of construction, before any assertion could run. These two were genuinely
 *     UNMOUNTABLE, and that is why they had never been under test.
 *   - `DayFlow.openTxn`, `ClockScreen.punch` and the two `join.vue` `claim()` methods call it from a
 *     method. Those four always mounted (verified against the unfixed source); what was blocked was
 *     exercising the key-minting method — `DayFlow.openTxn('PayIn')` threw against the old line.
 *
 * NOT ONLY A JEST ENVIRONMENT, and stated no more strongly than it was checked. Node exposed no
 * global `crypto` until 19, and `.github/workflows/nuxtjs.yml` pins `node-version: "16"` for the
 * `npm run generate` that publishes okam.no — so a second `crypto`-absent environment exists on the
 * build runner, not only under jest. What was NOT verified here is whether `nuxt generate` renders
 * a component that reaches `newGuid()`: the two `data()` callers are admin POS components behind
 * operator state, and the four method callers are not reached by a prerender at all. So this is a
 * named risk on the runner, not a demonstrated build failure. The SERVED app was never affected —
 * every browser defines `window.crypto`.
 *
 * WHY THE FALLBACK IS NOT `Math.random`. These are idempotency keys, not cosmetic ids. A repeated
 * key is not a cosmetic collision — `DayFlow`'s own comment spells the consequence out: the server
 * dedupes against the earlier key, returns the earlier posting, and "the UI would report success
 * while the drawer is short by 4500". A repeated `returnId` is a cash return that can be replayed
 * or silently swallowed. So every rung is a CSPRNG and the last rung is an explicit, named failure
 * rather than a weaker source. `the fallback is not Math.random` below asserts that by
 * construction, and `no CSPRNG reachable at all` asserts the terminal rung.
 */
import { shallowMount } from '@vue/test-utils'
import { newGuid } from '~/utils/guid'
import ReturnBuilder from '~/components/admin/pos/ReturnBuilder.vue'
import RefundModal from '~/components/admin/pos/RefundModal.vue'
import DayFlow from '~/components/admin/pos/DayFlow.vue'
import ClockScreen from '~/components/admin/pos/ClockScreen.vue'
import WorkforceJoin from '~/pages/workforce/join.vue'
import MealsJoin from '~/pages/meals/join.vue'

// RFC 4122 v4: 8-4-4-4-12 lowercase hex, version nibble `4`, variant nibble one of 8/9/a/b.
const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

// A real CSPRNG, used only to fill the fixture `crypto` objects the browser rungs are handed.
const nodeCrypto = module.require('crypto')

const withoutCryptoGlobal = () => {
  let had
  let saved
  beforeEach(() => {
    had = Object.prototype.hasOwnProperty.call(globalThis, 'crypto')
    saved = had ? globalThis.crypto : undefined
    // Explicit rather than relying on jsdom's accident. If a `setupFiles` entry ever supplies a
    // polyfill, this must keep testing the absent case rather than quietly becoming a second copy
    // of the fast-path test.
    delete globalThis.crypto
  })
  afterEach(() => {
    if (had) { globalThis.crypto = saved } else { delete globalThis.crypto }
  })
}

describe('newGuid with no crypto global present', () => {
  withoutCryptoGlobal()

  test('the case under test is genuinely reached: no crypto global on any alias', () => {
    expect(typeof globalThis.crypto).toBe('undefined')
    expect(typeof global.crypto).toBe('undefined')
    expect(typeof window.crypto).toBe('undefined')
  })

  test('returns a well-formed RFC 4122 v4 instead of throwing', () => {
    expect(newGuid()).toMatch(V4)
  })

  test('sets the version nibble to 4 and the variant nibble to 8/9/a/b across many draws', () => {
    const versions = new Set()
    const variants = new Set()
    for (let i = 0; i < 500; i++) {
      const g = newGuid()
      expect(g).toMatch(V4)
      versions.add(g[14])
      variants.add(g[19])
    }
    expect([...versions]).toEqual(['4'])
    expect([...variants].sort().join('')).toBe('89ab')
  })

  test('draws are distinct — a repeated idempotency key is a replayable cash return', () => {
    const seen = new Set()
    for (let i = 0; i < 10000; i++) { seen.add(newGuid()) }
    expect(seen.size).toBe(10000)
  })

  test('the fallback is not Math.random: pinning Math.random changes nothing', () => {
    const realRandom = Math.random
    Math.random = () => 0.42
    try {
      const seen = new Set()
      for (let i = 0; i < 200; i++) { seen.add(newGuid()) }
      expect(seen.size).toBe(200)
    } finally {
      Math.random = realRandom
    }
  })

  test('no CSPRNG reachable at all: it names what is missing rather than minting a weak key', () => {
    let thrown = null
    try {
      jest.isolateModules(() => {
        jest.doMock('crypto', () => ({}))
        // eslint-disable-next-line global-require
        const fresh = require('~/utils/guid')
        try { fresh.newGuid() } catch (e) { thrown = e }
      })
    } finally {
      // `doMock` registers in the explicit-mock map, which `isolateModules` does NOT reset — left
      // standing it starves every later test in this file of Node's crypto and they fail here
      // instead of where they are aimed.
      jest.unmock('crypto')
      jest.resetModules()
    }
    expect(thrown).toBeInstanceOf(Error)
    expect(thrown.message).toContain('no cryptographic random source available')
    // The bare `ReferenceError: crypto is not defined` named nothing an operator could act on.
    expect(thrown).not.toBeInstanceOf(ReferenceError)
  })
})

describe('newGuid keeps the two rungs that already worked', () => {
  let had
  let saved
  beforeEach(() => {
    had = Object.prototype.hasOwnProperty.call(globalThis, 'crypto')
    saved = had ? globalThis.crypto : undefined
  })
  afterEach(() => {
    if (had) { globalThis.crypto = saved } else { delete globalThis.crypto }
  })

  test('a crypto global WITHOUT randomUUID takes the getRandomValues path (plain-http dev hosts)', () => {
    const calls = []
    globalThis.crypto = {
      getRandomValues (bytes) { calls.push(bytes.length); nodeCrypto.randomFillSync(bytes); return bytes }
    }
    expect(newGuid()).toMatch(V4)
    expect(calls).toEqual([16])
  })

  test('a crypto global WITH randomUUID takes the fast path', () => {
    let used = 0
    globalThis.crypto = {
      randomUUID () { used++; return '64194113-11a6-4f2a-8e07-7fe3692be4b2' },
      getRandomValues () { throw new Error('the fast path must not fall through to getRandomValues') }
    }
    expect(newGuid()).toBe('64194113-11a6-4f2a-8e07-7fe3692be4b2')
    expect(used).toBe(1)
  })
})

/**
 * The six components named against this defect, mounted here with NO crypto polyfill of any kind —
 * no `setupFiles` entry, no per-file `global.crypto = webcrypto`. Construction running to
 * completion IS the assertion; where a key is minted it is read back, to show the fix produces a
 * real GUID and not a stub.
 *
 * Two of the six (`ReturnBuilder`, `RefundModal`) could not be constructed at all before the fix.
 * The other four always constructed; `DayFlow` is the one whose key-minting method is pure enough
 * to call here, and `openTxn` threw against the old line, so it stands for that group.
 */
describe('the components that could not be mounted', () => {
  withoutCryptoGlobal()

  const storeFor = locale => ({ state: { adminLocale: locale }, dispatch () {}, subscribe () {} })
  const fakePos = () => ({
    storeId: 'st-1',
    cashPoint: { cashPointId: 'cp-1', unreferencedCardReturnEnabled: false },
    catalog: [],
    goodsGroupSvc: () => ({ GetForStore: () => Promise.resolve([]) }),
    posSvc: () => ({}),
    drawerSvc: () => ({}),
    errMsg: e => String(e),
    printReceiptDoc: () => {}
  })
  // `priceLabel` is a global-mixin method (`plugins/global-mixin.js`), mocked the way every
  // component test in this repo mocks it. `SignaturePad` is stubbed because its `mounted` calls
  // `canvas.getContext('2d')`, which jsdom answers with null without `node-canvas`.
  const COMMON = () => ({
    provide: { pos: fakePos() },
    stubs: { SignaturePad: true },
    mocks: { $store: storeFor('no'), $route: { query: {}, params: {} }, $router: { push () {} }, $i: k => k, $t: k => k, priceLabel: () => 'kr 0,00' }
  })

  test('ReturnBuilder mounts and its cash-return returnId is a v4', () => {
    const w = shallowMount(ReturnBuilder, COMMON())
    expect(w.vm.returnId).toMatch(V4)
  })

  test('RefundModal mounts and its cash-refund returnId is a v4', () => {
    const w = shallowMount(RefundModal, {
      ...COMMON(),
      propsData: {
        receipt: {
          journalEntryId: 'je-1',
          receiptType: 'Sale',
          grossAmount: 30000,
          tipAmount: 0,
          payments: [{ paymentType: 'Cash', amount: 30000 }],
          lines: [],
          taxLines: []
        }
      }
    })
    expect(w.vm.returnId).toMatch(V4)
  })

  test('DayFlow mounts and its drawer-movement key is a v4', () => {
    const w = shallowMount(DayFlow, COMMON())
    w.vm.openTxn('PayIn')
    expect(w.vm.txnIdempotencyKey).toMatch(V4)
  })

  test('ClockScreen mounts', () => {
    expect(shallowMount(ClockScreen, COMMON()).vm).toBeTruthy()
  })

  test('pages/workforce/join mounts', () => {
    expect(shallowMount(WorkforceJoin, COMMON()).vm).toBeTruthy()
  })

  test('pages/meals/join mounts', () => {
    expect(shallowMount(MealsJoin, COMMON()).vm).toBeTruthy()
  })
})
