<template>
  <section class="mrg-card">
    <header class="mrg-card__head">
      <h2 class="mrg-card__title">
        {{ $i('mrg_imp_batch_title', { file: batch.fileName || $i('mrg_imp_unnamed_file') }) }}
      </h2>
      <span class="mrg-state" :class="'mrg-state--' + stateTone">{{ stateLabel }}</span>
    </header>

    <!-- THE DUPLICATE. Not a failure, and deliberately not rendered as one: the venue uploaded a
         file whose bytes were already here, so the server replayed the batch it already had. No
         second batch, no second price effect. -->
    <p v-if="batch.isDuplicate" class="mrg-notice mrg-notice--info" data-test="import-duplicate">
      {{ $i('mrg_imp_duplicate', { file: batch.fileName || $i('mrg_imp_unnamed_file') }) }}
    </p>
    <p v-if="batch.isDuplicate && batch.fileSha256" class="mrg-card__note" data-test="import-duplicate-hash">
      {{ $i('mrg_imp_duplicate_hash', { hash: shortHash }) }}
    </p>

    <p class="mrg-card__note" data-test="import-counts">
      {{ countsLabel }}
    </p>
    <p v-if="batch.uploadedAt" class="mrg-card__note">
      {{ $i('mrg_imp_uploaded_at', { time: instant(batch.uploadedAt) }) }}
    </p>
    <p v-if="batch.appliedAt" class="mrg-card__note" data-test="import-applied-at">
      {{ $i('mrg_imp_applied_at', { time: instant(batch.appliedAt) }) }}
    </p>

    <p v-if="batch.isApplied" class="mrg-notice mrg-notice--done" data-test="import-applied">
      {{ $i('mrg_imp_applied_lede') }}
    </p>

    <p v-if="!batch.rows.length" class="mrg-card__note" data-test="import-no-rows">
      {{ $i('mrg_imp_no_rows') }}
    </p>

    <div v-else class="mrg-rows">
      <table class="mrg-rows__table">
        <thead>
          <tr>
            <th>{{ $i('mrg_imp_col_row') }}</th>
            <th>{{ $i('mrg_imp_col_article') }}</th>
            <th class="mrg-rows__num">
              {{ $i('mrg_imp_col_price') }}
            </th>
            <th>{{ $i('mrg_imp_col_resolution') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in batch.rows" :key="row.id" :class="{ 'is-error': row.hasError }">
            <td>{{ row.rowNumber === null ? unknownMark : row.rowNumber }}</td>
            <td>
              <span class="mrg-rows__article">{{ row.articleNumber || $i('mrg_imp_no_article') }}</span>
              <span v-if="row.name" class="mrg-rows__name">{{ row.name }}</span>
              <!-- The server's own per-row prose. It names the offending cell, which no sentence
                   written here could, so it is shown verbatim rather than summarised. -->
              <span v-if="row.rowError" class="mrg-rows__error" data-test="import-row-error">{{ row.rowError }}</span>
            </td>
            <td class="mrg-rows__num" data-test="import-row-price">
              {{ priceLabelFor(row) }}
              <span v-if="row.unitCode" class="mrg-rows__unit">{{ row.unitCode }}</span>
            </td>
            <td>
              <template v-if="editable">
                <select
                  class="mrg-rows__input"
                  :value="editOf(row).resolution"
                  :disabled="busy"
                  @change="setResolution(row, $event.target.value)"
                >
                  <option value="Pending">
                    {{ $i('mrg_imp_res_pending') }}
                  </option>
                  <option value="Mapped" :disabled="!row.canMap">
                    {{ $i('mrg_imp_res_mapped') }}
                  </option>
                  <option value="Skipped">
                    {{ $i('mrg_imp_res_skipped') }}
                  </option>
                </select>
                <select
                  v-if="editOf(row).resolution === 'Mapped'"
                  class="mrg-rows__input"
                  :value="editOf(row).resolvedSupplierItemId || ''"
                  :disabled="busy"
                  @change="setItem(row, $event.target.value)"
                >
                  <option value="">
                    {{ $i('mrg_imp_pick_item') }}
                  </option>
                  <option v-for="item in supplierItems" :key="item.supplierItemId" :value="item.supplierItemId">
                    {{ itemLabel(item) }}
                  </option>
                </select>
                <span v-if="!row.canMap" class="mrg-rows__hint" data-test="import-row-skip-only">
                  {{ $i('mrg_imp_error_skip_only') }}
                </span>
                <span v-else-if="row.wasAutoMapped" class="mrg-rows__hint">
                  {{ $i('mrg_imp_auto_mapped') }}
                </span>
              </template>
              <span v-else data-test="import-row-resolution">{{ resolutionLabel(row.resolution) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <template v-if="editable">
      <p v-if="!supplierItems.length" class="mrg-card__note" data-test="import-no-items">
        {{ $i('mrg_imp_no_supplier_items') }}
      </p>

      <div class="mrg-actions">
        <button class="mrg-btn mrg-btn--ghost" :disabled="busy" @click="$emit('save-mappings', mappingPayload)">
          {{ saving ? $i('mrg_imp_saving') : $i('mrg_imp_save_mappings') }}
        </button>
        <button v-if="batch.canApprove" class="mrg-btn" :disabled="busy" @click="$emit('approve')">
          {{ approving ? $i('mrg_imp_approving') : $i('mrg_imp_approve') }}
        </button>
      </div>

      <!-- Approval withheld, with the reason. The server counts the unresolved rows in its own
           refusal; this says the same thing before the round trip rather than hiding the button. -->
      <p v-if="batch.approveBlocker" class="mrg-card__note" data-test="import-approve-blocked">
        {{ blockerLabel }}
      </p>
      <p v-if="batch.canApprove" class="mrg-card__note">
        {{ $i('mrg_imp_approve_caveat') }}
      </p>
    </template>
  </section>
</template>

<script>
import { marginMoney } from '~/utils/margin/money';
import { ROW_MAPPED, ROW_PENDING, ROW_SKIPPED, BATCH_APPLIED, BATCH_MAPPING } from '~/utils/margin/price-import';

/**
 * The review step: every parsed row, what it will do on approve, and what it will not.
 *
 * WHAT THE VENUE HAS TO BE ABLE TO SEE HERE, because approving is irreversible — applied prices are
 * append-only and are superseded forward, never withdrawn:
 *
 *  • which rows write a price (`Mapped`) and to WHICH article;
 *  • which rows do nothing (`Skipped`);
 *  • which rows are still unresolved (`Pending`) — they block approval, and the error rows are among
 *    them, because a row carrying a parse error may only ever be skipped;
 *  • what the file actually said, per row, in the server's own words.
 *
 * A price the parser could not read is `—`, never `kr 0,00`. On this screen that matters more than
 * anywhere else in the module: `0` here would read as "this supplier now charges nothing" on exactly
 * the rows most likely to be wrong.
 */
export default {
  name: 'MarginImportRowsPanel',
  mixins: [marginMoney],
  props: {
    /** The model from `readImportBatch`. */
    batch: {
      type: Object,
      required: true
    },
    /**
     * The supplier items a row may be mapped to: `{ supplierItemId, name, supplierArticleNumber,
     * supplierName }`. Constrained to the batch's supplier when it has one, because the server
     * refuses a mapping outside that scope.
     */
    supplierItems: {
      type: Array,
      default: () => []
    },
    busy: {
      type: Boolean,
      default: false
    },
    saving: {
      type: Boolean,
      default: false
    },
    approving: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return { edits: {} };
  },
  computed: {
    /** Only a batch in `Mapping` can be changed; an applied one is history. */
    editable () {
      return this.batch.state === BATCH_MAPPING;
    },
    stateLabel () {
      return this.$i('mrg_imp_state_' + String(this.batch.state || 'unknown').toLowerCase());
    },
    stateTone () {
      if (this.batch.state === BATCH_APPLIED) { return 'applied'; }
      return this.batch.state === BATCH_MAPPING ? 'mapping' : 'other';
    },
    countsLabel () {
      return this.$i('mrg_imp_counts', {
        rows: this.numberOrMark(this.batch.rowCount),
        mapped: this.numberOrMark(this.batch.mappedCount),
        skipped: this.numberOrMark(this.batch.skippedCount),
        pending: this.numberOrMark(this.batch.pendingCount),
        errors: this.numberOrMark(this.batch.errorCount)
      });
    },
    blockerLabel () {
      switch (this.batch.approveBlocker) {
      case 'pending': return this.$i('mrg_imp_blocked_pending', { count: this.numberOrMark(this.batch.pendingCount) });
      case 'applied': return this.$i('mrg_imp_blocked_applied');
      default: return this.$i('mrg_imp_blocked_state');
      }
    },
    /**
     * Every row's current resolution, sent as one instruction set. The endpoint accepts a partial
     * set, but sending everything makes what is saved exactly what is on screen — a partial payload
     * would leave a row the venue changed and changed back in whatever state the server last had.
     */
    mappingPayload () {
      return this.batch.rows.map((row) => {
        const edit = this.editOf(row);
        return {
          rowId: row.id,
          resolution: edit.resolution,
          resolvedSupplierItemId: edit.resolution === ROW_MAPPED ? (edit.resolvedSupplierItemId || null) : null
        };
      });
    },
    shortHash () {
      return String(this.batch.fileSha256 || '').slice(0, 12);
    }
  },
  watch: {
    // Re-seeded whenever the batch document changes, so the controls always show what the server
    // last stored rather than a stale local edit that a failed save left behind.
    batch: {
      immediate: true,
      handler (batch) {
        const edits = {};
        for (const row of (batch && batch.rows) || []) {
          edits[row.id] = { resolution: row.resolution, resolvedSupplierItemId: row.resolvedSupplierItemId };
        }
        this.edits = edits;
      }
    }
  },
  methods: {
    editOf (row) {
      return this.edits[row.id] || { resolution: ROW_PENDING, resolvedSupplierItemId: null };
    },

    setResolution (row, resolution) {
      // Guarded here as well as server-side: an error row can only be skipped, and the option is
      // disabled — a keyboard or a stale render must not be a way around it.
      const next = resolution === ROW_MAPPED && !row.canMap ? ROW_SKIPPED : resolution;
      this.$set(this.edits, row.id, {
        resolution: next,
        resolvedSupplierItemId: next === ROW_MAPPED ? this.editOf(row).resolvedSupplierItemId : null
      });
    },

    setItem (row, supplierItemId) {
      this.$set(this.edits, row.id, {
        resolution: ROW_MAPPED,
        resolvedSupplierItemId: supplierItemId || null
      });
    },

    itemLabel (item) {
      const parts = [item.name || this.$i('mrg_item_unnamed')];
      if (item.supplierArticleNumber) { parts.push(item.supplierArticleNumber); }
      if (item.supplierName) { parts.push(item.supplierName); }
      return parts.join(' · ');
    },

    resolutionLabel (resolution) {
      switch (resolution) {
      case ROW_MAPPED: return this.$i('mrg_imp_res_mapped');
      case ROW_SKIPPED: return this.$i('mrg_imp_res_skipped');
      default: return this.$i('mrg_imp_res_pending');
      }
    },

    /** A parsed price, or the unknown mark. The wire's null means "could not be read", never zero. */
    priceLabelFor (row) {
      return row.priceMinor === null ? this.unknownMark : this.amount(row.priceMinor, row.currency);
    },

    instant (date) {
      return new Intl.DateTimeFormat(this.locale, { dateStyle: 'short', timeStyle: 'short' }).format(date);
    },

    numberOrMark (value) {
      return value === null || value === undefined ? this.unknownMark : String(value);
    }
  }
};
</script>

<style lang="scss" scoped>
.mrg-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.mrg-card__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.mrg-card__title {
  font-size: 1.1em;
  font-weight: 600;
  color: #292c34;
  margin: 0;
}

.mrg-card__note {
  font-size: 0.85em;
  color: #64748b;
  margin: 0 0 8px 0;
}

.mrg-state {
  font-size: 0.75em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 4px 10px;
  border-radius: 6px;

  &--mapping { background: #f1f5f9; color: #64748b; }
  &--applied { background: rgba(27, 183, 118, 0.12); color: #159f63; }
  &--other { background: #f8f9fa; color: #94a3b8; }
}

.mrg-notice {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.9em;
  margin: 0 0 12px 0;

  &--info { background: #eff6ff; color: #1e40af; }
  &--done { background: rgba(27, 183, 118, 0.1); color: #159f63; }
}

.mrg-rows { overflow-x: auto; }

.mrg-rows__table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    text-align: left;
    padding: 10px 8px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 0.9em;
    vertical-align: top;
  }

  th {
    font-size: 0.75em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: #64748b;
  }

  tr.is-error td { background: #fff7ed; }
}

.mrg-rows__num { text-align: right; }

.mrg-rows__article { display: block; font-weight: 600; color: #292c34; }
.mrg-rows__name { display: block; font-size: 0.85em; color: #64748b; }

.mrg-rows__error {
  display: block;
  font-size: 0.8em;
  color: #92400e;
  margin-top: 4px;
}

.mrg-rows__unit {
  display: block;
  font-size: 0.8em;
  color: #64748b;
}

.mrg-rows__hint {
  display: block;
  font-size: 0.75em;
  font-style: italic;
  color: #64748b;
  margin-top: 4px;
}

.mrg-rows__input {
  width: 100%;
  padding: 8px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  font-size: 0.85em;
  color: #292c34;
  margin-bottom: 6px;

  &:focus {
    outline: none;
    border-color: #1bb776;
    box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
  }
}

.mrg-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin: 16px 0 12px 0;
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

  &--ghost {
    background: #fff;
    color: #292c34;
    border: 2px solid #e2e8f0;
    padding: 12px 18px;
    font-weight: 500;
  }
}
</style>
