<template>
  <div
    ref="dropdown"
    class="multi-select-dropdown"
  >
    <button
      class="dropdown-toggle"
      :class="{ 'is-open': isOpen }"
      @click="toggleDropdown"
    >
      <span class="dropdown-label">{{ displayText }}</span>
      <span class="material-icons">{{ isOpen ? 'expand_less' : 'expand_more' }}</span>
    </button>

    <div
      v-if="isOpen"
      class="dropdown-menu"
    >
      <div class="dropdown-header">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          :placeholder="searchPlaceholder"
          @click.stop
        />
      </div>

      <div class="dropdown-actions">
        <button
          class="action-btn"
          @click="selectAll"
        >
          Velg alle
        </button>
        <button
          class="action-btn"
          @click="deselectAll"
        >
          Fjern alle
        </button>
      </div>

      <div class="dropdown-list">
        <label
          v-for="option in filteredOptions"
          :key="option.id"
          class="dropdown-item"
        >
          <input
            type="checkbox"
            :checked="isSelected(option.id)"
            @change="toggleOption(option.id)"
          />
          <span class="checkbox-label">{{ option.label }}</span>
        </label>

        <div
          v-if="filteredOptions.length === 0"
          class="no-results"
        >
          Ingen resultater
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MultiSelectDropdown',
  props: {
    options: {
      type: Array,
      required: true,
      // Array of { id: string, label: string }
    },
    selected: {
      type: Array,
      default: () => [],
      // Array of ids
    },
    placeholder: {
      type: String,
      default: 'Velg...',
    },
    allText: {
      type: String,
      default: 'Alle',
    },
    searchPlaceholder: {
      type: String,
      default: 'Søk...',
    },
  },
  data() {
    return {
      isOpen: false,
      searchQuery: '',
    };
  },
  mounted() {
    document.addEventListener('click', this.handleClickOutside);
  },
  beforeDestroy() {
    document.removeEventListener('click', this.handleClickOutside);
  },
  computed: {
    displayText() {
      if (this.selected.length === 0) {
        return this.placeholder;
      }
      if (this.selected.length === this.options.length) {
        return this.allText;
      }
      return `${this.selected.length} valgt`;
    },
    filteredOptions() {
      if (!this.searchQuery) {
        return this.options;
      }
      const query = this.searchQuery.toLowerCase();
      return this.options.filter((option) =>
        option.label.toLowerCase().includes(query)
      );
    },
  },
  methods: {
    handleClickOutside(event) {
      if (this.$refs.dropdown && !this.$refs.dropdown.contains(event.target)) {
        this.closeDropdown();
      }
    },
    toggleDropdown() {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.searchQuery = '';
      }
    },
    closeDropdown() {
      this.isOpen = false;
      this.searchQuery = '';
    },
    isSelected(id) {
      return this.selected.includes(id);
    },
    toggleOption(id) {
      const newSelected = [...this.selected];
      const index = newSelected.indexOf(id);

      if (index >= 0) {
        newSelected.splice(index, 1);
      } else {
        newSelected.push(id);
      }

      this.$emit('update:selected', newSelected);
    },
    selectAll() {
      const allIds = this.filteredOptions.map((option) => option.id);
      // Merge with existing selected items not in filtered list
      const existingNotFiltered = this.selected.filter(
        (id) => !this.filteredOptions.find((opt) => opt.id === id)
      );
      this.$emit('update:selected', [...existingNotFiltered, ...allIds]);
    },
    deselectAll() {
      // Remove only filtered options from selected
      const filteredIds = this.filteredOptions.map((opt) => opt.id);
      const newSelected = this.selected.filter((id) => !filteredIds.includes(id));
      this.$emit('update:selected', newSelected);
    },
  },
};
</script>

<style lang="scss" scoped>
.multi-select-dropdown {
  position: relative;
  width: 100%;
}

.dropdown-toggle {
  width: 100%;
  padding: 10px 14px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.2s ease;
  color: #292c34;

  &:hover {
    border-color: #1bb776;
    background: #f8f9fa;
  }

  &.is-open {
    border-color: #1bb776;
    background: #e8f7f1;
  }

  .dropdown-label {
    flex: 1;
    text-align: left;
  }

  .material-icons {
    font-size: 20px;
    color: #666;
  }
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-height: 400px;
  display: flex;
  flex-direction: column;
}

.dropdown-header {
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;

  .search-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 0.9em;
    outline: none;

    &:focus {
      border-color: #1bb776;
      box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
    }
  }
}

.dropdown-actions {
  padding: 8px 12px;
  display: flex;
  gap: 8px;
  border-bottom: 1px solid #e2e8f0;

  .action-btn {
    flex: 1;
    padding: 6px 12px;
    background: #f8f9fa;
    border: 1px solid #ddd;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85em;
    transition: all 0.2s ease;
    color: #292c34;

    &:hover {
      background: #e8f7f1;
      border-color: #1bb776;
      color: #1bb776;
    }
  }
}

.dropdown-list {
  overflow-y: auto;
  max-height: 280px;
  padding: 4px;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f8f9fa;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #ddd;
    border-radius: 4px;

    &:hover {
      background: #ccc;
    }
  }
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.2s ease;
  user-select: none;

  &:hover {
    background: #f8f9fa;
  }

  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    margin: 0 10px 0 0;
    cursor: pointer;
    accent-color: #1bb776;
  }

  .checkbox-label {
    flex: 1;
    font-size: 0.9em;
    color: #292c34;
  }
}

.no-results {
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 0.9em;
  font-style: italic;
}
</style>
