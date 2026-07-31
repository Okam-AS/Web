<template>
  <section class="msp">
    <h2 class="msp__title">
      {{ $i('mrgs_spend_title') }}
    </h2>
    <p class="msp__lede">
      {{ $i('mrgs_spend_lede') }}
    </p>

    <!-- A FINALIZED STATEMENT CARRIES NO EDIT CONTROL AT ALL. Not a disabled one: a disabled field
         still says "this is where you would change it", and there is no path on the server that would
         accept the change. The correction path — a new forward-only revision — lives on the page
         beside this panel, where it is an action rather than a refusal. -->
    <p v-if="frozen" class="msp__notice msp__notice--plain" data-test="spend-frozen">
      {{ $i('mrgs_spend_frozen') }}
    </p>

    <!-- Open, but the row carries no revision token, so an aggregate mutation cannot be guarded. The
         client refuses before the request rather than sending an unguarded write. -->
    <p v-else-if="!statement.canMutate" class="msp__notice msp__notice--warn" data-test="spend-no-revision">
      {{ $i('mrgs_spend_no_revision') }}
    </p>

    <!-- ---- read-only: the lines exactly as the statement holds them --------------------------- -->
    <template v-if="!editable">
      <p v-if="!statement.spendEntries.length" class="msp__note" data-test="spend-empty-readonly">
        {{ $i('mrgs_spend_empty') }}
      </p>
      <table v-else class="msp__lines">
        <thead>
          <tr>
            <th>{{ $i('mrgs_spend_date') }}</th>
            <th>{{ $i('mrgs_spend_supplier') }}</th>
            <th>{{ $i('mrgs_spend_note') }}</th>
            <th class="msp__num">
              {{ $i('mrgs_spend_amount') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in statement.spendEntries" :key="entry.id" data-test="spend-readonly-row">
            <td>{{ entry.spendDate || unknownMark }}</td>
            <td>{{ supplierLabel(entry.supplierId) }}</td>
            <td>{{ entry.note || '' }}</td>
            <td class="msp__num">
              {{ entry.amountMinor === null ? unknownMark : amount(entry.amountMinor, entry.currency) }}
            </td>
          </tr>
        </tbody>
      </table>

      <dl class="msp__stock">
        <div class="msp__stockrow">
          <dt>{{ $i('mrgs_spend_opening') }}</dt>
          <dd data-test="opening-readonly">
            {{ stockLabel(statement.openingStockValueMinor) }}
          </dd>
        </div>
        <div class="msp__stockrow">
          <dt>{{ $i('mrgs_spend_closing') }}</dt>
          <dd data-test="closing-readonly">
            {{ stockLabel(statement.closingStockValueMinor) }}
          </dd>
        </div>
      </dl>
    </template>

    <!-- ---- editable: the replace-set editor --------------------------------------------------- -->
    <template v-else>
      <p v-if="!draft.length" class="msp__note" data-test="spend-empty">
        {{ $i('mrgs_spend_empty') }}
      </p>

      <div v-for="(row, index) in draft" :key="index" class="msp__row">
        <input
          v-model="row.spendDate"
          class="msp__input"
          type="date"
          :disabled="busy"
          :aria-label="$i('mrgs_spend_date')"
          data-test="spend-date"
        >

        <select
          v-if="supplierNames"
          v-model="row.supplierId"
          class="msp__input"
          :disabled="busy"
          :aria-label="$i('mrgs_spend_supplier')"
          data-test="spend-supplier"
        >
          <option value="">
            {{ $i('mrgs_spend_supplier_none') }}
          </option>
          <option v-for="supplier in supplierOptions" :key="supplier.id" :value="supplier.id">
            {{ supplier.name }}
          </option>
          <!-- A line attributed to a supplier this list does not name — archived since, or removed —
               keeps its own option so the replace-set save cannot silently drop the attribution. -->
          <option v-if="isUnlistedSupplier(row.supplierId)" :value="row.supplierId">
            {{ $i('mrgs_spend_supplier_unlisted') }}
          </option>
        </select>
        <span v-else class="msp__supplier-unknown" data-test="spend-supplier-unknown">
          {{ supplierLabel(row.supplierId) }}
        </span>

        <input
          v-model="row.note"
          class="msp__input"
          type="text"
          :placeholder="$i('mrgs_spend_note')"
          :disabled="busy"
          :aria-label="$i('mrgs_spend_note')"
          data-test="spend-note"
        >

        <input
          v-model="row.amount"
          class="msp__input msp__amount"
          type="text"
          inputmode="decimal"
          :disabled="busy"
          :aria-label="$i('mrgs_spend_amount')"
          data-test="spend-amount"
        >

        <button class="msp__remove" :disabled="busy" data-test="spend-remove" @click="remove(index)">
          ×
        </button>

        <!-- The integer minor units this row is about to send, echoed back. What is on screen is what
             goes on the wire — the amount is never re-formatted from the text after parsing. -->
        <span class="msp__echo" data-test="spend-echo">{{ echo(row) }}</span>
      </div>

      <div class="msp__stockfields">
        <label class="msp__field">
          <span class="msp__fieldlabel">{{ $i('mrgs_spend_opening') }}</span>
          <input
            v-model="openingStock"
            class="msp__input"
            type="text"
            inputmode="decimal"
            :placeholder="$i('mrgs_spend_stock_blank')"
            :disabled="busy"
            data-test="opening-stock"
          >
        </label>
        <label class="msp__field">
          <span class="msp__fieldlabel">{{ $i('mrgs_spend_closing') }}</span>
          <input
            v-model="closingStock"
            class="msp__input"
            type="text"
            inputmode="decimal"
            :placeholder="$i('mrgs_spend_stock_blank')"
            :disabled="busy"
            data-test="closing-stock"
          >
        </label>
      </div>

      <p class="msp__note">
        {{ $i('mrgs_spend_stock_hint') }}
      </p>

      <p v-if="error" class="msp__error" data-test="spend-error">
        {{ error }}
      </p>

      <div class="msp__actions">
        <button class="mrg-btn mrg-btn--ghost" :disabled="busy" data-test="spend-add" @click="add">
          {{ $i('mrgs_spend_add') }}
        </button>
        <button class="mrg-btn" :disabled="busy" data-test="spend-save" @click="save">
          {{ saving ? $i('mrgs_spend_saving') : $i('mrgs_spend_save') }}
        </button>
      </div>

      <p class="msp__caveat">
        {{ $i('mrgs_spend_replace_caveat') }}
      </p>
    </template>
  </section>
</template>

<script>
import { marginMoney } from '~/utils/margin/money';
import { STATEMENT_FINALIZED } from '~/utils/margin/statement-view';
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
 * The venue's purchase spend for the week — the ACTUAL side of the statement.
 *
 * It is the only writer of `PUT /margin/statements/{id}/inputs`, and that save is a REPLACE-SET: the
 * body is the complete desired set of lines, so anything not in it is deleted. Three consequences are
 * handled rather than commented around — the editor is seeded from the statement's own lines and
 * never from a partial read, a line attributed to a supplier this store's list cannot name keeps its
 * attribution as an explicit option, and the two stock estimates are sent on every save (including as
 * null) because they are assigned verbatim.
 *
 * NO INVOICE-FILE INTAKE. There is no server route that turns an invoice into a spend line: the CSV
 * and EHF parsers in this module feed the SUPPLIER PRICE import, which writes item prices and never
 * touches a statement. A file drop here would be the most natural thing on the screen to reach for and
 * would quietly be a different feature.
 *
 * A FINALIZED STATEMENT RENDERS NO EDIT CONTROL. The server refuses every mutation on one, so the
 * panel shows the frozen lines and says why, and the correction path is a new revision.
 */
export default {
  name: 'MarginSpendPanel',
  mixins: [marginMoney],
  props: {
    /** The model from `readStatement`. */
    statement: {
      type: Object,
      required: true
    },
    /** Supplier id → name from `readSupplierNames`, or null when that read did not answer. */
    supplierNames: {
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
      draft: [],
      openingStock: '',
      closingStock: '',
      error: ''
    };
  },
  computed: {
    frozen () {
      return this.statement.state === STATEMENT_FINALIZED;
    },
    editable () {
      return this.statement.canMutate;
    },
    supplierOptions () {
      const names = this.supplierNames || {};
      return Object.keys(names).map(id => ({ id, name: names[id] || this.$i('mrgs_spend_supplier_unnamed') }));
    }
  },
  watch: {
    // Re-seeded whenever the server's answer changes — including after a save, whose response is the
    // fresh statement. The draft is a COPY: editing it must not mutate the read model the figures
    // panel renders from.
    statement: {
      immediate: true,
      handler (value) {
        this.draft = (value.spendEntries || []).map(entry => ({
          spendDate: entry.spendDate || '',
          supplierId: entry.supplierId || '',
          note: entry.note || '',
          // Held as TEXT in the venue's own decimal form. The wire value is integer minor units, so it
          // is split at the minor place rather than divided — `1250 / 100` is exact here but the same
          // habit is what produces 19.99 * 100 = 1998 on the way back.
          amount: entry.amountMinor === null ? '' : minorToText(entry.amountMinor),
          // Carried verbatim so a line entered in another currency is never silently relabelled. A new
          // line sends null and the server fills in the statement's own currency.
          currency: entry.currency || null
        }));
        this.openingStock = value.openingStockValueMinor === null ? '' : minorToText(value.openingStockValueMinor);
        this.closingStock = value.closingStockValueMinor === null ? '' : minorToText(value.closingStockValueMinor);
        this.error = '';
      }
    }
  },
  methods: {
    supplierLabel (supplierId) {
      if (!supplierId) { return this.$i('mrgs_spend_supplier_none'); }
      // Three different answers, kept apart: the list never came back, the list came back without this
      // id, and the list named it. Only the middle one is a claim about the store's suppliers.
      if (this.supplierNames === null) { return this.$i('mrgs_spend_supplier_list_unknown'); }
      const name = this.supplierNames[supplierId];
      return name || this.$i('mrgs_spend_supplier_unlisted');
    },

    isUnlistedSupplier (supplierId) {
      return !!supplierId && !!this.supplierNames && !(supplierId in this.supplierNames);
    },

    stockLabel (minor) {
      return minor === null || minor === undefined
        ? this.$i('mrgs_spend_stock_not_entered')
        : this.signedAmount(minor, this.statement.currency);
    },

    /** The minor units a row will send, or the reason it will send none. Never `kr 0,00` for a typo. */
    echo (row) {
      const parsed = parseSpendAmount(row.amount, false);
      if (parsed.error) {
        return parsed.error === SPEND_EMPTY ? '' : this.$i(ERROR_KEYS[parsed.error]);
      }
      return this.amount(parsed.minor, row.currency || this.statement.currency);
    },

    add () {
      this.draft.push({ spendDate: '', supplierId: '', note: '', amount: '', currency: null });
    },

    remove (index) {
      this.draft.splice(index, 1);
    },

    /**
     * The same rules `MarginStatementService.SetInputsAsync` enforces, checked here so the venue is not
     * made to round-trip for a typo — and, for the currency rule, so it is told WHICH lines disagree.
     * The server's own refusal on this surface carries no machine code, only English prose, so a check
     * it can never reach is the difference between an instruction and a shrug.
     */
    validate () {
      const currencies = {};
      for (const row of this.draft) {
        if (!ISO_DATE.test(row.spendDate || '')) { return this.$i('mrgs_spend_err_date'); }
        const parsed = parseSpendAmount(row.amount, false);
        if (parsed.error) { return this.$i(ERROR_KEYS[parsed.error]); }
        // Exactly the server's normalisation: a blank currency becomes the statement's own, so a line
        // that states nothing never counts as a second currency.
        const currency = row.currency || this.statement.currency;
        if (currency) { currencies[currency] = true; }
      }

      const distinct = Object.keys(currencies);
      if (distinct.length > 1) {
        // The actual-spend total adds these together, so two currencies among them would produce a
        // figure in neither, and this module has no rate to convert with.
        return this.$i('mrgs_spend_err_mixed_currency', { currencies: distinct.sort().join(', ') });
      }

      if (this.openingStock !== '' && parseSpendAmount(this.openingStock, true).error) {
        return this.$i('mrgs_spend_err_stock');
      }
      if (this.closingStock !== '' && parseSpendAmount(this.closingStock, true).error) {
        return this.$i('mrgs_spend_err_stock');
      }
      return '';
    },

    save () {
      this.error = this.validate();
      if (this.error) { return; }

      this.$emit('save', {
        spendEntries: this.draft.map(row => ({
          spendDate: row.spendDate,
          supplierId: row.supplierId || null,
          amountMinor: parseSpendAmount(row.amount, false).minor,
          currency: row.currency,
          note: row.note || null
        })),
        // A blank field is null — "not entered" — and NOT zero. Zero opening stock is a claim that the
        // larder was empty on Monday, and the server subtracts it from the actual spend either way.
        openingStockValueMinor: this.openingStock === '' ? null : parseSpendAmount(this.openingStock, true).minor,
        closingStockValueMinor: this.closingStock === '' ? null : parseSpendAmount(this.closingStock, true).minor
      });
    }
  }
};

/**
 * Integer minor units back into the venue's decimal text, by SPLITTING the digits rather than
 * dividing: the sign, then the whole part, then a comma, then exactly two minor digits.
 *
 * Division would be exact for these magnitudes, but it is the habit that produces `19.99 * 100 =
 * 1998.9999…` on the way back, and this text is what the venue then edits and re-submits.
 */
function minorToText (minor) {
  const negative = minor < 0;
  const digits = String(Math.abs(minor)).padStart(3, '0');
  return (negative ? '-' : '') + digits.slice(0, -2) + ',' + digits.slice(-2);
}
</script>

<style lang="scss" scoped>
.msp {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.msp__title {
  font-size: 1.1em;
  font-weight: 600;
  color: #292c34;
  margin: 0 0 8px 0;
}

.msp__lede,
.msp__note {
  font-size: 0.85em;
  color: #64748b;
  margin: 0 0 12px 0;
}

.msp__notice {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.9em;
  margin: 0 0 16px 0;

  &--warn { background: #fff7ed; color: #92400e; }
  &--plain { background: #f8f9fa; color: #64748b; }
}

.msp__error {
  font-size: 0.85em;
  color: #92400e;
  margin: 12px 0;
}

.msp__lines {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;

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

.msp__num { text-align: right; }

.msp__row {
  display: grid;
  grid-template-columns: 150px 1fr 1fr 120px 32px;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;

  @media (max-width: 900px) { grid-template-columns: 1fr 1fr; }
}

.msp__echo {
  grid-column: 1 / -1;
  font-size: 0.75em;
  color: #64748b;
  padding-left: 2px;
}

.msp__supplier-unknown {
  font-size: 0.85em;
  color: #64748b;
}

.msp__input {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  font-size: 0.9em;
  color: #292c34;

  &:focus {
    outline: none;
    border-color: #1bb776;
    box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
  }
}

.msp__amount { text-align: right; }

.msp__remove {
  background: none;
  border: none;
  font-size: 1.2em;
  color: #ef4444;
  cursor: pointer;
}

.msp__stockfields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin: 20px 0 8px 0;
}

.msp__field { display: block; }

.msp__fieldlabel {
  display: block;
  margin-bottom: 6px;
  font-size: 0.75em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #64748b;
}

.msp__stock { margin: 0; }

.msp__stockrow {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 0;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.85em;

  dt { color: #64748b; }
  dd { margin: 0; color: #292c34; }
}

.msp__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.msp__caveat {
  margin: 16px 0 0 0;
  font-size: 0.8em;
  font-style: italic;
  color: #64748b;
}

.mrg-btn {
  background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
  color: #fff;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9em;
  cursor: pointer;

  &:disabled { background: #cbd5e0; cursor: not-allowed; opacity: 0.6; }

  &--ghost {
    background: #fff;
    color: #292c34;
    border: 2px solid #e2e8f0;
    font-weight: 500;
  }
}
</style>
