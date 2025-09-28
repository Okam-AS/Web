<template>
  <div class="price-input-container">
    <input
      :id="id"
      :value="displayValue"
      type="text"
      inputmode="decimal"
      class="price-input"
      :placeholder="placeholder || '0,00'"
      :disabled="disabled"
      @input="handleInput"
      @blur="handleBlur"
      @focus="handleFocus"
    />
    <div class="currency-symbol">kr</div>
  </div>
</template>

<script>
export default {
  name: 'PriceInput',
  props: {
    value: {
      type: [Number, String],
      default: 0
    },
    id: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: '0,00'
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      focused: false,
      internalValue: null
    };
  },
  created() {
    this.internalValue = this.value;
  },
  watch: {
    value(newVal) {
      this.internalValue = newVal;
    }
  },
  computed: {
    displayValue() {
      const valueToUse = this.internalValue !== null ? this.internalValue : this.value;
      
      if (this.focused) {
        const valInOre = parseFloat(valueToUse || 0);
        const valInKroner = valInOre / 100;
        console.log(`PriceInput displayValue (focused) - value in øre: ${valInOre}, value in kroner: ${valInKroner}`);
        return this.formatNumberWithSpaces(valInKroner.toString().replace('.', ','));
      }
      
      const valInOre = parseFloat(valueToUse || 0);
      const valInKroner = valInOre / 100;
      console.log(`PriceInput displayValue (not focused) - value in øre: ${valInOre}, value in kroner: ${valInKroner}`);
      return isNaN(valInKroner) 
        ? '0,00' 
        : this.formatNumberWithSpaces(valInKroner.toFixed(2).replace('.', ','));
    }
  },
  methods: {
    formatNumberWithSpaces(num) {
      const parts = num.toString().split(',');
      
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      
      return parts.length > 1 ? parts.join(',') : parts[0];
    },
    handleInput(event) {
      let value = event.target.value;
      console.log(`PriceInput handleInput - raw value: ${value}`);
      
      value = value.replace(/\s/g, '');
      
      value = value.replace(/[^\d,.]/g, '');
      console.log(`PriceInput handleInput - after regex cleanup: ${value}`);
      
      value = value.replace(/,/g, '.');
      console.log(`PriceInput handleInput - after comma replacement: ${value}`);
      
      value = value.replace(/\.(?=.*\.)/g, '');
      console.log(`PriceInput handleInput - after decimal cleanup: ${value}`);
      
      const displayValue = value.replace(/\./g, ',');
      
      event.target.value = this.formatNumberWithSpaces(displayValue);
      console.log(`PriceInput handleInput - display value set to: ${event.target.value}`);
      
      const numericValueInKroner = parseFloat(value || 0);
      const numericValueInOre = Math.round((isNaN(numericValueInKroner) ? 0 : numericValueInKroner) * 100);
      console.log(`PriceInput handleInput - parsed numericValue in kroner: ${numericValueInKroner}, in øre: ${numericValueInOre}`);
      console.log(`PriceInput handleInput - current this.value before emit: ${this.value}`);
      
      this.internalValue = numericValueInOre;
      
      this.$emit('input', numericValueInOre);
    },
    handleBlur(event) {
      this.focused = false;
      
      const inputValue = event.target.value.replace(/\s/g, '').replace(/,/g, '.');
      const inputValueInKroner = parseFloat(inputValue || 0);
      const inputValueInOre = Math.round((isNaN(inputValueInKroner) ? 0 : inputValueInKroner) * 100);
      
      console.log(`PriceInput handleBlur - inputValue: ${inputValue}, inputValueInKroner: ${inputValueInKroner}, inputValueInOre: ${inputValueInOre}`);
      console.log(`PriceInput handleBlur - this.value before emit: ${this.value}, type: ${typeof this.value}`);
      
      this.internalValue = inputValueInOre;
      
      if (inputValueInOre !== parseFloat(this.value || 0)) {
        console.log(`PriceInput handleBlur - emitting new value: ${inputValueInOre}`);
        this.$emit('input', inputValueInOre);
      } else {
        console.log(`PriceInput handleBlur - value unchanged, not emitting`);
      }
      
      this.$emit('blur', event);
    },
    handleFocus(event) {
      this.focused = true;
      this.$emit('focus', event);
    }
  }
};
</script>

<style scoped>
.price-input-container {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.price-input {
  padding: 0.625rem 2rem 0.625rem 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
  width: 100%;
}

.price-input:focus {
  outline: none;
  border-color: #333;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.currency-symbol {
  position: absolute;
  right: 0.75rem;
  color: #718096;
  pointer-events: none;
}
</style>
