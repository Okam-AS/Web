import {
  readStatement,
  readStatementRows,
  readCoverage,
  readSupplierNames,
  readCalendarDate,
  STATEMENT_UNKNOWN,
  STATEMENT_UNCALCULATED,
  STATEMENT_OPEN,
  STATEMENT_FINALIZED,
  RECEIPT_READ,
  RECEIPT_ABSENT,
  RECEIPT_UNREADABLE
} from '~/utils/margin/statement-view'

// The figures are the proven journey's own (MJ-E2E-09): net 16400, covered 26400, uncovered −10000,
// theoretical 10860, actual 23000. Using them rather than round invented numbers means a change that
// breaks the reconciliation shows up as a mismatch against a real week.
const RECEIPT = JSON.stringify({
  Currency: 'NOK',
  CoveredNetSalesMinor: 26400,
  UncoveredNetSalesMinor: -10000,
  TheoreticalCostComplete: true,
  RecipeVersionIds: ['v-1']
})

function detail (overrides) {
  return Object.assign({
    statementId: 'f3000000-0000-0000-0000-000000000001',
    storeId: 42,
    periodStart: '2026-07-06T00:00:00Z',
    periodEnd: '2026-07-12T00:00:00Z',
    revisionNumber: 1,
    previousStatementId: null,
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
    inputReceiptJson: RECEIPT,
    spendEntries: [],
    revision: 'AAAAAAAAF9k=',
    generatedAtUtc: '2026-07-13T09:00:00Z'
  }, overrides || {})
}

describe('readStatement tells ZERO from UNKNOWN, which the wire does not', () => {
  test('a fully calculated Open statement reports every figure the backend produced', () => {
    const s = readStatement(detail())
    expect(s.state).toBe(STATEMENT_OPEN)
    expect(s.netFoodSalesMinor).toBe(16400)
    expect(s.coveredNetSalesMinor).toBe(26400)
    expect(s.uncoveredNetSalesMinor).toBe(-10000)
    expect(s.theoreticalIngredientCostMinor).toBe(10860)
    expect(s.actualPurchaseSpendMinor).toBe(23000)
    expect(s.receiptState).toBe(RECEIPT_READ)
    expect(s.canMutate).toBe(true)
  })

  // The reconciliation is the BACKEND's. This asserts the view model carries both sides intact rather
  // than deriving either, which is the failure mode a computed `net - covered` would introduce.
  test('covered + uncovered still equals net after the read model, because neither was recomputed', () => {
    const s = readStatement(detail())
    expect(s.coveredNetSalesMinor + s.uncoveredNetSalesMinor).toBe(s.netFoodSalesMinor)
  })

  // THE LOAD-BEARING CASE. `netFoodSalesMinor` and friends are non-nullable `long` columns, so a
  // statement nobody has calculated carries three zeros that are schema defaults and not answers.
  test('with no calculation timestamp every money figure is null, not zero', () => {
    const s = readStatement(detail({
      calculationTimestampUtc: null,
      netFoodSalesMinor: 0,
      theoreticalIngredientCostMinor: 0,
      actualPurchaseSpendMinor: 0,
      theoreticalFoodCostPercent: null,
      actualFoodCostPercent: null,
      inputReceiptJson: null
    }))
    expect(s.state).toBe(STATEMENT_UNCALCULATED)
    expect(s.netFoodSalesMinor).toBeNull()
    expect(s.theoreticalIngredientCostMinor).toBeNull()
    expect(s.actualPurchaseSpendMinor).toBeNull()
    expect(s.coveredNetSalesMinor).toBeNull()
    expect(s.uncoveredNetSalesMinor).toBeNull()
  })

  // CONTROL for the row above: a REAL zero on a calculated statement survives as a zero. Withholding
  // it would be the opposite lie.
  test('a calculated week that genuinely sold nothing keeps its zeros', () => {
    const s = readStatement(detail({
      netFoodSalesMinor: 0,
      theoreticalIngredientCostMinor: 0,
      actualPurchaseSpendMinor: 0,
      theoreticalFoodCostPercent: null,
      actualFoodCostPercent: null,
      gapPercentagePoints: null,
      coveragePercent: null
    }))
    expect(s.state).toBe(STATEMENT_OPEN)
    expect(s.netFoodSalesMinor).toBe(0)
    // ...and the ratios stay null, because dividing by zero net sales is undefined and not 0 %.
    expect(s.theoreticalFoodCostPercent).toBeNull()
    expect(s.actualFoodCostPercent).toBeNull()
  })

  // The server falls back to `0 / 0 / false / []` for these when it cannot read the receipt, and those
  // fallbacks are indistinguishable from answers on the wire. A covered figure of 0 against a net of
  // 16 400 is a CLAIM — "nothing sold this week was linked to a recipe" — not a silence.
  describe('the receipt-derived fields are withheld when the receipt is not readable', () => {
    test('an absent receipt makes the coverage split and the version list unknown', () => {
      const s = readStatement(detail({ inputReceiptJson: null, coveredNetSalesMinor: 0, uncoveredNetSalesMinor: 0, theoreticalCostComplete: false, recipeVersionIds: [] }))
      expect(s.receiptState).toBe(RECEIPT_ABSENT)
      expect(s.coveredNetSalesMinor).toBeNull()
      expect(s.uncoveredNetSalesMinor).toBeNull()
      expect(s.recipeVersionIds).toBeNull()
      // Tri-state: "we cannot tell whether the cost is complete" is not "the cost is incomplete".
      expect(s.theoreticalCostComplete).toBeNull()
    })

    test('an unparseable receipt is a different state and the same withholding', () => {
      const s = readStatement(detail({ inputReceiptJson: '{not json' }))
      expect(s.receiptState).toBe(RECEIPT_UNREADABLE)
      expect(s.coveredNetSalesMinor).toBeNull()
      expect(s.theoreticalCostComplete).toBeNull()
    })

    // CONTROL: with a readable receipt the flag is a real boolean again, in both directions.
    test('a readable receipt gives a real completeness flag', () => {
      expect(readStatement(detail()).theoreticalCostComplete).toBe(true)
      expect(readStatement(detail({ theoreticalCostComplete: false })).theoreticalCostComplete).toBe(false)
    })
  })

  // The receipt is written with a bare `JsonConvert.SerializeObject` rather than through the MVC
  // pipeline, so it keeps PascalCase inside a camelCase document. It states the currency the figures
  // were PRODUCED in; the server's fallback is the store's currency today, which is a different claim
  // about a frozen statement.
  test('the currency comes off the receipt, not off the server fallback, when the two disagree', () => {
    const receipt = JSON.stringify({ Currency: 'CHF' })
    expect(readStatement(detail({ inputReceiptJson: receipt, currency: 'NOK' })).currency).toBe('CHF')
    expect(readStatement(detail({ inputReceiptJson: null, currency: 'NOK' })).currency).toBe('NOK')
  })

  describe('mutability is a state, not a preference', () => {
    test('a finalized statement can never be mutated from this surface', () => {
      const s = readStatement(detail({ state: 'Finalized', finalizedAtUtc: '2026-07-13T10:00:00Z' }))
      expect(s.state).toBe(STATEMENT_FINALIZED)
      expect(s.canMutate).toBe(false)
      expect(s.finalizedAt).toBeInstanceOf(Date)
    })

    // Under a provider with no rowversion the server sends no revision, and an unguarded aggregate
    // write is exactly what the If-Match contract exists to prevent.
    test('an Open statement with no revision token cannot be mutated either', () => {
      expect(readStatement(detail({ revision: null })).canMutate).toBe(false)
    })
  })

  test('a read that never answered is UNKNOWN throughout, with no figure and no spend', () => {
    const s = readStatement(null)
    expect(s.state).toBe(STATEMENT_UNKNOWN)
    expect(s.netFoodSalesMinor).toBeNull()
    expect(s.coveragePercent).toBeNull()
    expect(s.spendEntries).toEqual([])
    expect(s.canMutate).toBe(false)
  })

  // A spend line's supplier attribution has to survive a round trip through a REPLACE-SET editor even
  // when nothing on this screen can name the supplier — otherwise the next save deletes it unseen.
  test('a spend line keeps its supplier id whether or not anything can name it', () => {
    const s = readStatement(detail({
      spendEntries: [
        { id: 'e-1', spendDate: '2026-07-06T00:00:00', supplierId: 's-gone', amountMinor: 1500000, currency: 'NOK', note: 'F-1' },
        { id: 'e-2', spendDate: '2026-07-08T00:00:00', supplierId: null, amountMinor: 800000, currency: 'NOK', note: null }
      ]
    }))
    expect(s.spendEntries[0]).toEqual({
      id: 'e-1', spendDate: '2026-07-06', supplierId: 's-gone', amountMinor: 1500000, currency: 'NOK', note: 'F-1'
    })
    expect(s.spendEntries[1].supplierId).toBeNull()
  })
})

// A calendar date arrives BOTH `Z`-suffixed and bare on the same document, depending on whether EF
// loaded the row or the service just wrote it. Turning either into a `Date` is a chance to display
// the day before, so the ISO prefix is taken as a string.
describe('readCalendarDate never constructs a Date', () => {
  test('both wire forms of the same day give the same day', () => {
    expect(readCalendarDate('2026-07-06T00:00:00Z')).toBe('2026-07-06')
    expect(readCalendarDate('2026-07-06T00:00:00')).toBe('2026-07-06')
    expect(readCalendarDate('2026-07-06')).toBe('2026-07-06')
  })

  test('anything that is not a date is null rather than a ten-character fragment', () => {
    expect(readCalendarDate('not-a-date-at-all')).toBeNull()
    expect(readCalendarDate(null)).toBeNull()
    expect(readCalendarDate(new Date())).toBeNull()
  })
})

describe('readStatementRows', () => {
  test('a failed list read is null, never an empty list', () => {
    expect(readStatementRows(null)).toBeNull()
    expect(readStatementRows({})).toBeNull()
    expect(readStatementRows({ statements: [] })).toEqual([])
  })

  test('a row reports its state, its revision and whether its theoretical side is complete', () => {
    const rows = readStatementRows({
      statements: [
        { statementId: 'a', periodStart: '2026-07-06T00:00:00Z', periodEnd: '2026-07-12T00:00:00Z', revisionNumber: 2, state: 'Open', netFoodSalesMinor: 16400, actualFoodCostPercent: 140.24, theoreticalCostComplete: false, currency: 'NOK' },
        { statementId: 'b', periodStart: '2026-07-06T00:00:00Z', periodEnd: '2026-07-12T00:00:00Z', revisionNumber: 1, state: 'Finalized', netFoodSalesMinor: 16400, actualFoodCostPercent: null, theoreticalCostComplete: true, currency: 'NOK' }
      ]
    })
    expect(rows[0]).toMatchObject({ revisionNumber: 2, finalized: false, theoreticalCostComplete: false })
    expect(rows[1]).toMatchObject({ revisionNumber: 1, finalized: true, theoreticalCostComplete: true })
    // Null stays null: a row whose percentage the server could not work out must not read as 0 %.
    expect(rows[1].actualFoodCostPercent).toBeNull()
  })
})

describe('readCoverage', () => {
  test('a failed read is null — which is not "everything is covered"', () => {
    expect(readCoverage(null)).toBeNull()
  })

  // The null-product bucket is first-class: it is frequently the largest single reason a week's
  // coverage is short, and filtering it would make the remainder look like the whole story.
  test('the open-price bucket survives as its own row, negative amount and all', () => {
    const c = readCoverage({
      fromDate: '2026-07-06T00:00:00Z',
      toDate: '2026-07-12T00:00:00Z',
      coveragePercent: 160.98,
      netFoodSalesMinor: 16400,
      coveredNetSalesMinor: 26400,
      uncoveredNetSalesMinor: -10000,
      currency: 'NOK',
      uncoveredTopSellers: [{ productId: null, isOpenPrice: true, productNameSnapshot: null, netSalesMinor: -10000, lineCount: 1 }],
      brokenLinks: [],
      priceFreshness: [{ supplierId: 's-1', supplierName: 'Leverandør AS', latestPriceEffectiveFromUtc: null, priceAgeDays: null, itemsWithPrice: 0, itemsWithoutPrice: 3 }],
      projectionWatermark: 9
    })
    expect(c.fromDate).toBe('2026-07-06')
    expect(c.uncoveredTopSellers).toHaveLength(1)
    expect(c.uncoveredTopSellers[0]).toMatchObject({ isOpenPrice: true, netSalesMinor: -10000 })
    // Null age is "no priced item at all", a different state from zero days old.
    expect(c.priceFreshness[0].priceAgeDays).toBeNull()
  })
})

describe('readSupplierNames', () => {
  test('a failed read is null so a line can say the NAMES are unknown', () => {
    expect(readSupplierNames(null)).toBeNull()
    expect(readSupplierNames({ suppliers: [] })).toBeNull()
  })

  test('an answered read is a lookup, and an empty store is an empty lookup', () => {
    expect(readSupplierNames([])).toEqual({})
    expect(readSupplierNames([{ supplierId: 's-1', name: 'Leverandør AS' }])).toEqual({ 's-1': 'Leverandør AS' })
  })
})
