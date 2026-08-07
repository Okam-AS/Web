import { webcrypto } from 'crypto'
import { mount } from '@vue/test-utils'
import '~/plugins/global-mixin'
import '~/plugins/i18n'
import RefundModal from '~/components/admin/pos/RefundModal.vue'
import SplitBillModal from '~/components/admin/pos/SplitBillModal.vue'

// See `pos-return-document-amount-and-vat.test.js` for why these two lines are here: `RefundModal`
// generates its refund idempotency key in `data()` and jsdom 16.7 has no `crypto` global, and
// `SignaturePad`'s `mounted` needs a canvas 2d context jsdom does not provide. Both are platform
// gaps, not product behaviour, and neither is stubbed anywhere it would hide a rule under test.
if (typeof global.crypto === 'undefined') { global.crypto = webcrypto }

// RefundModal (12.6%, 45 uncovered branches) pays money back against a sale that already happened.
// SplitBillModal (3.6%) decides which guest at a table owes what. Neither was executed by any test.
//
// What is pinned in each is the one number a person would notice being wrong: the CAP on a refund,
// and the per-guest SUBTOTAL — plus, in both cases, the gate that stops the money moving before the
// document can be explained.

const storeFor = locale => ({ state: { adminLocale: locale }, dispatch () {}, subscribe () {} })

const fakePos = () => ({
  cashPoint: { cashPointId: 'cp-1' },
  posSvc: () => ({}),
  checkSvc: () => ({}),
  errMsg: e => String(e),
  printReceiptDoc: () => {}
})

// ------------------------------------------------------------------------------------------------
// RefundModal — the cap
// ------------------------------------------------------------------------------------------------

const CARD_LINE = { paymentType: 'DinteroTerminal', amount: 20000, paymentTransactionId: 'tx-1' }
const CASH_LINE = { paymentType: 'Cash', amount: 30000 }

const receipt = over => ({
  journalEntryId: 'je-1',
  receiptType: 'Sale',
  grossAmount: 30000,
  tipAmount: 0,
  payments: [CASH_LINE],
  lines: [],
  taxLines: [],
  ...over
})

const mountRefund = (over = {}, data = {}) => {
  const w = mount(RefundModal, {
    propsData: { receipt: receipt(over) },
    provide: { pos: fakePos() },
    stubs: { SignaturePad: true },
    mocks: { $store: storeFor('no') }
  })
  if (Object.keys(data).length) { w.setData(data) }
  return w
}

describe('RefundModal — a refund is capped at what was actually taken', () => {
  test('a plain cash sale may be refunded in full', () => {
    const w = mountRefund()
    expect(w.vm.maxAmount).toBe(30000)
    expect(w.vm.effectiveAmount).toBe(30000)
  })

  // A split settlement: 200,00 went to the card and 100,00 to cash. Refunding the card must not
  // return the whole 300,00 sale to a tender that only carried 200,00.
  test('a split sale refunds only what went to THIS tender', () => {
    const w = mountRefund({ payments: [CARD_LINE, CASH_LINE] })
    expect(w.vm.isCard).toBe(true)
    expect(w.vm.cardLine).toBe(w.vm.receipt.payments[0])
    expect(w.vm.maxAmount).toBe(20000)
  })

  // A tip is not reversed by a RETREC. A tender that carried gross + tip must still cap at gross.
  test('a tender larger than the sale gross is capped at the gross, so a tip is not refunded', () => {
    const w = mountRefund({ grossAmount: 30000, tipAmount: 5000, payments: [{ paymentType: 'Cash', amount: 35000 }] })
    expect(w.vm.maxAmount).toBe(30000)
  })

  test('a receipt with no payment lines falls back to the sale gross rather than crashing', () => {
    const w = mountRefund({ payments: [] })
    expect(w.vm.maxAmount).toBe(30000)
  })

  test('a partial refund pays the typed amount, a full refund pays the cap', () => {
    expect(mountRefund({}, { amountMode: 'partial', partialAmount: 12500 }).vm.effectiveAmount).toBe(12500)
    expect(mountRefund({}, { amountMode: 'full', partialAmount: 12500 }).vm.effectiveAmount).toBe(30000)
  })

  test('a cash sale is not a card sale and needs a signature', () => {
    const cash = mountRefund()
    expect(cash.vm.isCard).toBe(false)
    expect(cash.vm.requiresSignature).toBe(true)
    const card = mountRefund({ payments: [CARD_LINE] })
    expect(card.vm.isCard).toBe(true)
    expect(card.vm.requiresSignature).toBe(false)
  })

  // The card line is identified by its transaction id, not by its payment type — a card line whose
  // transaction never came back cannot be refunded to the card.
  test('a card payment line with no transaction id is not refundable to the card', () => {
    const w = mountRefund({ payments: [{ paymentType: 'DinteroTerminal', amount: 30000 }] })
    expect(w.vm.isCard).toBe(false)
  })

  test('each modal instance carries its own refund idempotency key', () => {
    expect(mountRefund().vm.returnId).not.toBe(mountRefund().vm.returnId)
  })
})

describe('RefundModal — nothing is paid back until the refund can be explained', () => {
  const ready = (over = {}, data = {}) => mountRefund(over, {
    reasonSel: { reasonType: 'Feilslag', reasonText: '' },
    customerPhone: '+4791000000',
    signature: 'data:image/png;base64,AAA',
    ...data
  })

  test('a complete cash refund may continue', () => {
    expect(ready().vm.canContinue).toBe(true)
  })

  test('no reason, no refund', () => {
    expect(ready({}, { reasonSel: { reasonType: 'None', reasonText: '' } }).vm.canContinue).toBe(false)
  })

  test('the free-text reason must carry text', () => {
    expect(ready({}, { reasonSel: { reasonType: 'Annet', reasonText: '  ' } }).vm.canContinue).toBe(false)
    expect(ready({}, { reasonSel: { reasonType: 'Annet', reasonText: 'Feil vare' } }).vm.canContinue).toBe(true)
  })

  test('no customer phone, no refund', () => {
    expect(ready({}, { customerPhone: '   ' }).vm.canContinue).toBe(false)
  })

  test('cash back needs a signature, a card refund does not', () => {
    expect(ready({}, { signature: '' }).vm.canContinue).toBe(false)
    expect(ready({ payments: [CARD_LINE] }, { signature: '' }).vm.canContinue).toBe(true)
  })

  // The cap is enforced on the button, not only in the request. One øre over what the tender
  // carried is refused.
  test('a partial refund above the cap is refused', () => {
    expect(ready({}, { amountMode: 'partial', partialAmount: 30001 }).vm.canContinue).toBe(false)
    expect(ready({}, { amountMode: 'partial', partialAmount: 30000 }).vm.canContinue).toBe(true)
  })

  test('a zero or negative partial refund is refused', () => {
    expect(ready({}, { amountMode: 'partial', partialAmount: 0 }).vm.canContinue).toBe(false)
    expect(ready({}, { amountMode: 'partial', partialAmount: -100 }).vm.canContinue).toBe(false)
  })

  // The card refund path has no idempotency key of its own, so a second tap while the first request
  // is in flight would refund the customer twice.
  test('a request already in flight blocks a second tap', () => {
    expect(ready({}, { busy: true }).vm.canContinue).toBe(false)
  })
})

// ------------------------------------------------------------------------------------------------
// SplitBillModal — what each guest owes
// ------------------------------------------------------------------------------------------------

const item = (id, seat, net) => ({ orderLineItemId: id, seatNumber: seat, netLineAmount: net, productName: 'Vare', quantity: 1 })

const mountSplitBill = check => mount(SplitBillModal, {
  propsData: { check },
  provide: { pos: fakePos() },
  mocks: { $store: storeFor('no') }
})

describe('SplitBillModal — the per-guest subtotal is what each guest is asked to pay', () => {
  const seated = () => mountSplitBill({
    orderId: 'o-1',
    couverts: 2,
    items: [item('a', 1, 18900), item('b', 2, 3900), item('c', 1, 5900)]
  })

  test('each guest\'s bucket sums only that guest\'s lines', () => {
    const b = seated().vm.seatBuckets
    expect(b).toHaveLength(2)
    expect(b[0]).toMatchObject({ seat: 1, subtotal: 24800 })
    expect(b[1]).toMatchObject({ seat: 2, subtotal: 3900 })
  })

  test('the buckets together are the whole bill, with nothing counted twice', () => {
    const b = seated().vm.seatBuckets
    expect(b.reduce((s, x) => s + x.subtotal, 0)).toBe(18900 + 3900 + 5900)
    expect(b.reduce((s, x) => s + x.lines.length, 0)).toBe(3)
  })

  // NOTE ON THE SOURCE, recorded rather than asserted away, in the same shape as the note in
  // `pos-split-payment-shares.test.js`: the `.sort((a, b) => a.seat - b.seat)` at the end of
  // `seatBuckets` is REDUNDANT. The buckets are accumulated into a plain object keyed by seat
  // number, and `Object.keys` returns integer-like keys in ascending numeric order by language
  // guarantee — for `[3, 1, 2]` it returns `['1','2','3']` whether the keys were written as
  // numbers or as strings. Deleting the sort was checked and changes no answer this component can
  // reach (seat numbers are positive integers 1..20, set from `seatChips`).
  //
  // So this test cannot red on the sort being DELETED, and that is a property of JavaScript, not
  // evidence of protection. It does red on the ordering being WRONG — a reversed comparator fails
  // it and two of its neighbours (3 tests), as does walking the keys backwards. Kept for that, and
  // the redundancy is named here so nobody reads the line as load-bearing.
  test('the buckets are ordered by guest number, not by the order lines arrived in', () => {
    const w = mountSplitBill({ orderId: 'o-1', couverts: 3, items: [item('a', 3, 100), item('b', 1, 200), item('c', 2, 300)] })
    expect(w.vm.seatBuckets.map(x => x.seat)).toEqual([1, 2, 3])
  })

  // A line nobody has placed belongs to nobody, so it must not silently land in a bucket and be
  // charged to a guest who did not order it.
  test('an unplaced line joins no bucket and blocks the split', () => {
    const w = mountSplitBill({ orderId: 'o-1', couverts: 2, items: [item('a', 1, 18900), item('b', null, 3900)] })
    expect(w.vm.unassignedLines.map(l => l.orderLineItemId)).toEqual(['b'])
    expect(w.vm.allPlaced).toBe(false)
    expect(w.vm.bySeatValid).toBe(false)
    expect(w.vm.seatBuckets.reduce((s, x) => s + x.subtotal, 0)).toBe(18900)
  })

  test('placing the last line makes the split valid and moves the money into a bucket', () => {
    const w = mountSplitBill({ orderId: 'o-1', couverts: 2, items: [item('a', 1, 18900), item('b', null, 3900)] })
    w.vm.placeLine(w.vm.lines[1], 2)
    expect(w.vm.allPlaced).toBe(true)
    expect(w.vm.bySeatValid).toBe(true)
    expect(w.vm.seatBuckets.map(x => x.subtotal)).toEqual([18900, 3900])
  })

  // One guest holding every line is not a split; the whole bill would be one part.
  test('every line on one guest is not a valid split', () => {
    const w = mountSplitBill({ orderId: 'o-1', couverts: 2, items: [item('a', 1, 18900), item('b', 1, 3900)] })
    expect(w.vm.allPlaced).toBe(true)
    expect(w.vm.seatBuckets).toHaveLength(1)
    expect(w.vm.bySeatValid).toBe(false)
  })

  test('the per-guest mode is offered only when the check carries seat tags', () => {
    expect(seated().vm.hasSeats).toBe(true)
    expect(seated().vm.mode).toBe('BySeat')
    const untagged = mountSplitBill({ orderId: 'o-1', couverts: 2, items: [item('a', null, 100)] })
    expect(untagged.vm.hasSeats).toBe(false)
    expect(untagged.vm.mode).toBe('ByItem')
  })
})

describe('SplitBillModal — the guest chips offered for placement', () => {
  test('at least the party size, and at least two', () => {
    expect(mountSplitBill({ orderId: 'o-1', couverts: 5, items: [item('a', 1, 100)] }).vm.maxSeat).toBe(5)
    expect(mountSplitBill({ orderId: 'o-1', couverts: 0, items: [item('a', null, 100)] }).vm.maxSeat).toBe(2)
  })

  // A line tagged for guest 7 at a table booked for 2 must still have a chip to sit on, or its
  // money could never be placed.
  test('a seat above the party size still gets a chip', () => {
    expect(mountSplitBill({ orderId: 'o-1', couverts: 2, items: [item('a', 7, 100)] }).vm.maxSeat).toBe(7)
  })

  test('the chip row is capped at twenty', () => {
    const w = mountSplitBill({ orderId: 'o-1', couverts: 40, items: [item('a', 1, 100)] })
    expect(w.vm.maxSeat).toBe(20)
    expect(w.vm.seatChips).toHaveLength(20)
    expect(w.vm.seatChips[0]).toBe(1)
  })
})

describe('SplitBillModal — by-item parts', () => {
  test('every line starts on part one', () => {
    const w = mountSplitBill({ orderId: 'o-1', couverts: 0, items: [item('a', null, 100), item('b', null, 200)] })
    expect(Object.values(w.vm.assignments)).toEqual([1, 1])
  })

  // Reducing the part count must pull assignments back into range, or a line would be assigned to a
  // part that no longer exists and its money would leave the split.
  test('reducing the part count clamps assignments that are now out of range', () => {
    const w = mountSplitBill({ orderId: 'o-1', couverts: 0, items: [item('a', null, 100), item('b', null, 200)] })
    w.vm.setParts(4)
    w.vm.$set(w.vm.assignments, 0, 4)
    w.vm.$set(w.vm.assignments, 1, 2)
    w.vm.setParts(2)
    expect(w.vm.partCount).toBe(2)
    expect(Object.values(w.vm.assignments)).toEqual([2, 2])
  })

  test('a paid part is remembered and blocks reverting the split', () => {
    const w = mountSplitBill({ orderId: 'o-1', couverts: 0, items: [item('a', null, 100)] })
    w.setData({ splitModel: { parts: [{ partOrderId: 'p1', partNumber: 1 }, { partOrderId: 'p2', partNumber: 2 }] } })
    expect(w.vm.anyPaid).toBe(false)
    expect(w.vm.allPaid).toBe(false)
    w.setData({ paid: { p1: true } })
    expect(w.vm.anyPaid).toBe(true)
    expect(w.vm.allPaid).toBe(false)
    w.setData({ paid: { p1: true, p2: true } })
    expect(w.vm.allPaid).toBe(true)
  })

  test('a per-guest part reads out by guest, and the other modes by part number', () => {
    const w = mountSplitBill({ orderId: 'o-1', couverts: 0, items: [item('a', null, 100)] })
    expect(w.vm.partLabel({ partNumber: 2 })).toContain('2')
    w.setData({ partLabels: { 2: 'Gjest 2' } })
    expect(w.vm.partLabel({ partNumber: 2 })).toBe('Gjest 2')
  })
})
