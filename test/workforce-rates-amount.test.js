import {
  AMOUNT_EMPTY,
  AMOUNT_NOT_A_NUMBER,
  AMOUNT_NOT_POSITIVE,
  AMOUNT_TOO_LARGE,
  AMOUNT_TOO_MANY_DECIMALS,
  parseRateAmount
} from '~/utils/workforce-rates/rate-amount'

// The one place a typed number becomes money on this surface. A rate that lands one øre low is
// never correctable — the timeline is append-only — so this parser is tested against the exact
// failure it exists to prevent, not merely against the happy path.
describe('parseRateAmount', () => {
  // ---- the defect this parser exists to avoid ----------------------------------------------------

  // THE POSITIVE CONTROL for the whole technique. If the parser multiplied, 19,99 would be stored
  // as 1998 øre and every hour of that engagement would be paid a øre short, forever. This asserts
  // BOTH that the bug is real in the obvious implementation AND that this parser does not have it —
  // either half alone would be a test that proves nothing.
  test('the naive `Number(text) * 100` is genuinely wrong here, and this parser is not', () => {
    expect(Number('19.99') * 100).not.toBe(1999)
    expect(Math.trunc(Number('19.99') * 100)).toBe(1998)

    expect(parseRateAmount('19,99').minor).toBe(1999)
    expect(parseRateAmount('19.99').minor).toBe(1999)
  })

  // The same trap at five more amounts, so the one above cannot be dismissed as a single unlucky
  // value. Each of these truncates exactly one øre low under `Number(x) * 100`, and the last three
  // are ordinary Norwegian hourly rates rather than contrived ones.
  test.each([
    ['0,29', 29],
    ['1,13', 113],
    ['2,01', 201],
    ['8,20', 820],
    ['256,03', 25603],
    ['256,15', 25615]
  ])('%s is exactly %i øre, where multiplication would round it away', (text, minor) => {
    expect(Math.trunc(Number(text.replace(',', '.')) * 100)).toBe(minor - 1)
    expect(parseRateAmount(text).minor).toBe(minor)
  })

  // ---- accepted shapes ----------------------------------------------------------------------------

  test.each([
    ['235', 23500],
    ['235,5', 23550],
    ['235,50', 23550],
    ['235.50', 23550],
    ['0,01', 1],
    ['1', 100],
    ['00235,50', 23550],
    ['1 234,50', 123450],
    // The NBSP (U+00A0) and narrow NBSP (U+202F) `Intl` emits for Norwegian grouping, which a
    // paste from any other column of this admin carries with it.
    ['1\u00A0234,50', 123450],
    ['1\u202F234,50', 123450],
    ['  200  ', 20000],
    ['1 234', 123400]
  ])('accepts %s as %i minor units', (text, minor) => {
    const result = parseRateAmount(text)
    expect(result.error).toBeNull()
    expect(result.minor).toBe(minor)
    // The unit is whole minor units by construction, never a fraction of one.
    expect(Number.isInteger(result.minor)).toBe(true)
  })

  test('a trailing zero changes nothing, because the fraction is padded rather than scaled', () => {
    expect(parseRateAmount('235,5').minor).toBe(parseRateAmount('235,50').minor)
    expect(parseRateAmount('235').minor).toBe(parseRateAmount('235,00').minor)
  })

  // ---- refusals, each with its own code ------------------------------------------------------------

  test.each([
    ['', AMOUNT_EMPTY],
    ['   ', AMOUNT_EMPTY],
    [null, AMOUNT_EMPTY],
    [undefined, AMOUNT_EMPTY],
    ['abc', AMOUNT_NOT_A_NUMBER],
    // `Number('1e3')` is 1000 and `Number('0x10')` is 16 — values nobody typed as a rate.
    ['1e3', AMOUNT_NOT_A_NUMBER],
    ['0x10', AMOUNT_NOT_A_NUMBER],
    ['235,', AMOUNT_NOT_A_NUMBER],
    [',50', AMOUNT_NOT_A_NUMBER],
    ['235,50,25', AMOUNT_NOT_A_NUMBER],
    ['--5', AMOUNT_NOT_A_NUMBER],
    ['+5', AMOUNT_NOT_A_NUMBER],
    ['235kr', AMOUNT_NOT_A_NUMBER],
    ['Infinity', AMOUNT_NOT_A_NUMBER],
    ['NaN', AMOUNT_NOT_A_NUMBER],
    // Finer than the øre. Truncating would store an amount the manager did not state.
    ['235,555', AMOUNT_TOO_MANY_DECIMALS],
    ['0,001', AMOUNT_TOO_MANY_DECIMALS],
    // The server refuses these as `workforce.rate-not-positive`; the form says so first.
    ['0', AMOUNT_NOT_POSITIVE],
    ['0,00', AMOUNT_NOT_POSITIVE],
    ['-5', AMOUNT_NOT_POSITIVE],
    ['-0,01', AMOUNT_NOT_POSITIVE],
    ['99999999999999999', AMOUNT_TOO_LARGE]
  ])('refuses %p as %s', (text, code) => {
    const result = parseRateAmount(text)
    expect(result.error).toBe(code)
    // A refusal never leaks a number the caller could send anyway.
    expect(result.minor).toBeNull()
  })

  // POSITIVE CONTROL for the refusal table: the boundary just inside each limit must be ACCEPTED,
  // or a parser that refused everything would satisfy every row above.
  test('the values just inside each limit are accepted', () => {
    expect(parseRateAmount('0,01').minor).toBe(1)
    expect(parseRateAmount('235,55').error).toBeNull()
    // Thirteen whole digits plus the two øre places is exactly the fifteen the parser allows.
    expect(parseRateAmount('9999999999999').minor).toBe(999999999999900)
    expect(Number.isSafeInteger(parseRateAmount('9999999999999').minor)).toBe(true)
    // One digit more is over the line, which is what makes the acceptance above a real boundary.
    expect(parseRateAmount('99999999999999').error).toBe(AMOUNT_TOO_LARGE)
  })

  test('exactly one of minor and error is ever set', () => {
    for (const text of ['235,50', '0', 'abc', '', '235,555', '9'.repeat(20)]) {
      const result = parseRateAmount(text)
      expect((result.minor === null) !== (result.error === null)).toBe(true)
    }
  })
})
