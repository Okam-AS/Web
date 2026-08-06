import fs from 'fs'
import path from 'path'
import { crossCurrencyLabel } from '~/utils/cross-currency'
import { UNKNOWN_AMOUNT } from '~/utils/price'
import { wholeAmount, fractionAmount } from '~/core/helpers/tools'
import WorkforceWeekGrid from '~/components/admin/workforce/WorkforceWeekGrid.vue'
import WorkforceRateTimeline from '~/components/admin/workforce-rates/WorkforceRateTimeline.vue'
import MealsFundedOrders from '~/components/admin/meals/MealsFundedOrders.vue'
import MealsProgramPanel from '~/components/admin/meals/MealsProgramPanel.vue'
import EventsJourney from '~/components/admin/events/EventsJourney.vue'
import { marginMoney } from '~/utils/margin/money'

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
describe('every module mixin composes through the gate', () => {
  it('WorkforceWeekGrid.amount', () => {
    const ctx = Object.assign({ currency: 'NOK', priceLabel }, digits)
    expect(WorkforceWeekGrid.methods.amount.call(ctx, null, 'SEK')).toBe(UNKNOWN_AMOUNT)
    expect(WorkforceWeekGrid.methods.amount.call(ctx, undefined, 'SEK')).toBe(UNKNOWN_AMOUNT)
    expect(WorkforceWeekGrid.methods.amount.call(ctx, 0, 'SEK')).toBe('0,00 SEK')
    expect(WorkforceWeekGrid.methods.amount.call(ctx, 20680, 'SEK')).toBe('206,80 SEK')
  })

  it('WorkforceRateTimeline.amountLabel', () => {
    const ctx = Object.assign({ currency: 'NOK', dash: '—', priceLabel }, digits)
    const row = (hourlyRateMinor) => ({ hourlyRateMinor, currency: 'SEK' })
    // Its own `=== null` guard answers first and answers the same way; `undefined` reaches the
    // composition and is the case that used to print "0,00 SEK".
    expect(WorkforceRateTimeline.methods.amountLabel.call(ctx, row(null))).toBe('—')
    expect(WorkforceRateTimeline.methods.amountLabel.call(ctx, row(undefined))).toBe(UNKNOWN_AMOUNT)
    expect(WorkforceRateTimeline.methods.amountLabel.call(ctx, row(0))).toBe('0,00 SEK')
    expect(WorkforceRateTimeline.methods.amountLabel.call(ctx, row(23550))).toBe('235,50 SEK')
  })

  it('MealsFundedOrders.amount', () => {
    const ctx = Object.assign({ currency: 'NOK', unknownMark: '—', priceLabel }, digits)
    expect(MealsFundedOrders.methods.amount.call(ctx, null, 'SEK')).toBe(UNKNOWN_AMOUNT)
    expect(MealsFundedOrders.methods.amount.call(ctx, 0, 'SEK')).toBe('0,00 SEK')
    expect(MealsFundedOrders.methods.amount.call(ctx, 20680, 'SEK')).toBe('206,80 SEK')
  })

  it('EventsJourney.amount', () => {
    const ctx = Object.assign({ currency: 'NOK', unknownMark: '—', priceLabel }, digits)
    // `readMinor` refuses the absence before the composition sees it, so this site was already safe.
    // It is pinned anyway: the assertion is about what an operator reads, and it must not change if
    // somebody later relaxes `readMinor` for an unrelated reason.
    expect(EventsJourney.methods.amount.call(ctx, null, 'SEK')).toBe('—')
    expect(EventsJourney.methods.amount.call(ctx, 0, 'SEK')).toBe('0,00 SEK')
    expect(EventsJourney.methods.amount.call(ctx, 20680, 'SEK')).toBe('206,80 SEK')
  })

  it('marginMoney.amount and signedAmount', () => {
    const ctx = Object.assign({ currency: 'NOK', unknownMark: '—', priceLabel }, digits)
    expect(marginMoney.methods.amount.call(ctx, null, 'SEK')).toBe(UNKNOWN_AMOUNT)
    expect(marginMoney.methods.amount.call(ctx, 0, 'SEK')).toBe('0,00 SEK')
    expect(marginMoney.methods.amount.call(ctx, -20680, 'SEK')).toBe('-206,80 SEK')
    // `signedAmount` reached the gate UN-NEGATED, and the defect was real: before the gate, the loss
    // column printed "0,00 SEK" for a plate cost nobody had computed.
    //
    // The mechanism is NOT a negation, and an earlier version of this comment said it was. The
    // shipped body branches on `minor < 0`, and `null < 0` is `false` — as are `undefined < 0` and
    // `NaN < 0` — so every absence takes the ELSE arm and delegates to `amount` exactly as an
    // ordinary read does. `-null` really is `-0` and `-0` really is a stated value, but that door
    // does not exist in this code and no `-0` case is pinned anywhere.
    //
    // The assertions below still earn their place, PROSPECTIVELY rather than retrospectively: a
    // future rewrite that negates first — the obvious way to simplify this method — would hand the
    // gate `-0`, which IS stated, and print "0,00 SEK" again. That rewrite reds here.
    const signed = (minor) => marginMoney.methods.signedAmount.call(
      Object.assign({}, ctx, { amount: marginMoney.methods.amount }), minor, 'SEK')
    expect(signed(null)).toBe(UNKNOWN_AMOUNT)
    expect(signed(0)).toBe('0,00 SEK')
    expect(signed(-20680)).toBe('−206,80 SEK')
  })

  it('MealsProgramPanel.allowancePreview', () => {
    const ctx = over => Object.assign({
      currency: 'NOK',
      selectedProgram: { currency: 'SEK' },
      policy: { allowance: '206,80' },
      priceLabel
    }, digits, over)
    const preview = over => MealsProgramPanel.computed.allowancePreview.call(ctx(over))
    expect(preview()).toBe('206,80 SEK')
    // A zero allowance is admitted by the parser (`allowZero`) and must still read as an amount.
    expect(preview({ policy: { allowance: '0' } })).toBe('0,00 SEK')
    // An unparseable allowance never reaches the composition: the computed answers null and the
    // template's `v-if` hides the hint entirely, which is the honest rendering of "not typed yet".
    expect(preview({ policy: { allowance: '' } })).toBeNull()
    expect(preview({ policy: { allowance: 'abc' } })).toBeNull()
  })
})

// The census, as an executable invariant rather than a paragraph in a document. `crossCurrencyLabel`
// only protects the sites that route through it, so the thing worth pinning is that NO site composes
// the digits by hand — including one added tomorrow by an author who never read any of this.
//
// SCOPE, STATED RATHER THAN IMPLIED. `ROOTS` is every directory in this repo that ships renderable
// source; an earlier version listed four of them and silently ignored six that exist and are clean.
// The patterns cover the two idioms a person would actually reach for — string concatenation and a
// template literal. A third spelling (building the parts through intermediate variables, say) would
// slip past, so this is a guard against the ordinary re-inlining, not a proof of impossibility.
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
    expect(ROOTS.flatMap(r => walk(path.join(root, r))).length).toBeGreaterThan(300)
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
