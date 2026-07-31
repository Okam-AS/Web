import {
  parseSpendAmount,
  SPEND_EMPTY,
  SPEND_NOT_A_NUMBER,
  SPEND_TOO_MANY_DECIMALS,
  SPEND_NEGATIVE,
  SPEND_TOO_LARGE
} from '~/utils/margin/spend-amount'

describe('parseSpendAmount', () => {
  // THE WHOLE REASON THIS EXISTS. `19.99 * 100` is 1998.9999999999998 in IEEE-754, so the obvious
  // conversion sends 1998 øre for an invoice of 19,99. Over a week of purchase lines those missing øre
  // land in the actual-food-cost percentage the menu gets priced on.
  test('the float trap: 19,99 is 1999 minor units, and so is every other decimal that breaks *100', () => {
    for (const [text, minor] of [['19.99', 1999], ['19,99', 1999], ['1.10', 110], ['70.55', 7055], ['1.005', null]]) {
      const parsed = parseSpendAmount(text, false)
      if (minor === null) { expect(parsed.error).toBe(SPEND_TOO_MANY_DECIMALS) } else { expect(parsed.minor).toBe(minor) }
    }
  })

  test('whole amounts, one decimal and Norwegian grouping all land on the øre', () => {
    expect(parseSpendAmount('150', false).minor).toBe(15000)
    expect(parseSpendAmount('150,5', false).minor).toBe(15050)
    expect(parseSpendAmount('12 500,00', false).minor).toBe(1250000)
    // The NBSP and narrow NBSP that Intl and a spreadsheet paste produce.
    expect(parseSpendAmount('12 500,00', false).minor).toBe(1250000)
    expect(parseSpendAmount('12 500,00', false).minor).toBe(1250000)
  })

  // The server's rule is "a purchase-spend amount must not be negative" — so ZERO is legal. This is
  // the one place the rules diverge from the workforce rate parser, which refuses both together, and
  // the divergence is why that parser could not be reused.
  test('zero is a legal spend line and a negative one is not', () => {
    expect(parseSpendAmount('0', false)).toEqual({ minor: 0, error: null })
    expect(parseSpendAmount('0,00', false)).toEqual({ minor: 0, error: null })
    expect(parseSpendAmount('-1', false).error).toBe(SPEND_NEGATIVE)
  })

  // The two stock estimates have no server-side guard, so none is invented here.
  test('a stock estimate may be negative when the caller allows it', () => {
    expect(parseSpendAmount('-1,50', true).minor).toBe(-150)
    expect(parseSpendAmount('-0,00', true).minor).toBe(0) // never -0, which compares equal anyway
  })

  test('`Number` accidents are refused rather than silently accepted', () => {
    for (const text of ['1e3', '0x10', ' ', 'abc', '1.2.3', '12,']) {
      const parsed = parseSpendAmount(text, false)
      expect(parsed.minor).toBeNull()
      expect([SPEND_NOT_A_NUMBER, SPEND_EMPTY]).toContain(parsed.error)
    }
  })

  test('blank and nullish are EMPTY, which the caller renders as "enter an amount" and not as zero', () => {
    expect(parseSpendAmount('', false).error).toBe(SPEND_EMPTY)
    expect(parseSpendAmount(null, false).error).toBe(SPEND_EMPTY)
    expect(parseSpendAmount(undefined, false).error).toBe(SPEND_EMPTY)
  })

  test('three decimals are refused rather than truncated to an amount nobody stated', () => {
    expect(parseSpendAmount('235,555', false).error).toBe(SPEND_TOO_MANY_DECIMALS)
  })

  test('past exact integer representation it refuses instead of rounding', () => {
    expect(parseSpendAmount('99999999999999999', false).error).toBe(SPEND_TOO_LARGE)
  })

  test('exactly one of minor and error is ever set', () => {
    for (const text of ['150', '0', '-5', 'abc', '', '1,234']) {
      for (const allowNegative of [true, false]) {
        const parsed = parseSpendAmount(text, allowNegative)
        expect((parsed.minor === null) !== (parsed.error === null)).toBe(true)
      }
    }
  })
})
