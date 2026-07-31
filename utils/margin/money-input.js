// Typed money -> integer minor units, WITHOUT FLOATING POINT.
//
// The one place on the Margin admin where a person enters an amount (the manual supplier price), and
// the one place a client-side conversion touches money at all. `readCostPreview` and the menu-margin
// reader render figures the backend computed; this turns "49,90" into 4990 before it is sent.
//
// WHY NOT `Math.round(parseFloat(text) * 100)`. Because it is wrong, quietly, for values a price list
// is full of: `1.005 * 100` is 100.49999999999999 in IEEE-754, so a price of kr 1,005 rounds DOWN to
// 100 øre where every human and the backend's own `decimal` parser round it up to 101. The error is
// one øre, it appears on some values and not others, and it lands in the number a dish gets priced
// on. The backend refused to use a float for exactly this reason (`MarginCsvParser` parses in
// `decimal`); the browser has no decimal, so the digits are taken as STRINGS and never multiplied.
//
// The accepted grammar matches what a Norwegian venue types and what the server's own Norwegian CSV
// dialect accepts: a comma OR a dot as the decimal mark, spaces and non-breaking spaces as thousand
// separators, at most two decimals. It deliberately does NOT accept `1.234,56` (a dot as a thousand
// separator): the two dialects disagree about what `1.234` means, and guessing between "one
// thousand two hundred and thirty-four" and "one and a bit" is exactly the silent wrong-øre this
// file exists to prevent. Such input is refused and the venue is told which forms are read.

/** The refusal reasons, as translation keys the caller renders. */
export const MONEY_EMPTY = 'empty';
export const MONEY_MALFORMED = 'malformed';
export const MONEY_TOO_MANY_DECIMALS = 'too-many-decimals';
export const MONEY_NEGATIVE = 'negative';

/**
 * `{ minor, error }` — exactly one is non-null.
 *
 * `minor` is an integer number of øre. It is built by string concatenation of the whole part and a
 * two-digit fraction, so 49,90 → 4990, 12,50 → 1250 and 249 → 24900 are exact by construction rather
 * than by a rounding that happens to land right.
 */
export function parseMinorUnits (raw) {
  const text = String(raw === null || raw === undefined ? '' : raw)
    // Every kind of space, stripped. `\s` already covers U+00A0 and U+202F — the non-breaking
    // and narrow-no-break spaces a spreadsheet writes as thousand separators, which are the same
    // two the backend's own parser strips by name.
    .replace(/\s/g, '')
    .trim();

  if (!text.length) { return fail(MONEY_EMPTY); }
  if (text.charAt(0) === '-') { return fail(MONEY_NEGATIVE); }

  const match = /^(\d*)(?:[.,](\d*))?$/.exec(text);
  if (!match) { return fail(MONEY_MALFORMED); }

  const whole = match[1] || '';
  const fraction = match[2] === undefined ? '' : match[2];
  // "," and "" both reach here with no digits at all on either side of the mark.
  if (!whole.length && !fraction.length) { return fail(MONEY_MALFORMED); }
  if (fraction.length > 2) { return fail(MONEY_TOO_MANY_DECIMALS); }

  const digits = (whole || '0') + (fraction + '00').slice(0, 2);
  const minor = Number(digits);
  // Past ~90 071 billion øre a JS integer stops being exact. The backend's column is a 64-bit long,
  // so it would accept more than this can carry — refused here rather than sent as a rounded
  // approximation of what was typed.
  if (!Number.isSafeInteger(minor)) { return fail(MONEY_MALFORMED); }

  return { minor, error: null };
}

function fail (error) {
  return { minor: null, error };
}
