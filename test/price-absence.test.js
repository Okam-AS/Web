import { mount } from '@vue/test-utils'
import { globalMixin } from '~/plugins/global-mixin'
import { formatChf, isAmountStated, UNKNOWN_AMOUNT } from '~/utils/price'
import CardTerminalStatus from '~/components/admin/pos/CardTerminalStatus.vue'

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
