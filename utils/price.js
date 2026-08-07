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
 * The typographic MINUS (U+2212), not the ASCII hyphen. It is what these rows have always printed,
 * and it is exported so a test can name the character instead of pasting a glyph that looks like
 * three other ones.
 */
export const MINUS_SIGN = '−'

/**
 * The label for a row that prints the NEGATION of an amount. Nine rows, and the list is exhaustive
 * because a source scan in `test/xz-negated-absence.test.js` fails if a tenth appears anywhere under
 * `components/admin/pos/`: six deduction rows on the X/Z report (negativ salg, retur, feilslag),
 * the per-line discount on a printed receipt, the per-line discount on an open check, and the
 * discount total in the check footer.
 *
 * WHY IT EXISTS, AND WHY NO EXISTING GATE COULD REACH IT. Those rows wrote the sign as a template
 * literal OUTSIDE the interpolation: `−{{ priceLabel(x) }}`. The formatter therefore never saw the
 * character, and every absence rule in this module — all of which run INSIDE the interpolation —
 * was structurally incapable of refusing it. An absent amount rendered as `−—`: a minus sign
 * attached to the unknown mark, which reads as the negative of a figure nobody stated and is
 * indistinguishable from a formatting slip on a kassasystemforskrifta document an inspector reads.
 * A gate cannot refuse a character that is never passed to it, so the sign has to be owned by the
 * label. That is the whole point of this function, and it is why the answer is not a fifth guard.
 *
 * FOUR WORLDS, NOT THREE. A deduction row has to survive a field that already carries a minus, on
 * top of the usual stated / zero / absent trio:
 *
 *   - STATED MAGNITUDE (5000, the normal case) renders `−kr 50,00`. The sign MUST still print.
 *     Deleting the literal is the obvious way to be rid of `−—`, and it silently turns every
 *     deduction on the report into a positive — trading a confusing row for a wrong one.
 *   - GENUINE ZERO renders `kr 0,00`, with no sign. Zero is a figure somebody stated; `−kr 0,00`
 *     is not a smaller number, only a stranger one.
 *   - ALREADY NEGATIVE (-5000): the negation is +50 and it prints `kr 50,00`. The sign is resolved
 *     ONCE, from the negated value. Prepending a literal to a formatted negative would compose
 *     `−kr -50,00`, which states the opposite of itself twice.
 *   - ABSENT renders the bare unknown mark and NO sign, because "we do not know" is the whole of
 *     the claim and a sign in front of it asserts a direction the row does not have.
 *
 * `formatAmount` is the caller's own formatter (`this.priceLabel` off the global mixin), and it is
 * only ever handed a MAGNITUDE. That is not a stylistic preference: core's `priceLabel` splits the
 * minor units with `slice(0, -2)` and `slice(-2)`, so it formats -4 as "kr 0,-4" and -50 as
 * "kr -,50". Negating the value and letting the formatter print the sign would be correct
 * arithmetic handed to a formatter that cannot render it.
 */
export function negatedAmountLabel (amountMinor, formatAmount) {
  if (!isAmountStated(amountMinor)) { return UNKNOWN_AMOUNT }
  const negated = -Number(amountMinor)
  // A genuine zero needs no case of its own: negating it gives `-0`, and `-0 < 0` is false, so it
  // takes the unsigned branch and prints its digits. An explicit `if (negated === 0)` guard stood
  // here first and the mutation proof in `lanes/L-XZ-NEGATED-ABSENCE/` could not make deleting it
  // fail a single test — which is what dead means.
  return (negated < 0 ? MINUS_SIGN : '') + formatAmount(Math.abs(negated))
}

/**
 * Is there an amount in play here — or do we simply not know?
 *
 * THE ONE IMPLEMENTATION of the render question this module answers, with `isDeductionInPlay` below
 * as its deduction-facing name. `true` when the amount states a figure above zero, and ALSO when it
 * states nothing at all. `false` only for an amount that positively says there is none — a stated
 * zero, or a stated value at or below it.
 *
 * WHY IT IS NAMED TWICE AND WRITTEN ONCE. The deduction rows were the first callers and their name
 * is load-bearing where it is used; a check row's DEPOSIT tag then needed the identical predicate,
 * and `isDeductionInPlay(depositAmount)` would have read as a lie about what a deposit is (pant is
 * an addition to the bill, not a subtraction from it). Copying the two lines into the component
 * would have put a second answer to the absence question in a Vue file, which is the exact thing
 * this module exists to prevent — so the rule stays here, once, and the deduction name delegates.
 */
export function isAmountInPlay (amountMinor) {
  if (!isAmountStated(amountMinor)) { return true }
  return Number(amountMinor) > 0
}

/**
 * Is a deduction in play on this amount?
 *
 * The predicate a deduction ROW is rendered on, and the one that decides whether a returned bill row
 * refunds what was charged or what it was listed at. `true` when the amount states a deduction, and
 * ALSO when it states nothing at all. `false` only for an amount that positively says there was none
 * — a stated zero, or a stated value at or below it.
 *
 * WHY IT IS NOT `x > 0`. A relational test gives the same answer, "no", to a genuine zero and to a
 * field that never arrived, so a discount nobody could read vanished off the check with nothing left
 * on screen to say it had been there. Three worlds, not two: a stated discount prints its figure; a
 * stated zero prints NO ROW, because nothing was taken off and a "Rabatt kr 0,00" line on every
 * ordinary bill is noise; and an amount nobody stated prints the row carrying the unknown mark,
 * because "we do not know what came off this bill" is a reading an operator has to be given rather
 * than one the layout is allowed to swallow.
 *
 * WHY THE ZERO AND NEGATIVE ANSWERS ARE DELIBERATELY UNCHANGED. Dropping the `> 0` altogether —
 * rendering a row for every stated amount — puts a zero discount on every check in the estate and
 * turns a stated negative into an unsigned `kr 50,00` under a heading that says Rabatt. The change
 * is exactly one column wide, and that is measured rather than asserted:
 * `lanes/L-CHECK-DISCOUNT-SUM-COUPLED/sum-vs-guard-probe.js` runs both predicates over nineteen
 * shapes and prints every shape whose answer moves. All of them are unstated; no stated shape moves.
 */
export function isDeductionInPlay (amountMinor) {
  return isAmountInPlay(amountMinor)
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
