<template>
  <section class="meals-orders">
    <h2 class="meals-orders__title">
      {{ selected ? $i('meals_orders_title_for', { company: selected.label || unknownMark }) : $i('meals_orders_title') }}
    </h2>

    <p v-if="!selected" class="meals-orders__notice">
      {{ $i('meals_orders_pick') }}
    </p>

    <!-- The orders read did not answer. Kept apart from "this company has no funded orders" — one
         says nothing about the company, the other is a claim about its spending. -->
    <p v-else-if="isUnknown" class="meals-orders__notice meals-orders__notice--unknown">
      {{ refusalNotice }}
    </p>

    <p v-else-if="orders.isEmpty" class="meals-orders__notice">
      {{ $i('meals_orders_none') }}
    </p>

    <table v-else class="meals-orders__table">
      <thead>
        <tr>
          <th scope="col">
            {{ $i('meals_col_order') }}
          </th>
          <th scope="col">
            {{ $i('meals_col_state') }}
          </th>
          <th scope="col" class="is-numeric">
            {{ $i('meals_col_cap') }}
          </th>
          <th scope="col" class="is-numeric">
            {{ $i('meals_col_bound') }}
          </th>
          <th scope="col" class="is-numeric">
            {{ $i('meals_col_captured') }}
          </th>
          <th scope="col">
            {{ $i('meals_col_bound_at') }}
          </th>
          <th scope="col">
            {{ $i('meals_col_captured_at') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in orders.rows" :key="row.reservationId || row.orderId" class="meals-orders__row">
          <td>{{ row.orderId === null ? unknownMark : row.orderId }}</td>
          <td>
            <span class="meals-orders__badge" :class="'meals-orders__badge--' + stateTone(row)">
              {{ stateLabel(row) }}
            </span>
          </td>
          <td class="is-numeric">
            {{ amountOrMark(row.reservedCap) }}
          </td>
          <td class="is-numeric">
            {{ amountOrMark(row.boundTotal) }}
          </td>
          <!-- The only cell with a rule beyond "print what the server said": see `capturedCell`.
               The two non-figure outcomes both render a dash but carry DIFFERENT classes and
               different titles, because "nothing captured yet" and "the wire sent no figure" are
               not the same fact and must not be indistinguishable in the DOM either. -->
          <td class="is-numeric" :class="'is-capture-' + row.captured.state" :title="capturedTitle(row)">
            {{ capturedCell(row) }}
          </td>
          <td>{{ instant(row.boundAt) }}</td>
          <td>{{ instant(row.capturedAt) }}</td>
        </tr>
      </tbody>
      <!--
        THERE IS NO TOTALS ROW, AND THAT IS THE POINT.

        Meals settles credit sales on a company account (SAF-T transType 11002 kredittsalg, payment
        medium 12006 kundekonto) — every figure above is fiscal. The backend rounds each unit once
        and rounds a rollup once over the UNROUNDED sum, so a client-side sum of the rounded cells is
        a different number from the one the backend would put on the statement.

        `GET /v1/stores/{id}/meals/orders` exposes no rollup at all. The figure a venue actually
        wants — what this company owes for a period — is a STATEMENT (endpoints 19–23), which
        computes it from the allocation ledger and freezes it under a content hash. So the honest
        answer here is to show no total rather than a plausible one.

        There is a second reason that would hold even if the rounding were trivial: a store can hold
        agreements in several currencies at once, so a column total is not always a number.
      -->
    </table>
  </section>
</template>

<script>
import { DATA_UNKNOWN, CAPTURE_KNOWN, CAPTURE_NONE } from '~/utils/meals/store-view';
import { refusalKey } from '~/utils/meals/refusal-copy';
import { crossCurrencyLabel } from '~/utils/cross-currency';

// The funded orders of ONE company account at this store. Purely presentational — it renders the
// rows `buildStoreView` produced and adds no arithmetic of any kind.
export default {
  name: 'MealsFundedOrders',
  props: {
    orders: {
      type: Object,
      required: true
    },
    // The agreement row the list belongs to, or null when nothing is selected.
    selected: {
      type: Object,
      default: null
    },
    // BCP-47 tag for the timestamp labels; the page passes the admin locale.
    locale: {
      type: String,
      default: 'no'
    },
    // The ISO code this admin's money formatter prints (the market's own currency). Money the API
    // priced in ANY OTHER currency is rendered with its code and without a symbol, because printing
    // "kr" over a CHF amount relabels money. Null disables the comparison rather than guessing.
    currency: {
      type: String,
      default: null
    }
  },
  data () {
    return {
      unknownMark: '—'
    };
  },
  computed: {
    isUnknown () {
      return this.orders.state === DATA_UNKNOWN;
    },
    refusalNotice () {
      return this.$i(refusalKey(this.orders.refusal));
    }
  },
  methods: {
    stateTone (row) {
      switch (row.reservationState) {
      case 'Captured': return 'captured';
      case 'Bound': return 'bound';
      case 'Reserved': return 'reserved';
      case 'Released': return 'released';
      default: return 'unknown';
      }
    },
    // An unrecognised reservation state is shown verbatim rather than mapped onto one of the four
    // this client knows. A state we have never heard of is not a state we may rename.
    stateLabel (row) {
      switch (row.reservationState) {
      case 'Captured': return this.$i('meals_state_captured');
      case 'Bound': return this.$i('meals_state_bound');
      case 'Reserved': return this.$i('meals_state_reserved');
      case 'Released': return this.$i('meals_state_released');
      default: return row.reservationState || this.unknownMark;
      }
    },

    // --- money ------------------------------------------------------------------------------
    // Nothing below adds anything up. Every amount is one server-computed integer for one order.

    /**
     * Integer minor units through the admin's OWN money formatter — `priceLabel` on the global
     * mixin, which is core's `priceLabel` for kroner and `formatChf` for francs. No formatting is
     * reimplemented here. When the API priced the order in some other currency the symbol is
     * withheld and the ISO code printed instead, so a franc is never labelled "kr".
     */
    amount (minor, currency) {
      if (currency && this.currency && currency !== this.currency) {
        return crossCurrencyLabel(minor, currency, this);
      }
      return this.priceLabel(minor);
    },

    amountOrMark (value) {
      if (!value) { return this.unknownMark; }
      return this.amount(value.minor, value.currency);
    },

    /**
     * The captured cell, and the one place a zero is not automatically printed.
     *
     * `capturedMinor` arrives as `SUM(GrossMinor) ?? 0` over the reservation's allocation rows, so
     * the wire sends 0 for BOTH "nothing has been captured yet" and "captured, then reversed to
     * nothing". Those are different facts about a company's bill. A reservation with no capture
     * stamp and nothing summed is shown as a dash and explained by its state badge; a real zero —
     * one that carries a capture stamp, or that sits beside a non-zero sum — is shown as 0.
     *
     * The non-zero case is never hidden: the projection writes allocations and stamps the
     * attribution in separate steps, so a sum without a stamp is a capture in flight.
     */
    capturedCell (row) {
      const captured = row.captured;
      if (captured.state === CAPTURE_KNOWN) { return this.amount(captured.minor, captured.currency); }
      // Both remaining states render a dash, but for different reasons — the title says which.
      return this.unknownMark;
    },
    capturedTitle (row) {
      switch (row.captured.state) {
      case CAPTURE_NONE: return this.$i('meals_capture_none');
      case CAPTURE_KNOWN: return null;
      default: return this.$i('meals_capture_unknown');
      }
    },

    // --- time -------------------------------------------------------------------------------

    /**
     * A wire instant, formatted in the READER's own zone and labelled as such by the column header.
     *
     * The value has already been parsed by `parseApiInstant` in the view model — never
     * `new Date(iso)`, because these stamps are loaded straight off `datetime2` columns and
     * serialise bare, which JS reads as browser-local wall clock.
     *
     * It is shown in the reader's zone rather than the venue's because Meals exposes NO store
     * timezone: there is no Meals context endpoint, the market config carries no zone, and the
     * store zone the module does use lives on a policy version this surface cannot read. Rendering
     * a guessed zone would be worse than rendering an honest one, so this is the reader's clock and
     * the header says so. Nothing on this page derives a fiscal PERIOD from these instants — that
     * calculation belongs to the statement surface, in the store's own calendar.
     */
    instant (value) {
      if (!value) { return this.unknownMark; }
      return new Intl.DateTimeFormat(this.locale, {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      }).format(value);
    }
  }
};
</script>

<style lang="scss" scoped>
.meals-orders__title {
  font-size: 1.1em;
  font-weight: 600;
  color: #292c34;
  margin: 0 0 12px;
}

.meals-orders__notice {
  padding: 16px;
  border-radius: 8px;
  background: #f8f9fa;
  color: #64748b;
  font-size: 0.9em;
  margin: 0;
}

.meals-orders__notice--unknown {
  background: #fff8e6;
  color: #92400e;
}

.meals-orders__table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);

  th {
    text-align: left;
    font-size: 0.75em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: #64748b;
    padding: 12px 16px;
    border-bottom: 1px solid #e2e8f0;
  }

  td {
    padding: 12px 16px;
    font-size: 0.9em;
    color: #292c34;
    border-bottom: 1px solid #f1f5f9;
  }

  .is-numeric {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  /* A dash where money would go is muted, so it can never be misread as an amount. The two
     dash-producing states are tinted differently: "not yet" is neutral, "we do not know" is the
     same caveat amber every other unknown on this page uses. */
  .is-capture-none {
    color: #94a3b8;
  }

  .is-capture-unknown {
    color: #92400e;
  }
}

.meals-orders__badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.8em;
  font-weight: 600;
}

.meals-orders__badge--captured {
  background: rgba(27, 183, 118, 0.12);
  color: #159f63;
}

.meals-orders__badge--bound,
.meals-orders__badge--reserved {
  background: #eef2ff;
  color: #4338ca;
}

.meals-orders__badge--released {
  background: #f1f5f9;
  color: #64748b;
}

.meals-orders__badge--unknown {
  background: #fff8e6;
  color: #92400e;
}
</style>
