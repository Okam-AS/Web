<template>
  <div class="autocomplete-wrapper">
    <input
      ref="input"
      :value="value"
      type="text"
      :placeholder="placeholder"
      class="form-input"
      autocomplete="off"
      @input="onInput"
      @focus="showSuggestions = true"
      @blur="onBlur"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter.prevent="selectHighlighted"
      @keydown.esc="showSuggestions = false"
    />
    <ul
      v-if="showSuggestions && filteredSuggestions.length"
      class="autocomplete-list"
    >
      <li
        v-for="(suggestion, index) in filteredSuggestions"
        :key="suggestion"
        class="autocomplete-item"
        :class="{ 'is-highlighted': index === highlightedIndex }"
        @mousedown.prevent="select(suggestion)"
        @mouseenter="highlightedIndex = index"
      >
        {{ suggestion }}
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'SuggestInput',

  props: {
    value: {
      type: String,
      default: ''
    },
    suggestions: {
      type: Array,
      default: () => []
    },
    placeholder: {
      type: String,
      default: ''
    }
  },

  data() {
    return {
      showSuggestions: false,
      highlightedIndex: -1
    }
  },

  computed: {
    filteredSuggestions() {
      const query = (this.value || '').trim().toLowerCase()
      if (!query) return this.suggestions
      return this.suggestions.filter(
        (s) => s.toLowerCase().includes(query) && s.toLowerCase() !== query
      )
    }
  },

  methods: {
    onInput(event) {
      this.$emit('input', event.target.value)
      this.showSuggestions = true
      this.highlightedIndex = -1
    },

    onBlur() {
      // Delay so a mousedown on a suggestion is registered first
      setTimeout(() => {
        this.showSuggestions = false
        this.highlightedIndex = -1
      }, 150)
    },

    select(suggestion) {
      this.$emit('input', suggestion)
      this.showSuggestions = false
      this.highlightedIndex = -1
    },

    move(direction) {
      if (!this.showSuggestions) {
        this.showSuggestions = true
        return
      }
      const count = this.filteredSuggestions.length
      if (!count) return
      this.highlightedIndex =
        (this.highlightedIndex + direction + count) % count
    },

    selectHighlighted() {
      if (
        this.showSuggestions &&
        this.highlightedIndex >= 0 &&
        this.filteredSuggestions[this.highlightedIndex]
      ) {
        this.select(this.filteredSuggestions[this.highlightedIndex])
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.autocomplete-wrapper {
  position: relative;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1em;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #94a3b8;
    box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
}

.autocomplete-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 20;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
  max-height: 240px;
  overflow-y: auto;
}

.autocomplete-item {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.95em;
  color: #292c34;
  cursor: pointer;
  transition: background 0.15s ease;

  &.is-highlighted,
  &:hover {
    background: #f1f5f9;
  }
}
</style>
