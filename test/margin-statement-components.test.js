import { mount } from '@vue/test-utils'
import MarginStatementFiguresPanel from '~/components/admin/margin/MarginStatementFiguresPanel.vue'
import MarginSpendPanel from '~/components/admin/margin/MarginSpendPanel.vue'
import MarginCoveragePanel from '~/components/admin/margin/MarginCoveragePanel.vue'
import { readStatement, readCoverage } from '~/utils/margin/statement-view'

// The money mocks stand in for the global mixin's core formatter. They are deliberately trivial and
// SIGN-BLIND, so a component that leaked a raw negative into `priceLabel` would show it here instead
// of being papered over by a smarter fake.
const mocks = {
  $i: (key, params) => (params ? key + ':' + JSON.stringify(params) : key),
  priceLabel: minor => 'kr ' + minor,
  wholeAmount: minor => String(Math.trunc(minor / 100)),
  fractionAmount: minor => String(Math.abs(minor) % 100).padStart(2, '0')
}

const DASH = '—'

function detail (overrides) {
  return Object.assign({
    statementId: 'st-1',
    periodStart: '2026-07-06T00:00:00Z',
    periodEnd: '2026-07-12T00:00:00Z',
    revisionNumber: 1,
    state: 'Open',
    netFoodSalesMinor: 16400,
    theoreticalIngredientCostMinor: 10860,
    actualPurchaseSpendMinor: 23000,
    openingStockValueMinor: null,
    closingStockValueMinor: null,
    theoreticalFoodCostPercent: 66.22,
    actualFoodCostPercent: 140.24,
    gapPercentagePoints: 74.02,
    coveragePercent: 160.98,
    coveredNetSalesMinor: 26400,
    uncoveredNetSalesMinor: -10000,
    theoreticalCostComplete: true,
    theoreticalCostExcludedCurrencies: [],
    currency: 'NOK',
    projectionWatermark: 9,
    recipeVersionIds: ['v-1'],
    priceFreshnessAsOfUtc: '2026-07-01T00:00:00',
    calculationTimestampUtc: '2026-07-13T09:00:00Z',
    finalizedAtUtc: null,
    inputReceiptJson: JSON.stringify({ Currency: 'NOK', CoveredNetSalesMinor: 26400, UncoveredNetSalesMinor: -10000, TheoreticalCostComplete: true, RecipeVersionIds: ['v-1'] }),
    spendEntries: [],
    revision: 'rev-1'
  }, overrides || {})
}

function figures (overrides) {
  return mount(MarginStatementFiguresPanel, {
    mocks,
    propsData: { statement: readStatement(detail(overrides)), currency: 'NOK', locale: 'no' }
  })
}

describe('MarginStatementFiguresPanel', () => {
  test('the proven week renders all three headline figures and the coverage split', () => {
    const w = figures()
    expect(w.find('[data-test="net"]').text()).toBe('kr 16400')
    expect(w.find('[data-test="theoretical"]').text()).toBe('kr 10860')
    expect(w.find('[data-test="actual"]').text()).toBe('kr 23000')
    expect(w.find('[data-test="covered"]').text()).toBe('kr 26400')
    expect(w.find('[data-test="state-badge"]').text()).toBe('mrgs_state_open')
  })

  // A negative amount below one krone comes out of core's `priceLabel` malformed, and an uncovered
  // bucket dominated by returns is precisely the row this surface exists to show.
  test('a negative amount carries a typographic minus in front of its magnitude', () => {
    expect(figures().find('[data-test="uncovered"]').text()).toBe('−kr 10000')
  })

  // THE LOAD-BEARING RULE: unknown money is a dash and never kr 0,00.
  test('an uncalculated statement shows dashes, not zeros, and says why', () => {
    const w = figures({
      calculationTimestampUtc: null,
      netFoodSalesMinor: 0,
      theoreticalIngredientCostMinor: 0,
      actualPurchaseSpendMinor: 0,
      theoreticalFoodCostPercent: null,
      actualFoodCostPercent: null,
      gapPercentagePoints: null,
      coveragePercent: null,
      inputReceiptJson: null
    })
    for (const cell of ['net', 'theoretical', 'actual', 'covered', 'uncovered']) {
      expect(w.find('[data-test="' + cell + '"]').text()).toBe(DASH)
    }
    expect(w.find('[data-test="uncalculated"]').exists()).toBe(true)
    expect(w.find('[data-test="state-badge"]').text()).toBe('mrgs_state_uncalculated')
  })

  // CONTROL for the row above: a real zero on a calculated statement is printed as a zero.
  test('a calculated week that sold nothing prints kr 0, not a dash', () => {
    const w = figures({ netFoodSalesMinor: 0, theoreticalFoodCostPercent: null, actualFoodCostPercent: null, gapPercentagePoints: null, coveragePercent: null })
    expect(w.find('[data-test="net"]').text()).toBe('kr 0')
    expect(w.find('[data-test="uncalculated"]').exists()).toBe(false)
  })

  // 0,00 % is the most flattering possible misreading of "we could not work it out".
  test('a percentage the server could not work out is a dash with the reason said out loud', () => {
    const w = figures({ netFoodSalesMinor: 0, theoreticalFoodCostPercent: null, actualFoodCostPercent: null, gapPercentagePoints: null, coveragePercent: null })
    expect(w.find('[data-test="theoretical-percent"]').text()).toBe(DASH)
    expect(w.find('[data-test="actual-percent"]').text()).toBe(DASH)
    expect(w.find('[data-test="gap"]').text()).toBe(DASH)
    expect(w.find('[data-test="ratios-undefined"]').exists()).toBe(true)
  })

  test('an incomplete theoretical cost is shown as a lower bound and flagged as understating', () => {
    const w = figures({
      theoreticalCostComplete: false,
      inputReceiptJson: JSON.stringify({ Currency: 'NOK', CoveredNetSalesMinor: 26400, UncoveredNetSalesMinor: -10000, TheoreticalCostComplete: false, RecipeVersionIds: [] })
    })
    expect(w.find('[data-test="theoretical"]').text()).toContain('mrgs_at_least')
    expect(w.find('[data-test="theoretical-floor"]').exists()).toBe(true)
  })

  test('currencies excluded from the theoretical cost are named', () => {
    const w = figures({ theoreticalCostExcludedCurrencies: ['CHF', 'EUR'] })
    expect(w.find('[data-test="excluded-currencies"]').text()).toContain('CHF, EUR')
  })

  // The server answers 0/0/[] when it cannot read the receipt, so the panel must not print those.
  test('an unreadable receipt makes the split and the version list unknown, and says so', () => {
    const w = figures({ inputReceiptJson: '{broken' })
    expect(w.find('[data-test="covered"]').text()).toBe(DASH)
    expect(w.find('[data-test="recipe-versions"]').text()).toBe(DASH)
    expect(w.find('[data-test="receipt-missing"]').exists()).toBe(true)
    // ...and the completeness warning is NOT shown, because we cannot tell either way.
    expect(w.find('[data-test="theoretical-floor"]').exists()).toBe(false)
  })

  test('the provenance names the watermark, the versions used and the calculation time', () => {
    const w = figures()
    expect(w.find('[data-test="watermark"]').text()).toBe('9')
    expect(w.find('[data-test="recipe-versions"]').text()).toContain('mrgs_prov_recipe_versions_count')
    expect(w.find('[data-test="calculated-at"]').text()).not.toBe(DASH)
  })

  test('a missing watermark is a dash rather than a zero, which would read as "the journal is empty"', () => {
    expect(figures({ projectionWatermark: null }).find('[data-test="watermark"]').text()).toBe(DASH)
  })

  test('a correction names the revision it supersedes', () => {
    const w = figures({ state: 'Finalized', finalizedAtUtc: '2026-07-13T10:00:00Z', revisionNumber: 2, previousStatementId: 'st-0' })
    expect(w.find('[data-test="state-badge"]').text()).toBe('mrgs_state_finalized')
    expect(w.find('[data-test="corrects"]').text()).toContain('1')
  })
})

function spend (overrides, props) {
  return mount(MarginSpendPanel, {
    mocks,
    propsData: Object.assign({
      statement: readStatement(detail(overrides)),
      supplierNames: { 's-1': 'Leverandør AS' },
      currency: 'NOK',
      locale: 'no'
    }, props || {})
  })
}

const TWO_LINES = [
  { id: 'e-1', spendDate: '2026-07-06T00:00:00', supplierId: 's-1', amountMinor: 1500000, currency: 'NOK', note: 'F-1001' },
  { id: 'e-2', spendDate: '2026-07-08T00:00:00', supplierId: 's-gone', amountMinor: 800000, currency: 'NOK', note: null }
]

describe('MarginSpendPanel', () => {
  test('an Open statement with a revision opens the editor, seeded from its own lines', () => {
    const w = spend({ spendEntries: TWO_LINES })
    expect(w.findAll('[data-test="spend-amount"]')).toHaveLength(2)
    expect(w.findAll('[data-test="spend-amount"]').at(0).element.value).toBe('15000,00')
    expect(w.find('[data-test="spend-save"]').exists()).toBe(true)
  })

  // THE IMMUTABILITY RULE. Not a disabled control: a disabled field still says "this is where you
  // would change it", and there is no server path that would accept the change.
  test('a finalized statement renders NO edit control at all, only the frozen lines', () => {
    const w = spend({ state: 'Finalized', finalizedAtUtc: '2026-07-13T10:00:00Z', spendEntries: TWO_LINES })
    expect(w.find('[data-test="spend-frozen"]').exists()).toBe(true)
    expect(w.find('[data-test="spend-save"]').exists()).toBe(false)
    expect(w.find('[data-test="spend-add"]').exists()).toBe(false)
    expect(w.findAll('[data-test="spend-amount"]')).toHaveLength(0)
    expect(w.findAll('input')).toHaveLength(0)
    // The lines are still readable — freezing them is not hiding them.
    expect(w.findAll('[data-test="spend-readonly-row"]')).toHaveLength(2)
  })

  // Under a provider with no rowversion the write would go through unguarded, so the panel shuts
  // rather than offering a save the client will refuse to send.
  test('an Open statement with no revision is read-only and says which guard is missing', () => {
    const w = spend({ revision: null, spendEntries: TWO_LINES })
    expect(w.find('[data-test="spend-no-revision"]').exists()).toBe(true)
    expect(w.find('[data-test="spend-save"]').exists()).toBe(false)
  })

  test('the save emits the WHOLE set, because the server treats the body as a replace-set', async () => {
    const w = spend({ spendEntries: TWO_LINES })
    w.find('[data-test="spend-save"]').trigger('click')
    await w.vm.$nextTick()

    const payload = w.emitted().save[0][0]
    expect(payload.spendEntries).toHaveLength(2)
    expect(payload.spendEntries[0]).toEqual({
      spendDate: '2026-07-06', supplierId: 's-1', amountMinor: 1500000, currency: 'NOK', note: 'F-1001'
    })
    // The attribution to a supplier this store's list cannot name SURVIVES the round trip. Dropping it
    // would delete an attribution the venue was never shown.
    expect(payload.spendEntries[1].supplierId).toBe('s-gone')
  })

  test('a supplier the list does not name keeps its own option so the select cannot clear it', () => {
    const w = spend({ spendEntries: TWO_LINES })
    const options = w.findAll('[data-test="spend-supplier"]').at(1).findAll('option')
    expect(options.filter(o => o.text() === 'mrgs_spend_supplier_unlisted').length).toBe(1)
  })

  // Three different answers, kept apart: the list never came back, the list came back without this id,
  // and the list named it. Only the middle one is a claim about the store's suppliers.
  test('a failed supplier read offers no picker and says the NAMES are unknown', () => {
    const w = spend({ spendEntries: TWO_LINES }, { supplierNames: null })
    expect(w.find('[data-test="spend-supplier"]').exists()).toBe(false)
    expect(w.findAll('[data-test="spend-supplier-unknown"]').at(0).text()).toBe('mrgs_spend_supplier_list_unknown')
  })

  test('a blank stock estimate is sent as null — "not entered" is not "the larder was empty"', async () => {
    const w = spend({ spendEntries: [], openingStockValueMinor: null, closingStockValueMinor: 0 })
    expect(w.find('[data-test="closing-stock"]').element.value).toBe('0,00')
    w.find('[data-test="spend-save"]').trigger('click')
    await w.vm.$nextTick()

    const payload = w.emitted().save[0][0]
    expect(payload.openingStockValueMinor).toBeNull()
    expect(payload.closingStockValueMinor).toBe(0)
  })

  describe('the refusals the server answers without a machine code are pre-empted here', () => {
    test('a negative amount is refused before the request, naming the rule', async () => {
      const w = spend({ spendEntries: TWO_LINES })
      w.findAll('[data-test="spend-amount"]').at(0).setValue('-5')
      w.find('[data-test="spend-save"]').trigger('click')
      await w.vm.$nextTick()

      expect(w.find('[data-test="spend-error"]').text()).toBe('mrgs_spend_err_negative')
      expect(w.emitted().save).toBeUndefined()
    })

    test('a line with no date is refused', async () => {
      const w = spend({ spendEntries: TWO_LINES })
      w.findAll('[data-test="spend-date"]').at(0).setValue('')
      w.find('[data-test="spend-save"]').trigger('click')
      await w.vm.$nextTick()

      expect(w.find('[data-test="spend-error"]').text()).toBe('mrgs_spend_err_date')
      expect(w.emitted().save).toBeUndefined()
    })

    // The actual-spend total adds these together, so two currencies would produce a figure in neither.
    // The server refuses it in prose; this refuses it naming WHICH currencies disagree.
    test('two currencies among the lines are refused, and both are named', async () => {
      const w = spend({
        spendEntries: [
          TWO_LINES[0],
          Object.assign({}, TWO_LINES[1], { currency: 'CHF' })
        ]
      })
      w.find('[data-test="spend-save"]').trigger('click')
      await w.vm.$nextTick()

      const message = w.find('[data-test="spend-error"]').text()
      expect(message).toContain('mrgs_spend_err_mixed_currency')
      expect(message).toContain('CHF, NOK')
      expect(w.emitted().save).toBeUndefined()
    })

    // CONTROL: a line that states NO currency inherits the statement's, exactly as the server does, so
    // it never counts as a second one.
    test('a new line with no currency does not trip the currency check', async () => {
      const w = spend({ spendEntries: TWO_LINES })
      w.find('[data-test="spend-add"]').trigger('click')
      await w.vm.$nextTick()
      w.findAll('[data-test="spend-date"]').at(2).setValue('2026-07-09')
      w.findAll('[data-test="spend-amount"]').at(2).setValue('100')
      w.find('[data-test="spend-save"]').trigger('click')
      await w.vm.$nextTick()

      expect(w.find('[data-test="spend-error"]').exists()).toBe(false)
      expect(w.emitted().save[0][0].spendEntries[2]).toEqual({
        spendDate: '2026-07-09', supplierId: null, amountMinor: 10000, currency: null, note: null
      })
    })
  })
})

describe('MarginCoveragePanel', () => {
  const response = {
    fromDate: '2026-07-06T00:00:00Z',
    toDate: '2026-07-12T00:00:00Z',
    coveragePercent: 160.98,
    netFoodSalesMinor: 16400,
    coveredNetSalesMinor: 26400,
    uncoveredNetSalesMinor: -10000,
    currency: 'NOK',
    uncoveredTopSellers: [
      { productId: null, isOpenPrice: true, productNameSnapshot: null, netSalesMinor: -10000, lineCount: 1 },
      { productId: 'p-1', isOpenPrice: false, productNameSnapshot: 'Cola', netSalesMinor: 2000, lineCount: 3 }
    ],
    brokenLinks: [{ linkId: 'l-1', recipeId: 'r-1', recipeName: 'Fiskesuppe', productId: 'p-9', brokenDetectedAtUtc: null }],
    priceFreshness: [{ supplierId: 's-1', supplierName: 'Leverandør AS', latestPriceEffectiveFromUtc: null, priceAgeDays: null, itemsWithPrice: 0, itemsWithoutPrice: 3 }],
    projectionWatermark: 9
  }

  function coverage (value) {
    return mount(MarginCoveragePanel, { mocks, propsData: { coverage: value, currency: 'NOK', locale: 'no' } })
  }

  // A failed read is not "everything is covered", which is the most dangerous possible default here.
  test('a null read renders the unknown notice and no figures', () => {
    const w = coverage(null)
    expect(w.find('[data-test="coverage-unknown"]').exists()).toBe(true)
    expect(w.find('[data-test="coverage-window-percent"]').exists()).toBe(false)
  })

  test('the open-price bucket is a first-class row and keeps its negative amount', () => {
    const w = coverage(readCoverage(response))
    const rows = w.findAll('[data-test="uncovered-row"]')
    expect(rows).toHaveLength(2)
    expect(rows.at(0).text()).toContain('mrgs_coverage_open_price')
    expect(rows.at(0).text()).toContain('−kr 10000')
  })

  test('broken links and the price age are surfaced, and "never priced" is not zero days old', () => {
    const w = coverage(readCoverage(response))
    expect(w.find('[data-test="broken-link"]').text()).toBe('Fiskesuppe')
    expect(w.find('[data-test="freshness-row"]').text()).toContain('mrgs_coverage_never_priced')
  })

  test('an undefined coverage percentage is a dash with the reason, never 0 %', () => {
    const w = coverage(readCoverage(Object.assign({}, response, { coveragePercent: null, netFoodSalesMinor: 0 })))
    expect(w.find('[data-test="coverage-window-percent"]').text()).toBe(DASH)
    expect(w.find('[data-test="coverage-undefined"]').exists()).toBe(true)
  })
})
