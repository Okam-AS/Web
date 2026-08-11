import { effectiveVatRate, setVatRate, vatRateOptions, VAT_FIELDS } from '~/utils/product-vat'

// THE VAT RATE THE PRODUCT EDITOR SHOWS MUST BE THE ONE THE PLATFORM CHARGES.
//
// A product carries its rate twice. `taxRate` is a decimal and is the truth; `tax` is a legacy
// integer and is a lossy shadow of it. OkamAPI is explicit about which is which:
//
//   Entities/Product/Product.cs:23,28   int Tax; decimal? TaxRate
//   Helpers/TaxRateExtensions.cs:34     EffectiveTaxRate(Product p) => p.TaxRate ?? p.Tax
//   Helpers/TaxRateExtensions.cs:22-26  "a Swiss 8.1 shadows as 8 ... must never be read for VAT"
//
// This editor read and wrote the shadow, which produced two defects at once. A Swiss product taxed
// at 8.1% displayed "8 %" — a truncated rate presented as correct. And because `saveProduct` spreads
// the fetched product, `taxRate` survived a save untouched as an undeclared property (core's Product
// model has no `taxRate` at all, core/models/product/product.ts:26), so writing only `tax` left the
// two fields DISAGREEING: the operator picked 25, the platform charged `TaxRate ?? Tax` = 8.1, and
// nothing on the screen or in the payload reported a conflict.
//

// `pages/admin/products.vue` cannot be imported here — its template uses optional chaining, which
// this repo's Vue 2 template compiler cannot parse — so the rule lives in utils/product-vat.js and
// the page's three computeds are one-line adapters over it. That is what is pinned.
const ctx = product => product

const read = (product, [intField, decimalField]) => effectiveVatRate(product, intField, decimalField)
const write = (product, [intField, decimalField], value) => setVatRate(product, value, intField, decimalField)

const FIELDS = [
  ['takeaway', ...VAT_FIELDS.takeaway],
  ['dineIn', ...VAT_FIELDS.dineIn],
  ['delivery', ...VAT_FIELDS.delivery]
]

describe('the editor reads the decimal rate, not its truncated shadow', () => {
  test.each(FIELDS)('%s shows the Swiss 8.1, not the 8 the integer holds', (name, intField, decimalField) => {
    const self = ctx({ [intField]: 8, [decimalField]: 8.1 })
    expect(read(self, [intField, decimalField])).toBe(8.1)
  })

  test.each(FIELDS)('%s falls back to the integer when there is no decimal', (name, intField, decimalField) => {
    expect(read(ctx({ [intField]: 25, [decimalField]: null }), [intField, decimalField])).toBe(25)
    expect(read(ctx({ [intField]: 25 }), [intField, decimalField])).toBe(25)
  })

  test.each(FIELDS)('%s reports a genuine zero rate as zero, not as absence', (name, intField, decimalField) => {
    // `!0` is true, so any truthiness guard here would swallow a zero-rated product.
    expect(read(ctx({ [intField]: 0, [decimalField]: 0 }), [intField, decimalField])).toBe(0)
    expect(read(ctx({ [intField]: 0, [decimalField]: null }), [intField, decimalField])).toBe(0)
  })

  test.each(FIELDS)('%s answers null when nobody stated a rate at all', (name, intField, decimalField) => {
    expect(read(ctx({}), [intField, decimalField])).toBeNull()
    expect(read(ctx(null), [intField, decimalField])).toBeNull()
  })
})

describe('choosing a rate writes both halves, so they can never disagree', () => {
  test.each(FIELDS)('%s sets the decimal to the choice and the integer to its truncation', (name, intField, decimalField) => {
    const product = { [intField]: 8, [decimalField]: 8.1 }
    write(ctx(product), [intField, decimalField], 25)
    expect(product[decimalField]).toBe(25)
    expect(product[intField]).toBe(25)
  })

  test.each(FIELDS)('%s truncates like the backend does, so 8.1 shadows as 8', (name, intField, decimalField) => {
    // `(int)decimal.Truncate(rate)` in SetTaxRate. Rounding would put 8 on a row charging 8.1.
    const product = {}
    write(ctx(product), [intField, decimalField], 8.1)
    expect(product[decimalField]).toBe(8.1)
    expect(product[intField]).toBe(8)
  })

  test.each(FIELDS)('%s round-trips: what was chosen is what is read back', (name, intField, decimalField) => {
    const product = { }
    const self = ctx(product)
    write(self, [intField, decimalField], 8.1)
    expect(read(self, [intField, decimalField])).toBe(8.1)
  })

  test.each(FIELDS)('%s leaves the product alone when handed something that is not a rate', (name, intField, decimalField) => {
    const product = { [intField]: 15, [decimalField]: 15 }
    const self = ctx(product)
    write(self, [intField, decimalField], '')
    write(self, [intField, decimalField], null)
    write(self, [intField, decimalField], NaN)
    expect(product[intField]).toBe(15)
    expect(product[decimalField]).toBe(15)
  })

  test('a rate written on a brand-new product creates both fields', () => {
    // A newly created product has `tax` and no `taxRate` at all, so this is the path where the
    // decimal has to be brought into existence rather than updated.
    const product = { tax: 15 }
    write(ctx(product), VAT_FIELDS.takeaway, 8.1)
    expect(product).toEqual({ tax: 8, taxRate: 8.1 })
  })
})

describe('the offered rates still show whatever the product actually carries', () => {
  const vatOptions = vatRateOptions

  test('a Swiss 8.1 is listed even though the offer is Norwegian', () => {
    expect(vatOptions(8.1)).toEqual([8.1, 0, 12, 15, 25])
  })

  test('a rate already on the list is not duplicated', () => {
    expect(vatOptions(25)).toEqual([0, 12, 15, 25])
  })

  test('no rate at all leaves the offer as it was', () => {
    expect(vatOptions(null)).toEqual([0, 12, 15, 25])
  })
})
