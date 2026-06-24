import formatChf from '~/utils/price'

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

  test('handles null and undefined gracefully', () => {
    expect(formatChf(null)).toBe('CHF 0.00')
    expect(formatChf(undefined)).toBe('CHF 0.00')
  })

  test('uses an ASCII apostrophe (U+0027), not the typographic one', () => {
    const result = formatChf(123450)
    expect(result).toContain(String.fromCharCode(0x27))
    expect(result).not.toContain(String.fromCharCode(0x2019))
  })
})
