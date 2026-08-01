<template>
  <section class="mwp">
    <h2 class="mwp__title">
      {{ $i('mrgs_waste_title') }}
    </h2>
    <p class="mwp__lede">
      {{ $i('mrgs_waste_lede') }}
    </p>

    <!-- A FINALIZED WEEK CARRIES NO FORM AT ALL. Not a disabled one: a disabled field still says
         "this is where you would add it", and there is no path on the server that would accept it —
         the week's waste is frozen with its figures, in three layers. The correction path is a new
         forward-only revision, which lives beside this panel as an action rather than a refusal. -->
    <p v-if="frozen" class="mwp__notice" data-test="waste-frozen">
      {{ $i('mrgs_waste_frozen') }}
    </p>

    <p v-if="entries === null" class="mwp__note" data-test="waste-unknown">
      {{ $i('mrgs_waste_unknown') }}
    </p>

    <template v-else>
      <p v-if="!entries.length" class="mwp__note" data-test="waste-empty">
        {{ $i('mrgs_waste_empty') }}
      </p>
      <table v-else class="mwp__lines">
        <thead>
          <tr>
            <th>{{ $i('mrgs_waste_date') }}</th>
            <th>{{ $i('mrgs_waste_reason') }}</th>
            <th>{{ $i('mrgs_waste_what') }}</th>
            <th class="mwp__num">
              {{ $i('mrgs_waste_value') }}
            </th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in entries" :key="entry.wasteEntryId" data-test="waste-row">
            <td>{{ entry.wasteDate || unknownMark }}</td>
            <td>{{ reasonLabel(entry.reason) }}</td>
            <td>{{ whatLabel(entry) }}</td>
            <!-- An entry nothing could price shows the unknown mark and the reason, never 0: a loss
                 the module could not value is not a free one, and a zero would join the total. -->
            <td class="mwp__num" data-test="waste-row-value">
              {{ valueLabel(entry) }}
            </td>
            <td class="mwp__num">
              <button
                v-if="!entry.frozen"
                class="mwp__remove"
                :disabled="busy"
                :aria-label="$i('mrgs_waste_remove')"
                data-test="waste-remove"
                @click="$emit('remove', entry)"
              >
                ×
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="unvaluedCount" class="mwp__notice" data-test="waste-floor">
        {{ $i('mrgs_waste_floor', { count: unvaluedCount }) }}
      </p>
    </template>

    <!-- ---- the form ---------------------------------------------------------------------------- -->
    <template v-if="!frozen">
      <h3 class="mwp__subtitle">
        {{ $i('mrgs_waste_add_title') }}
      </h3>

      <div class="mwp__fields">
        <label class="mwp__field">
          <span class="mwp__fieldlabel">{{ $i('mrgs_waste_date') }}</span>
          <input v-model="draft.wasteDate" class="mwp__input" type="date" :disabled="busy" data-test="waste-date">
        </label>

        <label class="mwp__field">
          <span class="mwp__fieldlabel">{{ $i('mrgs_waste_reason') }}</span>
          <select v-model="draft.reason" class="mwp__input" :disabled="busy" data-test="waste-reason">
            <option v-for="reason in reasons" :key="reason" :value="reason">
              {{ reasonLabel(reason) }}
            </option>
          </select>
        </label>
      </div>

      <!-- TWO WAYS TO SAY WHAT WAS THROWN AWAY, and they are not the same feature. A mastered
           ingredient plus a quantity lets the module price the loss from the same supplier prices the
           theoretical cost is built on — which is the whole reason this costs a venue nothing. Free
           text is for everything the ingredient master does not hold: a finished plate, a delivery
           that arrived broken. -->
      <div class="mwp__fields">
        <label class="mwp__field">
          <span class="mwp__fieldlabel">{{ $i('mrgs_waste_ingredient') }}</span>
          <select
            v-if="ingredients"
            v-model="draft.ingredientId"
            class="mwp__input"
            :disabled="busy"
            data-test="waste-ingredient"
          >
            <option value="">
              {{ $i('mrgs_waste_ingredient_none') }}
            </option>
            <option v-for="ingredient in ingredients" :key="ingredient.id" :value="ingredient.id">
              {{ ingredient.name }}
            </option>
          </select>
          <span v-else class="mwp__note" data-test="waste-ingredients-unknown">
            {{ $i('mrgs_waste_ingredients_unknown') }}
          </span>
        </label>

        <label v-if="draft.ingredientId" class="mwp__field">
          <span class="mwp__fieldlabel">{{ quantityLabel }}</span>
          <input
            v-model="draft.quantity"
            class="mwp__input"
            type="text"
            inputmode="decimal"
            :disabled="busy"
            data-test="waste-quantity"
          >
        </label>

        <label v-else class="mwp__field mwp__field--wide">
          <span class="mwp__fieldlabel">{{ $i('mrgs_waste_what') }}</span>
          <input
            v-model="draft.description"
            class="mwp__input"
            type="text"
            :disabled="busy"
            data-test="waste-description"
          >
        </label>
      </div>

      <label class="mwp__field mwp__field--wide">
        <span class="mwp__fieldlabel">{{ valueFieldLabel }}</span>
        <input
          v-model="draft.value"
          class="mwp__input"
          type="text"
          inputmode="decimal"
          :placeholder="valuePlaceholder"
          :disabled="busy"
          data-test="waste-value"
        >
      </label>
      <p class="mwp__note">
        {{ draft.ingredientId ? $i('mrgs_waste_value_hint_priced') : $i('mrgs_waste_value_hint_stated') }}
      </p>

      <p v-if="error" class="mwp__error" data-test="waste-error">
        {{ error }}
      </p>

      <button class="mrg-btn" :disabled="busy || !canRecord" data-test="waste-record" @click="record">
        {{ recording ? $i('mrgs_waste_recording') : $i('mrgs_waste_record') }}
      </button>
    </template>
  </section>
</template>

<script>
import { marginMoney } from '~/utils/margin/money';
import { WASTE_REASONS, WASTE_REASON_KEYS } from '~/utils/margin/waste-reasons';
import {
  parseSpendAmount,
  SPEND_EMPTY,
  SPEND_NOT_A_NUMBER,
  SPEND_TOO_MANY_DECIMALS,
  SPEND_NEGATIVE,
  SPEND_TOO_LARGE
} from '~/utils/margin/spend-amount';

const ERROR_KEYS = {
  [SPEND_EMPTY]: 'mrgs_spend_err_empty',
  [SPEND_NOT_A_NUMBER]: 'mrgs_spend_err_not_a_number',
  [SPEND_TOO_MANY_DECIMALS]: 'mrgs_spend_err_decimals',
  [SPEND_NEGATIVE]: 'mrgs_spend_err_negative',
  [SPEND_TOO_LARGE]: 'mrgs_spend_err_too_large'
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * What the kitchen threw away this week, and why.
 *
 * The honest cheap answer to "where is my variance". The statement's theoretical side comes from
 * recipes and its actual side from purchase invoices, and everything between them is unexplained; a
 * stock count would close that gap properly and no pilot venue counts. Waste is the part of it the
 * kitchen already knows about as it happens.
 *
 * IT CHANGES NO FIGURE ON THE STATEMENT. Waste is already inside purchase spend — the venue bought it
 * — so adding it to the actual side would count the same kroner twice and make the gap it exists to
 * EXPLAIN look larger. This panel records it and the coverage panel reports it; neither touches the
 * reconciliation above them.
 *
 * NOTHING HERE ADDS MONEY UP. The per-reason totals are the server's, rendered in the server's own
 * order. The only arithmetic in this file is turning a typed amount into integer minor units, done by
 * rearranging digits as text (`~/utils/margin/spend-amount`) rather than by multiplying.
 *
 * A FROZEN WEEK RENDERS NO FORM AND NO REMOVE CONTROL, per-entry: the list can legitimately span both
 * sides of a freeze, so `frozen` is read off each entry rather than assumed for the whole table.
 */
export default {
  name: 'MarginWastePanel',
  mixins: [marginMoney],
  props: {
    /** The models from `readWasteEntries`, or null while the read has not answered. */
    entries: {
      type: Array,
      default: null
    },
    /** `[{ id, name, baseUnit }]` for the store's active ingredients, or null when that read did not answer. */
    ingredients: {
      type: Array,
      default: null
    },
    /** True once a Finalized statement covers the selected week: no new entry can land in it. */
    frozen: {
      type: Boolean,
      default: false
    },
    /** The default date the form opens on — the selected week's Monday. */
    defaultDate: {
      type: String,
      default: ''
    },
    busy: {
      type: Boolean,
      default: false
    },
    recording: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      draft: this.blankDraft(),
      error: ''
    };
  },
  computed: {
    reasons () {
      return WASTE_REASONS;
    },
    unvaluedCount () {
      return (this.entries || []).filter(entry => entry.valueMinor === null).length;
    },
    /** The picked ingredient's base unit is the unit its price is expressed per; nothing else is convertible. */
    quantityLabel () {
      const picked = (this.ingredients || []).find(i => i.id === this.draft.ingredientId);
      return picked && picked.baseUnit
        ? this.$i('mrgs_waste_quantity_in', { unit: picked.baseUnit })
        : this.$i('mrgs_waste_quantity');
    },
    valueFieldLabel () {
      return this.draft.ingredientId ? this.$i('mrgs_waste_value_optional') : this.$i('mrgs_waste_value');
    },
    valuePlaceholder () {
      return this.draft.ingredientId ? this.$i('mrgs_waste_value_from_prices') : '';
    },
    canRecord () {
      if (!ISO_DATE.test(this.draft.wasteDate) || !this.draft.reason) { return false; }
      return this.draft.ingredientId
        ? String(this.draft.quantity).trim() !== '' || String(this.draft.value).trim() !== ''
        : String(this.draft.description).trim() !== '' && String(this.draft.value).trim() !== '';
    }
  },
  watch: {
    defaultDate: {
      immediate: true,
      handler (value) {
        if (value && !this.draft.wasteDate) { this.draft.wasteDate = value; }
      }
    }
  },
  methods: {
    blankDraft () {
      return {
        wasteDate: this.defaultDate || '',
        reason: WASTE_REASONS[0],
        ingredientId: '',
        quantity: '',
        description: '',
        value: ''
      };
    },
    reasonLabel (reason) {
      const key = WASTE_REASON_KEYS[reason];
      return key ? this.$i(key) : (reason || this.unknownMark);
    },
    whatLabel (entry) {
      if (entry.ingredientName) {
        return entry.quantity === null
          ? entry.ingredientName
          : this.number(entry.quantity) + ' ' + entry.ingredientName;
      }
      return entry.description || this.unknownMark;
    },
    /**
     * The stored figure, or the unknown mark. `valuationSource` is shown for a priced entry so the
     * venue can tell its own estimate from the module's — two different claims about one number.
     */
    valueLabel (entry) {
      if (entry.valueMinor === null) { return this.unknownMark; }
      return this.amount(entry.valueMinor, entry.currency);
    },
    record () {
      this.error = '';
      const stated = String(this.draft.value).trim();
      let valueMinor = null;
      if (stated !== '') {
        const parsed = parseSpendAmount(stated);
        if (parsed.error) {
          this.error = this.$i(ERROR_KEYS[parsed.error] || 'mrgs_spend_err_not_a_number');
          return;
        }
        valueMinor = parsed.minor;
      }

      const quantity = String(this.draft.quantity).trim();
      this.$emit('record', {
        wasteDate: this.draft.wasteDate,
        reason: this.draft.reason,
        ingredientId: this.draft.ingredientId || null,
        // Sent as the typed decimal, not as minor units: a quantity is grams or millilitres, not money,
        // and routing it through the money parser would refuse the three decimals a recipe uses.
        quantity: this.draft.ingredientId && quantity !== '' ? Number(quantity.replace(',', '.')) : null,
        valueMinor,
        description: this.draft.ingredientId ? null : this.draft.description.trim(),
        note: null
      });
    },
    /** Called by the page once the server has accepted the entry, so a failed write keeps what was typed. */
    reset () {
      this.draft = this.blankDraft();
      this.error = '';
    }
  }
};
</script>

<style lang="scss" scoped>
.mwp {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  margin-bottom: 24px;
}

.mwp__title {
  font-size: 1.1em;
  font-weight: 600;
  color: #292c34;
  margin: 0 0 8px 0;
}

.mwp__subtitle {
  font-size: 0.85em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #292c34;
  margin: 24px 0 12px 0;
}

.mwp__lede,
.mwp__note {
  font-size: 0.85em;
  color: #64748b;
  margin: 0 0 12px 0;
}

.mwp__notice {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.9em;
  background: #f8f9fa;
  color: #64748b;
  margin: 0 0 16px 0;
}

.mwp__error {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.9em;
  background: #fef2f2;
  color: #ef4444;
  margin: 0 0 16px 0;
}

.mwp__lines {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12px;

  th,
  td {
    text-align: left;
    padding: 10px 8px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 0.9em;
  }

  th {
    font-size: 0.75em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: #64748b;
  }
}

.mwp__num { text-align: right; }

.mwp__fields {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.mwp__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1 1 180px;

  &--wide { flex: 1 1 100%; }
}

.mwp__fieldlabel {
  font-size: 0.75em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #64748b;
}

.mwp__input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  font-size: 0.95em;
  color: #292c34;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #1bb776;
    box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
  }
}

.mwp__remove {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 1.2em;
  cursor: pointer;
  padding: 0 8px;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}
</style>
