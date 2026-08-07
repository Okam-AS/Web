import { webcrypto } from 'crypto'
import { mount } from '@vue/test-utils'
import '~/plugins/global-mixin'
import '~/plugins/i18n'
import ReturnBuilder from '~/components/admin/pos/ReturnBuilder.vue'

// THE PLATFORM, SUPPLIED — and why this line has to be here at all.
//
// `ReturnBuilder`'s `data()` calls `newGuid()` for the cash return's idempotency key, and
// `utils/guid.js` reaches for the `crypto` global. jsdom 16.7 (this repo's jest environment) does
// not define one; every real browser does, on plain http as well as https. So without this line the
// component cannot be constructed at all — `ReferenceError: crypto is not defined` out of `initData`,
// before a single assertion runs.
//
// That is the mechanical reason the till's two money-OUT surfaces have never been under test.
// `newGuid` is called from `ReturnBuilder`, `RefundModal`, `DayFlow`, `ClockScreen` and
// `pages/workforce/join.vue`, and every one of those files sits at 0–13% coverage. It was not that
// nobody wrote the tests; the components could not be mounted. See this lane's return for the
// separate latent defect in `utils/guid.js` that the same line exposes.
//
// Supplying the global is supplying the platform, not bending the product: nothing below stubs
// `newGuid`, and the ids the component generates are the shipped ones.
if (typeof global.crypto === 'undefined') { global.crypto = webcrypto }

// ReturnBuilder writes an unreferenced RETREC — money out of the drawer, against a fiscal document
// with no original sale behind it. Nothing in the suite executed it: 7.4%, 137 uncovered statements,
// 104 uncovered branches, 40 uncovered functions.
//
// Three things are pinned, and they are the three that decide what the document says:
//   the AMOUNT paid out,
//   the VAT RATE each line carries (goods-group profile × eat-in/take-away, with the product's own
//     rate as the fallback — "a return computed from a listed price" is the defect class this repo
//     has already shipped once),
//   and the GATE, because a RETREC without a reason, a customer phone and — for cash — a signature
//     is a payout nobody can explain afterwards.
//
// The component is mounted whole with its real children and the figures are read off rendered DOM
// where the DOM prints them.

const storeFor = locale => ({ state: { adminLocale: locale }, dispatch () {}, subscribe () {} })

// A profiled group carries all three context rates; an unprofiled one carries none and the
// operator-picked (or product) rate stands.
const GROUPS = [
  { goodsGroupId: 1, name: 'Mat', code: '10', isActive: true, takeAwayVatPercent: 15, eatInVatPercent: 25, deliveryVatPercent: 15 },
  { goodsGroupId: 2, name: 'Alkohol', code: '20', isActive: true, takeAwayVatPercent: 25, eatInVatPercent: 25, deliveryVatPercent: 25 },
  { goodsGroupId: 3, name: 'Uprofilert', code: '30', isActive: true, takeAwayVatPercent: null, eatInVatPercent: null, deliveryVatPercent: null },
  { goodsGroupId: 9, name: 'Avviklet', code: '90', isActive: false, takeAwayVatPercent: 15, eatInVatPercent: 25, deliveryVatPercent: 15 }
]

const CATALOG = [{
  categoryProductListItems: [
    { isHeading: false, product: { productId: 'p-burger', name: 'Burger', amount: 18900, tax: 25, goodsGroupId: 1 } },
    { isHeading: false, product: { productId: 'p-transport', name: 'Transport', amount: 5000, tax: 12, goodsGroupId: 3 } },
    { isHeading: false, product: { productId: 'p-nogroup', name: 'Ukategorisert', amount: 7500, tax: 25, goodsGroupId: null } },
    { isHeading: false, product: { productId: 'p-hidden', name: 'Skjult', amount: 100, tax: 25, goodsGroupId: 1, hide: true } },
    { isHeading: true, product: { productId: 'h-1', name: 'Overskrift', amount: 0, tax: 25, goodsGroupId: 1 } },
    { isHeading: false, product: null }
  ]
}]

const fakePos = over => ({
  storeId: 'st-1',
  cashPoint: { cashPointId: 'cp-1', unreferencedCardReturnEnabled: false },
  catalog: CATALOG,
  goodsGroupSvc: () => ({ GetForStore: async () => GROUPS }),
  posSvc: () => ({}),
  errMsg: e => String(e),
  printReceiptDoc: () => {},
  ...over
})

// THE SECOND PLATFORM GAP, named for the same reason as the first. `SignaturePad`'s `mounted` calls
// `canvas.getContext('2d')`, which jsdom returns `null` for unless `node-canvas` is installed — it is
// not, and `npm install` is banned repo-wide. So the settle step cannot render with the real child
// and this is the only stub in the file. What it stubs is a drawing surface: the gate below reads
// `signature` as data, and that data is set here directly, so the rule under test is the shipped one.
const STUBS = { SignaturePad: true }

const mountBuilder = async (propsData = {}, posOver = {}) => {
  const w = mount(ReturnBuilder, {
    propsData,
    provide: { pos: fakePos(posOver) },
    stubs: STUBS,
    mocks: { $store: storeFor('no') }
  })
  // `mounted` loads the goods groups; the VAT derivation is meaningless until they arrive.
  await w.vm.$nextTick()
  await w.vm.$nextTick()
  return w
}

const LINE = over => ({ name: 'Burger', quantity: 1, unitAmount: 18900, vatPercent: 25, goodsGroupId: 1, ...over })

describe('ReturnBuilder — the amount paid out', () => {
  test('one line of one is that line\'s amount', async () => {
    const w = await mountBuilder({ initialLines: [LINE()] })
    expect(w.vm.total).toBe(18900)
    expect(w.find('.rbuild__summary strong').text()).toBe('kr 189,00')
  })

  // Quantity multiplies. A total that summed unit amounts and ignored quantity would pay out one
  // burger for three.
  test('quantity multiplies the unit amount', async () => {
    const w = await mountBuilder({ initialLines: [LINE({ quantity: 3 })] })
    expect(w.vm.total).toBe(56700)
    expect(w.find('.rbuild__summary strong').text()).toBe('kr 567,00')
  })

  test('several lines add up, each by its own quantity', async () => {
    const w = await mountBuilder({ initialLines: [LINE({ quantity: 2 }), LINE({ name: 'Cola', unitAmount: 3900, quantity: 3 })] })
    expect(w.vm.total).toBe(2 * 18900 + 3 * 3900)
    expect(w.find('.rbuild__summary strong').text()).toBe('kr 495,00')
  })

  test('an empty return totals nothing', async () => {
    const w = await mountBuilder()
    expect(w.vm.total).toBe(0)
  })

  // The continue button carries the figure the operator is about to hand over. It must be the same
  // number the summary shows, on the same screen.
  test('the button the operator presses names the amount it will pay out', async () => {
    const w = await mountBuilder({ initialLines: [LINE({ quantity: 2 })] })
    w.setData({ step: 'build' })
    await w.vm.$nextTick()
    expect(w.find('.rbuild__foot .rbuild__primary').text()).toContain('kr 378,00')
  })

  // The builder is a money-moving surface with a client-generated idempotency key. Two instances
  // must not share it, or a retried return would dedupe against a different return.
  test('each builder instance carries its own return idempotency key', async () => {
    const a = await mountBuilder()
    const b = await mountBuilder()
    expect(a.vm.returnId).toBeTruthy()
    expect(a.vm.returnId).not.toBe(b.vm.returnId)
  })
})

describe('ReturnBuilder — the VAT rate the document carries', () => {
  test('a profiled group takes the take-away rate by default', async () => {
    const w = await mountBuilder()
    expect(w.vm.vatContext).toBe('SelfPickup')
    expect(w.vm.effectiveVat(1)).toBe(15)
  })

  test('the same group takes the eat-in rate once the document says eat-in', async () => {
    const w = await mountBuilder()
    w.vm.setContext('TableDelivery')
    expect(w.vm.effectiveVat(1)).toBe(25)
  })

  // A group missing ANY of its three rates is not profiled — a partially-filled profile must not be
  // read as authoritative, or a return would be journalled at a rate nobody configured.
  test('a group with no profile derives no rate at all', async () => {
    const w = await mountBuilder()
    expect(w.vm.effectiveVat(3)).toBeNull()
    expect(w.vm.groupVat({ goodsGroupId: 4, takeAwayVatPercent: 15, eatInVatPercent: null, deliveryVatPercent: 15 })).toBeNull()
    expect(w.vm.groupVat(undefined)).toBeNull()
  })

  // Switching the context re-prices the lines already on the return. A line left at the old rate
  // would put two different rates on one document for the same goods group.
  test('switching to eat-in re-prices every profiled line already added', async () => {
    const w = await mountBuilder({ initialLines: [LINE({ goodsGroupId: 1, vatPercent: 15 }), LINE({ name: 'Øl', goodsGroupId: 2, vatPercent: 25 })] })
    w.vm.setContext('TableDelivery')
    expect(w.vm.lines.map(l => l.vatPercent)).toEqual([25, 25])
  })

  test('switching back re-prices them again', async () => {
    const w = await mountBuilder({ initialLines: [LINE({ goodsGroupId: 1, vatPercent: 15 })] })
    w.vm.setContext('TableDelivery')
    w.vm.setContext('SelfPickup')
    expect(w.vm.lines[0].vatPercent).toBe(15)
  })

  // An unprofiled line keeps the rate the operator chose. Re-pricing it from a profile that does
  // not exist would silently rewrite a rate a person entered deliberately.
  test('a line whose group has no profile keeps its operator-chosen rate through a context switch', async () => {
    const w = await mountBuilder({ initialLines: [LINE({ goodsGroupId: 3, vatPercent: 12 })] })
    w.vm.setContext('TableDelivery')
    expect(w.vm.lines[0].vatPercent).toBe(12)
  })

  test('only active goods groups are offered', async () => {
    const w = await mountBuilder()
    expect(w.vm.goodsGroups.map(g => g.goodsGroupId)).toEqual([1, 2, 3])
    expect(w.vm.effectiveVat(9)).toBeNull()
  })

  test('a goods-group service that throws leaves an empty list rather than a broken screen', async () => {
    const w = await mountBuilder({}, { goodsGroupSvc: () => ({ GetForStore: async () => { throw new Error('503') } }) })
    await w.vm.$nextTick()
    expect(w.vm.goodsGroups).toEqual([])
  })
})

describe('ReturnBuilder — a return line built from a menu item', () => {
  test('the line takes the product\'s listed price and the group\'s derived rate, not the product\'s own', async () => {
    const w = await mountBuilder()
    w.vm.pickProduct({ productId: 'p-burger', name: 'Burger', amount: 18900, tax: 25, goodsGroupId: 1 })
    expect(w.vm.lines).toHaveLength(1)
    expect(w.vm.lines[0]).toEqual({ name: 'Burger', quantity: 1, unitAmount: 18900, vatPercent: 15, goodsGroupId: 1 })
  })

  // 12% is a legal Norwegian rate. Rewriting it to 25 because it is not the group's would journal
  // the wrong rate on a fiscal document — the source calls this out by name.
  test('an unprofiled group keeps the product\'s own legal rate, 12% included', async () => {
    const w = await mountBuilder()
    w.vm.pickProduct({ productId: 'p-transport', name: 'Transport', amount: 5000, tax: 12, goodsGroupId: 3 })
    expect(w.vm.lines[0].vatPercent).toBe(12)
  })

  test('a rate that is not a legal Norwegian rate falls back to 25, it is not carried through', async () => {
    const w = await mountBuilder()
    w.vm.pickProduct({ productId: 'p-odd', name: 'Rart', amount: 5000, tax: 7, goodsGroupId: 3 })
    expect(w.vm.lines[0].vatPercent).toBe(25)
  })

  // A product with no goods group cannot be journalled. It drops into the manual form for the
  // operator to classify rather than being added as a line the backend would reject.
  test('a product with no goods group is not added as a line, it opens the manual form', async () => {
    const w = await mountBuilder()
    w.vm.pickProduct({ productId: 'p-nogroup', name: 'Ukategorisert', amount: 7500, tax: 25, goodsGroupId: null })
    expect(w.vm.lines).toHaveLength(0)
    expect(w.vm.entryMode).toBe('manual')
    expect(w.vm.draft).toEqual({ name: 'Ukategorisert', quantity: 1, unitAmount: 7500, vatPercent: 25, goodsGroupId: null })
  })

  // Tapping the same item twice is one line of two, not two lines of one.
  test('the same product tapped twice becomes quantity two on one line', async () => {
    const w = await mountBuilder()
    const p = { productId: 'p-burger', name: 'Burger', amount: 18900, tax: 25, goodsGroupId: 1 }
    w.vm.pickProduct(p)
    w.vm.pickProduct(p)
    expect(w.vm.lines).toHaveLength(1)
    expect(w.vm.lines[0].quantity).toBe(2)
    expect(w.vm.total).toBe(37800)
  })

  // Same name, different price is a different thing being returned. Stacking them would return two
  // at whichever price landed first.
  test('the same name at a different price is a separate line', async () => {
    const w = await mountBuilder()
    w.vm.pickProduct({ productId: 'p-burger', name: 'Burger', amount: 18900, tax: 25, goodsGroupId: 1 })
    w.vm.pickProduct({ productId: 'p-burger2', name: 'Burger', amount: 20900, tax: 25, goodsGroupId: 1 })
    expect(w.vm.lines).toHaveLength(2)
    expect(w.vm.total).toBe(39800)
  })

  test('headings, hidden products and empty slots are not sellable and are not offered', async () => {
    const w = await mountBuilder()
    expect(w.vm.allProducts.map(p => p.name)).toEqual(['Burger', 'Transport', 'Ukategorisert'])
  })

  test('the menu search narrows by name, case-insensitively', async () => {
    const w = await mountBuilder()
    w.setData({ menuQuery: '  BURG ' })
    await w.vm.$nextTick()
    expect(w.vm.filteredProducts.map(p => p.name)).toEqual(['Burger'])
  })
})

describe('ReturnBuilder — nothing is paid out until the document can be explained', () => {
  const settleReady = async (over = {}) => {
    const w = await mountBuilder({ initialLines: [LINE()] })
    w.setData({
      step: 'settle',
      method: 'cash',
      reasonSel: { reasonType: 'Feilslag', reasonText: '' },
      customerPhone: '+4791000000',
      signature: 'data:image/png;base64,AAA',
      ...over
    })
    await w.vm.$nextTick()
    return w
  }

  test('a complete cash return may advance', async () => {
    const w = await settleReady()
    expect(w.vm.canAdvance).toBe(true)
    expect(w.find('.rbuild__foot .rbuild__primary').attributes('disabled')).toBeUndefined()
  })

  test('no reason, no payout', async () => {
    const w = await settleReady({ reasonSel: { reasonType: 'None', reasonText: '' } })
    expect(w.vm.canAdvance).toBe(false)
    expect(w.find('.rbuild__foot .rbuild__primary').attributes('disabled')).toBe('disabled')
  })

  // "Annet" is the free-text reason; choosing it and typing nothing explains nothing.
  test('the free-text reason must actually carry text', async () => {
    expect((await settleReady({ reasonSel: { reasonType: 'Annet', reasonText: '   ' } })).vm.canAdvance).toBe(false)
    expect((await settleReady({ reasonSel: { reasonType: 'Annet', reasonText: 'Feil vare' } })).vm.canAdvance).toBe(true)
  })

  test('no customer phone, no payout', async () => {
    expect((await settleReady({ customerPhone: '' })).vm.canAdvance).toBe(false)
    expect((await settleReady({ customerPhone: '   ' })).vm.canAdvance).toBe(false)
  })

  // Cash out of the drawer needs the customer's signature on the screen; the card path is signed on
  // the terminal instead.
  test('a cash return needs a signature and a card return does not', async () => {
    expect((await settleReady({ signature: '' })).vm.canAdvance).toBe(false)
    expect((await settleReady({ signature: '', method: 'card' })).vm.canAdvance).toBe(true)
  })

  // Every line must be classified before the RETREC can be journalled — a bill row may arrive
  // without a goods group.
  test('an unclassified line blocks the return', async () => {
    const w = await mountBuilder({ initialLines: [LINE(), LINE({ name: 'Ukjent', goodsGroupId: null })] })
    w.setData({
      step: 'settle',
      method: 'card',
      reasonSel: { reasonType: 'Feilslag', reasonText: '' },
      customerPhone: '+4791000000'
    })
    await w.vm.$nextTick()
    expect(w.vm.canAdvance).toBe(false)
  })

  // Returns are money-moving and the card path has no idempotency key. A second tap while the first
  // request is in flight must not fire another payout.
  test('a request already in flight blocks a second tap', async () => {
    const w = await settleReady({ busy: true })
    expect(w.vm.canAdvance).toBe(false)
    expect(w.find('.rbuild__foot .rbuild__primary').attributes('disabled')).toBe('disabled')
  })

  test('an empty return cannot advance out of the build step', async () => {
    const w = await mountBuilder()
    expect(w.vm.step).toBe('build')
    expect(w.vm.canAdvance).toBe(false)
  })

  // The manual entry form has its own gate: a name, a positive amount, a quantity and a group.
  test('the manual line form refuses an incomplete or zero-amount line', async () => {
    const w = await mountBuilder()
    const draft = over => { w.setData({ draft: { name: 'Vare', quantity: 1, unitAmount: 5000, vatPercent: 25, goodsGroupId: 1, ...over } }); return w.vm.canAddLine }
    expect(draft({})).toBe(true)
    expect(draft({ name: '   ' })).toBe(false)
    expect(draft({ unitAmount: 0 })).toBe(false)
    expect(draft({ quantity: 0 })).toBe(false)
    expect(draft({ goodsGroupId: null })).toBe(false)
  })

  test('adding a manual line takes the derived rate over the operator-picked one', async () => {
    const w = await mountBuilder()
    w.setData({ draft: { name: 'Vare', quantity: 2, unitAmount: 5000, vatPercent: 25, goodsGroupId: 1 } })
    w.vm.addLine()
    expect(w.vm.lines[0].vatPercent).toBe(15)
    expect(w.vm.total).toBe(10000)
  })

  test('the card method is offered only where the acquirer has enabled unreferenced card returns', async () => {
    expect((await mountBuilder()).vm.cardReturnEnabled).toBe(false)
    const enabled = await mountBuilder({}, { cashPoint: { cashPointId: 'cp-1', unreferencedCardReturnEnabled: true } })
    expect(enabled.vm.cardReturnEnabled).toBe(true)
  })
})
