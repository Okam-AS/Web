<template>
  <section class="meals-statement" data-test="meals-statement">
    <h2 class="meals-statement__title">
      {{ $i('mlst_run_title') }}
    </h2>

    <!-- The facts the operator is about to sign. `contentHash` and `revision` are on screen because
         they are the two preconditions the finalize call sends: an operator who is refused for a
         stale hash can see that the one on screen changed, rather than being told a hash they were
         never shown did not match. -->
    <dl class="mls-facts" data-test="meals-statement-facts">
      <div>
        <dt>{{ $i('mlst_fact_period') }}</dt>
        <dd data-test="meals-statement-period">
          {{ statement.period || unknownMark }}
        </dd>
      </div>
      <div>
        <dt>{{ $i('mlst_fact_status') }}</dt>
        <dd>
          <span class="mls-badge" :class="statusClass" data-test="meals-statement-status">
            {{ statusLabel }}
          </span>
        </dd>
      </div>
      <div>
        <dt>{{ $i('mlst_fact_run') }}</dt>
        <dd data-test="meals-statement-run-id">
          {{ statement.statementRunId || unknownMark }}
        </dd>
      </div>
      <div>
        <dt>{{ $i('mlst_fact_lines') }}</dt>
        <dd data-test="meals-statement-line-count">
          {{ statement.lineCount === null ? unknownMark : statement.lineCount }}
        </dd>
      </div>
      <div>
        <dt>{{ $i('mlst_fact_gross') }}</dt>
        <dd data-test="meals-statement-total-gross">
          {{ amountOrMark(statement.totalGross) }}
        </dd>
      </div>
      <div>
        <dt>{{ $i('mlst_fact_net') }}</dt>
        <dd data-test="meals-statement-total-net">
          {{ amountOrMark(statement.totalNet) }}
        </dd>
      </div>
      <div>
        <dt>{{ $i('mlst_fact_vat') }}</dt>
        <dd data-test="meals-statement-total-vat">
          {{ amountOrMark(statement.totalVat) }}
        </dd>
      </div>
      <div>
        <dt>{{ $i('mlst_fact_content_hash') }}</dt>
        <dd class="meals-statement__mono" data-test="meals-statement-content-hash">
          {{ statement.contentHash || unknownMark }}
        </dd>
      </div>
      <div>
        <dt>{{ $i('mlst_fact_revision') }}</dt>
        <dd class="meals-statement__mono" data-test="meals-statement-revision">
          {{ statement.revision || unknownMark }}
        </dd>
      </div>
      <div v-if="statement.finalizedAtUtc">
        <dt>{{ $i('mlst_fact_finalized_at') }}</dt>
        <dd data-test="meals-statement-finalized-at">
          {{ statement.finalizedAtUtc }}
        </dd>
      </div>
    </dl>

    <p v-if="countsDisagree" class="mls-note mls-note--warn" data-test="meals-statement-count-mismatch">
      {{ $i('mlst_count_mismatch', { stated: statement.lineCount, rendered: statement.renderedLineCount }) }}
    </p>

    <p v-if="!statement.lines.length" class="mls-note" data-test="meals-statement-empty">
      {{ $i('mlst_lines_none') }}
    </p>

    <table v-else class="mls-table" data-test="meals-statement-lines">
      <thead>
        <tr>
          <th>{{ $i('mlst_col_member') }}</th>
          <th>{{ $i('mlst_col_kind') }}</th>
          <th>{{ $i('mlst_col_receipt') }}</th>
          <th>{{ $i('mlst_col_occurred') }}</th>
          <th class="meals-statement__num">
            {{ $i('mlst_col_gross') }}
          </th>
          <th class="meals-statement__num">
            {{ $i('mlst_col_net') }}
          </th>
          <th class="meals-statement__num">
            {{ $i('mlst_col_vat') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="line in statement.lines" :key="line.statementLineId || line.allocationId" data-test="meals-statement-line">
          <!-- THE COLUMN THIS SURFACE EXISTS FOR. It prints `line.memberDisplayRef` and nothing
               else — see the header of utils/meals/statement-view.js. When the company supplied no
               employee reference the stored value IS the bare membership id, and that is what a
               reconciling accountant will see on the bill; the row is marked so the venue knows the
               difference, but the VALUE is never substituted. -->
          <td class="meals-statement__member" data-test="meals-statement-member-ref">
            <span v-if="line.hasMemberRef" class="meals-statement__mono">{{ line.memberDisplayRef }}</span>
            <span v-else class="meals-statement__muted">{{ unknownMark }}</span>
          </td>
          <td data-test="meals-statement-kind">
            {{ kindLabel(line.kind) }}
          </td>
          <td>{{ line.sourceReceiptNumber || unknownMark }}</td>
          <td>{{ line.orderOccurredAtUtc || unknownMark }}</td>
          <td class="meals-statement__num">
            {{ amountOrMark(line.gross) }}
          </td>
          <td class="meals-statement__num">
            {{ amountOrMark(line.net) }}
          </td>
          <td class="meals-statement__num">
            {{ amountOrMark(line.vat) }}
          </td>
        </tr>
      </tbody>
    </table>

    <p class="mls-note" data-test="meals-statement-ref-note">
      {{ $i('mlst_member_ref_note') }}
    </p>
  </section>
</template>

<script>
import { UNKNOWN_MARK } from '~/utils/meals/statement-view';

/**
 * The month statement's figures and its lines.
 *
 * Presentation only: every value here arrives already read by `utils/meals/statement-view.js`, and
 * nothing on this component sums, scales or substitutes one. In particular the member column
 * receives `memberDisplayRef` and renders it — it has no access to any other identifier to fall back
 * to, which is deliberate.
 *
 * `data-test` attributes are present. Every other component under `components/admin/meals/` carries
 * none, which `journeys/meals-admin-setup.spec.js` records as a finding — its selectors ride on
 * Norwegian label text and a reworded label fails a journey that should fail only when the product
 * does. This surface does not inherit that.
 */
export default {
  name: 'MealsStatementLines',
  props: {
    statement: {
      type: Object,
      required: true
    },
    // The ISO code this admin's own money formatter prints (the market's currency). Money the API
    // priced in any other currency is rendered with its code and without a symbol: a wrong symbol is
    // a wrong amount.
    currency: {
      type: String,
      default: null
    }
  },
  data () {
    return { unknownMark: UNKNOWN_MARK };
  },
  computed: {
    statusLabel () {
      if (this.statement.isFinalized) { return this.$i('mlst_status_finalized'); }
      if (this.statement.isDraft) { return this.$i('mlst_status_draft'); }
      return this.statement.status || this.unknownMark;
    },
    statusClass () {
      return this.statement.isFinalized ? 'mls-badge--on' : 'mls-badge--warn';
    },
    /**
     * The server said one number of lines and sent another. Surfaced rather than smoothed: it would
     * mean the payload was truncated, and the totals on screen would then belong to rows nobody can
     * see.
     */
    countsDisagree () {
      return this.statement.lineCount !== null &&
        this.statement.lineCount !== this.statement.renderedLineCount;
    }
  },
  methods: {
    /**
     * Integer minor units through the admin's OWN money formatter — `priceLabel` on the global mixin,
     * which resolves to core's formatter for kroner. No grouping or separator rule is reimplemented.
     */
    amount (minor, wireCurrency) {
      if (wireCurrency && this.currency && wireCurrency !== this.currency) {
        return this.priceLabel(minor) + ' ' + wireCurrency;
      }
      return this.priceLabel(minor);
    },
    amountOrMark (value) {
      if (!value) { return this.unknownMark; }
      return this.amount(value.minor, value.currency);
    },
    kindLabel (kind) {
      if (kind === 'Capture') { return this.$i('mlst_kind_capture'); }
      if (kind === 'Reversal') { return this.$i('mlst_kind_reversal'); }
      return kind || this.unknownMark;
    }
  }
};
</script>

<style lang="scss" scoped>
@import './meals-admin';

.meals-statement {
  margin-bottom: 32px;
}

.meals-statement__title {
  font-size: 1.1em;
  font-weight: 600;
  color: #292c34;
  margin: 0 0 12px;
}

.meals-statement__mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9em;
}

.meals-statement__member {
  white-space: nowrap;
}

/* Figures are right-aligned and tabular so a column of amounts can be scanned down; a dash where
   money would go is muted, so it can never be misread as an amount. */
.meals-statement__num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.meals-statement__muted {
  color: #94a3b8;
}
</style>
