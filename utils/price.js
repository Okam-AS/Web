// Money formatting for every market.
//
// One algorithm, parameterised by the `currencyFormat` descriptor on each market
// in config/edition.js. Amounts are in MINOR units (øre / Rappen), matching
// core/helpers/tools priceLabel.
//
// Adding a market is a data entry in config/edition.js -- nothing in here has to
// change. Byte-parity with the two implementations this replaced (core's
// priceLabel for 'no', the old formatChf for 'ch') is pinned by test/money-format.test.js.

import { market, markets, resolveMarket } from '~/config/edition'

// Core's grouping regex, verbatim from core/helpers/tools wholeAmountTool.
const GROUP_PATTERN = /\B(?=(\d{3})+(?!\d))/g

// 'digits' split: slice the last N characters off the decimal string. This is
// core's behaviour, warts included (1-9 minor units render as ",00"; the sign is
// mangled below one major unit). Reproduced exactly so the 'no' market cannot move.
function splitDigits (amountMinor, fractionDigits) {
  if (!amountMinor) {
    return { whole: '0', fraction: '0'.repeat(fractionDigits) }
  }
  const digits = amountMinor.toString()
  const whole = fractionDigits > 0 ? digits.slice(0, -fractionDigits) : digits
  const fraction = fractionDigits > 0 ? digits.slice(-fractionDigits) : ''
  return {
    whole: whole || '0',
    fraction: fraction.length < fractionDigits ? '0'.repeat(fractionDigits) : fraction
  }
}

// 'exact' split: arithmetic on an integer minor-unit amount. Correct for every
// input, and byte-identical to what Intl produced for 'ch'.
function splitExact (amountMinor, fractionDigits) {
  const raw = Number(amountMinor) || 0
  const sign = raw < 0 ? '-' : ''
  const abs = Math.round(Math.abs(raw))
  const divisor = Math.pow(10, fractionDigits)
  const whole = Math.floor(abs / divisor)
  return {
    whole: sign + whole.toString(),
    fraction: fractionDigits > 0 ? String(abs - (whole * divisor)).padStart(fractionDigits, '0') : ''
  }
}

/**
 * Split a minor-unit amount into its grouped whole part and its fraction part,
 * with no currency symbol. Replaces core's `wholeAmount` / `fractionAmount`,
 * which were the only readers of the global currency format that this repo did
 * not route through a market.
 *
 * @returns {{ whole: string, fraction: string }}
 */
export function splitAmount (currencyFormat, amountMinor) {
  if (!currencyFormat) {
    throw new Error('splitAmount: missing currencyFormat descriptor')
  }
  const parts = currencyFormat.amountSplit === 'exact'
    ? splitExact(amountMinor, currencyFormat.fractionDigits)
    : splitDigits(amountMinor, currencyFormat.fractionDigits)
  return {
    whole: parts.whole.replace(GROUP_PATTERN, currencyFormat.groupSeparator),
    fraction: parts.fraction
  }
}

/**
 * Format a minor-unit amount with an explicit currency-format descriptor.
 *
 * @param {object} currencyFormat  a market's `currencyFormat` (config/edition.js)
 * @param {number} amountMinor     amount in minor units
 * @param {boolean} hideFractionIfZero  drop the fraction when it is all zeroes
 *                                      (ignored by markets with supportsHideFraction: false)
 */
export function formatAmount (currencyFormat, amountMinor, hideFractionIfZero) {
  const parts = splitAmount(currencyFormat, amountMinor)

  const hide = hideFractionIfZero && currencyFormat.supportsHideFraction !== false
  let fraction = ''
  if (currencyFormat.fractionDigits > 0 && (!hide || parseInt(parts.fraction, 10) > 0)) {
    fraction = currencyFormat.decimalSeparator + parts.fraction
  }

  const money = parts.whole + fraction
  return currencyFormat.symbolPosition === 'suffix'
    ? money + currencyFormat.symbolSpace + currencyFormat.symbol
    : currencyFormat.symbol + currencyFormat.symbolSpace + money
}

/**
 * Format a minor-unit amount for a market code. Throws on an unknown code.
 */
export function formatMarketAmount (marketCode, amountMinor, hideFractionIfZero) {
  return formatAmount(resolveMarket(marketCode).currencyFormat, amountMinor, hideFractionIfZero)
}

/**
 * The currency format for the RUNTIME market: the market switcher writes the
 * active code into Vuex, and the store getter resolves it (loudly, never to a
 * hardcoded Norway -- see runtimeMarketConfig in config/edition.js).
 *
 * With no store at all -- a component mounted bare in a test, or a call before
 * the store is installed -- this falls back to the market this bundle was BUILT
 * for. Absence of a runtime override is not an unknown market.
 */
export function currencyFormatForStore (store) {
  const config = (store && store.getters && store.getters.marketConfig) || market
  return config.currencyFormat || market.currencyFormat
}

/**
 * Translate a market's currencyFormat into the override shape that
 * core/helpers/tools `setCurrencyFormat` consumes:
 * { prefix, suffix, decimalSeparator, thousandSeparator, fractionLength, symbol }.
 *
 * Core only actually reads prefix/suffix (its priceLabel hardcodes the rest), but
 * the full descriptor is passed so any future core release picks the market up.
 */
export function coreCurrencyFormat (currencyFormat) {
  const suffixed = currencyFormat.symbolPosition === 'suffix'
  return {
    prefix: suffixed ? '' : currencyFormat.symbol + currencyFormat.symbolSpace,
    suffix: suffixed ? currencyFormat.symbolSpace + currencyFormat.symbol : '',
    decimalSeparator: currencyFormat.decimalSeparator,
    thousandSeparator: currencyFormat.groupSeparator,
    fractionLength: currencyFormat.fractionDigits,
    symbol: currencyFormat.symbol
  }
}

/**
 * CHF formatting. Kept as a named export because it is part of this module's
 * shipped surface; it is now just the 'ch' entry of the market lookup.
 */
export function formatChf (amountMinor) {
  return formatAmount(markets.ch.currencyFormat, amountMinor, false)
}

export default formatChf
