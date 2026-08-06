import { mount } from '@vue/test-utils'
import '~/plugins/global-mixin'
import { MINUS_SIGN, UNKNOWN_AMOUNT } from '~/utils/price'
import PosReceiptView from '~/components/admin/pos/PosReceiptView.vue'
import CheckLine from '~/components/admin/pos/CheckLine.vue'
import CheckPanel from '~/components/admin/pos/CheckPanel.vue'

// The three POS surfaces that wrote the SAME construction the X/Z report did — a minus sign as a
// template literal OUTSIDE the interpolation, `−{{ priceLabel(x) }}`, where no absence rule in this
// repo can see it. `L-XZ-NEGATED-ABSENCE` fixed six rows on `XReportView.vue`; these three were left.
//
// WHAT THIS LANE IS AND IS NOT. It is not a repeat of that defect. All three rows sit behind a
// `v-if="…discountAmount > 0"`, and that guard withholds `null`, `undefined`, `''`, `NaN`, a genuine
// zero and a negative before the row renders at all — so the ordinary absences never reach the label
// and an inspector holding a receipt cannot be shown `−—` by any of them. To claim otherwise would be
// asserting a defect the repository cannot show, which is the exact failure the baseline commit under
// this one is named for.
//
// WHAT IS ACTUALLY WRONG, stated no larger than it is. `x > 0` is a RELATIONAL test and
// `isAmountStated(x)` is the absence rule, and they do not agree. FOUR shapes pass the guard while
// the rule refuses them — `Infinity`, the string `'Infinity'`, `true`, and an object with a numeric
// `valueOf` — and every one of them reaches the label as an amount nobody stated. Before this lane
// the receipt row rendered `−—` for all four. `Infinity` is not hypothetical arithmetic:
// `JSON.parse('1e400')` IS `Infinity`, so a number literal past double range on the wire produces one
// without anybody writing it. A well-formed .NET `long` cannot get there, which is why this is
// hardening and not an incident. The full sixteen-shape table is
// `lanes/L-XZ-RESIDUAL-SITES/guard-vs-rule-probe.js`, and it is a script rather than a paragraph
// because the review this lane corrects reasoned about these predicates instead of running them.
//
// So the tests below are in three parts, and the middle one is the load-bearing one:
//   1. BEHAVIOUR-PRESERVING. A stated discount still prints its sign, unchanged, at all three sites.
//      Deleting the literal is the obvious way to be rid of `−—` and it silently turns a discount
//      into a surcharge.
//   2. THE WORLD THE GUARD DOES NOT SAVE. `Infinity` passes `> 0`, renders the row, and reaches the
//      label. This is real rendered DOM with the guard untouched and no fixture bent to make it fail.
//   3. THE GUARD ITSELF, PINNED. The absences the guard withholds are asserted to render NO ROW at
//      all — so it is on the record that the guard, not the label, is what hides them, and relaxing
//      it becomes a deliberate act that has to come back through this file.
//
// AND IT DID COME BACK THROUGH THIS FILE. `L-CHECK-DISCOUNT-SUM-COUPLED` relaxed it on the two CHECK
// surfaces, because the guard was hiding the wrong thing: the reducer one screen above CheckLine
// manufactured a zero out of a member line that never stated its discount, and the guard then
// deleted the row that absence should have produced. Those two sites split the list in three — a
// stated deduction, a stated NO deduction, and an amount nobody stated — and only the middle one is
// still silent. `PosReceiptView` is untouched and keeps the original list, so the assertions below
// are now a record of a real difference between a check and a receipt rather than a uniform rule.

const posMocks = () => ({
  $i: (key, args) => (args ? key + ':' + JSON.stringify(args) : key),
  $store: { dispatch: () => {}, subscribe: () => {} }
})

// The six shapes the `> 0` guard withholds. `-5000` is included because a negative discount is a
// figure somebody stated and the guard hides it just the same.
//
// STILL THE GUARD ON PosReceiptView, AND NO LONGER THE GUARD ON THE CHECK. `L-CHECK-DISCOUNT-SUM-
// COUPLED` did the deliberate act this file's closing section said would have to come back through
// it: CheckLine and CheckPanel now render their row on `isDeductionInPlay`, so the four ABSENCES
// below get a row carrying the unknown mark instead of vanishing, while the two STATED shapes are
// withheld exactly as before. The receipt is a wire object with no reducer in front of it and was
// out of that lane's scope, so it keeps all six. The split is below, and the two lists together are
// still these six shapes.
const GUARD_WITHHELD = [
  ['null', null],
  ['undefined', undefined],
  ['the empty string', ''],
  ['NaN', NaN],
  ['a genuine zero', 0],
  ['an already-negative amount', -5000]
]

// On the check surfaces: the amounts that STATE there was no deduction. These, and only these, are
// withheld now.
const STATED_NO_DEDUCTION = [
  ['a genuine zero', 0],
  ['an already-negative amount', -5000]
]

// On the check surfaces: the amounts nobody stated. Every one of them used to be dropped silently by
// the relational guard; every one of them now renders the row with the bare mark. `test/check-
// discount-sum.test.js` is where that change is argued and proved against the server's own
// `finalAmount`; this file pins that the four sites still agree about what a sign may attach to.
const UNSTATED_ON_A_CHECK = [
  ['null', null],
  ['undefined', undefined],
  ['the empty string', ''],
  ['NaN', NaN]
]

// Every shape that passes `> 0` while `isAmountStated` refuses it. Enumerated by running both
// predicates over sixteen candidates (`lanes/L-XZ-RESIDUAL-SITES/guard-vs-rule-probe.js`), not by
// reasoning about them — which is the step that produced the "unreachable" reading this lane
// corrects. If a shape is ever added to or removed from the absence rule, that probe is what says so.
const GUARD_ADMITS_UNSTATED = [
  ['Infinity', Infinity],
  ["the string 'Infinity'", 'Infinity'],
  ['a boolean true', true],
  ['an object with a numeric valueOf', { valueOf: () => 5000 }]
]

// ---------------------------------------------------------------------------------------------
// PosReceiptView — ported FIRST, because it is the only one of the three that is itself a
// kassasystemforskrifta artifact: it is what `print()` puts on the bong roll, and it is mounted from
// five surfaces (PaymentScreen, ReceiptsView, ReturnBuilder, RefundModal, SellScreen's proforma).
// It also reads `line.discountAmount` straight off the wire model, with no client-side reducer in
// between, so all three unstated-but-guard-passing shapes reach it.
// ---------------------------------------------------------------------------------------------

const receiptWith = discountAmount => ({
  registerId: 'K-1',
  operatorName: 'Ada',
  localDate: '05.08.2026',
  localTime: '18:04',
  receiptNumber: 1042,
  sellerLegalName: 'Kafé AS',
  title: 'SALGSKVITTERING',
  grossAmount: 12000,
  payments: [{ paymentType: 'Cash', amount: 12000 }],
  taxLines: [],
  lines: [{
    lineNumber: 1,
    quantity: 1,
    productName: 'Kaffe',
    lineAmount: 5000,
    unitAmount: 5000,
    depositAmount: 0,
    discountReason: 'Personalrabatt',
    discountAmount
  }]
})

const mountReceipt = discountAmount => mount(PosReceiptView, {
  propsData: { receipt: receiptWith(discountAmount) },
  mocks: posMocks()
})

const receiptDiscountRow = wrapper => wrapper.find('.receipt__line-discount')

describe('PosReceiptView — the per-line discount on a printed receipt', () => {
  test('a stated discount still prints its sign', () => {
    const wrapper = mountReceipt(5000)
    expect(receiptDiscountRow(wrapper).text()).toContain(MINUS_SIGN + 'kr 50,00')
    wrapper.destroy()
  })

  test.each(GUARD_ADMITS_UNSTATED)(
    'an amount the absence rule refuses but the guard admits (%s) renders the bare mark, unsigned',
    (_name, value) => {
      const wrapper = mountReceipt(value)
      const row = receiptDiscountRow(wrapper)
      // The guard let it through, so the row IS on the receipt. That is the point.
      expect(row.exists()).toBe(true)
      expect(row.text()).toContain(UNKNOWN_AMOUNT)
      expect(row.text()).not.toContain(MINUS_SIGN + UNKNOWN_AMOUNT)
      expect(row.text()).not.toContain(MINUS_SIGN)
      wrapper.destroy()
    })

  test.each(GUARD_WITHHELD)(
    'the `> 0` guard, not the label, is what withholds %s — no row renders',
    (_name, value) => {
      const wrapper = mountReceipt(value)
      expect(receiptDiscountRow(wrapper).exists()).toBe(false)
      wrapper.destroy()
    })

  // The whole document, not one row: with every amount on it absent, nothing anywhere may pair the
  // sign with the mark. This is the assertion that would catch a second discount row added later.
  test('no cell anywhere on a fully absent receipt pairs a sign with the unknown mark', () => {
    const receipt = receiptWith(null)
    receipt.grossAmount = null
    receipt.tipAmount = null
    receipt.roundingAmount = null
    receipt.tenderedAmount = null
    receipt.changeAmount = null
    receipt.lines[0].lineAmount = null
    receipt.lines[0].unitAmount = null
    receipt.lines[0].quantity = 2
    receipt.lines[0].discountAmount = Infinity
    receipt.payments = [{ paymentType: 'Cash', amount: null }]
    receipt.taxLines = [{ vatPercent: 25, basis: null, amount: null }]
    const wrapper = mount(PosReceiptView, { propsData: { receipt }, mocks: posMocks() })

    expect(wrapper.text()).not.toContain(MINUS_SIGN + UNKNOWN_AMOUNT)
    wrapper.destroy()
  })
})

// ---------------------------------------------------------------------------------------------
// CheckLine — the discount line on one grouped row of an open check.
// ---------------------------------------------------------------------------------------------

const groupWith = discountAmount => ({
  key: 'k1',
  name: 'Kaffe',
  productId: 7,
  isOpenPrice: false,
  options: [],
  notes: '',
  courseSequence: null,
  seatNumber: null,
  status: 'Pending',
  unitAmount: 5000,
  tax: 25,
  quantity: 1,
  lineAmount: 5000,
  depositAmount: 0,
  discountReason: 'Personalrabatt',
  lineIds: [1],
  discountAmount
})

const mountCheckLine = discountAmount => mount(CheckLine, {
  propsData: { group: groupWith(discountAmount) },
  mocks: posMocks()
})

describe('CheckLine — the discount line on an open check row', () => {
  test('a stated discount still prints its sign', () => {
    const wrapper = mountCheckLine(5000)
    expect(wrapper.find('.check-line__discount').text()).toContain(MINUS_SIGN + 'kr 50,00')
    wrapper.destroy()
  })

  test.each(GUARD_ADMITS_UNSTATED)(
    'an amount the absence rule refuses but the guard admits (%s) renders the bare mark, unsigned',
    (_name, value) => {
      const wrapper = mountCheckLine(value)
      const row = wrapper.find('.check-line__discount')
      expect(row.exists()).toBe(true)
      expect(row.text()).toContain(UNKNOWN_AMOUNT)
      expect(row.text()).not.toContain(MINUS_SIGN + UNKNOWN_AMOUNT)
      wrapper.destroy()
    })

  test.each(STATED_NO_DEDUCTION)(
    'an amount that states there was no deduction (%s) renders no row',
    (_name, value) => {
      const wrapper = mountCheckLine(value)
      expect(wrapper.find('.check-line__discount').exists()).toBe(false)
      wrapper.destroy()
    })

  test.each(UNSTATED_ON_A_CHECK)(
    'an amount nobody stated (%s) now gets its row, carrying the bare mark',
    (_name, value) => {
      const wrapper = mountCheckLine(value)
      const row = wrapper.find('.check-line__discount')
      expect(row.exists()).toBe(true)
      expect(row.text()).toContain(UNKNOWN_AMOUNT)
      expect(row.text()).not.toContain(MINUS_SIGN)
      wrapper.destroy()
    })
})

// ---------------------------------------------------------------------------------------------
// CheckPanel — the discount TOTAL in the check footer, and the CheckLine rows it renders as
// children. Mounted whole rather than shallow, so the child row is real DOM too.
// ---------------------------------------------------------------------------------------------

const checkWith = discountAmount => ({
  tableId: null,
  tableName: null,
  couverts: 2,
  deliveryType: 'TableDelivery',
  finalAmount: 7000,
  items: [{
    orderLineItemId: 1,
    productId: 7,
    name: 'Kaffe',
    isOpenPrice: false,
    options: [],
    notes: '',
    courseSequence: null,
    seatNumber: null,
    status: 'Pending',
    unitAmount: 5000,
    tax: 25,
    quantity: 1,
    netLineAmount: 5000,
    depositAmount: 0,
    discountReason: 'Personalrabatt',
    discountAmount
  }]
})

const mountPanel = discountAmount => mount(CheckPanel, {
  propsData: { check: checkWith(discountAmount) },
  mocks: posMocks()
})

describe('CheckPanel — the discount total in the check footer', () => {
  test('a stated discount total still prints its sign', () => {
    const wrapper = mountPanel(5000)
    expect(wrapper.find('.check-panel__discount').text()).toBe(MINUS_SIGN + 'kr 50,00')
    wrapper.destroy()
  })

  // `groups` used to reduce `line.discountAmount || 0` into a number it seeded itself, and three of
  // the four shapes were ARITHMETICALLY ABSORBED on the way here rather than refused: `0 + true` was
  // 1, `0 + {valueOf:()=>5000}` was 5000, and `0 + 'Infinity'` was the STRING '0Infinity'. Two of
  // those reached the footer as real figures. `statedSum` refuses all four at the reducer, so every
  // one of them arrives as `null` and the footer prints the mark — which is why the panel now takes
  // the same four cases the other two sites do instead of the one that used to survive.
  test.each(GUARD_ADMITS_UNSTATED)(
    'the reducer refuses %s rather than absorbing it, and the footer prints the bare mark',
    (_name, value) => {
      const wrapper = mountPanel(value)
      const cell = wrapper.find('.check-panel__discount')
      expect(cell.exists()).toBe(true)
      expect(cell.text()).toBe(UNKNOWN_AMOUNT)
      expect(cell.text()).not.toContain(MINUS_SIGN)
      wrapper.destroy()
    })

  test.each(STATED_NO_DEDUCTION)(
    'an amount that states there was no deduction (%s) renders no discount row',
    (_name, value) => {
      const wrapper = mountPanel(value)
      expect(wrapper.find('.check-panel__discount').exists()).toBe(false)
      wrapper.destroy()
    })

  test.each(UNSTATED_ON_A_CHECK)(
    'an amount nobody stated (%s) now gets its footer row, carrying the bare mark',
    (_name, value) => {
      const wrapper = mountPanel(value)
      const cell = wrapper.find('.check-panel__discount')
      expect(cell.exists()).toBe(true)
      expect(cell.text()).toBe(UNKNOWN_AMOUNT)
      wrapper.destroy()
    })

  // The panel renders CheckLine for real, so the child's discount row is covered by the same mount.
  test('the child check line is real DOM in this mount and carries the same sign', () => {
    const wrapper = mountPanel(5000)
    expect(wrapper.findAllComponents(CheckLine)).toHaveLength(1)
    expect(wrapper.find('.check-line__discount').text()).toContain(MINUS_SIGN + 'kr 50,00')
    wrapper.destroy()
  })

  test('nothing anywhere in the panel pairs a sign with the unknown mark', () => {
    const check = checkWith(Infinity)
    check.finalAmount = null
    check.items[0].netLineAmount = null
    check.items[0].unitAmount = null
    const wrapper = mount(CheckPanel, { propsData: { check }, mocks: posMocks() })

    expect(wrapper.text()).not.toContain(MINUS_SIGN + UNKNOWN_AMOUNT)
    wrapper.destroy()
  })
})

// ---------------------------------------------------------------------------------------------
// The label reached DIRECTLY, with the guard out of the picture entirely.
//
// The guard was incidental safety: nobody wrote `> 0` as an absence gate, no comment marked it
// load-bearing, and CheckLine's guard in particular protected a field its own parent constructs. The
// prediction written here was that if it were ever relaxed — to distinguish "no discount" from
// "discount unknown", say — every one of the four worlds below would become renderable in the same
// edit. That is exactly what happened one lane later, and on the two check surfaces the ABSENT world
// is renderable today. The port landing first is why that lane changed a guard instead of shipping
// `−—`, and this describe block is why the label was already right when it did.
// ---------------------------------------------------------------------------------------------

describe('negatedPriceLabel, reached directly at each of the three sites', () => {
  const sites = [
    ['PosReceiptView', () => mount(PosReceiptView,
      { propsData: { receipt: receiptWith(5000) }, mocks: posMocks() })],
    ['CheckLine', () => mount(CheckLine,
      { propsData: { group: groupWith(5000) }, mocks: posMocks() })],
    ['CheckPanel', () => mount(CheckPanel,
      { propsData: { check: checkWith(5000) }, mocks: posMocks() })]
  ]

  describe.each(sites)('%s', (_name, factory) => {
    test('a stated magnitude keeps its sign and the formatter only sees the magnitude', () => {
      const wrapper = factory()
      const seen = []
      wrapper.vm.priceLabel = (v) => { seen.push(v); return 'F' + v }
      expect(wrapper.vm.negatedPriceLabel(5000)).toBe(MINUS_SIGN + 'F5000')
      // core's priceLabel renders -4 as "kr 0,-4" and -50 as "kr -,50"; it must never see a negative.
      expect(seen).toEqual([5000])
      wrapper.destroy()
    })

    test('every shape of absence is the bare mark, with no sign', () => {
      const wrapper = factory()
      for (const absent of [null, undefined, '', '   ', NaN, Infinity, true, {}]) {
        expect(wrapper.vm.negatedPriceLabel(absent)).toBe(UNKNOWN_AMOUNT)
      }
      wrapper.destroy()
    })

    test('a genuine zero is a figure, printed unsigned', () => {
      const wrapper = factory()
      expect(wrapper.vm.negatedPriceLabel(0)).toBe('kr 0,00')
      expect(wrapper.vm.negatedPriceLabel(0)).not.toContain(MINUS_SIGN)
      wrapper.destroy()
    })

    test('an already-negative amount is not negated twice', () => {
      const wrapper = factory()
      expect(wrapper.vm.negatedPriceLabel(-5000)).toBe('kr 50,00')
      expect(wrapper.vm.negatedPriceLabel(-5000)).not.toContain('-50')
      wrapper.destroy()
    })
  })
})
