<template>
  <div class="mrg-conv">
    <h4 class="mrg-conv__title">
      {{ $i('mrg_conv_title') }}
    </h4>
    <p class="mrg-conv__lede">
      {{ $i('mrg_conv_lede', { base: baseUnitLabel }) }}
    </p>
    <p class="mrg-conv__lede">
      {{ $i('mrg_conv_universal', { codes: universalCodes }) }}
    </p>

    <div v-for="(conversion, index) in conversions" :key="index" class="mrg-conv__row">
      <input
        v-model="conversion.fromUnitCode"
        class="mrg-conv__input"
        type="text"
        :placeholder="$i('mrg_conv_unit_placeholder')"
        :disabled="busy"
      >
      <span class="mrg-conv__equals">=</span>
      <input
        v-model="conversion.factorToBase"
        class="mrg-conv__input"
        type="text"
        inputmode="decimal"
        :placeholder="$i('mrg_conv_factor_placeholder')"
        :disabled="busy"
      >
      <span class="mrg-conv__base">{{ baseUnitLabel }}</span>
      <button class="mrg-conv__remove" :disabled="busy" @click="$emit('remove', index)">
        ×
      </button>
    </div>

    <!-- Said where the × is, because the × is not a delete and would be read as one. There is no
         endpoint that retires a conversion: dropping a row here simply stops sending that unit, and
         a unit the payload does not mention is left exactly as it was. -->
    <p v-if="conversions.length" class="mrg-conv__lede" data-test="conversion-remove-caveat">
      {{ $i('mrg_conv_remove_caveat') }}
    </p>

    <button class="mrg-conv__add" :disabled="busy" @click="$emit('add')">
      {{ $i('mrg_conv_add') }}
    </button>
  </div>
</template>

<script>
import { unitCodesFor } from '~/utils/margin/units';

/**
 * The unit-conversion rows of one ingredient: "one <code> is <factor> <base units>".
 *
 * A conversion is what lets a supplier's pack unit and a recipe line's unit reach the ingredient's
 * base unit. The backend resolves a unit code in a fixed order — the venue's own conversions first,
 * then the universal metric family, then FAIL — and a failure is not an error, it is a line that
 * silently does not price. So the two things this editor has to say are which codes already convert
 * without any conversion at all, and that removing a row is not a deletion.
 *
 * The rows are edited in place on the array the parent owns; the parent validates and submits.
 */
export default {
  name: 'MarginConversionEditor',
  props: {
    conversions: {
      type: Array,
      required: true
    },
    baseUnit: {
      type: String,
      default: null
    },
    busy: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    baseUnitLabel () {
      return this.baseUnit ? this.$i('mrg_unit_' + String(this.baseUnit).toLowerCase()) : this.$i('mrg_unit_unknown');
    },
    /**
     * The codes that already convert to this base unit with no conversion authored. An unrecognised
     * base unit yields an empty list rather than a guessed family — the same refusal
     * `unitCodesFor` makes for the recipe line editor.
     */
    universalCodes () {
      const codes = unitCodesFor(this.baseUnit);
      return codes.length ? codes.join(', ') : this.$i('mrg_conv_universal_none');
    }
  }
};
</script>

<style lang="scss" scoped>
.mrg-conv { margin-bottom: 16px; }

.mrg-conv__title {
  font-size: 0.8em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #292c34;
  margin: 0 0 6px 0;
}

.mrg-conv__lede {
  font-size: 0.8em;
  color: #64748b;
  margin: 0 0 8px 0;
}

.mrg-conv__row {
  display: grid;
  grid-template-columns: 1fr 16px 1fr auto 28px;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.mrg-conv__input {
  width: 100%;
  padding: 10px;
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

.mrg-conv__equals,
.mrg-conv__base {
  font-size: 0.85em;
  color: #64748b;
}

.mrg-conv__remove {
  background: none;
  border: none;
  font-size: 1.2em;
  color: #ef4444;
  cursor: pointer;
}

.mrg-conv__add {
  background: #fff;
  color: #292c34;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 0.9em;
  font-weight: 500;
  cursor: pointer;

  &:disabled { opacity: 0.6; cursor: not-allowed; }
}
</style>
