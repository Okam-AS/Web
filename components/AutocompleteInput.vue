<template>
  <div>
    <input
      type="text"
      :value="value"
      maxlength="150"
      @input="$emit('input', $event.target.value)"
      @focus="hasFocus = true"
      @blur.self="hasFocus = false"
    >
    <ul v-if="hasFocus && filteredSuggestions.length > 0">
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
    suggestions: {
      type: Array,
      default: () => []
    }
  },
  data () {
    return {
      hasFocus: false
    }
  },
  computed: {
    filteredSuggestions () {
      const _this = this
      return _this.suggestions.filter(x => x.toLowerCase().includes(_this.value.toLowerCase()) && x.toLowerCase() !== _this.value.toLowerCase())
    }
  }
}
</script>
<style lang="scss" scoped>
ul{
  min-width: 200px;
  cursor: pointer;
  position: absolute;
  background: white;
  border: 1px solid lightgray
}
li {
  padding: 5px;
  border-bottom: 1px solid lightgray;
  list-style: none;
}
li:hover{
  background: lightgray;
}
</style>