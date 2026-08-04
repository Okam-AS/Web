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

/**
 * Add amounts WITHOUT inventing one.
 *
 * A gate in front of a formatter cannot see a hole that the arithmetic already filled in. `null + null`
 * is `0` and `(a || 0) + (b || 0)` is `0`, so a row whose two fields never arrived reaches
 * `priceLabel` as a genuine zero and prints as a real amount — the figure is manufactured before
 * anything is in a position to refuse it. That is why this is a SUM helper and not a second gate:
 * the only place absence can still be seen is before the `+`.
 *
 * Returns `null` — the absent marker every entry point here already understands — if ANY addend is
 * unstated, so `priceLabel(statedSum(a, b))` prints the unknown mark. A partial sum presented as a
 * total is a worse lie than no total: the reader cannot tell which term is missing.
 *
 * An EMPTY list sums to `0`, and that is deliberate: nothing recorded really is nothing. An ABSENT
 * list is not a list, and callers must gate the container themselves rather than pass `[]` for it.
 */
export function statedSum (...amounts) {
  let total = 0
  for (const amount of amounts) {
    if (!isAmountStated(amount)) { return null }
    total += Number(amount)
  }
  return total
}

/**
 * The gate in front of the local money formatters the legacy admin pages wrote for themselves.
 *
 * Five pages each invented their own — an invoice, a settlements summary, a Wolt menu, a rewards
 * roster and two product lists — and five of them printed an amount nobody stated as a real figure,
 * because each one re-decided the absence question and got it wrong in a different way (`|| 0`, an
 * `if (!x)` that a genuine zero also takes, an explicit absence test answered with "0 kr", a raw
 * `/ 100`). The FORMAT legitimately differs per page and stays with the page; the RULE does not, and
 * lives here so there is one place left to get it wrong.
 *
 * `suffix` is a trailing unit ("kr", a currency code) and is omitted when blank — an absent amount
 * never gets one, since "— kr" still asserts that somebody priced this in kroner.
 */
export function amountLabel (amountMinor, { suffix = '', decimalSeparator = '.' } = {}) {
  if (!isAmountStated(amountMinor)) { return UNKNOWN_AMOUNT }
  const kroner = (Number(amountMinor) / 100).toFixed(2)
  const body = decimalSeparator === '.' ? kroner : kroner.split('.').join(decimalSeparator)
  return suffix ? body + ' ' + suffix : body
}

/**
 * The nb-NO currency rendering ("kr 206,80") that the invoice and the settlements summary each built
 * with their own identical `Intl.NumberFormat` call.
 */
export function nokAmountLabel (amountMinor) {
  if (!isAmountStated(amountMinor)) { return UNKNOWN_AMOUNT }
  return new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' })
    .format(Number(amountMinor) / 100)
}

/**
 * What an `<input type="number">` is seeded with for an amount nobody stated.
 *
 * NOT the unknown mark: a number input cannot hold "—", and a dash is not something an operator can
 * edit. Blank is the honest seed — there is no number to show — and it is the difference between an
 * operator seeing an empty price field and an operator tabbing past a pre-filled "0.00" that then
 * gets published as a real price.
 */
export function amountInputValue (amountMinor) {
  if (!isAmountStated(amountMinor)) { return '' }
  return (Number(amountMinor) / 100).toFixed(2)
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
