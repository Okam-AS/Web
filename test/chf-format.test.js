import formatChf from '~/utils/price'
import { priceLabel, setCurrencyFormat } from '~/core/helpers/tools'

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

// The admin web funnels every amount through a single currency seam:
// global-mixin.js picks a setCurrencyFormat override from the resolved market
// and core priceLabel renders using it. These tests exercise that shared path
// for both markets (the two overrides global-mixin selects between).
describe('shared priceLabel currency seam (global-mixin)', () => {
  afterEach(() => {
    // Restore the Norwegian/admin default so the singleton override does not
    // leak market state between tests.
    setCurrencyFormat({ prefix: 'kr ', suffix: '' })
  })

  test('CH market renders the full Swiss format (apostrophe thousands, dot decimals) through the shared priceLabel path', () => {
    setCurrencyFormat({ prefix: 'CHF ', suffix: '', decimalSeparator: '.', thousandSeparator: "'" })
    expect(priceLabel(123450)).toBe("CHF 1'234.50")
    expect(priceLabel(500)).toBe('CHF 5.00')
  })

  test('NO market renders the kr prefix through the shared priceLabel path', () => {
    setCurrencyFormat({ prefix: 'kr ', suffix: '' })
    const label = priceLabel(50000)
    expect(label).toMatch(/^kr /)
    expect(label).toContain('500')
  })
})
