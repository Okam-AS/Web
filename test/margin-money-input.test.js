import {
  parseMinorUnits,
  MONEY_EMPTY,
  MONEY_MALFORMED,
  MONEY_TOO_MANY_DECIMALS,
  MONEY_NEGATIVE
} from '~/utils/margin/money-input'

// The one client-side conversion that touches money. It exists because the obvious implementation —
// `Math.round(parseFloat(text) * 100)` — is wrong on values a price list is full of, so the
// float-drift cases below are the point of the file rather than an edge-case flourish.
describe('parseMinorUnits', () => {
  test('the Norwegian dialect: a comma decimal lands as exact øre', () => {
    expect(parseMinorUnits('49,90').minor).toBe(4990)
    expect(parseMinorUnits('12,50').minor).toBe(1250)
    expect(parseMinorUnits('249').minor).toBe(24900)
  })

  test('a dot decimal is accepted too, and means the same thing', () => {
    expect(parseMinorUnits('49.90').minor).toBe(4990)
    expect(parseMinorUnits('0.05').minor).toBe(5)
  })

  test('NO FLOAT DRIFT: the values IEEE-754 rounds the wrong way', () => {
    // 1.005 * 100 is 100.49999999999999 as a double, so `Math.round` gives 100 — one øre less than
    // the backend's decimal parser, which rounds half away from zero to 101. Digits are never
    // multiplied here, so the question does not arise.
    expect(parseMinorUnits('1,005').error).toBe(MONEY_TOO_MANY_DECIMALS)
    expect(parseMinorUnits('1,01').minor).toBe(101)
    // 8.115 and 2.675 are the other classic pair; two decimals of each are exact here.
    expect(parseMinorUnits('8,11').minor).toBe(811)
    expect(parseMinorUnits('2,67').minor).toBe(267)
    // A long value that a double could not represent exactly at all.
    expect(parseMinorUnits('70766.31').minor).toBe(7076631)
  })

  test('one decimal is padded, not truncated', () => {
    expect(parseMinorUnits('12,5').minor).toBe(1250)
    expect(parseMinorUnits(',5').minor).toBe(50)
  })

  test('thousand separators are spaces, including the non-breaking ones', () => {
    expect(parseMinorUnits('1 234,56').minor).toBe(123456)
    expect(parseMinorUnits('1 234,56').minor).toBe(123456)
    expect(parseMinorUnits('1 234,56').minor).toBe(123456)
  })

  test('a dot used as a THOUSAND separator is refused rather than guessed at', () => {
    // "1.234" is one thousand two hundred and thirty-four in one dialect and one-and-a-bit in the
    // other. Guessing between them is silently wrong øre, which is the whole thing this prevents.
    expect(parseMinorUnits('1.234,56').error).toBe(MONEY_MALFORMED)
  })

  test('the refusals are distinct, so the message can say which', () => {
    expect(parseMinorUnits('').error).toBe(MONEY_EMPTY)
    expect(parseMinorUnits('   ').error).toBe(MONEY_EMPTY)
    expect(parseMinorUnits(null).error).toBe(MONEY_EMPTY)
    expect(parseMinorUnits('abc').error).toBe(MONEY_MALFORMED)
    expect(parseMinorUnits(',').error).toBe(MONEY_MALFORMED)
    expect(parseMinorUnits('-5').error).toBe(MONEY_NEGATIVE)
    expect(parseMinorUnits('1,234').error).toBe(MONEY_TOO_MANY_DECIMALS)
  })

  test('a refusal never carries a number, and a success never carries an error', () => {
    expect(parseMinorUnits('abc').minor).toBeNull()
    expect(parseMinorUnits('49,90').error).toBeNull()
  })

  test('past the exact-integer range it refuses rather than sending an approximation', () => {
    expect(parseMinorUnits('99999999999999999').error).toBe(MONEY_MALFORMED)
  })
})
