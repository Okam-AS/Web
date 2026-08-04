import fs from 'fs'
import path from 'path'
import { mount } from '@vue/test-utils'
import '~/plugins/global-mixin'
import {
  amountInputValue, amountLabel, nokAmountLabel, statedSum, UNKNOWN_AMOUNT
} from '~/utils/price'
import XReportView from '~/components/admin/pos/XReportView.vue'
import KraviaInvoice from '~/pages/admin/kravia-invoice.vue'
import Settlements from '~/pages/admin/settlements.vue'
import RewardMembers from '~/pages/admin/reward-members.vue'

// `test/price-absence.test.js` pinned the SHARED formatter. It could not pin the surfaces that never
// call it — the legacy pages that format money with a local helper, a raw division or a `|| 0`, and so
// print an amount nobody stated as a real figure. This file is the pin for those.
//
// Three worlds at every site, never two: an amount somebody STATED, a genuine ZERO, and ABSENCE. Two
// is not enough — an "absent does not print zero" test passes against a formatter that can no longer
// render a genuine zero either, and a genuine zero is the case that must survive. `!0` is `true`, so
// any truthiness guard swallows exactly the case the fix is meant to protect.

const mountReport = report => mount(XReportView, {
  propsData: { report },
  mocks: {
    $i: key => key,
    $store: { dispatch: () => {}, subscribe: () => {} }
  }
})

// The VAT summary is a four-column grid: basis | pct | VAT | incl-VAT. Assertions below name the
// COLUMN, never the row: three of these four cells print money, so "the row contains a dash" is
// satisfied by any of them and would pass against the very expression this file exists to refuse.
const vatRow = (wrapper) => {
  const row = wrapper.findAll('.xreport__grid').wrappers
    .filter(w => !w.classes('xreport__grid--head') && !w.classes('xreport__grid--total'))[0]
  const cell = i => row.findAll('span').at(i).text()
  return { basis: cell(0), pct: cell(1), vat: cell(2), inclVat: cell(3) }
}

describe('the X report sums amounts without inventing one', () => {
  // The gate lives inside `priceLabel`. A gate cannot refuse a hole the arithmetic already filled in,
  // and this is the site where that happened: `priceLabel(v.basis + v.amount)`.
  test('a VAT row whose basis and amount both failed to arrive does not print a total', () => {
    const wrapper = mountReport({
      vatRates: [{ vatPercent: 25, basis: null, amount: null }]
    })

    // `null + null` is 0, so this cell used to read "kr 0" — a stated figure on a fiscal document,
    // manufactured out of two fields nobody supplied.
    expect(vatRow(wrapper).inclVat).toBe(UNKNOWN_AMOUNT)
    wrapper.destroy()
  })

  test('one absent term is enough — a half-known total is not a total', () => {
    const wrapper = mountReport({
      vatRates: [{ vatPercent: 25, basis: 80000, amount: null }]
    })
    const row = vatRow(wrapper)

    // The basis is still shown, because it IS stated. The incl-VAT cell is not: `80000 + null` is
    // 80000, so it used to report kr 800 as the amount the customer paid — indistinguishable from a
    // row that genuinely carried no VAT.
    expect(row.basis).toBe('kr 800,00')
    expect(row.inclVat).toBe(UNKNOWN_AMOUNT)
    expect(row.inclVat).not.toBe(row.basis)
    wrapper.destroy()
  })

  test('a genuine zero VAT row still totals, and still totals to a real figure', () => {
    // Zero-rated goods are real: basis stated, VAT genuinely nil. This is the case a truthiness guard
    // would have destroyed, and it must print digits.
    const wrapper = mountReport({
      vatRates: [{ vatPercent: 0, basis: 0, amount: 0 }]
    })

    expect(vatRow(wrapper).inclVat).toBe('kr 0,00')
    expect(vatRow(wrapper).inclVat).not.toBe(UNKNOWN_AMOUNT)
    wrapper.destroy()
  })

  test('a stated VAT row is arithmetically unchanged', () => {
    const wrapper = mountReport({
      vatRates: [{ vatPercent: 25, basis: 80000, amount: 20000 }]
    })
    const row = vatRow(wrapper)

    expect(row.basis).toBe('kr 800,00')
    expect(row.vat).toBe('kr 200,00')
    expect(row.inclVat).toBe('kr 1 000,00')
    wrapper.destroy()
  })
})

describe('the X report totals that were summed with || 0', () => {
  const receivedTotalOf = wrapper => wrapper.findAll('.xreport__row--sub').wrappers
    .map(w => w.text()).find(t => t.includes('pos_report_total_received'))

  test('a payment mean whose amount did not arrive does not silently drop out of the total', () => {
    const wrapper = mountReport({
      paymentMeans: [
        { paymentType: 'Cash', count: 3, amount: 50000 },
        { paymentType: 'Giftcard', count: 1, amount: null }
      ]
    })

    // `sum + (p.amount || 0)` answered kr 500 — the cash, presented as everything received.
    expect(receivedTotalOf(wrapper)).toContain(UNKNOWN_AMOUNT)
    expect(receivedTotalOf(wrapper)).not.toContain('kr 500')
    wrapper.destroy()
  })

  test('a genuine zero on a mean is a figure, and is still added', () => {
    const wrapper = mountReport({
      paymentMeans: [
        { paymentType: 'Cash', count: 3, amount: 50000 },
        { paymentType: 'Giftcard', count: 0, amount: 0 }
      ]
    })

    expect(receivedTotalOf(wrapper)).toContain('kr 500')
    expect(receivedTotalOf(wrapper)).not.toContain(UNKNOWN_AMOUNT)
    wrapper.destroy()
  })

  test('the corrections total is withheld when any of its four terms is missing', () => {
    const withheld = mountReport({
      negativeSalesAmount: 1000,
      referencedReturnsAmount: 2000,
      correctionAmount: null,
      abortedSalesAmount: 500
    })
    const stated = mountReport({
      negativeSalesAmount: 1000,
      referencedReturnsAmount: 2000,
      correctionAmount: 0,
      abortedSalesAmount: 500
    })
    const lineOf = w => w.findAll('.xreport__row').wrappers
      .map(x => x.text()).find(t => t.includes('pos_report_total_corrections'))

    expect(lineOf(withheld)).toContain(UNKNOWN_AMOUNT)
    // A genuinely zero correction bucket keeps the total a real figure: 10 + 20 + 0 + 5 = kr 35.
    expect(lineOf(stated)).toContain('kr 35')
    expect(lineOf(stated)).not.toContain(UNKNOWN_AMOUNT)
    withheld.destroy()
    stated.destroy()
  })
})

describe('statedSum, the rule the report totals now use', () => {
  test('absence propagates through the arithmetic instead of being erased by it', () => {
    expect(statedSum(null, null)).toBe(null)
    expect(statedSum(80000, null)).toBe(null)
    expect(statedSum(null, 80000)).toBe(null)
    expect(statedSum(80000, undefined)).toBe(null)
    expect(statedSum(80000, NaN)).toBe(null)
    expect(statedSum(80000, '')).toBe(null)
  })

  test('a genuine zero is an addend like any other', () => {
    expect(statedSum(0, 0)).toBe(0)
    expect(statedSum(80000, 0)).toBe(80000)
    expect(statedSum(80000, 20000)).toBe(100000)
    // Negatives are stated figures too — a correction bucket is allowed to be negative.
    expect(statedSum(80000, -20000)).toBe(60000)
  })

  test('nothing to add is zero; that is a real answer and not an absent one', () => {
    expect(statedSum()).toBe(0)
  })
})

// THE FIVE LEGACY PAGES.
//
// Each had written its own money formatter, and each had re-decided the absence question on its own
// and got it wrong differently. The formats genuinely differ per page and stay with the page; the
// RULE is now one function in `utils/price.js`, which is what these exercise — together with the
// delegation, so a page that stopped calling it is caught.
//
// Three worlds at every site, never two: STATED, genuinely ZERO, ABSENT.
const ABSENT = [null, undefined, '', '   ']

// `Intl.NumberFormat('nb-NO', … 'NOK')` separates the figure from "kr" with U+00A0, a NO-BREAK SPACE.
// Expectations below are compared with it normalised to an ordinary space, so the assertion reads as
// what the operator sees rather than smuggling an invisible character into the test file.
const plain = value => String(value).split(String.fromCharCode(0xA0)).join(' ')

describe.each([
  // the page whose format it is | the shared rule it now calls | what absence used to print there
  ['the invoice page and the settlements page (nb-NO currency)', v => plain(nokAmountLabel(v)), ['0,00 kr']],
  ['the Wolt menu page ("206.80 kr")', v => amountLabel(v, { suffix: 'kr' }), ['0 kr']],
  ['the rewards page ("206,80 kr")', v => amountLabel(v, { suffix: 'kr', decimalSeparator: ',' }), ['0 kr']],
  ['the product lists ("206.80 NOK")', v => amountLabel(v, { suffix: 'NOK' }), ['0.00 NOK', 'NaN NOK']]
])('%s', (_name, format, oldAbsentOutputs) => {
  test('an amount that never arrived is withheld', () => {
    for (const absent of ABSENT) {
      expect(format(absent)).toBe(UNKNOWN_AMOUNT)
    }
    // `undefined` was the "NaN" half of the product bug and `null` the "0.00" half — one expression,
    // two different lies depending only on whether the API omitted the key or sent a null.
    for (const old of oldAbsentOutputs) {
      expect(format(null)).not.toBe(old)
      expect(format(undefined)).not.toBe(old)
    }
    expect(format(undefined)).not.toContain('NaN')
  })

  test('the withheld mark carries no currency of its own', () => {
    // "— kr" would still assert that somebody priced this in kroner.
    expect(format(null)).toBe(UNKNOWN_AMOUNT)
    expect(format(null)).not.toMatch(/kr|NOK/)
  })

  test('a genuine zero is still printed as a figure', () => {
    // The case a truthiness guard destroys. `!0` is `true`, so "fixing" any of these with `if (!x)`
    // would blank out a settlement that really came to nothing or a genuinely free menu item — which
    // is the defect the settlements page already had, from the other direction.
    const zero = format(0)
    expect(zero).not.toBe(UNKNOWN_AMOUNT)
    expect(zero).toMatch(/0/)
  })

  test('a stated amount is unchanged, and the three worlds are three different strings', () => {
    const stated = format(20680)
    expect(stated).toMatch(/206/)
    expect(format(null)).not.toBe(format(0))
    expect(format(0)).not.toBe(stated)
    expect(format(null)).not.toBe(stated)
  })
})

test('each page keeps the exact format it shipped with; only the absent case changed', () => {
  expect(plain(nokAmountLabel(20680))).toBe('206,80 kr')
  expect(plain(nokAmountLabel(0))).toBe('0,00 kr')
  expect(amountLabel(20680, { suffix: 'kr' })).toBe('206.80 kr')
  expect(amountLabel(20680, { suffix: 'kr', decimalSeparator: ',' })).toBe('206,80 kr')
  expect(amountLabel(20680, { suffix: 'NOK' })).toBe('206.80 NOK')
  // A product with no currency code prints the figure alone rather than a trailing space.
  expect(amountLabel(20680, { suffix: undefined })).toBe('206.80')
})

// The three pages that CAN be loaded here are asserted through their real component methods, so a
// page that stops delegating is caught even though the rule itself still passes.
describe('the pages delegate to that rule rather than keeping a copy of it', () => {
  const viaMethod = (component, name) => (...args) => component.methods[name].call({}, ...args)

  test.each([
    ['kravia-invoice invoiceAmountLabel', viaMethod(KraviaInvoice, 'invoiceAmountLabel'), '206,80 kr'],
    ['settlements formatAmount', viaMethod(Settlements, 'formatAmount'), '206,80 kr'],
    ['reward-members formatBalance', viaMethod(RewardMembers, 'formatBalance'), '206,80 kr']
  ])('%s', (_name, format, stated) => {
    for (const absent of ABSENT) {
      expect(format(absent)).toBe(UNKNOWN_AMOUNT)
    }
    expect(format(0)).not.toBe(UNKNOWN_AMOUNT)
    expect(plain(format(20680))).toBe(stated)
  })

  // `kravia-invoice` USED TO declare a method called `priceLabel`. In Vue 2 a component method shadows
  // the mixin's, so the gate in `plugins/global-mixin.js` could never have run on a single figure of an
  // invoice, including the confirmation dialog an operator approves before one is issued.
  //
  // Gating the local method fixed the output but left the NAME colliding, so the next figure added to
  // this page would silently get whichever of the two the shadowing rules picked. The name is vacated
  // now. Deleting the method was NOT available — the mixin renders core's `kr `-prefix format while an
  // invoice prints nb-NO suffix style, so de-shadowing by deletion would have restyled every invoice.
  test('the invoice page no longer declares anything called priceLabel', () => {
    expect(KraviaInvoice.methods.priceLabel).toBeUndefined()
    expect(Object.keys(KraviaInvoice.methods)).not.toContain('priceLabel')
    expect(KraviaInvoice.computed ? Object.keys(KraviaInvoice.computed) : []).not.toContain('priceLabel')
  })

  // A missed call site would NOT throw: it would fall through to the mixin's `priceLabel`, which is
  // gated but renders "kr 206,80" where an invoice prints "206,80 kr". The failure mode of a partial
  // rename is a silent restyle, so the template is asserted to carry no bare call at all.
  test('no invoice template call site was left behind on the old name', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '..', 'pages/admin/kravia-invoice.vue'), 'utf8')
    // Sliced at `<script>`, not the first `</template>` — this page nests a slot that closes at line 63.
    const template = source.slice(0, source.indexOf('\n<script>'))
    expect(template).not.toMatch(/[^a-zA-Z]priceLabel\s*\(/)
    // All ten figures on the page still render through the renamed, gated helper.
    expect(template.split('invoiceAmountLabel(').length - 1).toBe(10)
  })
})

// `pages/admin/wolt-menu.vue`, `pages/admin/products.vue` and
// `components/onboarding/OnboardingProductImages.vue` CANNOT be imported in this suite, and that is
// pre-existing: their templates use optional chaining (`product.image?.imageUrl`), which the
// `vue-template-es2015-compiler` behind `vue-jest` cannot parse. No test in this repo has ever been
// able to mount them. Reading the source is the strongest instrument available for those three, so
// the reachability of the fix is asserted against the file itself: revert a template to the raw
// division and this fails.
describe('the three pages this suite cannot mount are pinned at the source', () => {
  const read = rel => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8')
  // NOT `indexOf('</template>')`: these pages nest `<template>` slots inside the block, so the first
  // close tag lands mid-file and every assertion below would silently inspect a fragment. Slicing at
  // the `<script>` tag is the only unambiguous boundary. `products.vue` really does nest one at line
  // 454 of a 775-line template, which is exactly how such an assertion passes while proving nothing.
  const templateOf = source => source.slice(0, source.indexOf('\n<script>'))

  test('these three really are unmountable here, for the stated reason', () => {
    // If this stops being true the tests below should be replaced with real DOM ones.
    for (const rel of ['pages/admin/wolt-menu.vue', 'pages/admin/products.vue', 'components/onboarding/OnboardingProductImages.vue']) {
      expect(templateOf(read(rel))).toMatch(/\?\./)
    }
  })

  test('neither product surface divides the raw field in its template any more', () => {
    for (const rel of ['pages/admin/products.vue', 'components/onboarding/OnboardingProductImages.vue']) {
      const template = templateOf(read(rel))
      expect(template).not.toContain('product.amount / 100')
      expect(template).toContain('productPrice(')
    }
  })

  test('the dine-in cell sums through statedSum, so one absent addend withholds it', () => {
    // It added two fields before dividing, so it carried the X report's defect too: `null + null` is
    // 0 and printed a real dine-in price for a product with neither figure.
    const template = templateOf(read('pages/admin/products.vue'))
    expect(template).not.toContain('product.amount + product.tableAdditionalAmount')
    expect(template).toContain('statedSum(product.amount, product.tableAdditionalAmount)')
    expect(amountLabel(statedSum(null, null), { suffix: 'NOK' })).toBe(UNKNOWN_AMOUNT)
    expect(amountLabel(statedSum(20680, null), { suffix: 'NOK' })).toBe(UNKNOWN_AMOUNT)
    expect(amountLabel(statedSum(20680, 2000), { suffix: 'NOK' })).toBe('226.80 NOK')
    expect(amountLabel(statedSum(20680, 0), { suffix: 'NOK' })).toBe('206.80 NOK')
  })

  test('all three delegate to the shared rule instead of keeping their own', () => {
    expect(read('pages/admin/wolt-menu.vue')).toContain('amountLabel(price, { suffix: "kr" })')
    expect(read('pages/admin/wolt-menu.vue')).toContain('amountInputValue(price)')
    expect(read('pages/admin/products.vue')).toContain('amountLabel(amountInOre, { suffix: currency })')
    expect(read('components/onboarding/OnboardingProductImages.vue')).toContain('amountLabel(amountInOre, { suffix: currency })')
  })
})

describe('the Wolt menu price INPUT, which wrote the zero back to Wolt', () => {
  test('an unpriced item seeds a blank field, not the characters 0.00', () => {
    // This one is not a label. It is `:value` on an `<input type="number">` bound to
    // `@blur="updateItemPrice"`, so the old '0.00' meant an operator who merely tabbed through the
    // row published a real zero price to Wolt in place of one nobody knew.
    //
    // The unknown mark would be wrong HERE — a number input cannot hold '—', and a dash is not
    // something an operator can edit. Blank is the honest seed.
    for (const absent of ABSENT) {
      expect(amountInputValue(absent)).toBe('')
    }
    expect(amountInputValue(null)).not.toBe('0.00')
  })

  test('a genuinely free item still seeds a real zero, which is editable and true', () => {
    expect(amountInputValue(0)).toBe('0.00')
    expect(amountInputValue(20680)).toBe('206.80')
  })

  // A blank seed is only an improvement if tabbing past it is a no-op. `updateItemPrice` previously
  // reached `parseFloat('')` -> NaN and alerted "invalid price" at an operator who never had one, so
  // the write path had to change with the seed. This page cannot be mounted here (see above), so the
  // guard is pinned at the source.
  test('blurring a blank field writes nothing rather than alerting or storing a zero', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '..', 'pages/admin/wolt-menu.vue'), 'utf8')
    const handler = source.slice(source.indexOf('updateItemPrice(item, newPrice)'))
    const blankGuard = handler.indexOf('newPrice.trim() === \'\'')
    const parse = handler.indexOf('parseFloat(newPrice)')
    expect(blankGuard).toBeGreaterThan(-1)
    // ...and it has to come BEFORE the parse, or the alert fires first.
    expect(blankGuard).toBeLessThan(parse)
  })

  // The change-detection snapshot coerced too: `price: item.price || 0` recorded an unpriced item as
  // costing zero, so setting it to a genuine zero left the snapshot identical and the edit went
  // undetected. Both sides of that comparison are built by the same function, so recording absence as
  // absence is the only thing that changes.
  test('the change-detection snapshot records an unpriced item as unpriced', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '..', 'pages/admin/wolt-menu.vue'), 'utf8')
    const snapshot = source.slice(source.indexOf('createMenuSnapshot()'))
    expect(snapshot).not.toContain('price: item.price || 0')
    expect(snapshot).toContain('isAmountStated(item.price)')
  })
})
