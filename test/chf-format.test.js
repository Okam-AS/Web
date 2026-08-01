import formatChf, { UNKNOWN_AMOUNT } from '~/utils/price'

describe('formatChf', () => {
  test('formats thousands with an ASCII apostrophe and 2 decimals', () => {
    expect(formatChf(123450)).toBe("CHF 1'234.50")
  })

  test('formats sub-thousand amounts with 2 decimals', () => {
    expect(formatChf(500)).toBe('CHF 5.00')
  })

  test('formats zero', () => {
    expect(formatChf(0)).toBe('CHF 0.00')
  })

  // WAS: "handles null and undefined gracefully", asserting 'CHF 0.00'. Printing a franc figure for
  // an amount nobody stated is not grace, it is a claim the wire never made — and it made an absent
  // amount indistinguishable from a genuine zero. The rule and its full pin now live in
  // test/price-absence.test.js; this is the CHF half of it, kept beside the formatter it belongs to.
  test('an amount nobody stated is withheld, not printed as zero francs', () => {
    expect(formatChf(null)).toBe(UNKNOWN_AMOUNT)
    expect(formatChf(undefined)).toBe(UNKNOWN_AMOUNT)
    expect(formatChf(null)).not.toBe(formatChf(0))
  })

  test('uses an ASCII apostrophe (U+0027), not the typographic one', () => {
    const result = formatChf(123450)
    expect(result).toContain(String.fromCharCode(0x27))
    expect(result).not.toContain(String.fromCharCode(0x2019))
  })
})
