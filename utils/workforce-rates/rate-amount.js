// Turning what a manager TYPES into the integer minor units the wire takes — the one place on this
// surface where a number becomes money.
//
// WHY THIS IS NOT `Number(text) * 100`. The obvious conversion is wrong twice over. `19.99 * 100` is
// `1998.9999999999998` in IEEE-754, so a rate typed as 19,99 would be stored as 1998 øre — a
// silently under-paid hour, on a timeline that can never be edited to fix it. And `Number('1e3')`,
// `Number('0x10')` and `Number(' ')` all succeed with values nobody typed. So no arithmetic happens
// here at all: the digits are REARRANGED as text — the fraction padded to two places and appended to
// the whole part — and converted exactly once, by a single `Number()` on a string of pure digits.
//
// WHY IT REFUSES RATHER THAN ROUNDS. Three decimal places is not a rate this schema can hold, and
// truncating "235,555" to 23555 would store an amount the manager did not state. The øre is the
// unit; anything finer is refused and said out loud.
//
// The result is deliberately NOT formatted back for display. The caller renders the integer minor
// units it is about to send, so what is on screen is what goes on the wire.

/** The submitted text was blank. */
export const AMOUNT_EMPTY = 'empty';
/** The submitted text is not a plain decimal number. */
export const AMOUNT_NOT_A_NUMBER = 'not-a-number';
/** More than two decimal places — finer than the øre the schema stores. */
export const AMOUNT_TOO_MANY_DECIMALS = 'too-many-decimals';
/** Zero or negative. The server refuses this as `workforce.rate-not-positive`; so does this. */
export const AMOUNT_NOT_POSITIVE = 'not-positive';
/** Beyond exact integer representation — refused rather than silently rounded. */
export const AMOUNT_TOO_LARGE = 'too-large';

// `Number()` is exact for integers up to 2^53-1 (16 digits); 15 digits of minor units is ~10 billion
// major units, far past any hourly rate, and stops well short of where exactness ends.
const MAX_DIGITS = 15;

// A plain decimal and nothing else: no exponent, no hex, no thousands separator that survived
// normalisation, no trailing separator.
const DECIMAL = /^(-?)(\d+)(?:[.,](\d+))?$/;

// Thousands separators and stray padding. `\s` covers the ordinary space, the NBSP (U+00A0) and
// the narrow NBSP (U+202F) that `Intl` and a paste from a spreadsheet produce in Norwegian
// grouping, so "1 234,50" is the amount a manager already sees in every other column of this admin.
const SEPARATORS = /\s/g;

/**
 * Parses a typed major-unit amount into integer minor units.
 *
 * Returns `{ minor, error }`: exactly one of the two is set. `minor` is a positive safe integer;
 * `error` is one of the `AMOUNT_*` codes, which the caller maps to a message — never the raw text,
 * so the reason is renderable in every language.
 */
export function parseRateAmount (text) {
  if (text === null || text === undefined) { return fail(AMOUNT_EMPTY); }

  const cleaned = String(text).replace(SEPARATORS, '');
  if (cleaned === '') { return fail(AMOUNT_EMPTY); }

  const match = DECIMAL.exec(cleaned);
  if (!match) { return fail(AMOUNT_NOT_A_NUMBER); }

  const negative = match[1] === '-';
  const whole = match[2];
  const fraction = match[3] || '';

  if (fraction.length > 2) { return fail(AMOUNT_TOO_MANY_DECIMALS); }

  // The whole conversion: pad the fraction to the øre place and read the digits as one integer.
  // No multiplication, no division, so no float ever touches the amount.
  const digits = whole + fraction.padEnd(2, '0');
  if (digits.length > MAX_DIGITS) { return fail(AMOUNT_TOO_LARGE); }

  const minor = Number(digits);
  if (!Number.isSafeInteger(minor)) { return fail(AMOUNT_TOO_LARGE); }

  // Zero and negative collapse to the same refusal the server makes: "unpaid" is a pay-code
  // question and never a rate, and a stored zero is indistinguishable from free labour once summed.
  if (negative || minor === 0) { return fail(AMOUNT_NOT_POSITIVE); }

  return { minor, error: null };
}

function fail (error) {
  return { minor: null, error };
}

export default parseRateAmount;
