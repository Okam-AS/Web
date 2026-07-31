<template>
  <section class="mrg-card">
    <h2 class="mrg-card__title">
      {{ $i('mrg_ing_title') }}
    </h2>
    <p class="mrg-card__note">
      {{ $i('mrg_ing_lede') }}
    </p>

    <p v-if="list === null" class="mrg-card__note" data-test="ingredients-unknown">
      {{ $i('mrg_ingredients_unknown') }}
    </p>

    <template v-else>
      <label class="mrg-check">
        <input type="checkbox" :checked="showArchived" :disabled="busy" @change="$emit('toggle-archived')">
        <span>{{ $i('mrg_ing_show_archived') }}</span>
      </label>

      <p v-if="!ingredients.length" class="mrg-card__note" data-test="ingredients-empty">
        {{ $i('mrg_ing_empty') }}
      </p>
      <ul v-else class="mrg-list">
        <li v-for="ingredient in ingredients" :key="ingredient.ingredientId">
          <button
            class="mrg-list__item"
            :class="{ 'is-selected': ingredient.ingredientId === selectedId }"
            :disabled="busy"
            @click="$emit('select', ingredient.ingredientId)"
          >
            <span class="mrg-list__name">{{ ingredient.name || $i('mrg_ing_unnamed') }}</span>
            <span class="mrg-list__meta">{{ rowMeta(ingredient) }}</span>
          </button>
        </li>
      </ul>

      <!-- The starter chips, kept alongside the manual form rather than replaced by it: copying one
           is still the fastest way out of an empty store, and it brings suggested conversions the
           venue would otherwise have to know. -->
      <div v-if="starterCandidates.length" class="mrg-starters">
        <p class="mrg-card__note">
          {{ $i('mrg_starters_lede') }}
        </p>
        <button
          v-for="candidate in starterCandidates"
          :key="candidate.name"
          class="mrg-chip"
          :disabled="busy"
          @click="$emit('copy-starter', candidate)"
        >
          + {{ candidate.name }}
        </button>
      </div>

      <!-- CREATE. The base unit is chosen exactly once, here: there is no field for it on the
           update request, so it is immutable by construction rather than by a rule. -->
      <h3 class="mrg-card__subtitle">
        {{ $i('mrg_ing_create_title') }}
      </h3>

      <label class="mrg-field">
        <span class="mrg-field__label">{{ $i('mrg_ing_name') }}</span>
        <input v-model="createForm.name" class="mrg-field__input" type="text" :disabled="busy">
      </label>

      <label class="mrg-field">
        <span class="mrg-field__label">{{ $i('mrg_ing_base_unit') }}</span>
        <select v-model="createForm.baseUnit" class="mrg-field__input" :disabled="busy">
          <option v-for="unit in baseUnits" :key="unit" :value="unit">
            {{ $i('mrg_unit_' + unit.toLowerCase()) }}
          </option>
        </select>
        <span class="mrg-field__hint">{{ $i('mrg_ing_base_unit_hint') }}</span>
      </label>

      <label class="mrg-field">
        <span class="mrg-field__label">{{ $i('mrg_ing_notes') }}</span>
        <input v-model="createForm.notes" class="mrg-field__input" type="text" :disabled="busy">
      </label>

      <MarginConversionEditor
        :conversions="createForm.conversions"
        :base-unit="createForm.baseUnit"
        :busy="busy"
        @add="createForm.conversions.push({ fromUnitCode: '', factorToBase: '' })"
        @remove="createForm.conversions.splice($event, 1)"
      />

      <p v-if="createError" class="mrg-card__error" data-test="ingredient-create-error">
        {{ createError }}
      </p>

      <button class="mrg-btn" :disabled="busy" @click="submitCreate">
        {{ saving ? $i('mrg_ing_saving') : $i('mrg_ing_create') }}
      </button>
    </template>

    <!-- EDIT. Opened only on a detail read, because that read is what carries the revision every
         write here has to send back. -->
    <template v-if="selectedId">
      <h3 class="mrg-card__subtitle">
        {{ $i('mrg_ing_edit_title') }}
      </h3>

      <p v-if="!detail" class="mrg-card__note" data-test="ingredient-detail-unknown">
        {{ $i('mrg_ing_detail_unknown') }}
      </p>

      <template v-else>
        <p class="mrg-card__note" data-test="ingredient-detail-base-unit">
          {{ $i('mrg_ing_base_unit_fixed', { unit: $i('mrg_unit_' + String(detail.baseUnit).toLowerCase()) }) }}
        </p>

        <p v-if="detail.status === 'Archived'" class="mrg-card__error" data-test="ingredient-archived">
          {{ $i('mrg_ing_is_archived') }}
        </p>

        <label class="mrg-field">
          <span class="mrg-field__label">{{ $i('mrg_ing_name') }}</span>
          <input v-model="editForm.name" class="mrg-field__input" type="text" :disabled="busy">
        </label>

        <label class="mrg-field">
          <span class="mrg-field__label">{{ $i('mrg_ing_notes') }}</span>
          <input v-model="editForm.notes" class="mrg-field__input" type="text" :disabled="busy">
        </label>

        <MarginConversionEditor
          :conversions="editForm.conversions"
          :base-unit="detail.baseUnit"
          :busy="busy"
          @add="editForm.conversions.push({ fromUnitCode: '', factorToBase: '' })"
          @remove="editForm.conversions.splice($event, 1)"
        />

        <!-- History, read-only: a superseded factor is why a cost changed, and there is no endpoint
             that could delete or restore one. -->
        <template v-if="supersededConversions.length">
          <p class="mrg-card__note" data-test="conversion-history-lede">
            {{ $i('mrg_conv_history') }}
          </p>
          <ul class="mrg-history">
            <li v-for="conversion in supersededConversions" :key="conversion.id">
              {{ $i('mrg_conv_history_row', {
                unit: conversion.fromUnitCode,
                factor: number(conversion.factorToBase),
                base: $i('mrg_unit_' + String(detail.baseUnit).toLowerCase()),
                version: conversion.version
              }) }}
            </li>
          </ul>
        </template>

        <p v-if="editError" class="mrg-card__error" data-test="ingredient-edit-error">
          {{ editError }}
        </p>

        <div class="mrg-actions">
          <button v-if="detail.revision" class="mrg-btn" :disabled="busy" @click="submitEdit">
            {{ saving ? $i('mrg_ing_saving') : $i('mrg_ing_save') }}
          </button>
          <button
            v-if="detail.revision && detail.status !== 'Archived'"
            class="mrg-btn mrg-btn--danger"
            :disabled="busy"
            @click="$emit('archive', detail)"
          >
            {{ $i('mrg_ing_archive') }}
          </button>
          <p v-if="!detail.revision" class="mrg-card__note" data-test="ingredient-no-revision">
            {{ $i('mrg_ing_no_revision') }}
          </p>
        </div>
        <p v-if="detail.revision && detail.status !== 'Archived'" class="mrg-card__note">
          {{ $i('mrg_ing_archive_caveat') }}
        </p>
      </template>
    </template>
  </section>
</template>

<script>
import MarginConversionEditor from '~/components/admin/margin/MarginConversionEditor.vue';
import { marginMoney } from '~/utils/margin/money';
import { BASE_UNITS } from '~/utils/margin/units';

/**
 * The ingredient master: the list, the manual create form the module never had, the conversion
 * editor, and archiving.
 *
 * WHAT THIS PANEL DOES NOT OFFER, AND WHY, so the gaps are not read as oversights:
 *
 *  • NO UNARCHIVE. `POST {id}/archive` sets `Archived`; nothing in the module sets it back. Archiving
 *    is presented as one-way because it is one-way.
 *  • NO CHANGING A BASE UNIT. `UpdateMarginIngredientRequest` has no `baseUnit` field at all.
 *  • NO DELETING A CONVERSION. Conversions supersede forward — a changed factor writes a new active
 *    version and flags the old one inactive — and no endpoint retires one. Removing a row from the
 *    editor therefore stops sending it, which LEAVES IT ACTIVE; the editor says so rather than
 *    offering a control that would look like a delete and be a no-op.
 *
 * The panel owns no network. The page reads, writes and renders every failure; this emits intent.
 */
export default {
  name: 'MarginIngredientPanel',
  components: { MarginConversionEditor },
  mixins: [marginMoney],
  props: {
    /** The `GET /margin/ingredients` body, or null while unknown (never `[]` for a failed read). */
    list: {
      type: Object,
      default: null
    },
    /** The selected ingredient's detail (`GET {id}`), or null while it has not answered. */
    detail: {
      type: Object,
      default: null
    },
    selectedId: {
      type: String,
      default: null
    },
    showArchived: {
      type: Boolean,
      default: false
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
      baseUnits: BASE_UNITS,
      createError: '',
      editError: '',
      createForm: { name: '', baseUnit: 'Kilogram', notes: '', conversions: [] },
      editForm: { name: '', notes: '', conversions: [] }
    };
  },
  computed: {
    ingredients () {
      return (this.list && this.list.ingredients) || [];
    },
    starterCandidates () {
      return (this.list && this.list.starterCandidates) || [];
    },
    supersededConversions () {
      return ((this.detail && this.detail.conversions) || []).filter(conversion => !conversion.isActive);
    }
  },
  watch: {
    // Seeded from the ACTIVE conversions only. Sending the superseded ones back would re-activate a
    // factor the venue already replaced.
    detail: {
      immediate: true,
      handler (detail) {
        this.editError = '';
        this.editForm = {
          name: (detail && detail.name) || '',
          notes: (detail && detail.notes) || '',
          conversions: ((detail && detail.conversions) || [])
            .filter(conversion => conversion.isActive)
            .map(conversion => ({ fromUnitCode: conversion.fromUnitCode, factorToBase: String(conversion.factorToBase) }))
        };
      }
    }
  },
  methods: {
    rowMeta (ingredient) {
      const parts = [this.$i('mrg_unit_' + String(ingredient.baseUnit).toLowerCase())];
      if (ingredient.status === 'Archived') { parts.push(this.$i('mrg_ing_archived_badge')); }
      return parts.join(' · ');
    },

    submitCreate () {
      const conversions = this.readConversions(this.createForm.conversions);
      if (conversions.error) { this.createError = this.$i(conversions.error); return; }
      if (!this.createForm.name.trim()) { this.createError = this.$i('mrg_ing_err_name'); return; }

      this.createError = '';
      this.$emit('create', {
        name: this.createForm.name.trim(),
        baseUnit: this.createForm.baseUnit,
        notes: this.createForm.notes.trim() || null,
        conversions: conversions.value
      });
      this.createForm = { name: '', baseUnit: this.createForm.baseUnit, notes: '', conversions: [] };
    },

    submitEdit () {
      const conversions = this.readConversions(this.editForm.conversions);
      if (conversions.error) { this.editError = this.$i(conversions.error); return; }
      if (!this.editForm.name.trim()) { this.editError = this.$i('mrg_ing_err_name'); return; }

      this.editError = '';
      this.$emit('update', {
        detail: this.detail,
        request: {
          name: this.editForm.name.trim(),
          notes: this.editForm.notes.trim() || null,
          conversions: conversions.value
        }
      });
    },

    /**
     * `{ value, error }` — the conversion rows as the wire wants them.
     *
     * The factor accepts a comma as the decimal mark, because a Norwegian keyboard produces one and
     * `Number('0,5')` is `NaN`. It is NOT money — no øre, no exact-decimal requirement — so a plain
     * numeric conversion is right here where it would be wrong in `money-input`.
     */
    readConversions (rows) {
      const value = [];
      const seen = {};
      for (const row of rows) {
        const unit = String(row.fromUnitCode || '').trim();
        const factor = Number(String(row.factorToBase || '').replace(',', '.'));
        if (!unit) { return { error: 'mrg_conv_err_unit' }; }
        if (!(factor > 0)) { return { error: 'mrg_conv_err_factor' }; }
        // The server keeps the LAST declaration of a unit and drops the rest silently; refusing here
        // means the venue sees which of their two rows would have been ignored.
        if (seen[unit]) { return { error: 'mrg_conv_err_duplicate' }; }
        seen[unit] = true;
        value.push({ fromUnitCode: unit, factorToBase: factor });
      }
      return { value, error: null };
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

.mrg-card__title {
  font-size: 1.1em;
  font-weight: 600;
  color: #292c34;
  margin: 0 0 8px 0;
}

.mrg-card__subtitle {
  font-size: 0.85em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #292c34;
  margin: 24px 0 12px 0;
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

.mrg-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85em;
  color: #64748b;
  margin-bottom: 12px;
}

.mrg-list { list-style: none; margin: 0; padding: 0; }

.mrg-list__item {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  border-bottom: 1px solid #e2e8f0;
  padding: 10px 4px;
  cursor: pointer;

  &.is-selected { background: rgba(27, 183, 118, 0.08); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

.mrg-list__name { display: block; font-weight: 600; color: #292c34; }
.mrg-list__meta { display: block; font-size: 0.8em; color: #64748b; }

.mrg-starters { margin-top: 16px; }

.mrg-chip {
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 6px 10px;
  margin: 0 6px 6px 0;
  font-size: 0.85em;
  color: #292c34;
  cursor: pointer;

  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

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

.mrg-field__hint {
  display: block;
  margin-top: 6px;
  font-size: 0.8em;
  font-style: italic;
  color: #64748b;
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

.mrg-history {
  margin: 0 0 12px 0;
  padding-left: 18px;
  font-size: 0.8em;
  color: #64748b;
}

.mrg-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
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

  &--danger {
    background: #fff;
    color: #ef4444;
    border: 2px solid #ef4444;
    font-weight: 500;
  }
}
</style>
