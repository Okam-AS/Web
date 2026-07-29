// The ONE place a Margin surface turns integer minor units into text, shared by every panel on the
// module so the plate cost and the margin beside it cannot be formatted by two different rules.
//
// NO ARITHMETIC LIVES HERE. The mixin receives a figure the backend computed and renders it; it never
// adds, subtracts, divides or scales one. The single operation it performs on a value is taking the
// magnitude of a negative amount so the sign can be placed in front of the formatted number — see
// `signedAmount` for why that is necessary and why it is not derivation.

/**
 * `currency` is the ISO code this admin's own money formatter prints (the market's currency, from
 * `marketConfig`). Money the API priced in ANY OTHER currency is rendered with its code and without a
 * symbol: a wrong symbol is a wrong amount.
 *
 * `priceLabel`, `wholeAmount` and `fractionAmount` come from the global mixin
 * (`plugins/global-mixin.js`), which resolves them to core's formatter for kroner and `formatChf` for
 * francs. Nothing about grouping, separators or the symbol is reimplemented here.
 */
export const marginMoney = {
  props: {
    currency: {
      type: String,
      default: null
    },
    locale: {
      type: String,
      default: 'no'
    }
  },
  data () {
    return { unknownMark: '—' };
  },
  methods: {
    /** Integer minor units through the admin's own money formatter, or the wire's ISO code. */
    amount (minor, wireCurrency) {
      if (wireCurrency && this.currency && wireCurrency !== this.currency) {
        return this.wholeAmount(minor) + ',' + this.fractionAmount(minor) + ' ' + wireCurrency;
      }
      return this.priceLabel(minor);
    },

    /**
     * A figure that can legitimately be NEGATIVE — a dish whose plate cost exceeds its ex-VAT net
     * price — with the sign placed in front of the formatted magnitude.
     *
     * WHY THIS EXISTS RATHER THAN `amount(minor)`. Core's `priceLabel` splits the minor units by
     * string slicing (`amount.toString().slice(0, -2)`), which is correct for every amount of one
     * krone or more but malformed for a negative one below it: −9 øre formats as "kr 0,-9" and −99 øre
     * as "kr -,99". A loss-making dish is precisely the row this surface exists to make visible, so a
     * garbled loss is not acceptable here. The magnitude still goes through the shared formatter —
     * the sign is placed, not computed, and no figure is derived from another.
     *
     * The minus is U+2212, the typographic minus, so it cannot be mistaken for a hyphen or a dash.
     */
    signedAmount (minor, wireCurrency) {
      return minor < 0
        ? '−' + this.amount(-minor, wireCurrency)
        : this.amount(minor, wireCurrency);
    },

    /**
     * A RATIO in percentage points, rounded to 2 dp AT PRESENTATION ONLY.
     *
     * It arrives exact and unrounded and is never touched by the money formatter, which would print a
     * percentage as kroner. `Intl.NumberFormat` rounds half away from zero, matching the backend's own
     * presentation rounding (`MarginStatementSupport.Percent(decimal?)`,
     * `MidpointRounding.AwayFromZero`), so the figure on screen and the figure in the CSV export agree.
     *
     * `style: 'percent'` is deliberately NOT used: it would multiply by 100, and this value is already
     * in percentage points.
     */
    ratio (value) {
      return new Intl.NumberFormat(this.locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    },

    /** A plain number for the recipe facts that are not money (quantities, yields). */
    number (value) {
      return new Intl.NumberFormat(this.locale, { maximumFractionDigits: 3 }).format(value);
    }
  }
};

export default marginMoney;
