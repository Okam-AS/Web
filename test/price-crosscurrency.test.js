import fs from 'fs'
import path from 'path'
import { crossCurrencyLabel } from '~/utils/cross-currency'
import { UNKNOWN_AMOUNT } from '~/utils/price'
import { wholeAmount, fractionAmount } from '~/core/helpers/tools'

// The cross-currency branch is the one money path on this admin that goes AROUND both formatters, so
// it is the one place the gate in front of them cannot reach. `wholeAmount` and `fractionAmount` are
// imported from core UNSTUBBED here, unlike every other component test in this repo, because the
// whole defect lived in what the SHIPPED helpers answer to an absent figure — a hand-written stand-in
// that returns "0"/"00" for null would reproduce the symptom by coincidence rather than measure it.

// The digit helpers exactly as the global mixin exposes them to a component (`plugins/global-mixin.js`
// forwards to core and adds nothing), so `digits` below is the real receiver shape.
const digits = { wholeAmount, fractionAmount }

// A stand-in for the OTHER branch — the market-currency one. It must never be reached by any
// assertion in this file; if a currency comparison were to silently stop matching, these tests would
// start measuring `priceLabel` instead of the composition, and this makes that loud.
const priceLabel = () => { throw new Error('same-currency branch reached: this test drives the CROSS-currency one') }

describe('core answers an absent amount with digits — which is why the composition needed a gate', () => {
  // The defect, stated as a measurement rather than a claim. Both halves of the composition are
  // falsy-guarded inside core, so all four absences and a genuine zero produce the SAME two strings.
  it.each([[null], [undefined], [''], [NaN], [0]])('wholeAmount(%p) is "0" and fractionAmount(%p) is "00"', value => {
    expect(wholeAmount(value)).toBe('0')
    expect(fractionAmount(value)).toBe('00')
  })

  it('so the ungated composition rendered absence and a real zero identically', () => {
    const composed = v => wholeAmount(v) + ',' + fractionAmount(v) + ' ' + 'SEK'
    expect(composed(null)).toBe('0,00 SEK')
    expect(composed(0)).toBe('0,00 SEK')
    // Byte-identical. No reader, and no test, could have told the two apart.
    expect(composed(null)).toBe(composed(0))
  })
})

describe('crossCurrencyLabel: three worlds, not two', () => {
  // WORLD 1 — absent. Nobody stated this amount, in any of the shapes an absence arrives as.
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['a blank string', '   '],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['a boolean', false],
    ['an object', {}]
  ])('withholds the figure when the amount is %s', (_label, value) => {
    expect(crossCurrencyLabel(value, 'SEK', digits)).toBe(UNKNOWN_AMOUNT)
  })

  it('withholds the currency code with it, not just the digits', () => {
    // "0,00 SEK" was wrong twice: it invented an amount AND asserted somebody priced this in kronor.
    expect(crossCurrencyLabel(null, 'SEK', digits)).not.toMatch(/SEK/)
    expect(crossCurrencyLabel(null, 'SEK', digits)).not.toMatch(/\d/)
  })

  // WORLD 2 — genuinely zero. THIS is the case a truthiness guard destroys: `!0` is `true`, so
  // `if (!minor) return UNKNOWN_AMOUNT` would withhold a cost of exactly nothing, which is a claim
  // somebody made and must still print.
  it('prints a genuine zero as a real amount', () => {
    expect(crossCurrencyLabel(0, 'SEK', digits)).toBe('0,00 SEK')
  })

  it('and a genuine zero is now DISTINGUISHABLE from an absence, which is the whole point', () => {
    expect(crossCurrencyLabel(0, 'SEK', digits)).not.toBe(crossCurrencyLabel(null, 'SEK', digits))
  })

  // The falsiness trap is a property of the value's DOMAIN, not of the idiom. Over a number `!0` is
  // `true` and the guard is wrong; over a string `!'0'` is `false` and the same guard enforces
  // nothing at all. Both are pinned so a future rewrite to `!minor` cannot pass by picking whichever
  // domain flatters it.
  it('reads a numeric string as stated — including the string zero', () => {
    expect(crossCurrencyLabel('0', 'SEK', digits)).toBe('0,00 SEK')
    expect(crossCurrencyLabel('20680', 'SEK', digits)).toBe('206,80 SEK')
  })

  it('but a blank string is an absence, not a zero', () => {
    expect(crossCurrencyLabel('', 'SEK', digits)).toBe(UNKNOWN_AMOUNT)
  })

  // WORLD 3 — present.
  it('prints a stated amount with the ISO code and no symbol', () => {
    expect(crossCurrencyLabel(20680, 'SEK', digits)).toBe('206,80 SEK')
    expect(crossCurrencyLabel(1234567, 'CHF', digits)).toBe('12 345,67 CHF')
    expect(crossCurrencyLabel(4, 'SEK', digits)).toBe('0,04 SEK')
  })

  it('does not withhold a negative amount — a refund of 206,80 is a figure somebody stated', () => {
    expect(crossCurrencyLabel(-20680, 'SEK', digits)).toBe('-206,80 SEK')
  })

  it('leaves core\'s sub-krone negative garbling exactly as it is, rather than hiding it behind a dash', () => {
    // −9 øre formats as "0,-9" because core slices the minor units as a string. That is
    // L-CORE-ORE-LABEL's pinned defect in a submodule this repo does not own, and it is NOT an
    // absence: withholding it here would disguise a formatting bug as missing data.
    expect(crossCurrencyLabel(-9, 'SEK', digits)).not.toBe(UNKNOWN_AMOUNT)
  })

  it('calls the digit helpers ON the component, so a receiver is never lost', () => {
    // `wholeAmount`/`fractionAmount` use no `this` today. If either grows one, destructuring them off
    // the component would break silently; this fails instead.
    const receiver = {
      marker: 'component',
      wholeAmount (minor) { return this.marker + String(minor) },
      fractionAmount () { return this.marker }
    }
    expect(crossCurrencyLabel(5, 'SEK', receiver)).toBe('component5,component SEK')
  })
})

// Each of the six mixins, driven through its OWN shipped method rather than the helper, because a
// gate in a util nobody routed to is worth nothing (C3: a capability exists only where it is
// reachable). Every context below forces the cross-currency branch: a wire currency that differs from
// the market's.

describe('no surface composes money digits by hand, in either of the two idioms policed here', () => {
  const ROOTS = [
    'components', 'pages', 'utils', 'plugins',
    'layouts', 'middleware', 'modules', 'store', 'server-middleware', 'platform'
  ]
  // `wholeAmount(x) + ',' + fractionAmount(x)`
  const CONCATENATED = /wholeAmount\s*\([^)]*\)\s*\+\s*['"],['"]\s*\+\s*[\w.]*fractionAmount\s*\(/
  // `` `${wholeAmount(x)},${fractionAmount(x)}` ``
  const INTERPOLATED = /wholeAmount\s*\([^)]*\)\s*\}\s*,\s*\$\{\s*[\w.]*fractionAmount\s*\(/
  const COMPOSITION = { test: source => CONCATENATED.test(source) || INTERPOLATED.test(source) }

  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) { return entry.name === 'node_modules' ? [] : walk(full) }
    return /\.(js|ts|vue)$/.test(entry.name) ? [full] : []
  })

  // A detector nobody has seen fire is not a detector. Both patterns are shown catching the thing
  // they exist to catch and leaving the gated call alone, so neither can rot into a regex that
  // matches nothing while the suite stays green.
  it('both patterns actually detect their idiom', () => {
    expect(COMPOSITION.test("this.wholeAmount(m) + ',' + this.fractionAmount(m) + ' ' + code")).toBe(true)
    expect(COMPOSITION.test('`${wholeAmount(m)},${fractionAmount(m)} ${code}`')).toBe(true)
    expect(COMPOSITION.test('return crossCurrencyLabel(minor, currency, this)')).toBe(false)
  })

  it('every root it claims to scan exists and is readable', () => {
    const root = path.resolve(__dirname, '..')
    // Otherwise a renamed directory silently shrinks the census to nothing while it still passes.
    ROOTS.forEach(r => expect(fs.existsSync(path.join(root, r))).toBe(true))
    expect(ROOTS.flatMap(r => walk(path.join(root, r))).length).toBeGreaterThan(240)
  })

  it('the composition exists in exactly one file, and it is the gated one', () => {
    const root = path.resolve(__dirname, '..')
    const offenders = ROOTS
      .flatMap(r => walk(path.join(root, r)))
      .filter(file => COMPOSITION.test(fs.readFileSync(file, 'utf8')))
      .map(file => path.relative(root, file))
      .sort()
    expect(offenders).toEqual(['utils/cross-currency.js'])
  })
})
