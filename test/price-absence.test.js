import fs from 'fs'
import path from 'path'
import { mount } from '@vue/test-utils'
import { globalMixin } from '~/plugins/global-mixin'
import { formatChf, isAmountStated, UNKNOWN_AMOUNT } from '~/utils/price'
import CardTerminalStatus from '~/components/admin/pos/CardTerminalStatus.vue'
import OfferDocument from '~/components/shared/OfferDocument.vue'

// A zero price is a claim — this costs nothing. An absent price is not a claim at all. This file is
// the pin that keeps the two apart, and it asserts them TOGETHER: an "it is not zero" test on its own
// passes against a formatter that can no longer render a zero either.
//
// What is under test is the SHIPPED formatter, not a stand-in. Every component test in this repo
// hand-writes its own `priceLabel` mock, so before this file nothing exercised the real one — which
// is how `Number(amountMinor) || 0` survived in `utils/price.js` with a test asserting that null
// "gracefully" produces CHF 0.00, and how core's `if (!amount) return "0"` went unnoticed behind it.
//
// Importing `plugins/global-mixin.js` runs its module body, which installs this admin's currency
// format (`kr ` prefix, no suffix) into core's singleton — so the Norwegian expectations below are
// literally what an admin screen prints.
const money = globalMixin.methods.priceLabel
const label = (value, hideFractionIfZero) => money.call({ isCh: false }, value, hideFractionIfZero)
const swissLabel = value => money.call({ isCh: true }, value)

// The four ways an amount fails to arrive. `NaN` is here because `Number('abc')` produced one and the
// old `|| 0` swallowed it; the empty string because a cleared field is absence, not zero.
const ABSENT = [null, undefined, '', '   ', NaN]

describe('an amount nobody stated does not render as a price', () => {
  test('the Norwegian formatter withholds it instead of answering zero', () => {
    for (const value of ABSENT) {
      expect(label(value, true)).toBe(UNKNOWN_AMOUNT)
      expect(label(value, false)).toBe(UNKNOWN_AMOUNT)
    }
  })

  test('the Swiss formatter withholds it too, with no currency on it', () => {
    for (const value of ABSENT) {
      expect(swissLabel(value)).toBe(UNKNOWN_AMOUNT)
      expect(formatChf(value)).toBe(UNKNOWN_AMOUNT)
    }
    // "CHF —" would still assert that somebody priced this in francs.
    expect(formatChf(null)).not.toContain('CHF')
  })

  test('the mark is the one every other surface already uses for a fact it does not have', () => {
    // U+2014, matching `unknownMark` in utils/margin/money.js and the Workforce, Meals, Events and
    // Growth panels. A different dash here would read as a second, unexplained state.
    expect(UNKNOWN_AMOUNT).toBe(String.fromCharCode(0x2014))
  })
})

describe('a real zero is still a real price', () => {
  test('nothing about zero changed, in either market', () => {
    expect(label(0, true)).toBe('kr 0')
    expect(label(0, false)).toBe('kr 0,00')
    expect(swissLabel(0)).toBe('CHF 0.00')
    expect(formatChf(0)).toBe('CHF 0.00')
  })

  test('and a genuine amount is untouched', () => {
    expect(label(20680, true)).toBe('kr 206,80')
    expect(label(18800, true)).toBe('kr 188')
    expect(swissLabel(123450)).toBe("CHF 1'234.50")
  })

  // The whole point, stated as one assertion in each market: these are three different answers.
  test('absent, zero and a genuine amount are three different renderings', () => {
    expect(label(null)).not.toBe(label(0))
    expect(label(0)).not.toBe(label(20680))
    expect(label(null)).not.toBe(label(20680))

    expect(swissLabel(null)).not.toBe(swissLabel(0))
    expect(swissLabel(0)).not.toBe(swissLabel(123450))
  })
})

describe('what still counts as an amount somebody stated', () => {
  test('zero, negatives and fractions are all stated figures', () => {
    expect(isAmountStated(0)).toBe(true)
    expect(isAmountStated(-5000)).toBe(true)
    expect(isAmountStated(12.5)).toBe(true)
  })

  test('a client-computed float still reaches the formatter — the offer document depends on it', () => {
    // components/shared/OfferDocument.vue prints `priceLabel(totalOnetimeFee * 0.25)` for the VAT
    // line of an offer. On a whole-krone fee that lands on an integer, and must keep rendering:
    expect(label(499900 * 0.25, true)).toBe('kr 1 249,75')

    // On a fee with øre it does not — kr 12,34 makes the VAT line 308.5 minor. Gating on "integer
    // minor units", the way `readMinor` in utils/events/journey.js does for WIRE fields, would have
    // blanked that line out. That stricter rule belongs at the wire, not in front of a figure this
    // app computed itself.
    expect(isAmountStated(1234 * 0.25)).toBe(true)
    expect(label(1234 * 0.25, true)).not.toBe(UNKNOWN_AMOUNT)
    // HOW core renders such a float is its own defect and is NOT fixed here: it slices the decimal
    // expansion, so this prints "kr 308" with the half-øre silently gone (and "kr 308,.5" when the
    // fraction is asked for). L-CORE-ORE-LABEL found it, pinned it and left it open because the fix
    // changes what every caller renders. This lane only refuses to hide it behind a dash.
    expect(label(1234 * 0.25, true)).toBe('kr 308')
  })

  test('a numeric string is stated; a blank one is not', () => {
    // Both formatters have always accepted a numeric string, so refusing one here would blank a
    // price that renders today.
    expect(isAmountStated('20680')).toBe(true)
    expect(label('20680', true)).toBe('kr 206,80')
    expect(isAmountStated('')).toBe(false)
    expect(isAmountStated('abc')).toBe(false)
  })

  test('nothing that is not money is treated as money', () => {
    expect(isAmountStated(null)).toBe(false)
    expect(isAmountStated(undefined)).toBe(false)
    expect(isAmountStated(NaN)).toBe(false)
    expect(isAmountStated(Infinity)).toBe(false)
    // `Number(true)` is 1 and `Number([])` is 0 — both would have printed a price.
    expect(isAmountStated(true)).toBe(false)
    expect(isAmountStated([])).toBe(false)
    expect(isAmountStated({})).toBe(false)
  })
})

// A helper returning a string proves nothing about a screen. This is the same rule read off a real
// component's DOM — the card-terminal panel, which is on while a customer's card is in the reader and
// whose one large figure IS the amount being charged.
describe('the card terminal screen, in a real DOM', () => {
  // Importing the plugin above ran `Vue.mixin(mixin)`, so this component mounts with the REAL global
  // mixin attached — its own `priceLabel`, not a stand-in, and `isCh` unset, which is the Norwegian
  // admin. The two mocks are the rest of the shell the app supplies: the i18n plugin's `$i`, and the
  // Vuex store the mixin's `mounted` hook loads state from.
  const mountStatus = props => mount(CardTerminalStatus, {
    propsData: Object.assign({ state: 'waiting' }, props),
    mocks: {
      $i: key => key,
      $store: { dispatch: () => {}, subscribe: () => {} }
    }
  })

  test('a check whose total has not arrived does not announce kr 0', () => {
    const wrapper = mountStatus({ amount: null })
    expect(wrapper.find('.card-status__amount').text()).toBe(UNKNOWN_AMOUNT)
    wrapper.destroy()
  })

  test('and neither does one where the amount was never passed at all', () => {
    // The prop's default used to be 0, so an omitted amount was rendered as a charge of nothing.
    const wrapper = mountStatus({})
    expect(wrapper.find('.card-status__amount').text()).toBe(UNKNOWN_AMOUNT)
    wrapper.destroy()
  })

  test('a real charge is still shown as the price it is', () => {
    const wrapper = mountStatus({ amount: 20680 })
    expect(wrapper.find('.card-status__amount').text()).toBe('kr 206,80')
    wrapper.destroy()
  })

  test('a genuine zero charge is still shown as zero', () => {
    // A 100%-discounted check is tendered as zero. That is a figure somebody computed.
    const wrapper = mountStatus({ amount: 0 })
    expect(wrapper.find('.card-status__amount').text()).toBe('kr 0,00')
    wrapper.destroy()
  })
})

// The offer document is the other real DOM this rule has to hold in, and it is the one where the
// STRUCTURE said the opposite. `components/shared/OfferDocument.vue` imported core's raw `priceLabel`
// from `~/core/helpers/tools` and never registered it in `methods`. A Vue 2 template compiles with
// `with(this)`, so that import was invisible to the template and bound nothing: every `priceLabel`
// in it has always resolved to the GATED mixin method. It read as a deliberate bypass and was not
// one — the worst kind of comment, one that lies by structure. The import is gone; this is the pin
// that says which function is actually on the other end.
describe('the offer document, in a real DOM', () => {
  // Importing the plugin at the top of this file ran `Vue.mixin(mixin)`, so this mounts with the REAL
  // global mixin. `isCh` lives on the separate `market-mixin`, which is not installed here, so it is
  // undefined and the Norwegian branch renders — the market this document is written for (it prints
  // "25% mva" and an Okam AS org.nr).
  const mountOffer = lineItems => mount(OfferDocument, {
    propsData: {
      offerProposal: {
        code: 'OFF-1',
        expiration: '2026-09-01T00:00:00',
        lineItems
      }
    },
    mocks: { $store: { dispatch: () => {}, subscribe: () => {} } }
  })

  // Minor units, and one column only: with every `onetimeFee` unstated, `hasOnetimeFees` is false and
  // each row is [product, quantity, monthly]. Three rows, three worlds.
  const monthlyCells = wrapper => wrapper.findAll('tbody tr').wrappers.map(row => row.findAll('td').at(2).text())

  test('a fee nobody stated is withheld, a zero fee is zero, and a real fee is the price it is', () => {
    const cells = monthlyCells(mountOffer([
      { name: 'Kasseterminal', quantity: 1, monthlyFee: 49900 },
      { name: 'Support, inkludert', quantity: 1, monthlyFee: 0 },
      { name: 'Tilleggsskjerm', quantity: 1, monthlyFee: null }
    ]))

    // PRESENT.
    expect(cells[0]).toBe('kr 499,00')
    // GENUINELY ZERO — an included line is priced at nothing, and that is a claim somebody made.
    expect(cells[1]).toBe('kr 0,00')
    // ABSENT. Core's raw helper answers "0" to any falsy amount, so had that import ever bound, this
    // cell would have quoted a customer a line item costing nothing.
    expect(cells[2]).toBe(UNKNOWN_AMOUNT)

    // The whole point: these are three different renderings, not two.
    expect(new Set(cells).size).toBe(3)
  })

  test('the document does not reach past the gate to core for its money formatter', () => {
    // Read off __dirname, not the checkout's name, so this holds in a lane worktree too.
    const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'shared', 'OfferDocument.vue'), 'utf8')
    // An IMPORT statement, anchored — the comment in that file names the path in prose deliberately,
    // and a pin that a reader breaks by rewording a comment teaches them to delete the pin.
    expect(source).not.toMatch(/^\s*import\s[^\n]*\sfrom\s+["']~\/core\/helpers\/tools["']/m)
  })

  // ------------------------------------------------------------------------------------------
  // The three rows UNDERNEATH those lines. The cells above are honest one at a time; the totals
  // were not, and the combination is worse than either half: a line saying `—` next to a subtotal
  // saying `kr 499,00` gives the reader no way to tell that the two disagree.
  //
  // `tfoot` is [label (colspan 3), monthly?, onetime?], so whichever single column renders, its
  // figure is cell 1.
  const footCells = wrapper => ({
    subtotal: wrapper.find('tfoot tr.subtotal').findAll('td').at(1).text(),
    vat: wrapper.find('tfoot tr.vat').findAll('td').at(1).text(),
    gross: wrapper.find('tfoot tr.total').findAll('td').at(1).text()
  })

  // A stated fee and an unstated one, which is the render that was measured on a real mount.
  const PARTIAL = [
    { name: 'Kasseterminal', quantity: 1, monthlyFee: 49900 },
    { name: 'Tilleggsskjerm', quantity: 1, monthlyFee: null }
  ]

  test('a line with no stated fee does not quietly become a smaller total', () => {
    const wrapper = mountOffer(PARTIAL)

    // The lines are already honest — this is the half that worked.
    expect(monthlyCells(wrapper)).toEqual(['kr 499,00', UNKNOWN_AMOUNT])

    // THE DEFECT. `(item.monthlyFee * item.quantity || 0)` summed the unstated line as nothing, so
    // the subtotal printed the price of the ONE line it could read and presented it as the whole.
    expect(footCells(wrapper).subtotal).not.toBe('kr 499,00')
    // What it says instead: the same mark the line above it uses. The document declines to total an
    // offer it cannot total, rather than publishing a figure that is short by an unknown amount.
    expect(footCells(wrapper).subtotal).toBe(UNKNOWN_AMOUNT)
  })

  test('and the VAT and gross rows beneath it refuse too, rather than printing zero', () => {
    const foot = footCells(mountOffer(PARTIAL))

    // These two are the SIBLINGS of the line that was reported, and they are why fixing only the
    // subtotal is not enough: `null * 0.25` is 0 in JavaScript, so a subtotal that correctly
    // answers `null` feeds a VAT row that confidently answers `kr 0,00` — trading a partial sum
    // for an outright false one, on the two rows a customer actually reads.
    expect(foot.vat).not.toBe('kr 0,00')
    expect(foot.gross).not.toBe('kr 0,00')
    expect(foot.vat).toBe(UNKNOWN_AMOUNT)
    expect(foot.gross).toBe(UNKNOWN_AMOUNT)

    // The bold "Totalt inkl. mva" is the figure somebody quotes. It is never a guess.
    expect(foot.gross).not.toMatch(/\d/)
  })

  test('a fee somebody deliberately set to zero is still totalled, not refused', () => {
    // The middle of the three worlds, and the one a truthiness guard eats: `!0` is true, so
    // swapping `|| 0` for any other falsiness test would blank the totals of an offer whose every
    // fee is perfectly well known — an included support line priced at nothing is a claim.
    const foot = footCells(mountOffer([
      { name: 'Kasseterminal', quantity: 1, monthlyFee: 49900 },
      { name: 'Support, inkludert', quantity: 1, monthlyFee: 0 }
    ]))

    expect(foot.subtotal).toBe('kr 499,00')
    expect(foot.vat).toBe('kr 124,75')
    expect(foot.gross).toBe('kr 623,75')
  })

  test('an offer that states every fee totals exactly what it always did', () => {
    // The arithmetic is unchanged, quantities included — this lane refuses sums, it does not
    // recompute them.
    const foot = footCells(mountOffer([
      { name: 'Kasseterminal', quantity: 2, monthlyFee: 49900 },
      { name: 'Support', quantity: 1, monthlyFee: 10000 }
    ]))

    expect(foot.subtotal).toBe(label(109800))
    expect(foot.vat).toBe(label(109800 * 0.25))
    expect(foot.gross).toBe(label(109800 * 1.25))
    expect(foot.subtotal).not.toBe(UNKNOWN_AMOUNT)
  })

  test('a line whose QUANTITY nobody stated is not counted as none of them', () => {
    // The other way into the same total. The sum multiplies fee by quantity, so an absent quantity
    // arrives as `49900 * undefined` = NaN, which the old `|| 0` swallowed just as quietly — and
    // this one is nastier, because the cell still shows `kr 499,00` (it prints the UNIT fee) while
    // the line contributes nothing to the sum beneath it.
    const wrapper = mountOffer([
      { name: 'Kasseterminal', quantity: 1, monthlyFee: 49900 },
      { name: 'Tilleggsskjerm', monthlyFee: 29900 }
    ])

    expect(monthlyCells(wrapper)[1]).toBe('kr 299,00')
    expect(footCells(wrapper).subtotal).not.toBe('kr 499,00')
    expect(footCells(wrapper).subtotal).toBe(UNKNOWN_AMOUNT)
  })

  test('the one-time column is held to the same rule as the monthly one', () => {
    // With every `monthlyFee` absent, `hasMonthlyFees` is false and the one-time column is the only
    // one rendered — so this is the SAME cell index reading the OTHER total.
    const foot = footCells(mountOffer([
      { name: 'Installasjon', quantity: 1, onetimeFee: 999000 },
      { name: 'Montering', quantity: 1, onetimeFee: undefined }
    ]))

    expect(foot.subtotal).toBe(UNKNOWN_AMOUNT)
    expect(foot.vat).toBe(UNKNOWN_AMOUNT)
    expect(foot.gross).toBe(UNKNOWN_AMOUNT)
  })

  test('the document tells the reader why there is no total, instead of just showing a dash', () => {
    // Three dashes with no explanation reads as a broken renderer, and a reader who thinks the page
    // is broken reloads it rather than asking for the missing price. The note is the difference
    // between withholding a figure and appearing to have lost one.
    const withHole = mountOffer(PARTIAL)
    expect(withHole.find('.unstated-total-note').exists()).toBe(true)
    expect(withHole.find('.unstated-total-note').text()).toContain('uten oppgitt pris')

    // And it is absent when every fee is stated — a permanent caveat is noise nobody reads.
    const complete = mountOffer([{ name: 'Kasseterminal', quantity: 1, monthlyFee: 49900 }])
    expect(complete.find('.unstated-total-note').exists()).toBe(false)
  })
})
