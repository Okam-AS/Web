import { mount } from '@vue/test-utils'
import '~/plugins/global-mixin'
import { MINUS_SIGN, UNKNOWN_AMOUNT } from '~/utils/price'
import PosReceiptView from '~/components/admin/pos/PosReceiptView.vue'

// A PRINTED RECEIPT THAT DOES NOT ADD UP.
//
// `PosReceiptView` is the kassasystemforskrifta artifact itself — what `print()` puts on the bong
// roll and what an inspector reads. Its per-line discount row was guarded on
// `v-if="line.discountAmount > 0"`, taking the wire object directly with no reducer in front of it,
// so an amount nobody stated was deleted from the page along with every trace that a deduction had
// been taken there.
//
// WHY THAT IS ARITHMETIC AND NOT LAYOUT, AND WHY THE CHECK IS DIFFERENT. The sibling lane
// `L-CHECK-DISCOUNT-SUM-COUPLED` corrected its own brief: on an open check the claim "the total
// disagrees with its own lines" DOES NOT HOLD, because `CheckLine` renders `netLineAmount`, which is
// already net of the discount, so the rows sum to `finalAmount` whether or not the deduction row is
// shown. The receipt does not share that property, and the fields are the reason:
//
//   JournalLineFactory.cs:95-105   LineAmount = unitGross * quantity      <-- GROSS of the discount
//                                  DiscountAmount journalled BESIDE it
//                                  netLineAmount = lineAmount - discountAmount, never journalled
//   FinalizeService.cs:150-160     netLineTotal = SUM(LineAmount) - SUM(DiscountAmount)
//                                  grossAmount  = netLineTotal + roundingAmount
//   FinalizeService.cs:169         netLineTotal == order.FinalAmount, ENFORCED on the single
//                                  finalize path so a sale can never be journalled with a total
//                                  that disagrees with its own lines
//   PosReceiptService.cs:161       receipt.GrossAmount = entry.GrossAmount
//
// `PosReceiptView` prints `line.lineAmount` per row and `receipt.grossAmount` as the grand total —
// gross rows above, net total below. The DEDUCTION ROWS ARE THE ONLY THING ON THE PAGE THAT BRIDGES
// THEM. Drop one and the printed document has ore missing with nothing on it to say why. So the
// stronger claim the check could not support is true here, and only here.
//
// PROVED AGAINST THE BACKEND, NOT AGAINST THE COMPONENT. The world below is not invented: it is the
// exact combination the backend's own end-to-end test asserts in
// `WebApi.Tests/Kassa/Cov_FinalizeVatTests.cs`
// (`FinalizeMixedVatDiscountedCheck_SplitsVatPerRateOnDiscountedNet`) — a 25 % drink at 20000 and a
// 15 % food at 10000, a whole-order 20 % discount distributed proportionally to 4000 and 2000,
// `check.FinalAmount == 24000`, `receipt.GrossAmount == 24000`, `receipt.RoundingAmount == 0`. A
// whole-order discount SPLIT ACROSS LINES is the ordinary case, which is why "one line went silent"
// is the ordinary shape of this bug rather than a contrived one.
//
// WHY THE ASSERTION IS A RECONCILIATION AND NOT AN `exists()`. A document-level `exists()` check
// PASSES ON THE OLD CODE here: the drink's discount did arrive, so its row renders and the page has
// a `.receipt__line-discount` on it — while the food line's deduction is gone and 20,00 is
// unaccounted for. The only assertion that can tell those two pages apart is the one that adds the
// printed figures up and compares the result to the number the backend charged.
//
// HONEST SIZE. `PosReceiptLineModel.DiscountAmount` is a non-nullable `int` serialised by Newtonsoft
// with default null/default handling (`Helpers/ServiceCollectionExtensions.cs:156-165`), so a
// well-formed response from this backend always states it and no receipt printed today is missing a
// row. This is hardening, and it is estate agreement: `CheckLine` and `CheckPanel` already split
// these three worlds and the receipt was the last surface answering differently. The tests are named
// for the reconciliation rather than for an incident.

const posMocks = () => ({
  $i: (key, args) => (args ? key + ':' + JSON.stringify(args) : key),
  $store: { dispatch: () => {}, subscribe: () => {} }
})

// Cov_FinalizeVatTests.cs, verbatim. Named as constants so a reader can see that every number the
// assertions compare against came off the backend rather than out of this file.
const DRINK_LINE_AMOUNT = 20000
const FOOD_LINE_AMOUNT = 10000
const DRINK_DISCOUNT = 4000
const FOOD_DISCOUNT = 2000
const BACKEND_FINAL_AMOUNT = 24000 // check.FinalAmount and receipt.GrossAmount, rounding 0
const UNDISCOUNTED_TOTAL = DRINK_LINE_AMOUNT + FOOD_LINE_AMOUNT // 30000

// `receipt.grossAmount` is what the page prints as its grand total, and the backend's invariant is
// what makes that the same number as the order's `finalAmount`. Asserting the identity here rather
// than hard-coding it twice means a fixture that drifts off the backend fails loudly.
test('the world under these tests is the backend arithmetic, not a fixture', () => {
  expect(UNDISCOUNTED_TOTAL - (DRINK_DISCOUNT + FOOD_DISCOUNT)).toBe(BACKEND_FINAL_AMOUNT)
})

// A receipt as the server builds it: gross line amounts, the discounts beside them, and the grand
// total already net of both. `discounts` is the only thing the three worlds vary.
const receiptWith = ([drinkDiscount, foodDiscount], grossAmount = BACKEND_FINAL_AMOUNT) => ({
  registerId: 'K-1',
  operatorName: 'Ada',
  localDate: '05.08.2026',
  localTime: '18:04',
  receiptNumber: 1042,
  sellerLegalName: 'Kafé AS',
  title: 'SALGSKVITTERING',
  grossAmount,
  roundingAmount: 0,
  tipAmount: 0,
  tenderedAmount: 0,
  changeAmount: 0,
  payments: [{ paymentType: 'Cash', amount: grossAmount }],
  taxLines: [],
  lines: [
    {
      lineNumber: 1,
      quantity: 1,
      productName: 'Brus',
      lineAmount: DRINK_LINE_AMOUNT,
      unitAmount: DRINK_LINE_AMOUNT,
      depositAmount: 0,
      discountReason: '20 %',
      discountAmount: drinkDiscount
    },
    {
      lineNumber: 2,
      quantity: 1,
      productName: 'Bolle',
      lineAmount: FOOD_LINE_AMOUNT,
      unitAmount: FOOD_LINE_AMOUNT,
      depositAmount: 0,
      discountReason: '20 %',
      discountAmount: foodDiscount
    }
  ]
})

const mountReceipt = (discounts, grossAmount) => mount(PosReceiptView, {
  propsData: { receipt: receiptWith(discounts, grossAmount) },
  mocks: posMocks()
})

// Read an amount back OFF THE PAGE. The tests must add up what was actually printed, not what was
// handed in, or they would be re-deriving the component's own input. The admin format is
// "kr 1 234,50": a "kr " prefix, a space thousands separator, a comma before the ore. A cell also
// carries its label ("20 % −kr 40,00"), so the figure is matched out rather than parsed positionally
// — and exactly one figure must be found, so a cell that somehow printed two cannot be read as one.
const MONEY = /kr\s*([\d ]+),(\d{2})/g

const oreFromLabel = (text) => {
  const found = [...text.matchAll(MONEY)]
  expect(found).toHaveLength(1)
  const [, kroner, ore] = found[0]
  return Number(kroner.replace(/\s/g, '')) * 100 + Number(ore)
}

// Everything the printed page states about money, read out of the rendered DOM.
const readPage = (wrapper) => {
  const lineRows = wrapper.findAll('.receipt__line')
  const lines = []
  for (let i = 0; i < lineRows.length; i++) {
    const row = lineRows.at(i)
    const deduction = row.find('.receipt__line-discount')
    lines.push({
      amount: oreFromLabel(row.find('.receipt__line-amount').text()),
      // `null` where the row carries the unknown mark: the page says a deduction was taken and does
      // not say how much. Distinct from `0`, which is the page saying nothing came off this line.
      deduction: !deduction.exists()
        ? 0
        : (deduction.text().includes(UNKNOWN_AMOUNT) ? null : oreFromLabel(deduction.text())),
      hasDeductionRow: deduction.exists()
    })
  }
  return {
    lines,
    printedTotal: oreFromLabel(wrapper.find('.receipt__total-grand').text()),
    printedLineSum: lines.reduce((s, l) => s + l.amount, 0),
    statedDeductions: lines.reduce((s, l) => s + (l.deduction || 0), 0),
    markedUnknownLines: lines.filter(l => l.deduction === null)
  }
}

describe('a printed receipt reconciles its own lines to its own total', () => {
  test('present: both deductions are stated, and the printed page adds up', () => {
    const wrapper = mountReceipt([DRINK_DISCOUNT, FOOD_DISCOUNT])
    const page = readPage(wrapper)

    // The total on the paper is the number the backend charged.
    expect(page.printedTotal).toBe(BACKEND_FINAL_AMOUNT)
    // The rows above it are GROSS, so they do NOT equal it on their own.
    expect(page.printedLineSum).toBe(UNDISCOUNTED_TOTAL)
    expect(page.printedLineSum).not.toBe(page.printedTotal)
    // The deduction rows are what closes the gap, and here they close it completely.
    expect(page.statedDeductions).toBe(DRINK_DISCOUNT + FOOD_DISCOUNT)
    expect(page.printedLineSum - page.statedDeductions).toBe(page.printedTotal)
    expect(page.markedUnknownLines).toHaveLength(0)
    wrapper.destroy()
  })

  test('genuinely zero: nothing came off, no deduction row, and the page still adds up', () => {
    const wrapper = mountReceipt([0, 0], UNDISCOUNTED_TOTAL)
    const page = readPage(wrapper)

    expect(page.printedTotal).toBe(UNDISCOUNTED_TOTAL)
    expect(page.printedLineSum - page.statedDeductions).toBe(page.printedTotal)
    // A "Rabatt kr 0,00" line on every ordinary bill is noise, and a stated zero is a figure that
    // says nothing came off. Both rows stay off the paper.
    expect(page.lines.filter(l => l.hasDeductionRow)).toHaveLength(0)
    wrapper.destroy()
  })

  // THE LANE. The food line's deduction never arrived; the backend still charged the discounted
  // total and the page still prints it.
  test('absent: the printed total still agrees with the backend finalAmount', () => {
    const wrapper = mountReceipt([DRINK_DISCOUNT, null])
    const page = readPage(wrapper)

    expect(page.printedTotal).toBe(BACKEND_FINAL_AMOUNT)
    expect(page.printedLineSum).toBe(UNDISCOUNTED_TOTAL)
    wrapper.destroy()
  })

  test('absent: the page cannot reconcile from its stated figures alone', () => {
    const wrapper = mountReceipt([DRINK_DISCOUNT, null])
    const page = readPage(wrapper)

    // Only one deduction figure is on the paper, so the arithmetic does not close.
    expect(page.statedDeductions).toBe(DRINK_DISCOUNT)
    const residual = page.printedLineSum - page.statedDeductions - page.printedTotal
    // Exactly the deduction the backend took on the line that went silent.
    expect(residual).toBe(FOOD_DISCOUNT)
    wrapper.destroy()
  })

  // The assertion the old guard fails and an `exists()` check cannot make. The residual is real
  // either way; what the fix changes is whether the page ADMITS it. Ore that the printed figures do
  // not account for must be attached to a row that says the amount is unknown — otherwise the
  // document silently asserts that 20,00 went nowhere.
  test('absent: no ore is left unaccounted for AND unmarked', () => {
    const wrapper = mountReceipt([DRINK_DISCOUNT, null])
    const page = readPage(wrapper)

    const residual = page.printedLineSum - page.statedDeductions - page.printedTotal
    const unaccountedAndUnmarked = page.markedUnknownLines.length > 0 ? 0 : residual
    expect(unaccountedAndUnmarked).toBe(0)
    wrapper.destroy()
  })

  // …and marked on the RIGHT line. A fix that renders a mark anywhere on the page would satisfy the
  // assertion above; the residual belongs to the food line and the row has to be on it.
  test('absent: the unknown mark sits on the line the residual belongs to', () => {
    const wrapper = mountReceipt([DRINK_DISCOUNT, null])
    const page = readPage(wrapper)

    expect(page.markedUnknownLines).toHaveLength(1)
    expect(page.markedUnknownLines[0].amount).toBe(FOOD_LINE_AMOUNT)
    // The drink's row is untouched: a stated deduction still prints its figure and its sign.
    expect(page.lines[0].deduction).toBe(DRINK_DISCOUNT)
    wrapper.destroy()
  })

  // Why the reconciliation had to be the assertion. Stated verbatim so the next reader does not
  // "simplify" these tests into a presence check.
  test('an exists() check on this page passes on the old guard too', () => {
    const wrapper = mountReceipt([DRINK_DISCOUNT, null])
    // The drink's discount arrived, so SOME discount row is on the page in the absent world — which
    // is exactly what the `> 0` guard also produced, while dropping the food line's.
    expect(wrapper.find('.receipt__line-discount').exists()).toBe(true)
    wrapper.destroy()
  })
})

describe('the deduction row itself, in the three worlds', () => {
  const rowFor = (wrapper, index) =>
    wrapper.findAll('.receipt__line').at(index).find('.receipt__line-discount')

  test('a stated deduction prints its figure with the typographic minus', () => {
    const wrapper = mountReceipt([DRINK_DISCOUNT, FOOD_DISCOUNT])
    expect(rowFor(wrapper, 0).text()).toContain(MINUS_SIGN + 'kr 40,00')
    expect(rowFor(wrapper, 1).text()).toContain(MINUS_SIGN + 'kr 20,00')
    wrapper.destroy()
  })

  test.each([
    ['a genuine zero', 0],
    ['an already-negative amount', -5000]
  ])('%s states that nothing came off, and renders no row', (_name, value) => {
    const wrapper = mountReceipt([DRINK_DISCOUNT, value])
    expect(rowFor(wrapper, 1).exists()).toBe(false)
    wrapper.destroy()
  })

  test.each([
    ['null', null],
    ['undefined', undefined],
    ['the empty string', ''],
    ['a blank string', '   '],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ["the string 'Infinity'", 'Infinity'],
    ['a boolean true', true],
    ['an object with a numeric valueOf', { valueOf: () => 5000 }]
  ])('%s states nothing at all, and renders the row carrying the bare mark', (_name, value) => {
    const wrapper = mountReceipt([DRINK_DISCOUNT, value])
    const row = rowFor(wrapper, 1)
    expect(row.exists()).toBe(true)
    expect(row.text()).toContain(UNKNOWN_AMOUNT)
    // "We do not know" is the whole of the claim; a sign in front of it asserts a direction the row
    // does not have, and `−—` on a receipt reads as a formatting slip on a legal document.
    expect(row.text()).not.toContain(MINUS_SIGN)
    // The reason is still the page's, so the row says WHAT was taken even when it cannot say how
    // much.
    expect(row.text()).toContain('20 %')
    wrapper.destroy()
  })

  // The four shapes above that `> 0` used to ADMIT are the sibling lane's finding and they still
  // render a row; the five it used to DROP are this lane's. Both lists now answer the same way,
  // which is the point: the row is rendered on the absence rule, not on a relational test that
  // happens to agree with it most of the time.
  test('the guard and the absence rule no longer disagree about any shape', () => {
    const admittedByTheOldGuard = [Infinity, 'Infinity', true, { valueOf: () => 5000 }]
    const droppedByTheOldGuard = [null, undefined, '', '   ', NaN]
    for (const value of admittedByTheOldGuard.concat(droppedByTheOldGuard)) {
      const wrapper = mountReceipt([DRINK_DISCOUNT, value])
      expect(rowFor(wrapper, 1).text()).toContain(UNKNOWN_AMOUNT)
      wrapper.destroy()
    }
  })
})
