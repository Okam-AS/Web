// The app's money DISPLAY rule, in one place: what an amount looks like — and what an amount nobody
// stated looks like.
//
// A zero price is a claim: it says this thing costs nothing. An absent price is not a claim at all,
// and the two must never render alike. Every entry point here treats `null`, `undefined`, an empty
// field and anything that is not a number as UNSTATED and prints the unknown mark; only a real
// number becomes digits.
//
// WHY IT EXISTS. The opposite coercion shipped: `formatChf` began `Number(amountMinor) || 0`, so a
// null, an undefined, an empty string and a NaN all printed "CHF 0.00" — the exact `Number(null) === 0`
// that made every unlinked engagement on the workforce roster read as bound to operator #0. Core's
// own helper does the same thing from the other side (`if (!amount) return "0"`), so the Norwegian
// branch printed "kr 0" for an amount nobody had stated. Both are gated now: this module holds the
// rule, and `plugins/global-mixin.js` applies it in front of BOTH formatters.
//
// RELATED, AND DELIBERATELY NOT THE SAME RULE. `readMinor` in `utils/events/journey.js` is a stricter
// reader for values coming off the WIRE: it also refuses a non-integer, because a `long …Minor` that
// arrived as 12.5 is a field whose value is not known. This one cannot be that strict, because it
// gates the SHARED formatter and `components/shared/OfferDocument.vue` legitimately hands it a
// client-computed float (`totalOnetimeFee * 0.25`, the VAT line of an offer). A module reading money
// off the wire should use `readMinor` first and this second; a surface formatting a figure it already
// holds needs only this.

// CHF price formatting helper for the Swiss ('ch') edition.
// Amounts are in MINOR units (Rappen), matching core/helpers/tools priceLabel.
// Produces strings like "CHF 1'234.50":
//   - de-CH locale, always 2 decimals, point decimal separator
//   - thousands separator normalised to an ASCII apostrophe (U+0027),
//     since de-CH Intl may emit the typographic apostrophe (U+2019)

const TYPOGRAPHIC_APOSTROPHE = String.fromCharCode(0x2019) // ’
const ASCII_APOSTROPHE = String.fromCharCode(0x27) // '

/**
 * What this admin prints for a fact it does not have — U+2014, the same mark every module surface
 * already uses for an absent hour, an absent count and an absent author (`unknownMark`).
 *
 * It carries no currency symbol and no digits on purpose: a reader must not be able to mistake it for
 * an amount, and "CHF —" would still assert that somebody priced this in francs.
 */
export const UNKNOWN_AMOUNT = '—'

/**
 * Did anyone actually state this amount?
 *
 * `false` for `null`, `undefined`, an empty or blank field, `NaN`, `Infinity`, and for a value whose
 * type is not money at all (a boolean, an object). `true` for every real number INCLUDING zero and
 * including a negative — a refund of nothing and a refund of −50 are both figures somebody stated.
 *
 * A numeric string counts as stated. Both formatters have always accepted one (`Number(amountMinor)`
 * on the Swiss side, `.toString()` on the Norwegian), so refusing it here would blank out a price
 * that renders today; a BLANK string is the absent case and is refused.
 */
export function isAmountStated (amountMinor) {
  if (amountMinor === null || amountMinor === undefined) { return false }
  if (typeof amountMinor === 'number') { return Number.isFinite(amountMinor) }
  if (typeof amountMinor === 'string') {
    return amountMinor.trim() !== '' && Number.isFinite(Number(amountMinor))
  }
  return false
}

export function formatChf (amountMinor) {
  // Before any arithmetic. `Number(null)` is 0 and `NaN || 0` is 0, so every absent amount used to
  // arrive at the formatter already disguised as a genuine zero.
  if (!isAmountStated(amountMinor)) { return UNKNOWN_AMOUNT }
  const minor = Number(amountMinor)
  const formatted = new Intl.NumberFormat('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
    .format(minor / 100)
    .split(TYPOGRAPHIC_APOSTROPHE)
    .join(ASCII_APOSTROPHE)
  return 'CHF ' + formatted
}

export default formatChf
