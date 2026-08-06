<template>
  <section class="wfrt-tl">
    <header class="wfrt-tl__head">
      <h2 class="wfrt-tl__title">
        {{ scopeLabel || $i('wfrt_rate_no_scope') }}
      </h2>
      <!-- The model, stated before the table rather than discovered through a 409. There is no
           update and no delete on this controller; the only thing a manager can do to a wrong rate
           is state a new one from a later date. -->
      <p class="wfrt-tl__law">
        {{ $i('wfrt_rate_append_only') }}
      </p>
    </header>

    <p v-if="isUnknown" class="wfrt-tl__unknown">
      {{ $i('wfrt_rate_unknown') }}
    </p>

    <p v-else-if="isEmpty" class="wfrt-tl__empty">
      {{ $i('wfrt_rate_none_yet') }}
    </p>

    <table v-else class="wfrt-tl__table">
      <thead>
        <tr>
          <th>{{ $i('wfrt_rate_col_from') }}</th>
          <th>{{ $i('wfrt_rate_col_until') }}</th>
          <th class="wfrt-tl__num">
            {{ $i('wfrt_rate_col_amount') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in timeline.rows"
          :key="row.rateVersionId"
          :class="{ 'wfrt-tl__row--open': row.isOpen, 'wfrt-tl__row--named': row.rateVersionId === conflictRateVersionId }"
        >
          <td>{{ row.effectiveFromLocalDate || dash }}</td>
          <td>
            <!-- An open row governs every instant from its start onward. "Until" is not a date it
                 has; saying "—" here would read as a missing value rather than as open-ended. -->
            <span v-if="row.isOpen" class="wfrt-tl__badge">{{ $i('wfrt_rate_in_force') }}</span>
            <span v-else>{{ closedLabel(row) }}</span>
          </td>
          <td class="wfrt-tl__num">
            {{ amountLabel(row) }}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- The 409 the server just answered, named. It carries the id of the statement already in
         force on that date, so the row above is marked rather than described. -->
    <p v-if="conflictRateVersionId" class="wfrt-tl__conflict">
      {{ $i('wfrt_rate_conflict_named') }}
    </p>

    <form v-if="canWrite" class="wfrt-tl__form" @submit.prevent="submit">
      <h3 class="wfrt-tl__form-title">
        {{ $i('wfrt_rate_new_title') }}
      </h3>

      <div class="wfrt-tl__fields">
        <label class="wfrt-tl__field">
          <span>{{ $i('wfrt_rate_field_from') }}</span>
          <!-- `type="date"` yields exactly `yyyy-MM-dd`, which is what the API takes. No Date object
               is ever constructed from it: converting here would pick the BROWSER's zone, and the
               store's is the only one entitled to decide when that local day begins. -->
          <input v-model="form.effectiveFromLocalDate" type="date" :disabled="busy" required>
        </label>

        <label class="wfrt-tl__field">
          <span>{{ $i('wfrt_rate_field_amount') }}</span>
          <input
            v-model="form.amountText"
            type="text"
            inputmode="decimal"
            :disabled="busy"
            :placeholder="$i('wfrt_rate_amount_placeholder')"
          >
        </label>

        <label class="wfrt-tl__field wfrt-tl__field--narrow">
          <span>{{ $i('wfrt_rate_field_currency') }}</span>
          <input v-model="form.currency" type="text" maxlength="3" :disabled="busy">
        </label>
      </div>

      <!-- What will actually go on the wire, in the unit the wire uses. A manager who types 235,50
           sees 23550 øre before pressing save, so the øre/krone question is answered on screen
           rather than in a payslip a month later. -->
      <p v-if="parsed.minor !== null" class="wfrt-tl__wire">
        {{ $i('wfrt_rate_wire_preview', { minor: parsed.minor, currency: normalisedCurrency }) }}
      </p>
      <p v-else-if="form.amountText" class="wfrt-tl__error">
        {{ amountErrorLabel }}
      </p>

      <p v-if="currencyError" class="wfrt-tl__error">
        {{ $i('wfrt_rate_currency_invalid') }}
      </p>

      <!-- The mistyped-future-rate edge, said BEFORE the attempt. The server refuses a second
           statement on a date that already carries one and names the existing row; a form that only
           found out afterwards would leave a manager believing the rate can be corrected where it
           stands. It cannot be corrected at all — only superseded from a later date. -->
      <p v-if="collision" class="wfrt-tl__blocker">
        {{ $i('wfrt_rate_collision', { date: form.effectiveFromLocalDate }) }}
      </p>

      <template v-else>
        <p v-if="predecessor" class="wfrt-tl__effect">
          {{ $i('wfrt_rate_supersedes', { date: predecessor.effectiveFromLocalDate }) }}
        </p>
        <!-- A backdated statement does not cancel a raise somebody already dated later: the server
             BOUNDS the new row at the successor's start instead. -->
        <p v-if="successor" class="wfrt-tl__effect">
          {{ $i('wfrt_rate_bounded_by', { date: successor.effectiveFromLocalDate }) }}
        </p>
      </template>

      <button class="wfrt-tl__btn" type="submit" :disabled="!canSubmit">
        {{ busy ? $i('wfrt_saving') : $i('wfrt_rate_submit') }}
      </button>
    </form>

    <p v-else class="wfrt-tl__readonly">
      {{ $i('wfrt_rate_read_only') }}
    </p>
  </section>
</template>

<script>
import {
  AMOUNT_EMPTY,
  AMOUNT_NOT_A_NUMBER,
  AMOUNT_NOT_POSITIVE,
  AMOUNT_TOO_LARGE,
  AMOUNT_TOO_MANY_DECIMALS,
  parseRateAmount
} from '~/utils/workforce-rates/rate-amount';
import { RATE_EMPTY, RATE_UNKNOWN, collisionOn, predecessorOn, successorOn } from '~/utils/workforce-rates/rate-timeline';
import { crossCurrencyLabel } from '~/utils/cross-currency';

const CURRENCY = /^[A-Z]{3}$/;

// One rate timeline, and the only way to add to it.
//
// There is no edit button and no delete button on any row, and that is a contract rather than an
// omission: `WorkforceRatesController` binds no verb that can change what an existing statement
// paid. A week already costed — possibly already exported to payroll — must keep costing the same
// forever, so the row a manager sees is the row that will still be there in a year.
export default {
  name: 'WorkforceRateTimeline',
  props: {
    timeline: {
      type: Object,
      required: true
    },
    scopeLabel: {
      type: String,
      default: null
    },
    /**
     * The ISO code this admin's own money formatter prints (the market's currency). Money the API
     * stated in ANY OTHER currency is rendered with its code and without a symbol — a wrong symbol
     * is a wrong amount.
     */
    currency: {
      type: String,
      default: null
    },
    canWrite: {
      type: Boolean,
      default: false
    },
    busy: {
      type: Boolean,
      default: false
    },
    /** The id the server named in a `workforce.rate-version-exists` 409, if one is outstanding. */
    conflictRateVersionId: {
      type: String,
      default: null
    }
  },
  data () {
    return {
      dash: '—',
      form: {
        effectiveFromLocalDate: '',
        amountText: '',
        currency: ''
      }
    };
  },
  computed: {
    isUnknown () {
      return this.timeline.state === RATE_UNKNOWN;
    },
    isEmpty () {
      return this.timeline.state === RATE_EMPTY;
    },
    parsed () {
      return parseRateAmount(this.form.amountText);
    },
    amountErrorLabel () {
      switch (this.parsed.error) {
      case AMOUNT_EMPTY: return this.$i('wfrt_rate_amount_empty');
      case AMOUNT_NOT_A_NUMBER: return this.$i('wfrt_rate_amount_nan');
      case AMOUNT_TOO_MANY_DECIMALS: return this.$i('wfrt_rate_amount_decimals');
      case AMOUNT_NOT_POSITIVE: return this.$i('wfrt_rate_amount_not_positive');
      case AMOUNT_TOO_LARGE: return this.$i('wfrt_rate_amount_too_large');
      default: return '';
      }
    },
    normalisedCurrency () {
      return String(this.form.currency || '').trim().toUpperCase();
    },
    currencyError () {
      return !!this.normalisedCurrency && !CURRENCY.test(this.normalisedCurrency);
    },
    collision () {
      return collisionOn(this.timeline, this.form.effectiveFromLocalDate);
    },
    predecessor () {
      return predecessorOn(this.timeline, this.form.effectiveFromLocalDate);
    },
    successor () {
      return successorOn(this.timeline, this.form.effectiveFromLocalDate);
    },
    canSubmit () {
      return !this.busy &&
        this.canWrite &&
        !!this.form.effectiveFromLocalDate &&
        this.parsed.minor !== null &&
        CURRENCY.test(this.normalisedCurrency) &&
        !this.collision;
    }
  },
  watch: {
    // The currency a timeline already uses is the one a new statement almost always continues, so
    // it is offered rather than the admin's market default. Only ever fills a field the manager has
    // not touched — retyping over somebody's edit would be worse than a wrong default.
    timeline: {
      immediate: true,
      handler () {
        if (this.form.currency) { return; }
        this.form.currency = this.timeline.headCurrency || this.currency || '';
      }
    }
  },
  methods: {
    /**
     * Integer minor units through the admin's OWN money formatter (`priceLabel` on the global mixin,
     * which is core's for kroner and `formatChf` for francs). When the API stated the rate in some
     * other currency the symbol is withheld and the ISO code printed instead.
     *
     * Same rule as `WorkforceWeekGrid.vue`'s `amount` and `utils/margin/money.js`, and no longer three
     * copies of it: the composition itself is `crossCurrencyLabel` in `~/utils/cross-currency`, which
     * is also where its refusal of an unstated amount lives.
     *
     * The `=== null` below therefore is not the only thing standing between an absent rate and a
     * printed "0,00 SEK" any more. It stays because it is the narrower statement — a rate row whose
     * amount is null is a row this timeline has a specific `dash` for — but removing it no longer
     * manufactures a figure.
     *
     * No arithmetic: the integer off the wire is what gets formatted. Rates cannot be negative (the
     * server refuses a non-positive one as `workforce.rate-not-positive`), so the sub-krone negative
     * that `priceLabel` garbles cannot arise here.
     */
    amountLabel (row) {
      if (row.hourlyRateMinor === null) { return this.dash; }
      if (row.currency && this.currency && row.currency !== this.currency) {
        return crossCurrencyLabel(row.hourlyRateMinor, row.currency, this);
      }
      return this.priceLabel(row.hourlyRateMinor);
    },

    /**
     * A closed row's end, in the venue's calendar.
     *
     * The wire gives the end as a UTC INSTANT and no local date beside it, unlike the start. It is
     * rendered through the store's zone rather than the browser's — a row closing at Oslo midnight
     * is `22:00Z` the previous day, and a viewer in London would otherwise be shown the wrong day.
     */
    closedLabel (row) {
      if (!row.effectiveToUtc) { return this.dash; }
      const zone = this.timeline.timeZoneId;
      if (!zone) { return this.dash; }
      return new Intl.DateTimeFormat('sv-SE', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' })
        .format(row.effectiveToUtc);
    },

    submit () {
      if (!this.canSubmit) { return; }
      this.$emit('submit', {
        // The venue's calendar date as a STRING. Never a Date, never an ISO datetime.
        effectiveFromLocalDate: this.form.effectiveFromLocalDate,
        hourlyRateMinor: this.parsed.minor,
        currency: this.normalisedCurrency
      });
    }
  }
};
</script>

<style scoped>
.wfrt-tl { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
.wfrt-tl__head { margin-bottom: 14px; }
.wfrt-tl__title { font-size: 1.1rem; font-weight: 600; color: #292c34; margin: 0 0 4px; }
.wfrt-tl__law { font-size: 0.85rem; color: #64748b; margin: 0; }

.wfrt-tl__unknown,
.wfrt-tl__empty { font-size: 0.9rem; color: #64748b; background: #f8f9fa; border-radius: 8px; padding: 12px; margin: 0 0 14px; }
.wfrt-tl__unknown { color: #92400e; background: #fffbeb; }

.wfrt-tl__table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 0.9rem; }
.wfrt-tl__table th { text-align: left; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.3px; color: #64748b; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
.wfrt-tl__table td { padding: 8px; border-bottom: 1px solid #f1f5f9; color: #292c34; }
.wfrt-tl__num { text-align: right; font-variant-numeric: tabular-nums; }
.wfrt-tl__row--open td { font-weight: 600; }
.wfrt-tl__row--named td { background: #fff1f2; }
.wfrt-tl__badge { display: inline-block; padding: 2px 8px; border-radius: 6px; background: #ecfdf5; color: #159f63; font-size: 0.75rem; font-weight: 600; }

.wfrt-tl__conflict { font-size: 0.85rem; color: #b91c1c; margin: 0 0 12px; }

.wfrt-tl__form { border-top: 1px solid #e2e8f0; padding-top: 16px; }
.wfrt-tl__form-title { font-size: 0.95rem; font-weight: 600; color: #292c34; margin: 0 0 12px; }
.wfrt-tl__fields { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 10px; }
.wfrt-tl__field { display: flex; flex-direction: column; gap: 6px; flex: 1 1 160px; }
.wfrt-tl__field--narrow { flex: 0 0 96px; }
.wfrt-tl__field span { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: #292c34; }
.wfrt-tl__field input { padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; color: #292c34; }
.wfrt-tl__field input:focus { outline: none; border-color: #1bb776; }

.wfrt-tl__wire { font-size: 0.8rem; color: #64748b; margin: 0 0 8px; font-variant-numeric: tabular-nums; }
.wfrt-tl__error { font-size: 0.85rem; color: #b91c1c; margin: 0 0 8px; }
.wfrt-tl__blocker { font-size: 0.85rem; color: #92400e; background: #fffbeb; border-radius: 8px; padding: 10px; margin: 0 0 10px; }
.wfrt-tl__effect { font-size: 0.82rem; color: #64748b; margin: 0 0 6px; }

.wfrt-tl__btn { background: linear-gradient(135deg, #1bb776 0%, #159f63 100%); color: #fff; border: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; cursor: pointer; }
.wfrt-tl__btn:disabled { background: #cbd5e0; cursor: not-allowed; opacity: 0.6; }
.wfrt-tl__readonly { font-size: 0.85rem; color: #64748b; margin: 0; }
</style>
