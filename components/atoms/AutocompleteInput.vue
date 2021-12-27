<template>
  <div>
    <input
      :class="{'hasErrors': value && hasBeenBlured && errorMessage}"
      type="text"
      :value="value"
      @input="$emit('input', $event.target.value)"
      @focus="focused"
      @blur="blured"
    >
    <div v-if="hasBeenBlured && hasFocus && errorMessage" class="field-error-message">
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
    value: {
      type: String,
      default: '',
      required: true
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
    }
  },
  data () {
    return {
      hasBeenBlured: false,
      hasFocus: false
    }
  },
  computed: {
    filteredSuggestions () {
      const _this = this
      return _this.suggestions.filter(x => x.toLowerCase().includes(_this.value.toLowerCase()) && x.toLowerCase() !== _this.value.toLowerCase())
    },
    errorMessage () {
      if (this.value.length < this.minLength) {
        return 'Feltet er for kort'
      } else if (this.value.length > this.maxLength) {
        return 'Feltet er for langt'
      } else if (this.startsWithLowerCase(this.value)) {
        return 'Må begynne med stor forbokstav'
      } else if (this.value.trim() !== this.value) {
        return 'Kan ikke begynne eller avslutte med mellomrom'
      }
      return ''
    }
  },
  methods: {
    focused () {
      this.hasFocus = true
    },
    blured () {
      this.hasFocus = false
      this.hasBeenBlured = true
    },
    startsWithLowerCase (stringValue) {
      const first = stringValue.charAt(0)
      return (first === first.toLowerCase() && first !== first.toUpperCase())
    }
  }
}
</script>
<style lang="scss" scoped>
@import "../../assets/sass/common.scss";

ul{
  min-width: rem(200);
  cursor: pointer;
  position: absolute;
  background: white;
  border: 1px solid lightgray
}
li {
  padding: rem(5);
  border-bottom: 1px solid lightgray;
  list-style: none;
}
li:hover{
  background: lightgray;
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