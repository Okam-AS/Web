// The cross-currency half of the money display rule, and the one composition on this admin that goes
// AROUND both formatters instead of through them.
//
// WHY A COMPOSITION EXISTS AT ALL. When the API priced a figure in a currency this admin's own
// formatter does not print, the symbol is withheld and the ISO code shown instead, because a wrong
// symbol is a wrong amount — a franc labelled "kr" is a lie about how much money this is. The digits
// still come from the shared helpers; only the symbol is replaced by the code.
//
// WHY IT NEEDED A GATE OF ITS OWN. `priceLabel` on the global mixin refuses an amount nobody stated
// and prints the unknown mark. The two digit helpers beside it deliberately do NOT — `pages/admin/
// delivery.vue` seeds the two halves of a money INPUT from them, and a dash typed into a field the
// operator then saves is worse than a zero. So this composition, built out of the ungated halves,
// inherited neither refusal: core's `wholeAmountTool(null)` answers "0" and `fractionAmountTool(null)`
// answers "00", which made an amount nobody stated compose to exactly "0,00 SEK" — byte-identical to
// a genuine zero of the same currency, in the one branch where the reader has no familiar symbol to
// read the figure against.
//
// THE DISTINCTION IS `isAmountStated`, NOT FALSINESS. `!0` is `true`, so a truthiness guard here
// would swallow the case that must survive: a cost of exactly nothing IS a claim somebody made and
// still prints "0,00 SEK". Only the unstated is withheld. (The trap is a property of the value's
// DOMAIN, not of the idiom: `!0` is `true` but `!'0'` is `false`, so the same guard written over a
// string field would enforce nothing at all and invite a test that can never fail.)
//
// AND IT IS THE SAME RULE AS THE OTHER BRANCH. Every call site is one `if`: this composition when the
// currencies differ, `this.priceLabel` when they do not. Gating this branch by any rule other than the
// one `priceLabel` already applies would mean a single absent amount rendering as a dash in kroner and
// as "0,00" in francs — the same absence answered two different ways by the same method. That is why
// this reuses `isAmountStated` rather than the stricter `readMinor`: a shared reading of absence
// matters more here than refusing a non-integer, which is the wire reader's job upstream.
//
// It lives in its own module rather than in `utils/price.js` because that module is the gate in front
// of the formatters and this is the path that bypasses them; and it is one function rather than five
// copies because three of the five call sites already carried a comment asking for exactly that.

import { isAmountStated, UNKNOWN_AMOUNT } from '~/utils/price';

/**
 * Integer minor units and an ISO currency code as one label — or the unknown mark, if nobody stated
 * the amount.
 *
 * `digits` is the calling component itself. `wholeAmount` and `fractionAmount` are global-mixin
 * methods and are called ON it rather than destructured off it, so they keep their receiver if either
 * ever grows one.
 */
export function crossCurrencyLabel (minor, currencyCode, digits) {
  if (!isAmountStated(minor)) { return UNKNOWN_AMOUNT; }
  return digits.wholeAmount(minor) + ',' + digits.fractionAmount(minor) + ' ' + currencyCode;
}

export default crossCurrencyLabel;
