// ONE-OFF PROOF, ALREADY SPENT. Run once to put a real figure behind the claim that the four
// `calculateTotal*` helpers in `pages/admin/offers.vue` were a hundredfold wrong, BEFORE deciding
// their fate. It passed 7/7; the captured run is `magnitude-proof.txt` beside this file.
//
// IT NO LONGER RUNS, BY DESIGN, and the filename is why: the helpers it slices out of the page were
// deleted by this same lane, so the slice below now finds nothing and the file would fail as a test.
// It is named `.source.js` rather than `.test.js` so Jest does not collect it — `lanes/` is inside
// the default testMatch and only `test/e2e/` is ignored, so a `.test.js` here WOULD have joined the
// suite and gone red. Kept as source rather than deleted because it is the audit trail for the
// figures quoted in evidence.md and in the comment left at the deletion site: a reader who doubts
// `kr 4,99` should be able to see exactly what was executed to produce it.
//
// WHY THE BODIES ARE SLICED FROM DISK RATHER THAN IMPORTED. `import OffersPage from
// '~/pages/admin/offers.vue'` cannot be done here: the page's TEMPLATE uses optional chaining
// (`proposalToDelete?.clientName`, lines 384 and 413) and this repo's Vue 2 template compiler
// (vue-template-es2015-compiler/buble) fails to parse it — a pre-existing limitation of this page
// that no lane has needed to face, because nothing has ever component-tested it. Slicing the four
// bodies out of the file text keeps the thing under test the SHIPPED source rather than a retyped
// copy, which is the whole point: a proof written from the same misunderstanding as the code would
// happily confirm the wrong magnitude. The slice boundaries are asserted below, so a drifted file
// fails loudly instead of quietly proving nothing.

import fs from 'fs'
import path from 'path'
import { globalMixin } from '~/plugins/global-mixin'
import OfferDocument from '~/components/shared/OfferDocument.vue'

const SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../pages/admin/offers.vue'), 'utf8')

const FIRST = 'calculateTotalMonthly(proposal) {'
const AFTER = 'sendProposalSms() {'

const start = SOURCE.indexOf(FIRST)
const end = SOURCE.indexOf(AFTER)

// The shipped text of the four helpers, verbatim, with nothing between them but their own commas.
const sliced = SOURCE.slice(start, end).trimEnd().replace(/,$/, '')
const helpers = new Function('return {' + sliced + '}')() // eslint-disable-line no-new-func

// The real Norwegian label. Importing global-mixin runs its module body, which installs this admin's
// currency format into core's singleton, so these strings are literally what an admin screen prints.
const priceLabel = function (value, hideFractionIfZero) {
  return globalMixin.methods.priceLabel.call({ isCh: false }, value, hideFractionIfZero)
}

// kr 499,00 monthly and kr 1 250,00 one-time, stated in øre exactly as the wire carries them.
const STATED = { lineItems: [{ monthlyFee: 49900, onetimeFee: 125000, quantity: 1 }] }
// The same offer with the two fees never filled in. Absent, not zero.
const UNSTATED = { lineItems: [{ monthlyFee: null, onetimeFee: undefined, quantity: 1 }] }

const documentTotal = name => OfferDocument.computed[name].call({ offerProposal: STATED })

describe('the slice is really the shipped code', () => {
  test('all four helpers came out of the file, and nothing else did', () => {
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    expect(Object.keys(helpers)).toEqual([
      'calculateTotalMonthly',
      'calculateTotalOnetime',
      'calculateTotalMonthlyValue',
      'calculateTotalOnetimeValue'
    ])
    // The magnitude bug, present in the sliced text rather than asserted from memory.
    expect(sliced).toContain('/ 100')
  })
})

describe('the magnitude, with a real figure', () => {
  test('the page helper renders a hundredth of the offer document beside it', () => {
    const fromHelper = helpers.calculateTotalMonthly.call({ priceLabel }, STATED)
    const fromDocument = priceLabel(documentTotal('totalMonthlyFee'))

    console.log('MONTHLY  49900 øre -> helper: ' + fromHelper + '  | document: ' + fromDocument)

    expect(fromHelper).toBe('kr 4,99')
    expect(fromDocument).toBe('kr 499,00')
  })

  test('the one-time helper does the same to a four-figure amount', () => {
    const fromHelper = helpers.calculateTotalOnetime.call({ priceLabel }, STATED)
    const fromDocument = priceLabel(documentTotal('totalOnetimeFee'))

    console.log('ONETIME 125000 øre -> helper: ' + fromHelper + '  | document: ' + fromDocument)

    expect(fromHelper).toBe('kr 12,50')
  })

  test('the two Value helpers hand kroner to callers that every sibling reads as øre', () => {
    const monthly = helpers.calculateTotalMonthlyValue.call({}, STATED)
    const onetime = helpers.calculateTotalOnetimeValue.call({}, STATED)

    console.log('VALUES  monthly: ' + monthly + ' (document: ' + documentTotal('totalMonthlyFee') +
      ')  onetime: ' + onetime + ' (document: ' + documentTotal('totalOnetimeFee') + ')')

    expect(monthly).toBe(499)
    expect(onetime).toBe(1250)
    expect(documentTotal('totalMonthlyFee')).toBe(49900)
    expect(documentTotal('totalOnetimeFee')).toBe(125000)
  })
})

describe('the absence, independently of the magnitude', () => {
  test('an unstated fee is silently dropped and the total prints as a real zero', () => {
    const monthly = helpers.calculateTotalMonthly.call({ priceLabel }, UNSTATED)
    const onetime = helpers.calculateTotalOnetime.call({ priceLabel }, UNSTATED)

    console.log('ABSENT  monthly: ' + monthly + '  onetime: ' + onetime + '  (should be the dash)')

    // `if (item.monthlyFee)` skips the addend, the reduce seed of 0 survives, and priceLabel is
    // handed a genuine-looking zero. The figure is manufactured before the gate can refuse it.
    expect(monthly).toBe('kr 0,00')
    expect(onetime).toBe('kr 0,00')
  })

  test('the same `if` also drops a genuine zero, so the three worlds are two', () => {
    const zeroed = { lineItems: [{ monthlyFee: 0, onetimeFee: 0, quantity: 1 }] }
    const stated = helpers.calculateTotalMonthly.call({ priceLabel }, zeroed)
    const absent = helpers.calculateTotalMonthly.call({ priceLabel }, UNSTATED)

    console.log('COLLAPSE stated-zero: ' + stated + '  absent: ' + absent + '  identical: ' +
      (stated === absent))

    expect(stated).toBe(absent)
  })

  test('an absent lineItems container answers with a manufactured zero too', () => {
    const monthly = helpers.calculateTotalMonthly.call({ priceLabel }, { lineItems: null })
    const value = helpers.calculateTotalMonthlyValue.call({}, null)

    console.log('NO-LIST monthly: ' + monthly + '  value: ' + value)

    expect(monthly).toBe('kr 0,00')
    expect(value).toBe(0)
  })
})
