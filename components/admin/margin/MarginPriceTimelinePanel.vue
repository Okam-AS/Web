<template>
  <section class="mrg-card">
    <h2 class="mrg-card__title">
      {{ $i('mrg_price_title') }}
    </h2>

    <p v-if="!item" class="mrg-card__note" data-test="price-no-item">
      {{ $i('mrg_price_no_item') }}
    </p>

    <template v-else>
      <p class="mrg-card__note" data-test="price-item-name">
        {{ $i('mrg_price_for_item', { item: item.name || $i('mrg_item_unnamed') }) }}
      </p>

      <!-- The item can hold a price and still contribute nothing. Said HERE, next to the form that
           is about to add one, because entering a price on an item that cannot cost is the exact
           moment a venue believes the problem is solved. -->
      <p v-if="itemCannotCost" class="mrg-card__error" data-test="price-item-incomplete">
        {{ incompleteWarning }}
      </p>

      <p v-if="timeline.state === 'unknown'" class="mrg-card__note" data-test="timeline-unknown">
        {{ $i('mrg_price_unknown') }}
      </p>
      <p v-else-if="timeline.state === 'empty'" class="mrg-card__note" data-test="timeline-empty">
        {{ $i('mrg_price_empty') }}
      </p>

      <p v-if="timeline.openCount > 1" class="mrg-card__error" data-test="timeline-multi-open">
        {{ $i('mrg_price_multi_open', { count: timeline.openCount }) }}
      </p>

      <ol v-if="timeline.rows.length" class="mrg-timeline">
        <li
          v-for="(row, index) in timeline.rows"
          :key="row.id"
          class="mrg-timeline__row"
          :class="{ 'is-open': row.isOpen, 'is-closed': !row.isOpen }"
        >
          <div class="mrg-timeline__head">
            <strong class="mrg-timeline__amount" data-test="timeline-amount">{{ amountOf(row) }}</strong>
            <span
              class="mrg-timeline__badge"
              :class="row.isOpen ? 'mrg-timeline__badge--open' : 'mrg-timeline__badge--closed'"
              data-test="timeline-badge"
            >{{ row.isOpen ? $i('mrg_price_badge_current') : $i('mrg_price_badge_closed') }}</span>
          </div>

          <span class="mrg-timeline__range" data-test="timeline-range">{{ rangeLabel(row) }}</span>
          <span v-if="supersedeLabel(row, index)" class="mrg-timeline__seam" data-test="timeline-seam">
            {{ supersedeLabel(row, index) }}
          </span>
          <span class="mrg-timeline__source" data-test="timeline-source">{{ sourceLabel(row) }}</span>
        </li>
      </ol>

      <!-- Recording a price. It never edits the row above it: the open price is closed at the
           instant this one starts, and both stay. -->
      <h3 class="mrg-card__subtitle">
        {{ $i('mrg_price_add_title') }}
      </h3>
      <p class="mrg-card__note">
        {{ $i('mrg_price_add_lede') }}
      </p>

      <div class="mrg-field-row">
        <label class="mrg-field">
          <span class="mrg-field__label">{{ $i('mrg_price_amount') }}</span>
          <input
            v-model="form.amount"
            class="mrg-field__input"
            type="text"
            inputmode="decimal"
            :placeholder="$i('mrg_price_amount_hint')"
            :disabled="busy"
          >
        </label>
        <label class="mrg-field">
          <span class="mrg-field__label">{{ $i('mrg_price_currency') }}</span>
          <input
            v-model="form.currency"
            class="mrg-field__input"
            type="text"
            maxlength="3"
            :disabled="busy"
          >
        </label>
        <label class="mrg-field">
          <span class="mrg-field__label">{{ $i('mrg_price_effective_from') }}</span>
          <input v-model="form.effectiveFrom" class="mrg-field__input" type="datetime-local" :disabled="busy">
        </label>
      </div>

      <p v-if="formError" class="mrg-card__error" data-test="price-form-error">
        {{ formError }}
      </p>

      <button class="mrg-btn" :disabled="busy" @click="submit">
        {{ saving ? $i('mrg_price_saving') : $i('mrg_price_add') }}
      </button>
    </template>
  </section>
</template>

<script>
import { marginMoney } from '~/utils/margin/money';
import {
  parseMinorUnits,
  MONEY_EMPTY,
  MONEY_MALFORMED,
  MONEY_TOO_MANY_DECIMALS,
  MONEY_NEGATIVE
} from '~/utils/margin/money-input';
import { ITEM_INCOMPLETE } from '~/utils/margin/supplier-model';

const MONEY_ERROR_KEYS = {
  [MONEY_EMPTY]: 'mrg_price_err_amount_empty',
  [MONEY_MALFORMED]: 'mrg_price_err_amount_malformed',
  [MONEY_TOO_MANY_DECIMALS]: 'mrg_price_err_amount_decimals',
  [MONEY_NEGATIVE]: 'mrg_price_err_amount_negative'
};

/**
 * One supplier item's price timeline, and the form that adds to it.
 *
 * THE PANEL'S WHOLE JOB IS THAT A CLOSED PRICE READS AS CLOSED. Prices here are append-only and
 * effective-dated, and recording a new one closes the open row at exactly the instant the new one
 * starts — so what a venue is looking at is a history in which at most ONE row is in force. Three
 * amounts listed without that distinction would be read as three live prices, and the two dead ones
 * are precisely the amounts nobody should be planning against.
 *
 * NO ARITHMETIC ON MONEY. Every amount is `priceMinor` off the wire through the shared formatter.
 * The one conversion that happens is the venue's own typing turned into øre before it is sent, by
 * `parseMinorUnits`, which works on digit strings and never multiplies by 100 in floating point.
 */
export default {
  name: 'MarginPriceTimelinePanel',
  mixins: [marginMoney],
  props: {
    /** The model from `readPriceTimeline`. */
    timeline: {
      type: Object,
      required: true
    },
    /** The selected supplier item (from `readSupplierItem`), or null while none is chosen. */
    item: {
      type: Object,
      default: null
    },
    /**
     * `{ batchId: fileName }` for imported rows, or null when the import list is unavailable — the
     * price-import surface sits behind its own stage flag, so it often is. A row then says only that
     * it came from an import, rather than printing a Guid nobody can read.
     */
    batchNames: {
      type: Object,
      default: null
    },
    busy: {
      type: Boolean,
      default: false
    },
    saving: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      formError: '',
      form: { amount: '', currency: '', effectiveFrom: '' }
    };
  },
  computed: {
    itemCannotCost () {
      return !!this.item && this.item.costState === ITEM_INCOMPLETE;
    },
    incompleteWarning () {
      // The preferred case is the worse one and gets its own sentence: an incomplete PREFERRED item
      // does not merely fail to cost, it stops the ingredient resolving to any price at all, so the
      // venue's other priced suppliers for it are silently unused.
      return this.item && this.item.isPreferred
        ? this.$i('mrg_price_item_incomplete_preferred')
        : this.$i('mrg_price_item_incomplete');
    }
  },
  watch: {
    // A new item resets the form, so a price typed for one article can never be submitted against
    // another after a click in the list.
    item: {
      immediate: true,
      handler () { this.resetForm(); }
    }
  },
  methods: {
    resetForm () {
      this.formError = '';
      this.form = {
        amount: '',
        // The market's own currency as the default, and editable: a supplier may invoice in another
        // one, and the server stores whatever three-letter code it is told (it checks the shape, not
        // the market). Guessing wrong here would denominate a real price in the wrong currency.
        currency: this.currency || '',
        effectiveFrom: localDateTimeValue(new Date())
      };
    },

    amountOf (row) {
      return row.priceMinor === null ? this.unknownMark : this.amount(row.priceMinor, row.currency);
    },

    rangeLabel (row) {
      if (!row.from) { return this.unknownMark; }
      if (row.isOpen) { return this.$i('mrg_price_range_open', { from: this.instant(row.from) }); }
      return this.$i('mrg_price_range_closed', {
        from: this.instant(row.from),
        to: row.to ? this.instant(row.to) : this.unknownMark
      });
    },

    /**
     * What CLOSED this row. The seam is the point of the whole surface: the predecessor ends at the
     * exact instant its successor begins, so there is never a moment with two prices and never a
     * moment the boundary is ambiguous. A gap is reported as a gap, because it means the item had no
     * effective price at all for that stretch, and a recipe costed at such an instant is unpriced.
     */
    supersedeLabel (row, index) {
      if (row.closesInto === 'next') {
        return this.$i('mrg_price_superseded', { at: row.to ? this.instant(row.to) : this.unknownMark });
      }
      if (row.closesInto === 'gap') {
        const next = this.timeline.rows[index - 1];
        return this.$i('mrg_price_gap', {
          to: row.to ? this.instant(row.to) : this.unknownMark,
          from: next && next.from ? this.instant(next.from) : this.unknownMark
        });
      }
      return '';
    },

    sourceLabel (row) {
      if (!row.isImported) { return this.$i('mrg_price_source_manual'); }
      const name = this.batchNames ? this.batchNames[row.importBatchId] : null;
      return name
        ? this.$i('mrg_price_source_import_named', { file: name })
        : this.$i('mrg_price_source_import');
    },

    instant (date) {
      return new Intl.DateTimeFormat(this.locale, { dateStyle: 'short', timeStyle: 'short' }).format(date);
    },

    /**
     * The same rules the server enforces, checked here so a typo does not cost a round trip. The
     * server stays authoritative — its overlap and backdating refusals arrive as prose this panel
     * cannot anticipate, and the page renders them verbatim.
     */
    submit () {
      const money = parseMinorUnits(this.form.amount);
      if (money.error) {
        this.formError = this.$i(MONEY_ERROR_KEYS[money.error] || 'mrg_price_err_amount_malformed');
        return;
      }

      const currency = String(this.form.currency || '').trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(currency)) {
        this.formError = this.$i('mrg_price_err_currency');
        return;
      }

      if (!this.form.effectiveFrom) {
        this.formError = this.$i('mrg_price_err_effective_from');
        return;
      }

      // `datetime-local` has no zone, so the browser reads it as LOCAL wall time — which is what the
      // venue typed — and `toISOString` converts it to the UTC instant the endpoint documents. A
      // value sent unconverted would land in the price timeline an hour or two off and could reorder
      // two prices entered minutes apart.
      const effectiveFrom = new Date(this.form.effectiveFrom);
      if (isNaN(effectiveFrom.getTime())) {
        this.formError = this.$i('mrg_price_err_effective_from');
        return;
      }

      this.formError = '';
      this.$emit('add-price', {
        priceMinor: money.minor,
        currency,
        effectiveFromUtc: effectiveFrom.toISOString()
      });
    }
  }
};

/** `YYYY-MM-DDTHH:mm` in LOCAL time — the only form a `datetime-local` input accepts. */
function localDateTimeValue (date) {
  const pad = value => String(value).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}
</script>

<style lang="scss" scoped>
.mrg-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.mrg-card__title {
  font-size: 1.1em;
  font-weight: 600;
  color: #292c34;
  margin: 0 0 16px 0;
}

.mrg-card__subtitle {
  font-size: 0.85em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #292c34;
  margin: 24px 0 8px 0;
}

.mrg-card__note {
  font-size: 0.85em;
  color: #64748b;
  margin: 0 0 12px 0;
}

.mrg-card__error {
  font-size: 0.85em;
  color: #92400e;
  background: #fff7ed;
  border-radius: 8px;
  padding: 10px 12px;
  margin: 0 0 12px 0;
}

.mrg-timeline {
  list-style: none;
  margin: 0 0 8px 0;
  padding: 0;
}

.mrg-timeline__row {
  border-left: 3px solid #e2e8f0;
  padding: 10px 0 10px 14px;
  margin-bottom: 4px;

  &.is-open { border-left-color: #1bb776; }
  &.is-closed { color: #64748b; }
}

.mrg-timeline__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mrg-timeline__amount {
  font-size: 1.1em;
  color: #292c34;
}

.mrg-timeline__row.is-closed .mrg-timeline__amount { color: #64748b; }

.mrg-timeline__badge {
  font-size: 0.7em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 3px 8px;
  border-radius: 6px;

  &--open { background: rgba(27, 183, 118, 0.12); color: #159f63; }
  &--closed { background: #f1f5f9; color: #64748b; }
}

.mrg-timeline__range,
.mrg-timeline__seam,
.mrg-timeline__source {
  display: block;
  font-size: 0.8em;
  color: #64748b;
  margin-top: 3px;
}

.mrg-timeline__seam { font-style: italic; }

.mrg-field { display: block; margin-bottom: 16px; }

.mrg-field__label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.85em;
  font-weight: 600;
  color: #292c34;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.mrg-field__input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  font-size: 0.95em;
  color: #292c34;

  &:focus {
    outline: none;
    border-color: #1bb776;
    box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
  }
}

.mrg-field-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 12px;
}

.mrg-btn {
  background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
  color: #fff;
  border: none;
  padding: 14px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95em;
  cursor: pointer;

  &:disabled { background: #cbd5e0; cursor: not-allowed; opacity: 0.6; }
}
</style>
