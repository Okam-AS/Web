import { priceLabel, fractionAmount, setCurrencyFormat } from '~/core/helpers/tools'

// Core's price helper, exercised directly out of the submodule (`~/core` maps to <rootDir>/core, and
// ts-jest compiles it). Every other money assertion in this repo goes through a hand-written stand-in
// on the mixin mocks; this file is the only place the SHIPPED formatter is the thing under test.
//
// Amounts are MINOR units throughout — 20680 is 206,80.
//
// WHY THIS FILE EXISTS. `,–` is not a currency symbol. It is the Norwegian notation that MEANS "and
// no øre", so it stands in place of the fraction and can never follow one: "206,80,–" reads as a
// price that was rounded when it was not. The helper appended it unconditionally, so every total
// that carried øre — a tip, a percentage discount, a Swiss price — printed the claim that it did not.
//
// The three formats below are the only three any client installs today, copied from their call sites,
// so a regression in any of them fails here rather than on a customer's screen:
//   NOK      core default, re-applied verbatim by ConsumerWeb plugins/1.currency-format.client.ts
//            and ConsumerApp src/app.ts for every non-CHF store. The only format with a suffix.
//   ADMIN    this repo's plugins/global-mixin.js line 55, and AdminApp app/main.ts.
//   SWISS    ConsumerWeb / ConsumerApp / AdminApp, for a store whose currencyCode is CHF.
const NOK = { prefix: '', suffix: ',–', decimalSeparator: ',', thousandSeparator: ' ', symbol: 'kr' }
const ADMIN = { prefix: 'kr ', suffix: '' }
const SWISS = { symbol: 'CHF', prefix: 'CHF ', suffix: '', decimalSeparator: '.', thousandSeparator: "'" }

// setCurrencyFormat mutates a module-level singleton in Core, so a test that does not reset it leaks
// into the next one.
beforeEach(() => setCurrencyFormat(NOK))

describe('the no-øre suffix stands in place of the øre, never beside them', () => {
  test('a total carrying øre does not claim to have none', () => {
    // The confirmation page of the funded checkout: a 179,83 cart plus a 15% tip.
    expect(priceLabel(20680, true)).toBe('206,80')
    expect(priceLabel(20680, false)).toBe('206,80')
  })

  test('a whole-krone total keeps the suffix, which is what it is for', () => {
    expect(priceLabel(18800, true)).toBe('188,–')
  })

  test('spelling the two zero øre out loud is still not "and no øre"', () => {
    // hideFractionIfZero=false asks for the fraction to be PRINTED. Printing ",00,–" says the
    // amount both has two øre digits and has no øre.
    expect(priceLabel(18800, false)).toBe('188,00')
  })

  test('øre and the no-øre notation are mutually exclusive in every case', () => {
    for (const minor of [1, 9, 50, 99, 20680, 1234567, 100001]) {
      expect(priceLabel(minor, true)).not.toMatch(/,–$/)
      expect(priceLabel(minor, false)).not.toMatch(/,–$/)
    }
    for (const minor of [100, 18800, 1234500]) {
      expect(priceLabel(minor, true)).toMatch(/,–$/)
    }
  })
})

describe('a total under one krone still carries øre', () => {
  // The fraction is read off the END of the minor-unit string, so a single-digit amount used to be
  // widened to "00" — which both erased the øre and, through parseInt, told priceLabel the total had
  // none. 4 øre printed as "0,–": the amount gone and the claim wrong. The stand-in formatter every
  // component test in this repo uses (String(minor % 100).padStart(2, '0')) has always said "04";
  // this is the shipped helper being brought into line with what those tests assert about it.
  test('single-digit øre are padded, not erased', () => {
    expect(fractionAmount(1)).toBe('01')
    expect(fractionAmount(4)).toBe('04')
    expect(fractionAmount(9)).toBe('09')
    expect(fractionAmount(50)).toBe('50')
  })

  test('one øre is a price with øre', () => {
    expect(priceLabel(1, true)).toBe('0,01')
    expect(priceLabel(9, false)).toBe('0,09')
    expect(priceLabel(50, true)).toBe('0,50')
  })
})

describe('boundaries', () => {
  test('zero', () => {
    // Nothing owed is exactly the case the suffix was invented for.
    expect(priceLabel(0, true)).toBe('0,–')
    expect(priceLabel(0, false)).toBe('0,00')
  })

  test('a negative whole-krone amount keeps its sign and its suffix', () => {
    expect(priceLabel(-2000, true)).toBe('-20,–')
  })

  test('a negative amount under one krone is malformed, and that is pinned, not fixed here', () => {
    // PRE-EXISTING and out of this lane: wholeAmountTool slices the string, so "-50" loses its whole
    // part and leaves a bare "-". Callers in this estate prepend the sign themselves and pass a
    // positive minor amount (see the "−" + priceLabel(...) assertions in the margin panel tests), so
    // nothing on screen depends on this. Pinned so a later lane that fixes it has to notice it did.
    expect(priceLabel(-50, true)).toBe('-,50')
    // What it must NOT do, either way, is claim there are no øre.
    expect(priceLabel(-50, true)).not.toMatch(/,–$/)
  })

  test('a float minor amount renders its own representation, and never claims no øre', () => {
    // PRE-EXISTING and out of this lane: the helper stringifies and slices, so any caller that hands
    // it a non-integer gets that float's decimal expansion grouped as digits. Rounding here would
    // silently change what every such caller renders, which is a money change and not this one.
    // What IS this lane's: the suffix decision must survive it.
    expect(priceLabel(20680.000000000004, true)).not.toMatch(/,–$/)
    expect(priceLabel(6.98, true)).not.toMatch(/,–$/)
    expect(priceLabel(20680.000000000004, true)).toBe('20 680.0 000 000 000,04')
  })

  test('thousands grouping is untouched', () => {
    expect(priceLabel(1234567, true)).toBe('12 345,67')
    expect(priceLabel(1234500, true)).toBe('12 345,–')
  })

  test('hidePrefixAndSuffix drops the no-øre notation with everything else', () => {
    expect(priceLabel(18800, true, true)).toBe('188')
    expect(priceLabel(20680, true, true)).toBe('206,80')
  })
})

describe('no client that installs its own format regresses', () => {
  test('the admin prefix format is byte-for-byte what it was', () => {
    setCurrencyFormat(ADMIN)
    expect(priceLabel(20680, true)).toBe('kr 206,80')
    expect(priceLabel(18800, true)).toBe('kr 188')
    expect(priceLabel(18800, false)).toBe('kr 188,00')
    expect(priceLabel(0, true)).toBe('kr 0')
  })

  test('a Swiss store is unaffected — it has no suffix to suppress', () => {
    setCurrencyFormat(SWISS)
    expect(priceLabel(20680, true)).toBe('CHF 206,80')
    expect(priceLabel(18800, true)).toBe('CHF 188')
    expect(priceLabel(1234567, true)).toBe('CHF 12 345,67')
  })
})
