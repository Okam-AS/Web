import fs from 'fs'
import path from 'path'
import { mount } from '@vue/test-utils'
import '~/plugins/global-mixin'
import { negatedAmountLabel, MINUS_SIGN, UNKNOWN_AMOUNT } from '~/utils/price'
import XReportView from '~/components/admin/pos/XReportView.vue'

// The X/Z report's deduction rows wrote their minus sign as a template literal OUTSIDE the
// interpolation — `−{{ priceLabel(x) }}`. Six rows did it. Every absence rule in this repo runs
// INSIDE the interpolation, so not one of them could see the character, and an amount nobody stated
// rendered as `−—`: the negative of an unknown, on a kassasystemforskrifta document an inspector
// reads, indistinguishable from a formatting slip.
//
// THIS FILE MOUNTS. A source-level assertion literally cannot see a character sitting outside an
// interpolation, which is exactly why the defect survived every gate in the estate. Every claim below
// is read off rendered DOM text, with the real global mixin and the real formatter — nothing here
// mocks `priceLabel`, because a mocked formatter would be re-describing the fix rather than testing
// it.
//
// FOUR WORLDS AT EVERY ROW, NOT THREE. A stated magnitude, a genuine zero, an ABSENCE, and a field
// that already carries a minus. The stated case is pinned FIRST and hardest, because the natural way
// to be rid of `−—` is to delete the literal — which silently turns every deduction on the report
// into a positive, trading a confusing row for a wrong one.

const baseReport = () => ({
  registerId: 'K-1',
  localDate: '30.07.2026',
  localTime: '18:04',
  fromSequenceNumber: 1,
  toSequenceNumber: 9,
  receiptCount: 9,
  goodsGroups: [],
  salesCount: 9,
  salesAmount: 100000,
  discountAmount: 0,
  negativeSalesCount: 2,
  negativeSalesAmount: 1000,
  referencedReturnsCount: 1,
  referencedReturnsAmount: 2000,
  abortedSalesCount: 0,
  abortedSalesAmount: 0,
  lineCorrectionCount: 0,
  lineCorrectionAmount: 0,
  correctionAmount: 0,
  copyReceiptCount: 0,
  copyReceiptAmount: 0,
  provisionalReceiptCount: 0,
  provisionalReceiptAmount: 0,
  trainingCount: 0,
  trainingAmount: 0,
  drawerOpenCount: 3,
  grandTotalSales: 500000,
  grandTotalReturns: 4000,
  grandTotalNet: 496000,
  grandTotalNegativeSales: 1000,
  grandTotalErrors: 500,
  // The per-operator deduction row is behind `v-if="o.returnsCount"`, so the COUNT stays stated in
  // every world below. A count without an amount is precisely the shape that produced `−—`.
  operators: [{ operatorName: 'Ada', salesAmount: 100000, returnsCount: 2, returnsAmount: 3000 }]
})

const mountReport = report => mount(XReportView, {
  propsData: { report },
  mocks: {
    $i: key => key,
    $store: { dispatch: () => {}, subscribe: () => {} }
  }
})

// Rows are addressed by SECTION and then by label. Two of the six deduction rows print the very same
// translation key as another one (`pos_report_return` appears three times, `pos_report_negative_sales`
// twice), so "the row whose text contains the key" would silently assert against the wrong row — and
// would pass while the row under test stayed broken.
const sectionByHeading = (wrapper, heading) => {
  const section = wrapper.findAll('.xreport__section').wrappers
    .find(s => s.find('h3').text() === heading)
  if (!section) { throw new Error('no section headed ' + heading) }
  return section
}

const amountCellIn = (section, label) => {
  const row = section.findAll('.xreport__row').wrappers
    .find(r => r.findAll('span').at(0).text().startsWith(label))
  if (!row) { throw new Error('no row labelled ' + label) }
  return row.findAll('span').at(1).text()
}

// The six rows that attached a sign to the unknown mark, each named by the field it prints and by
// how to find its rendered cell.
const SITES = [
  {
    name: 'negativ salg, omsetning',
    field: 'negativeSalesAmount',
    cell: w => amountCellIn(sectionByHeading(w, 'pos_report_turnover'), 'pos_report_negative_sales'),
    set: (r, v) => { r.negativeSalesAmount = v }
  },
  {
    name: 'retur, omsetning',
    field: 'referencedReturnsAmount',
    cell: w => amountCellIn(sectionByHeading(w, 'pos_report_turnover'), 'pos_report_return'),
    set: (r, v) => { r.referencedReturnsAmount = v }
  },
  {
    name: 'retur, grand total',
    field: 'grandTotalReturns',
    cell: w => amountCellIn(sectionByHeading(w, 'pos_report_grand_total'), 'pos_report_return'),
    set: (r, v) => { r.grandTotalReturns = v }
  },
  {
    name: 'negativ salg, grand total',
    field: 'grandTotalNegativeSales',
    cell: w => amountCellIn(sectionByHeading(w, 'pos_report_grand_total'), 'pos_report_negative_sales'),
    set: (r, v) => { r.grandTotalNegativeSales = v }
  },
  {
    name: 'feilslag, grand total',
    field: 'grandTotalErrors',
    cell: w => amountCellIn(sectionByHeading(w, 'pos_report_grand_total'), 'pos_report_errors'),
    set: (r, v) => { r.grandTotalErrors = v }
  },
  {
    name: 'retur, per operatør',
    field: 'operators[0].returnsAmount',
    cell: (w) => {
      const op = sectionByHeading(w, 'pos_report_operators').find('.xreport__op')
      return op.findAll('.xreport__row').at(1).findAll('span').at(1).text()
    },
    set: (r, v) => { r.operators[0].returnsAmount = v }
  }
]

const render = (site, value) => {
  const report = baseReport()
  site.set(report, value)
  const wrapper = mountReport(report)
  const text = site.cell(wrapper)
  wrapper.destroy()
  return text
}

test('the lane is measuring the number of rows it claimed to measure', () => {
  expect(SITES).toHaveLength(6)
})

describe.each(SITES.map(s => [s.name, s]))('%s', (_name, site) => {
  // WORLD 1, pinned first and on purpose. Deleting the literal minus is the obvious way to stop
  // `−—` from rendering, and it would break exactly this: a real deduction printed as a positive.
  test('a stated amount still renders its sign', () => {
    expect(render(site, 5000)).toBe(MINUS_SIGN + 'kr 50,00')
  })

  // WORLD 2. THE DEFECT. `−—` reads as the negative of a figure nobody supplied.
  test('an absent amount is the bare unknown mark, with no sign attached', () => {
    const cell = render(site, null)
    expect(cell).toBe(UNKNOWN_AMOUNT)
    expect(cell).not.toBe(MINUS_SIGN + UNKNOWN_AMOUNT)
    expect(cell).not.toContain(MINUS_SIGN)
  })

  test.each([[undefined], [''], ['   '], [NaN]])(
    'every other shape of absence is the same bare mark (%p)', (absent) => {
      const cell = render(site, absent)
      expect(cell).toBe(UNKNOWN_AMOUNT)
      expect(cell).not.toContain(MINUS_SIGN)
    })

  // WORLD 3. `!0` is true, so any truthiness guard destroys precisely this case — a bucket that
  // genuinely holds nothing is a claim, and it must print digits rather than a dash.
  test('a genuine zero prints as a figure, unsigned, and is not the unknown mark', () => {
    const cell = render(site, 0)
    expect(cell).toBe('kr 0,00')
    expect(cell).not.toBe(UNKNOWN_AMOUNT)
    expect(cell).not.toContain(MINUS_SIGN)
  })

  // WORLD 4. The sign is resolved ONCE, from the negated value. A literal in front of a formatted
  // negative would compose `−kr -50,00`, and core's formatter mangles negatives besides.
  test('a field that already carries a minus is not negated twice', () => {
    const cell = render(site, -5000)
    expect(cell).toBe('kr 50,00')
    expect(cell).not.toContain(MINUS_SIGN + 'kr -')
    expect(cell).not.toContain('-50')
  })
})

describe('the report as a whole', () => {
  // The exit criterion, asserted structurally rather than row by row: with every amount on the
  // document absent, NOTHING anywhere may print a sign welded to the unknown mark. This is the test
  // that would catch a seventh row, or a row added next month.
  test('no cell anywhere prints a sign attached to the unknown mark', () => {
    const report = baseReport()
    for (const key of Object.keys(report)) {
      if (/Amount$|^grandTotal|^salesAmount$/.test(key)) { report[key] = null }
    }
    report.operators[0].salesAmount = null
    report.operators[0].returnsAmount = null
    report.vatRates = [{ vatPercent: 25, basis: null, amount: null }]
    report.paymentMeans = [{ paymentType: 'Cash', count: 2, amount: null }]
    report.startFloat = null
    const wrapper = mountReport(report)

    const offenders = wrapper.findAll('span').wrappers
      .map(w => w.text())
      .filter(t => t.includes(MINUS_SIGN + UNKNOWN_AMOUNT))

    expect(offenders).toEqual([])
    wrapper.destroy()
  })

  // A stated report is unchanged in every visible respect: the six signs are all still there.
  test('a fully stated report still prints six signed deductions', () => {
    const wrapper = mountReport(baseReport())
    const signed = wrapper.findAll('span').wrappers
      .map(w => w.text())
      .filter(t => t.startsWith(MINUS_SIGN + 'kr'))

    expect(signed).toHaveLength(6)
    wrapper.destroy()
  })
})

describe('negatedAmountLabel, the rule the rows now use', () => {
  // An identity formatter, so these read as the SIGN decision alone rather than as currency.
  const fmt = minor => 'F' + minor

  test('absence has no sign, in every shape', () => {
    for (const absent of [null, undefined, '', '  ', NaN, Infinity, true, {}]) {
      expect(negatedAmountLabel(absent, fmt)).toBe(UNKNOWN_AMOUNT)
    }
  })

  test('the formatter is never handed the absent value at all', () => {
    const seen = []
    negatedAmountLabel(null, v => { seen.push(v); return '' })
    expect(seen).toEqual([])
  })

  test('a magnitude is negated, and the formatter only ever sees the magnitude', () => {
    const seen = []
    const spy = (v) => { seen.push(v); return 'F' + v }
    expect(negatedAmountLabel(5000, spy)).toBe(MINUS_SIGN + 'F5000')
    // core's priceLabel renders -4 as "kr 0,-4" and -50 as "kr -,50"; it must never receive one.
    expect(seen).toEqual([5000])
  })

  test('an already-negative field negates to a positive and loses the sign', () => {
    expect(negatedAmountLabel(-5000, fmt)).toBe('F5000')
  })

  test('a genuine zero is signless and is still a figure', () => {
    expect(negatedAmountLabel(0, fmt)).toBe('F0')
    expect(negatedAmountLabel(0, fmt)).not.toBe(UNKNOWN_AMOUNT)
    // -0 formats through the same branch rather than leaking a "-0" into the document.
    expect(negatedAmountLabel(-0, fmt)).toBe('F0')
  })

  test('a numeric string is a stated amount, as it is everywhere else in this module', () => {
    expect(negatedAmountLabel('5000', fmt)).toBe(MINUS_SIGN + 'F5000')
  })
})

// Supplementary, and deliberately NOT the load-bearing assertion — the mounted tests above are.
// This one exists so that reintroducing the literal is caught at the place it would be written.
test('no deduction row in the report template writes its sign outside the interpolation', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../components/admin/pos/XReportView.vue'), 'utf8')
  const template = source.slice(0, source.indexOf('</template>'))

  expect(template).not.toContain(MINUS_SIGN + '{{')
})
