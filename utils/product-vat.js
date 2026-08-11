// WHICH OF A PRODUCT'S TWO VAT RATES IS THE REAL ONE.
//
// A product carries its VAT rate twice, and the two are not equals. `taxRate` is a decimal and is the
// truth; `tax` is a legacy integer and is a lossy shadow of it. OkamAPI is explicit about which is
// which, and unusually blunt about the consequence:
//
//   Entities/Product/Product.cs:23,28   int Tax;  decimal? TaxRate
//   Helpers/TaxRateExtensions.cs:34     EffectiveTaxRate(Product p) => p.TaxRate ?? p.Tax
//   Helpers/TaxRateExtensions.cs:22-26  "it is a lossy shadow of the truth in TaxRate (a Swiss 8.1
//                                        shadows as 8) and must never be read for VAT"
//
// The admin product editor read and wrote the shadow, which is exactly what that note forbids, and it
// cost two separate defects.
//
// IT DISPLAYED A TRUNCATED RATE AS CORRECT. A Swiss product taxed at 8.1% rendered "8 %" in the
// editor's dropdown. 8% is a rate no market charges; nothing on the screen said it was an
// approximation, because as far as the editor knew it was the value.
//
// AND WRITING ONE HALF MADE THEM DISAGREE, which is worse. `saveProduct` spreads the fetched product,
// so `taxRate` survived a save untouched as an undeclared property — core's Product model does not
// declare it at all (core/models/product/product.ts:26), so it round-trips invisibly. An operator on
// a Swiss product who chose "25 %" therefore set `tax = 25` and left `taxRate` at 8.1, and the
// platform went on charging `TaxRate ?? Tax` = 8.1%. The screen confirmed 25, the register used 8.1,
// and no layer between them was in a position to notice. A wrong VAT rate the UI actively confirms is
// the worst shape this can take, because the operator has already checked it.
//
// WHY THIS IS A MODULE and not two methods on the page: `pages/admin/products.vue` cannot be imported
// by a component test at all — its template uses optional chaining (`product.image?.imageUrl`), which
// this repo's Vue 2 template compiler cannot parse — so a rule that lives on the page is a rule that
// cannot be pinned. Three other surfaces also hold hardcoded rate lists
// (components/admin/pos/OpenPriceModal.vue, ReturnBuilder.vue, pos-settings/GoodsGroupsTab.vue); this
// is the one place the read/write rule now lives for anything that adopts it.

/**
 * The rate the platform would actually charge: the decimal if the product has one, the legacy
 * integer otherwise. `null` when nobody stated either — which is NOT the same as a zero-rated
 * product, and the two must not be collapsed. `!0` is `true`, so no truthiness test can tell them
 * apart and none is used here.
 *
 * @param {object|null} product      the product being edited
 * @param {string} intField          'tax' | 'tableTax' | 'deliveryTax'
 * @param {string} decimalField      'taxRate' | 'tableTaxRate' | 'deliveryTaxRate'
 * @returns {number|null}
 */
export function effectiveVatRate (product, intField, decimalField) {
  if (!product) { return null }
  const decimal = product[decimalField]
  if (decimal !== null && decimal !== undefined && decimal !== '') {
    const asNumber = Number(decimal)
    if (Number.isFinite(asNumber)) { return asNumber }
  }
  const legacy = product[intField]
  if (legacy === null || legacy === undefined || legacy === '') { return null }
  const asNumber = Number(legacy)
  return Number.isFinite(asNumber) ? asNumber : null
}

/**
 * Write a chosen rate onto BOTH halves, so the decimal and its integer shadow can never state two
 * different rates again.
 *
 * This is deliberately the same rule the backend applies when it stamps a rate — `SetTaxRate`
 * (Helpers/TaxRateExtensions.cs:28-32) sets the decimal and then writes
 * `(int)decimal.Truncate(rate)` — because a client that rounded where the server truncates would
 * put a shadow on the row that disagrees with every row the server wrote. 8.1 shadows as 8.
 *
 * A value that is not a rate is ignored rather than written: an empty select or a cleared field is
 * an absence, and blanking a product's VAT because a widget emitted '' would be a silent money
 * change nobody asked for.
 *
 * @param {object|null} product
 * @param {number|string} rate
 * @param {string} intField
 * @param {string} decimalField
 * @param {function} [assign]  how to set a property — pass Vue's `$set` so a field that does not yet
 *                             exist on a newly created product becomes reactive.
 */
export function setVatRate (product, rate, intField, decimalField, assign) {
  if (!product) { return }
  const value = Number(rate)
  if (rate === null || rate === undefined || rate === '' || !Number.isFinite(value)) { return }
  const set = assign || ((target, key, next) => { target[key] = next })
  set(product, decimalField, value)
  set(product, intField, Math.trunc(value))
}

/** The three rates a product carries, as [intField, decimalField] pairs. */
export const VAT_FIELDS = {
  takeaway: ['tax', 'taxRate'],
  dineIn: ['tableTax', 'tableTaxRate'],
  delivery: ['deliveryTax', 'deliveryTaxRate']
}

/**
 * The rates the editor offers, plus whatever this product actually carries.
 *
 * The offer is Norway's — 0/12/15/25 — and it is NOT market-aware yet. A Swiss product's 8.1 reaches
 * the dropdown only through the `current` branch below: it is shown, and it stays selectable once
 * shown, but it is not offered to a product that does not already have it. Making the offer itself
 * market-aware needs a rate source this page does not have — the market's VAT rates are served on
 * `GET /stores/{id}/market` (`vatStandardRate` / `vatLabel`), which `pages/admin/products.vue` never
 * reads. That is named here rather than guessed at, because inventing a Swiss rate list in the
 * frontend would be a second source of VAT truth competing with the platform's.
 *
 * Keeping `current` on the list is load-bearing regardless: without it, opening the editor on a
 * product whose rate is not one of the four would silently re-point the select at the first option
 * and save a different rate than the one the product had.
 */
export function vatRateOptions (current) {
  const rates = [0, 12, 15, 25]
  if (current !== null && current !== undefined && current !== '' && !rates.includes(current)) {
    return [current].concat(rates)
  }
  return rates
}
