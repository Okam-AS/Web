<template>
  <div class="autocomplete-wrapper">
    <textarea
      v-if="multiline"
      :class="{'hasErrors': errorMessage && serverErrorMessage}"
      :value="value"
      @input="$emit('input', $event.target.value)"
      @focus="focused"
      @blur="blured"
    />
    <input
      v-else
      :class="{'hasErrors': errorMessage && serverErrorMessage}"
      type="text"
      :value="value"
      @input="$emit('input', $event.target.value)"
      @focus="focused"
      @blur="blured"
    >
    <div v-if="errorMessage && hasFocus" class="field-error-message">
      {{ errorMessage }}
    </div>
    <ul v-else-if="hasFocus && filteredSuggestions.length > 0">
      <li v-for="suggestion in filteredSuggestions" :key="suggestion" @mousedown="$emit('input', suggestion)">
        {{ suggestion }}
      </li>
    </ul>
  </div>
</template>
<script>
export default {
  props: {
    serverErrorMessage: {
      type: String,
      default: ''
    },
    value: {
      type: String,
      default: ''
    },
    minLength: {
      type: Number,
      default: 2
    },
    maxLength: {
      type: Number,
      default: 150
    },
    suggestions: {
      type: Array,
      default: () => []
    },
    multiline: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      hasFocus: false
    }
  },
  computed: {
    filteredSuggestions () {
      const _this = this;
      const valueToCheck = _this.value || '';
      return (_this.suggestions || []).filter((item) => {
        if (!item || !valueToCheck) {
          return false;
        }
        const lowerItem = item.toLowerCase();
        const lowerValue = valueToCheck.toLowerCase();
        return lowerItem.includes(lowerValue) && lowerItem !== lowerValue;
      });
    },
    errorMessage () {
      const valueToCheck = this.value || '';
      
      if (valueToCheck.length < this.minLength) {
        return 'Feltet er for kort';
      } else if (valueToCheck.length > this.maxLength) {
        return 'Feltet er for langt';
      } else if (this.startsWithLowerCase(valueToCheck)) {
        return 'Må begynne med stor forbokstav';
      } else if (valueToCheck.trim() !== valueToCheck) {
        return 'Kan ikke begynne eller avslutte med mellomrom';
      }
      return '';
    }
  },
  methods: {
    focused () {
      this.hasFocus = true;
    },
    blured () {
      this.hasFocus = false;
    },
    startsWithLowerCase (stringValue) {
      if (!stringValue || stringValue.length === 0) {
        return false;
      }
      const first = stringValue.charAt(0);
      return (first === first.toLowerCase() && first !== first.toUpperCase());
    }
  }
}
</script>
<style lang="scss" scoped>
@import "../../assets/sass/common.scss";

.autocomplete-wrapper {
  width: 100%;
  position: relative;

  input, textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    border: 1px solid #e2e8f0;
    transition: all 0.2s;

    &:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
  }

  textarea {
    min-height: 24px;
    resize: vertical;
    font-family: inherit;
    font-size: 0.6rem;
    line-height: 1.5;
  }
}

ul {
  min-width: rem(200);
  max-height: rem(200);
  overflow-y: auto;
  cursor: pointer;
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  margin-bottom: rem(8);
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: rem(6);
  box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 1000;
  padding: rem(4) 0;
}

li {
  padding: rem(8) rem(12);
  border-bottom: 1px solid #f3f4f6;
  list-style: none;
  font-size: rem(14);
  transition: all 0.2s;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #f8fafc;
    color: #2563eb;
  }
}

.field-error-message{
  position: absolute;
  background: crimson;
  color: white;
  margin-top: rem(6);
  padding: rem(6);
  border-radius: rem(3);
  font-size: rem(10);
}
.field-error-message:before{
  content:'';
  border-left: rem(6) solid transparent;
  border-right: rem(6) solid transparent;
  border-bottom: rem(6) solid crimson;
  position: absolute;
  top: rem(-6);
}
.hasErrors{
  border: 1px solid crimson;
}
</style>