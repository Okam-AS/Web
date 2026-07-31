// Turning what a venue TYPES into the integer minor units the statement's inputs take — the one place
// on this surface where a number becomes money.
//
// WHY THIS IS NOT `Number(text) * 100`. The obvious conversion is wrong twice over. `19.99 * 100` is
// `1998.9999999999998` in IEEE-754, so an invoice entered as 19,99 would be sent as 1998 øre; over a
// week of purchase lines those missing øre land straight in the actual-food-cost percentage a venue
// prices its menu on. And `Number('1e3')`, `Number('0x10')` and `Number(' ')` all succeed with values
// nobody typed. So no arithmetic happens here at all: the digits are REARRANGED as text — the fraction
// padded to two places and appended to the whole part — and converted exactly once, by a single
// `Number()` on a string of pure digits.
//
// WHY IT REFUSES RATHER THAN ROUNDS. Three decimal places is not an amount this schema can hold, and
// truncating "235,555" to 23555 would send a figure the venue did not state.
//
// A DELIBERATE NEAR-TWIN of `~/utils/workforce-rates/rate-amount`, and NOT an import of it, because
// the two rule sets genuinely differ and the difference is the whole point:
//
//   • an hourly rate must be POSITIVE, and that parser collapses zero and negative into one refusal;
//   • a purchase-spend line must merely be NON-NEGATIVE — the server's own rule is "a purchase-spend
//     amount must not be negative", so a line of exactly 0,00 is legal (a credited invoice entered for
//     the record) and cannot be refused here;
//   • a stock-value estimate has no server-side guard at all, so this refuses nothing it accepts.
//
// Importing the rates parser and re-deriving those cases is impossible — `AMOUNT_NOT_POSITIVE` does
// not say which of zero or negative it met. What the two should share is the digit rearrangement, in a
// neutral `~/utils/money/parse-minor`; that refactor edits `utils/workforce-rates/**`, which this lane
// does not own, so it is named here rather than done.
//
// The result is deliberately NOT formatted back for display. The caller renders the integer minor
// units it is about to send, so what is on screen is what goes on the wire.

/** The submitted text was blank. */
export const SPEND_EMPTY = 'empty';
/** The submitted text is not a plain decimal number. */
export const SPEND_NOT_A_NUMBER = 'not-a-number';
/** More than two decimal places — finer than the minor unit the schema stores. */
export const SPEND_TOO_MANY_DECIMALS = 'too-many-decimals';
/** Negative, which `MarginStatementService.SetInputsAsync` refuses for a spend line. */
export const SPEND_NEGATIVE = 'negative';
/** Beyond exact integer representation — refused rather than silently rounded. */
export const SPEND_TOO_LARGE = 'too-large';

// `Number()` is exact for integers up to 2^53-1 (16 digits); 15 digits of minor units is ~10 billion
// major units, far past any week of purchase invoices, and stops well short of where exactness ends.
const MAX_DIGITS = 15;

// A plain decimal and nothing else: no exponent, no hex, no thousands separator that survived
// normalisation, no trailing separator.
const DECIMAL = /^(-?)(\d+)(?:[.,](\d+))?$/;

// Thousands separators and stray padding. `\s` covers the ordinary space, the NBSP (U+00A0) and the
// narrow NBSP (U+202F) that `Intl` and a paste from a spreadsheet produce in Norwegian grouping, so
// "12 500,00" is the amount a venue already sees in every other column of this admin.
const SEPARATORS = /\s/g;

/**
 * Parses a typed major-unit amount into integer minor units.
 *
 * Returns `{ minor, error }`: exactly one of the two is set. `error` is one of the `SPEND_*` codes,
 * which the caller maps to a message — never the raw text, so the reason is renderable in every
 * language.
 *
 * `allowNegative` mirrors the server field by field: false for a spend line (refused server-side),
 * true for the two stock-value estimates (no server-side guard, so none is invented here).
 */
export function parseSpendAmount (text, allowNegative) {
  if (text === null || text === undefined) { return fail(SPEND_EMPTY); }

  const cleaned = String(text).replace(SEPARATORS, '');
  if (cleaned === '') { return fail(SPEND_EMPTY); }

  const match = DECIMAL.exec(cleaned);
  if (!match) { return fail(SPEND_NOT_A_NUMBER); }

  const negative = match[1] === '-';
  const whole = match[2];
  const fraction = match[3] || '';

  if (fraction.length > 2) { return fail(SPEND_TOO_MANY_DECIMALS); }

  // The whole conversion: pad the fraction to the minor place and read the digits as one integer.
  // No multiplication, no division, so no float ever touches the amount.
  const digits = whole + fraction.padEnd(2, '0');
  if (digits.length > MAX_DIGITS) { return fail(SPEND_TOO_LARGE); }

  const magnitude = Number(digits);
  if (!Number.isSafeInteger(magnitude)) { return fail(SPEND_TOO_LARGE); }

  if (negative && !allowNegative) { return fail(SPEND_NEGATIVE); }

  // `-0` is not a value the wire should carry, and it compares equal to 0 everywhere it would be
  // checked, so the sign is only applied to a magnitude that has one.
  return { minor: negative && magnitude !== 0 ? -magnitude : magnitude, error: null };
}

function fail (error) {
  return { minor: null, error };
}

export default parseSpendAmount;
